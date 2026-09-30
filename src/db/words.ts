import { canCloze } from '../lib/cloze'
import { newId } from '../lib/id'
import { uniq } from '../lib/text'
import { createCard, resetCard } from '../lib/srs'
import type { CardRecord, CardType, Word, WordInput } from './types'
import { getSettings } from './settings'
import { commit, getData } from './store'

/** Các kiểu thẻ áp dụng được cho một từ (thẻ điền câu cần có câu ví dụ chứa từ đó) */
export function cardTypesFor(word: Pick<Word, 'term' | 'examples'>, enabled: readonly CardType[]): CardType[] {
  return enabled.filter((t) => t !== 'cloze' || canCloze(word.term, word.examples))
}

function missingCards(word: Word, existing: CardRecord[], enabled: readonly CardType[], now: number): CardRecord[] {
  const have = new Set(existing.map((c) => c.type))
  return cardTypesFor(word, enabled)
    .filter((t) => !have.has(t))
    .map((t) => createCard(word.id, t, now))
}

export async function addWord(input: WordInput): Promise<Word> {
  const { enabledCardTypes } = getSettings()
  const now = Date.now()
  const word: Word = { ...input, id: newId(), createdAt: now, updatedAt: now }
  void commit([
    { type: 'put', collection: 'words', docs: [word] },
    { type: 'put', collection: 'cards', docs: missingCards(word, [], enabledCardTypes, now) },
  ])
  return word
}

export async function updateWord(id: string, patch: Partial<WordInput>): Promise<void> {
  const { words, cards } = getData()
  const current = words.find((w) => w.id === id)
  if (!current) return
  const now = Date.now()
  const word: Word = { ...current, ...patch, updatedAt: now }
  const existing = cards.filter((c) => c.wordId === id)
  void commit([
    { type: 'put', collection: 'words', docs: [word] },
    { type: 'put', collection: 'cards', docs: missingCards(word, existing, getSettings().enabledCardTypes, now) },
  ])
}

/** Xóa từ và các thẻ của nó. Lịch sử ôn vẫn giữ lại để thống kê không bị thay đổi. */
export async function deleteWord(id: string): Promise<void> {
  void commit([
    { type: 'delete', collection: 'words', ids: [id] },
    { type: 'deleteCardsOfWords', wordIds: [id] },
  ])
}

export async function resetWordProgress(id: string): Promise<void> {
  const now = Date.now()
  const cards = getData().cards.filter((c) => c.wordId === id)
  void commit([{ type: 'put', collection: 'cards', docs: cards.map((c) => resetCard(c, now)) }])
}

/** Tạo thẻ còn thiếu cho mọi từ, ví dụ sau khi bật thêm kiểu thẻ hoặc nhập dữ liệu. Chờ đến khi đã lưu lên server. */
export async function ensureCardsForAllWords(): Promise<number> {
  const { words, cards } = getData()
  const { enabledCardTypes } = getSettings()
  const byWord = new Map<string, CardRecord[]>()
  for (const c of cards) byWord.set(c.wordId, [...(byWord.get(c.wordId) ?? []), c])
  const now = Date.now()
  const toAdd = words.flatMap((w) => missingCards(w, byWord.get(w.id) ?? [], enabledCardTypes, now))
  await commit([{ type: 'put', collection: 'cards', docs: toAdd }])
  return toAdd.length
}

export async function findWordsByTerm(term: string): Promise<Word[]> {
  const q = term.trim().toLowerCase()
  if (!q) return []
  return getData().words.filter((w) => w.term.toLowerCase() === q)
}

/**
 * Đổi tên một nhãn trên mọi từ đang dùng nó. Tên mới trùng một nhãn khác thì hai nhãn được gộp làm một.
 * Chờ đến khi dữ liệu đã lưu lên server, trả về số từ bị ảnh hưởng.
 */
export async function renameTag(from: string, to: string): Promise<number> {
  const target = to.trim()
  if (!from || !target || target === from) return 0
  const { words } = getData()
  // Trùng tên một nhãn đã có (không phân biệt hoa thường) thì lấy đúng cách viết của nhãn đó,
  // tránh để lại hai nhãn chỉ khác chữ hoa như "Academic" và "academic"
  const existing = words.flatMap((w) => w.tags).find((t) => t !== from && t.toLowerCase() === target.toLowerCase())
  const name = existing ?? target
  const now = Date.now()
  const docs = words
    .filter((w) => w.tags.includes(from))
    .map((w) => ({ ...w, tags: uniq(w.tags.map((t) => (t === from ? name : t))), updatedAt: now }))
  await commit([{ type: 'put', collection: 'words', docs }])
  return docs.length
}

/**
 * Bỏ một nhãn khỏi mọi từ đang mang nó. Từ vựng vẫn giữ nguyên, chỉ mất nhãn.
 * Chờ đến khi dữ liệu đã lưu lên server, trả về số từ bị ảnh hưởng.
 */
export async function deleteTag(tag: string): Promise<number> {
  if (!tag) return 0
  const now = Date.now()
  const docs = getData()
    .words.filter((w) => w.tags.includes(tag))
    .map((w) => ({ ...w, tags: w.tags.filter((t) => t !== tag), updatedAt: now }))
  await commit([{ type: 'put', collection: 'words', docs }])
  return docs.length
}

/**
 * Thêm một hoặc nhiều nhãn cho các từ đã chọn. Từ nào đã có sẵn nhãn đó thì bỏ qua.
 * Chờ đến khi dữ liệu đã lưu lên server, trả về số từ thực sự thay đổi.
 */
export async function addTagsToWords(wordIds: string[], tags: string[]): Promise<number> {
  const names = uniq(tags.map((t) => t.trim()).filter(Boolean))
  if (wordIds.length === 0 || names.length === 0) return 0
  const { words } = getData()
  // Dùng lại đúng cách viết của nhãn đã có để không sinh ra "IELTS" và "ielts" song song
  const spelling = new Map(words.flatMap((w) => w.tags).map((t) => [t.toLowerCase(), t]))
  const adding = uniq(names.map((t) => spelling.get(t.toLowerCase()) ?? t))
  const ids = new Set(wordIds)
  const now = Date.now()
  const docs: Word[] = []
  for (const word of words) {
    if (!ids.has(word.id)) continue
    const merged = uniq([...word.tags, ...adding])
    if (merged.length === word.tags.length) continue
    docs.push({ ...word, tags: merged, updatedAt: now })
  }
  await commit([{ type: 'put', collection: 'words', docs }])
  return docs.length
}
