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
  /**
   * Khoảng trống gần nhất trước chuỗi hiện tại (tối đa 3 ngày). Bù đủ các ngày này là nối được
   * chuỗi trước đó vào chuỗi hiện tại. Rỗng nếu không có gì để nối.
   */
  missedDays: string[]
  /** Chuỗi trước khoảng trống */
  previousStreak: number
  /** Chuỗi sẽ có được nếu bù hết missedDays */
  restorableStreak: number
}

/**
 * Tính chuỗi ngày học và số mạng bằng cách chạy lại toàn bộ lịch sử theo thứ tự thời gian:
 * mỗi 15 ngày học liên tục được 1 mạng (tối đa 3), mỗi lần bù tiêu 1 mạng vào đúng ngày bấm khôi phục.
 * Nhờ vậy số mạng luôn suy ra được từ dữ liệu, không cần cộng trừ và lưu riêng.
 *
 * @param activeDays ngày có ôn tập hoặc luyện tập
 * @param frozenDays ngày đã được bù bằng mạng
 * @param usedOn ngày bù → ngày bấm khôi phục (bản ghi cũ không có thì coi như dùng ngay ngày đó)
 */
export function computeStreakState(
  activeDays: Set<string>,
  frozenDays: Set<string>,
  today: string,
  usedOn: Record<string, string> = {},
): StreakState {
  const covered = (day: string) => activeDays.has(day) || frozenDays.has(day)
  const days = [...activeDays, ...frozenDays].sort()
  if (days.length === 0) {
    return { current: 0, longest: 0, lives: 0, daysToNextLife: DAYS_PER_LIFE, missedDays: [], previousStreak: 0, restorableStreak: 0 }
  }

  const spentOn = new Map<string, number>()
  for (const day of frozenDays) {
    const when = usedOn[day] ?? day
    spentOn.set(when, (spentOn.get(when) ?? 0) + 1)
  }

  let lives = 0
  // Ngày bù giữ cho chuỗi không đứt nhưng không được tính vào 15 ngày học để lấy mạng mới
  let studyRun = 0
  let run = 0
  let longest = 0

  for (let day = days[0]; day <= today; day = shiftDayKey(day, 1)) {
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
    lives -= spentOn.get(day) ?? 0
  }

  const chainEndingAt = (end: string) => {
    let length = 0
    for (let d = end; covered(d); d = shiftDayKey(d, -1)) length++
    return length
  }

  // Hôm nay chưa học thì chuỗi vẫn tính đến hôm qua, chỉ mất chuỗi khi bỏ trọn một ngày
  const anchor = covered(today) ? today : shiftDayKey(today, -1)
  const current = chainEndingAt(anchor)

  // Lùi qua chuỗi hiện tại để tới khoảng trống gần nhất rồi gom các ngày trống
  let day = shiftDayKey(anchor, -current)
  const gap: string[] = []
  while (!covered(day) && day > days[0] && gap.length <= MAX_LIVES) {
    gap.push(day)
    day = shiftDayKey(day, -1)
  }
  const restorable = covered(day) && gap.length > 0 && gap.length <= MAX_LIVES
  const previousStreak = restorable ? chainEndingAt(day) : 0

  return {
    current,
    longest,
    lives: Math.max(0, lives),
    daysToNextLife: lives >= MAX_LIVES ? 0 : DAYS_PER_LIFE - (studyRun % DAYS_PER_LIFE),
    missedDays: restorable ? gap.reverse() : [],
    previousStreak,
    restorableStreak: restorable ? previousStreak + gap.length + current : 0,
  }
}
