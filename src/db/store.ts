import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { ApiError, apiGet, apiPost, notifyUnauthorized } from '../lib/api'
import type { CollectionName, Op, PageResponse, StoredDoc } from '../shared/protocol'
import { DEFAULT_SETTINGS, normalizeSettings } from './settingsDefaults'
import type { CardRecord, PracticeRecord, ReviewRecord, Settings, Word } from './types'

/**
 * Toàn bộ dữ liệu được tải từ MongoDB một lần khi mở app và giữ trong bộ nhớ.
 * Mỗi thay đổi là một danh sách Op: áp dụng ngay vào bộ nhớ để giao diện phản hồi tức thì,
 * rồi gửi lên server theo đúng thứ tự qua một hàng đợi.
 */
export interface DataState {
  words: Word[]
  cards: CardRecord[]
  reviews: ReviewRecord[]
  practice: PracticeRecord[]
  settings: Settings
}

type ListName = Exclude<CollectionName, 'settings'>

const EMPTY: DataState = { words: [], cards: [], reviews: [], practice: [], settings: DEFAULT_SETTINGS }

let state: DataState = EMPTY
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function setState(next: DataState) {
  state = next
  listeners.forEach((listener) => listener())
}

export function getData(): DataState {
  return state
}

export function useData(): DataState {
  return useSyncExternalStore(subscribe, getData)
}

// ---------------------------------------------------------------------------
// Áp dụng thao tác vào dữ liệu trong bộ nhớ (cùng ý nghĩa với backend/ops.ts)

function putDocs<T extends { id: string }>(list: T[], docs: T[]): T[] {
  const next = list.slice()
  const index = new Map(next.map((doc, i) => [doc.id, i]))
  for (const doc of docs) {
    const i = index.get(doc.id)
    if (i === undefined) {
      index.set(doc.id, next.length)
      next.push(doc)
    } else {
      next[i] = doc
    }
  }
  return next
}

function withList(s: DataState, name: ListName, update: (list: StoredDoc[]) => StoredDoc[]): DataState {
  return { ...s, [name]: update(s[name] as unknown as StoredDoc[]) }
}

/** Các thao tác đều lặp lại được: áp dụng lại lần nữa cho ra cùng kết quả */
export function applyOps(s: DataState, ops: Op[]): DataState {
  let next = s
  for (const op of ops) {
    switch (op.type) {
      case 'put':
        if (op.collection === 'settings') {
          const doc = op.docs.at(-1)
          if (doc) next = { ...next, settings: normalizeSettings(doc as Partial<Settings>) }
        } else {
          next = withList(next, op.collection, (list) => putDocs(list, op.docs))
        }
        break
      case 'delete':
      case 'clear': {
        const ids = op.type === 'delete' ? new Set(op.ids) : null
        if (op.collection === 'settings') {
          if (!ids || ids.has('app')) next = { ...next, settings: DEFAULT_SETTINGS }
        } else {
          next = withList(next, op.collection, (list) => (ids ? list.filter((doc) => !ids.has(doc.id)) : []))
        }
        break
      }
      case 'deleteCardsOfWords': {
        const wordIds = new Set(op.wordIds)
        next = { ...next, cards: next.cards.filter((card) => !wordIds.has(card.wordId)) }
        break
      }
    }
  }
  return next
}

// ---------------------------------------------------------------------------
// Trạng thái lưu

export type SyncStatus = 'saved' | 'saving' | 'error'

let syncStatus: SyncStatus = 'saved'
const statusListeners = new Set<() => void>()

function setSyncStatus(next: SyncStatus) {
  if (syncStatus === next) return
  syncStatus = next
  statusListeners.forEach((listener) => listener())
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (listener) => {
      statusListeners.add(listener)
      return () => statusListeners.delete(listener)
    },
    () => syncStatus,
  )
}

// ---------------------------------------------------------------------------
// Hàng đợi ghi

interface Deferred {
  promise: Promise<void>
  resolve: () => void
  reject: (error: unknown) => void
}

interface QueuedOp {
  op: Op
  /** Gắn vào thao tác cuối của mỗi lần commit: xong khi cả lần commit đã lưu lên server */
  done?: Deferred
}

const MAX_ITEMS_PER_OP = 1000
const MAX_BATCH_CHARS = 1_000_000
const MAX_RETRIES = 3

let pending: QueuedOp[] = []
let inFlight: QueuedOp[] = []
let flushing = false
/** Các lần tải lại đang chạy thu thập thao tác phát sinh trong lúc tải để áp dụng lại lên dữ liệu mới */
const loadCollectors = new Set<Op[]>()

function deferred(): Deferred {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  // Người gọi không chờ kết quả thì lỗi đã được báo qua toast, tránh cảnh báo "unhandled rejection"
  promise.catch(() => {})
  return { promise, resolve, reject }
}

function chunk<T>(items: T[]): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += MAX_ITEMS_PER_OP) chunks.push(items.slice(i, i + MAX_ITEMS_PER_OP))
  return chunks
}

/** Chia thao tác lớn (ví dụ nhập hàng nghìn từ) để mỗi request nằm trong giới hạn 4,5 MB của Vercel */
function splitOp(op: Op): Op[] {
  switch (op.type) {
    case 'put':
      return chunk(op.docs).map((docs) => ({ ...op, docs }))
    case 'delete':
      return chunk(op.ids).map((ids) => ({ ...op, ids }))
    case 'deleteCardsOfWords':
      return chunk(op.wordIds).map((wordIds) => ({ ...op, wordIds }))
    case 'clear':
      return [op]
  }
}

