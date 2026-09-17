import { canCloze } from '../lib/cloze'
import { newId } from '../lib/id'
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
