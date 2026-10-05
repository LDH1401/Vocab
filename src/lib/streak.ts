import { shiftDayKey } from './date'

/** Học liên tục đủ 15 ngày thì được 1 mạng, giữ tối đa 3 mạng */
export const DAYS_PER_LIFE = 15
export const MAX_LIVES = 3

export interface StreakState {
  /** Chuỗi ngày hiện tại, tính cả những ngày đã bù bằng mạng */
  current: number
  longest: number
  /** Số mạng đang có */
  lives: number
  /** Còn bao nhiêu ngày học liên tục nữa thì được thêm 1 mạng (0 khi đã đủ 3 mạng) */
  daysToNextLife: number
  /** Những ngày bị bỏ lỡ giữa ngày học gần nhất và hôm nay — bù đủ các ngày này là nối lại được chuỗi */
  missedDays: string[]
  /** Chuỗi sẽ có được nếu bù hết missedDays */
  restorableStreak: number
}

/**
 * Tính chuỗi ngày học và số mạng bằng cách chạy lại toàn bộ lịch sử theo thứ tự thời gian:
 * mỗi 15 ngày học liên tục được 1 mạng (tối đa 3), mỗi ngày đã bù tiêu 1 mạng.
 * Nhờ vậy số mạng luôn suy ra được từ dữ liệu, không cần cộng trừ và lưu riêng.
 *
 * @param activeDays ngày có ôn tập hoặc luyện tập
 * @param frozenDays ngày đã dùng mạng để bù
 */
export function computeStreakState(activeDays: Set<string>, frozenDays: Set<string>, today: string): StreakState {
  const covered = (day: string) => activeDays.has(day) || frozenDays.has(day)
  const days = [...activeDays, ...frozenDays].sort()
  const empty: StreakState = {
    current: 0,
    longest: 0,
    lives: 0,
    daysToNextLife: DAYS_PER_LIFE,
    missedDays: [],
    restorableStreak: 0,
  }
  if (days.length === 0) return empty

  let lives = 0
  // Ngày bù giữ cho chuỗi không đứt nhưng không được tính vào 15 ngày học để lấy mạng mới
  let studyRun = 0
  let run = 0
  let longest = 0

  for (let day = days[0]; day <= today; day = shiftDayKey(day, 1)) {
    if (frozenDays.has(day)) lives--
    if (covered(day)) {
      run++
      longest = Math.max(longest, run)
      if (activeDays.has(day)) {
        studyRun++
        if (studyRun % DAYS_PER_LIFE === 0) lives = Math.min(MAX_LIVES, lives + 1)
      }
    } else {
      run = 0
      studyRun = 0
    }
  }

  // Hôm nay chưa học thì chuỗi vẫn tính đến hôm qua, chỉ mất chuỗi khi bỏ trọn một ngày
  let current = 0
  let cursor = covered(today) ? today : shiftDayKey(today, -1)
  while (covered(cursor)) {
    current++
    cursor = shiftDayKey(cursor, -1)
  }

  // Các ngày trống nằm giữa ngày học gần nhất và hôm nay
  const missedDays: string[] = []
  let restorableStreak = 0
  if (current === 0 || !covered(shiftDayKey(today, -1))) {
    let day = covered(today) ? shiftDayKey(today, -1) : today
    while (!covered(day) && day > days[0] && missedDays.length < MAX_LIVES) {
      if (day !== today) missedDays.push(day)
      day = shiftDayKey(day, -1)
    }
    if (covered(day) && missedDays.length > 0) {
      let length = 0
      let back = day
      while (covered(back)) {
        length++
        back = shiftDayKey(back, -1)
      }
      restorableStreak = length + missedDays.length + (covered(today) ? 1 : 0)
    } else {
      missedDays.length = 0
    }
  }

  return {
    current,
    longest,
    lives: Math.max(0, lives),
    daysToNextLife: lives >= MAX_LIVES ? 0 : DAYS_PER_LIFE - (studyRun % DAYS_PER_LIFE),
    missedDays: missedDays.reverse(),
    restorableStreak,
  }
}
