import type { Grade, State } from 'ts-fsrs'

/**
 * Mỗi từ có một thẻ cho mỗi kiểu ôn được bật, FSRS xếp lịch riêng cho từng thẻ.
 * - meaning: nhìn từ, nhớ nghĩa (lật thẻ hoặc trắc nghiệm)
 * - spelling: nhìn nghĩa, gõ lại từ
 * - dictation: nghe phát âm, gõ lại từ
 * - cloze: điền từ vào câu ví dụ
 */
export const CARD_TYPES = ['meaning', 'spelling', 'cloze', 'dictation'] as const
export type CardType = (typeof CARD_TYPES)[number]

export interface Word {
  id: string
  term: string
  meaning: string
  ipa: string
  partOfSpeech: string
  definition: string
  examples: string[]
  synonyms: string[]
  note: string
  tags: string[]
  audioUrl: string
  createdAt: number
  updatedAt: number
}

export type WordInput = Omit<Word, 'id' | 'createdAt' | 'updatedAt'>

/** Trạng thái FSRS của thẻ, thời gian lưu dạng số ms cho IndexedDB và file JSON */
export interface FsrsState {
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: State
  last_review: number | null
}

export interface CardRecord extends FsrsState {
  id: string
  wordId: string
  type: CardType
  createdAt: number
}

export interface ReviewRecord {
  id: string
  cardId: string
  wordId: string
  cardType: CardType
  rating: Grade
  /** Trạng thái của thẻ trước lần ôn này */
  state: State
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reviewedAt: number
  durationMs: number
}

export type PracticeMode = 'flip' | 'choice' | 'spelling' | 'dictation' | 'cloze'

export interface PracticeRecord {
  id: string
  wordId: string
  mode: PracticeMode
  correct: boolean
  answeredAt: number
}

export type MeaningDisplay = 'flip' | 'choice' | 'mixed'
export type Accent = 'en-US' | 'en-GB'

export interface Settings {
  id: 'app'
  enabledCardTypes: CardType[]
  newCardsPerDay: number
  requestRetention: number
  meaningDisplay: MeaningDisplay
  accent: Accent
  voiceURI: string
  speechRate: number
  preferRecordedAudio: boolean
  autoPlayAudio: boolean
}