function isNoop(op: Op): boolean {
  return (
    (op.type === 'put' && op.docs.length === 0) ||
    (op.type === 'delete' && op.ids.length === 0) ||
    (op.type === 'deleteCardsOfWords' && op.wordIds.length === 0)
  )
}

/**
 * Áp dụng thay đổi ngay vào bộ nhớ và xếp hàng gửi lên server.
 * Promise trả về hoàn tất khi thay đổi đã được lưu vào MongoDB; phần lớn nơi gọi không cần chờ.
 */
export function commit(ops: Op[]): Promise<void> {
  const effective = ops.filter((op) => !isNoop(op))
  if (effective.length === 0) return Promise.resolve()

  setState(applyOps(state, effective))
  loadCollectors.forEach((collector) => collector.push(...effective))

  const queued: QueuedOp[] = effective.flatMap(splitOp).map((op) => ({ op }))
  const done = deferred()
  queued[queued.length - 1].done = done
  pending.push(...queued)
  void flush()
  return done.promise
}

function takeBatch(): QueuedOp[] {
  const batch: QueuedOp[] = []
  let size = 0
  while (pending.length > 0) {
    const opSize = JSON.stringify(pending[0].op).length
    if (batch.length > 0 && size + opSize > MAX_BATCH_CHARS) break
    batch.push(pending.shift()!)
    size += opSize
  }
  return batch
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function send(batch: QueuedOp[]) {
  for (let attempt = 0; ; attempt++) {
    try {
      await apiPost('ops', { ops: batch.map((q) => q.op) })
      return
    } catch (error) {
      const retryable = !(error instanceof ApiError) || error.status >= 500 || error.status === 429
      if (!retryable || attempt >= MAX_RETRIES) throw error
      await sleep(800 * 2 ** attempt)
    }
  }
}

async function flush() {
  if (flushing) return
  flushing = true
  setSyncStatus('saving')
  try {
    while (pending.length > 0) {
      inFlight = takeBatch()
      await send(inFlight)
      inFlight.forEach((q) => q.done?.resolve())
      inFlight = []
    }
    setSyncStatus('saved')
  } catch (error) {
    // Bỏ các thay đổi chưa lưu được rồi tải lại dữ liệu thật từ server để bộ nhớ khớp với MongoDB
    const failed = [...inFlight, ...pending]
    inFlight = []
    pending = []
    failed.forEach((q) => q.done?.reject(error))
    setSyncStatus('error')
    if (!(error instanceof ApiError && error.status === 401)) {
      toast.error('Không lưu được thay đổi lên máy chủ', {
        description: 'Thay đổi gần nhất chưa được lưu. Dữ liệu đã được tải lại từ MongoDB.',
      })
      await loadAll().then(
        () => setSyncStatus('saved'),
        () => {},
      )
    }
  } finally {
    flushing = false
    if (pending.length > 0) void flush()
  }
}

export function hasUnsavedChanges(): boolean {
  return flushing || pending.length > 0
}

// ---------------------------------------------------------------------------
// Tải dữ liệu

const PAGE_SIZE = 2000
let lastLoadedAt = 0

async function loadCollection(name: CollectionName): Promise<StoredDoc[]> {
  const docs: StoredDoc[] = []
  let after: string | null = null
  do {
    const params = new URLSearchParams({ collection: name, limit: String(PAGE_SIZE) })
    if (after) params.set('after', after)
    const page: PageResponse = await apiGet<PageResponse>(`data?${params}`)
    for (const doc of page.docs) docs.push(doc)
    after = page.next
  } while (after)
  return docs
}

/** Tải toàn bộ dữ liệu. Thay đổi chưa lưu xong hoặc phát sinh trong lúc tải được áp dụng lại lên kết quả. */
export async function loadAll(): Promise<void> {
  const replay = [...inFlight, ...pending].map((q) => q.op)
  const collector: Op[] = []
  loadCollectors.add(collector)
  try {
    const [words, cards, reviews, practice, settings] = await Promise.all(
      (['words', 'cards', 'reviews', 'practice', 'settings'] as const).map(loadCollection),
    )
    const loaded: DataState = {
      words: words as unknown as Word[],
      cards: cards as unknown as CardRecord[],
      reviews: reviews as unknown as ReviewRecord[],
      practice: practice as unknown as PracticeRecord[],
      settings: normalizeSettings(settings.find((doc) => doc.id === 'app') as Partial<Settings> | undefined),
    }
    setState(applyOps(loaded, [...replay, ...collector]))
    lastLoadedAt = Date.now()
  } finally {
    loadCollectors.delete(collector)
  }
}

/** Tải lại khi quay lại tab (ví dụ vừa học trên điện thoại) và cảnh báo khi đóng tab lúc chưa lưu xong */
export function startBackgroundSync(): () => void {
  const onVisible = () => {
    if (document.visibilityState === 'visible' && Date.now() - lastLoadedAt > 60_000) {
      loadAll().catch(() => {})
    }
  }
  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (hasUnsavedChanges()) event.preventDefault()
  }
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('beforeunload', onBeforeUnload)
  return () => {
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('beforeunload', onBeforeUnload)
  }
}

export async function logout(): Promise<void> {
  await apiPost('logout')
  pending = []
  setState(EMPTY)
  notifyUnauthorized()
}
