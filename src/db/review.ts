import { State } from 'ts-fsrs'
import { startOfStudyDay } from '../lib/date'
import { buildQueue, type SessionQueue } from '../lib/queue'
import type { CardRecord, ReviewRecord, Settings, Word } from './types'
import { commit, getData, type DataState } from './store'

export interface ReviewData {
  settings: Settings
  words: Word[]
  queue: SessionQueue
  /** Thời điểm đến hạn gần nhất của các thẻ chưa có trong phiên (để báo "quay lại sau") */
  nextDue: number | null
}

export function buildReviewData(data: DataState, now: number): ReviewData {
  const { settings, cards } = data
  const words = data.words.toSorted((a, b) => a.createdAt - b.createdAt)
  const dayStart = startOfStudyDay(now)
  const introduced = data.reviews.filter((r) => r.reviewedAt >= dayStart && r.state === State.New).length
  const wordOrder = new Map(words.map((w, i) => [w.id, i]))
  const queue = buildQueue(cards, {
    now,
    enabledTypes: settings.enabledCardTypes,
    newLimit: Math.max(0, settings.newCardsPerDay - introduced),
    wordOrder,
  })
  const inQueue = new Set([...queue.main, ...queue.learning].map((c) => c.id))
  const enabled = new Set(settings.enabledCardTypes)
  let nextDue: number | null = null
  for (const c of cards) {
    if (inQueue.has(c.id) || c.state === State.New || !enabled.has(c.type) || !wordOrder.has(c.wordId)) continue
    if (nextDue === null || c.due < nextDue) nextDue = c.due
  }
  return { settings, words, queue, nextDue }
}

export async function loadReviewData(now: number): Promise<ReviewData> {
  return buildReviewData(getData(), now)
}

export async function saveReview(updated: CardRecord, review: ReviewRecord): Promise<void> {
  void commit([
    { type: 'put', collection: 'cards', docs: [updated] },
    { type: 'put', collection: 'reviews', docs: [review] },
  ])
}

export async function undoReview(previous: CardRecord, reviewId: string): Promise<void> {
  void commit([
    { type: 'put', collection: 'cards', docs: [previous] },
    { type: 'delete', collection: 'reviews', ids: [reviewId] },
  ])
}
