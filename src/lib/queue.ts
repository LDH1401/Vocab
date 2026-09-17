import { State } from 'ts-fsrs'
import type { CardRecord, CardType } from '../db/types'
import { endOfStudyDay, MINUTE } from './date'
import { shuffle } from './random'
import { isShortTerm } from './srs'

/** Khi hết thẻ khác, thẻ đang học đến hạn trong khoảng này được đưa lên luôn (giống Anki) */
export const LEARN_AHEAD_MS = 20 * MINUTE

const TYPE_ORDER: Record<CardType, number> = { meaning: 0, spelling: 1, cloze: 2, dictation: 3 }

export interface SessionQueue {
  /** Thẻ ôn tập và thẻ mới chưa làm trong phiên */
  main: CardRecord[]
  /** Thẻ đang ở bước học ngắn, sắp xếp theo thời điểm đến hạn */
  learning: CardRecord[]
}

export interface QueueOptions {
  now: number
  enabledTypes: readonly CardType[]
  /** Số thẻ mới còn được học hôm nay */
  newLimit: number
  /** Thứ tự thêm từ (id -> thứ hạng), chỉ chứa các từ còn tồn tại */
  wordOrder: Map<string, number>
  random?: () => number
}

const byDue = (a: CardRecord, b: CardRecord) => a.due - b.due

/** Trộn đều hai danh sách, giữ thứ tự trong từng danh sách */
function interleave<T>(a: T[], b: T[]): T[] {
  return [
    ...a.map((item, i) => ({ item, pos: (i + 0.5) / a.length })),
    ...b.map((item, i) => ({ item, pos: (i + 0.5) / b.length })),
  ]
    .sort((x, y) => x.pos - y.pos)
    .map((x) => x.item)
}

export function buildQueue(cards: CardRecord[], opts: QueueOptions): SessionQueue {
  const { now, wordOrder } = opts
  const random = opts.random ?? Math.random
  const enabled = new Set(opts.enabledTypes)
  const dayEnd = endOfStudyDay(now)
  const usable = cards.filter((c) => enabled.has(c.type) && wordOrder.has(c.wordId))

  const learning = usable.filter((c) => isShortTerm(c) && c.due < dayEnd).sort(byDue)
  const reviews = shuffle(
    usable.filter((c) => c.state === State.Review && c.due < dayEnd),
    random,
  )

  // Không giới thiệu thẻ mới của một từ khi từ đó đã có thẻ khác trong phiên:
  // vừa thấy nghĩa xong mà phải gõ lại từ ngay thì quá dễ.
  const busyWords = new Set([...learning, ...reviews].map((c) => c.wordId))
  const candidates = usable
    .filter((c) => c.state === State.New)
    .sort(
      (a, b) =>
        wordOrder.get(a.wordId)! - wordOrder.get(b.wordId)! ||
        TYPE_ORDER[a.type] - TYPE_ORDER[b.type] ||
        a.createdAt - b.createdAt,
    )
  const newCards: CardRecord[] = []
  for (const card of candidates) {
    if (newCards.length >= opts.newLimit) break
    if (busyWords.has(card.wordId)) continue
    busyWords.add(card.wordId)
    newCards.push(card)
  }

  return { main: interleave(reviews, newCards), learning }
}

export function pickNext(queue: SessionQueue, now: number, lastWordId: string | null): CardRecord | null {
  const firstLearning = queue.learning[0]
  if (firstLearning && firstLearning.due <= now) return firstLearning
  if (queue.main.length > 0) {
    // Tránh hai thẻ của cùng một từ đứng liền nhau
    return queue.main.find((c) => c.wordId !== lastWordId) ?? queue.main[0]
  }
  if (firstLearning && firstLearning.due <= now + LEARN_AHEAD_MS) return firstLearning
  return null
}

export function afterAnswer(queue: SessionQueue, answered: CardRecord, updated: CardRecord, now: number): SessionQueue {
  const main = queue.main.filter((c) => c.id !== answered.id)
  const learning = queue.learning.filter((c) => c.id !== answered.id)
  if (isShortTerm(updated) && updated.due < endOfStudyDay(now)) {
    learning.push(updated)
    learning.sort(byDue)
  }
  return { main, learning }
}

export interface QueueCounts {
  newCount: number
  learningCount: number
  reviewCount: number
}

export function countQueue(queue: SessionQueue): QueueCounts {
  const all = [...queue.main, ...queue.learning]
  return {
    newCount: all.filter((c) => c.state === State.New).length,
    learningCount: all.filter(isShortTerm).length,
    reviewCount: all.filter((c) => c.state === State.Review).length,
  }
}
