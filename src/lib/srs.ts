import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card,
  type FSRS,
  type Grade,
} from 'ts-fsrs'
import type { CardRecord, CardType, FsrsState, ReviewRecord } from '../db/types'
import { DAY } from './date'
import { newId } from './id'

/** Thẻ có độ ổn định từ 21 ngày trở lên được coi là "đã thuộc" (giống Anki) */
export const MATURE_DAYS = 21

export const GRADES = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const

const schedulers = new Map<number, FSRS>()

function scheduler(requestRetention: number): FSRS {
  let f = schedulers.get(requestRetention)
  if (!f) {
    f = fsrs(generatorParameters({ request_retention: requestRetention, enable_fuzz: true }))
    schedulers.set(requestRetention, f)
  }
  return f
}

function toCard(s: FsrsState): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsed_days,
    scheduled_days: s.scheduled_days,
    learning_steps: s.learning_steps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.last_review === null ? undefined : new Date(s.last_review),
  }
}

function fromCard(c: Card): FsrsState {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? c.last_review.getTime() : null,
  }
}

export function createCard(wordId: string, type: CardType, now: number): CardRecord {
  return { id: newId(), wordId, type, createdAt: now, ...fromCard(createEmptyCard(now)) }
}

export function resetCard(card: CardRecord, now: number): CardRecord {
  return { ...card, ...fromCard(createEmptyCard(now)) }
}

export function gradeCard(
  card: CardRecord,
  grade: Grade,
  now: number,
  requestRetention: number,
  durationMs: number,
): { updated: CardRecord; review: ReviewRecord } {
  const { card: next, log } = scheduler(requestRetention).next(toCard(card), now, grade)
  return {
    updated: { ...card, ...fromCard(next) },
    review: {
      id: newId(),
      cardId: card.id,
      wordId: card.wordId,
      cardType: card.type,
      rating: grade,
      state: log.state,
      stability: log.stability,
      difficulty: log.difficulty,
      elapsed_days: log.elapsed_days,
      scheduled_days: log.scheduled_days,
      reviewedAt: now,
      durationMs,
    },
  }
}

/** Khoảng thời gian (ms) tới lần ôn sau cho từng mức đánh giá, để hiện trên nút */
export function previewIntervals(card: CardRecord, now: number, requestRetention: number): Record<Grade, number> {
  const preview = scheduler(requestRetention).repeat(toCard(card), now)
  const interval = (grade: Grade) => {
    const next = preview[grade].card
    return next.scheduled_days >= 1 ? next.scheduled_days * DAY : next.due.getTime() - now
  }
  return {
    [Rating.Again]: interval(Rating.Again),
    [Rating.Hard]: interval(Rating.Hard),
    [Rating.Good]: interval(Rating.Good),
    [Rating.Easy]: interval(Rating.Easy),
  }
}

/** Thẻ đang trong các bước học ngắn (tính bằng phút) */
export function isShortTerm(card: FsrsState): boolean {
  return card.state === State.Learning || card.state === State.Relearning
}

export function isMature(card: FsrsState): boolean {
  return card.state === State.Review && card.stability >= MATURE_DAYS
}

export type WordStatus = 'new' | 'learning' | 'mature'

export function wordStatus(cards: FsrsState[]): WordStatus {
  if (cards.every((c) => c.state === State.New)) return 'new'
  if (cards.every(isMature)) return 'mature'
  return 'learning'
}
