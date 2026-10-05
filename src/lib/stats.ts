import { Rating, State } from 'ts-fsrs'
import type { ReviewRecord } from '../db/types'
import { dayKey } from './date'

export function countByDay(timestamps: Iterable<number>): Map<string, number> {
  const counts = new Map<string, number>()
  for (const ts of timestamps) {
    const key = dayKey(ts)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/**
 * Tỉ lệ nhớ thực tế: trong các lượt ôn thẻ đã qua giai đoạn học (state Review),
 * bao nhiêu lượt không bấm "Quên".
 */
export function trueRetention(reviews: ReviewRecord[], since: number): { total: number; passed: number } {
  let total = 0
  let passed = 0
  for (const r of reviews) {
    if (r.reviewedAt < since || r.state !== State.Review) continue
    total++
    if (r.rating !== Rating.Again) passed++
  }
  return { total, passed }
}
