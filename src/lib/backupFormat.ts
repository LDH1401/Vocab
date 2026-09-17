import { State } from 'ts-fsrs'
import {
  CARD_TYPES,
  type CardRecord,
  type CardType,
  type PracticeRecord,
  type ReviewRecord,
  type Settings,
  type Word,
} from '../db/types'
import { sanitizeWordInput } from './wordData'

export const BACKUP_APP = 'vocab'
export const BACKUP_VERSION = 1

export interface Backup {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  words: Word[]
  cards: CardRecord[]
  reviews: ReviewRecord[]
  practice: PracticeRecord[]
  settings: Partial<Settings> | null
}

export class BackupError extends Error {}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const id = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : null)
const isCardType = (v: unknown): v is CardType => CARD_TYPES.includes(v as CardType)
const isState = (v: unknown): v is State => v === State.New || v === State.Learning || v === State.Review || v === State.Relearning

function readWord(raw: Obj): Word | null {
  const wordId = id(raw.id)
  const input = sanitizeWordInput(raw)
  if (!wordId || !input.term || !input.meaning) return null
  const createdAt = num(raw.createdAt, Date.now())
  return { ...input, id: wordId, createdAt, updatedAt: num(raw.updatedAt, createdAt) }
}

function readCard(raw: Obj): CardRecord | null {
  const cardId = id(raw.id)
  const wordId = id(raw.wordId)
  if (!cardId || !wordId || !isCardType(raw.type) || !isState(raw.state)) return null
  return {
    id: cardId,
    wordId,
    type: raw.type,
    createdAt: num(raw.createdAt),
    due: num(raw.due),
    stability: num(raw.stability),
    difficulty: num(raw.difficulty),
    elapsed_days: num(raw.elapsed_days),
    scheduled_days: num(raw.scheduled_days),
    learning_steps: num(raw.learning_steps),
    reps: num(raw.reps),
    lapses: num(raw.lapses),
    state: raw.state,
    last_review: typeof raw.last_review === 'number' ? raw.last_review : null,
  }
}

function readReview(raw: Obj): ReviewRecord | null {
  const reviewId = id(raw.id)
  const cardId = id(raw.cardId)
  const wordId = id(raw.wordId)
  const rating = raw.rating
  if (!reviewId || !cardId || !wordId || !isCardType(raw.cardType) || !isState(raw.state)) return null
  if (rating !== 1 && rating !== 2 && rating !== 3 && rating !== 4) return null
  return {
    id: reviewId,
    cardId,
    wordId,
    cardType: raw.cardType,
    rating,
    state: raw.state,
    stability: num(raw.stability),
    difficulty: num(raw.difficulty),
    elapsed_days: num(raw.elapsed_days),
    scheduled_days: num(raw.scheduled_days),
    reviewedAt: num(raw.reviewedAt),
    durationMs: num(raw.durationMs),
  }
}

const PRACTICE_MODES = ['flip', 'choice', 'spelling', 'dictation', 'cloze']

function readPractice(raw: Obj): PracticeRecord | null {
  const recordId = id(raw.id)
  const wordId = id(raw.wordId)
  if (!recordId || !wordId || !PRACTICE_MODES.includes(raw.mode as string)) return null
  return {
    id: recordId,
    wordId,
    mode: raw.mode as PracticeRecord['mode'],
    correct: raw.correct === true,
    answeredAt: num(raw.answeredAt),
  }
}

function readList<T>(value: unknown, read: (raw: Obj) => T | null): T[] {
  if (!Array.isArray(value)) return []
  return value.filter(isObj).map(read).filter((x): x is T => x !== null)
}

/** Đọc và kiểm tra file sao lưu JSON, bỏ qua các bản ghi hỏng */
export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BackupError('File không phải JSON hợp lệ.')
  }
  if (!isObj(data) || data.app !== BACKUP_APP || !Array.isArray(data.words)) {
    throw new BackupError('Đây không phải file sao lưu của Vocab.')
  }
  if (num(data.version) > BACKUP_VERSION) {
    throw new BackupError('File sao lưu được tạo từ phiên bản mới hơn của ứng dụng.')
  }
  const words = readList(data.words, readWord)
  const wordIds = new Set(words.map((w) => w.id))
  return {
    app: BACKUP_APP,
    version: num(data.version),
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    words,
    cards: readList(data.cards, readCard).filter((c) => wordIds.has(c.wordId)),
    reviews: readList(data.reviews, readReview),
    practice: readList(data.practice, readPractice),
    settings: isObj(data.settings) ? (data.settings as Partial<Settings>) : null,
  }
}

/** Gộp hai bản của cùng một bản ghi: giữ bản sửa sau cùng */
export function newerWord(a: Word, b: Word): Word {
  return b.updatedAt > a.updatedAt ? b : a
}

export function newerCard(a: CardRecord, b: CardRecord): CardRecord {
  return (b.last_review ?? -1) > (a.last_review ?? -1) ? b : a
}
