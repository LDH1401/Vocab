import { Rating, State } from 'ts-fsrs'
import type { ReviewRecord } from '../db/types'
import { dayKey, shiftDayKey } from './date'

export function countByDay(timestamps: Iterable<number>): Map<string, number> {
  const counts = new Map<string, number>()
  for (const ts of timestamps) {
    const key = dayKey(ts)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/**
 * Chuỗi ngày học liên tiếp. Hôm nay chưa học thì chuỗi vẫn tính đến hôm qua
 * (chỉ mất chuỗi khi bỏ trọn một ngày).
 */
export function computeStreak(activeDays: Set<string>, today: string): { current: number; longest: number } {
  let current = 0
  let cursor = activeDays.has(today) ? today : shiftDayKey(today, -1)
  while (activeDays.has(cursor)) {
    current++
    cursor = shiftDayKey(cursor, -1)
  }

  let longest = 0
  for (const day of activeDays) {
    if (activeDays.has(shiftDayKey(day, -1))) continue
    let length = 0
    let d = day
    while (activeDays.has(d)) {
      length++
      d = shiftDayKey(d, 1)
    }
    longest = Math.max(longest, length)
  }
  return { current, longest }
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
