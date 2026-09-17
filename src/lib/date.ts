export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

/** Ngày học mới bắt đầu lúc 4 giờ sáng: ôn lúc 1 giờ đêm vẫn tính cho hôm trước (giống Anki). */
export const DAY_START_HOUR = 4

export function startOfStudyDay(ts: number): number {
  const d = new Date(ts)
  if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1)
  d.setHours(DAY_START_HOUR, 0, 0, 0)
  return d.getTime()
}

export function endOfStudyDay(ts: number): number {
  const d = new Date(startOfStudyDay(ts))
  d.setDate(d.getDate() + 1)
  return d.getTime()
}

function formatKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Khóa ngày học dạng YYYY-MM-DD */
export function dayKey(ts: number): string {
  return formatKey(new Date(startOfStudyDay(ts)))
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function shiftDayKey(key: string, days: number): string {
  const d = parseDayKey(key)
  d.setDate(d.getDate() + days)
  return formatKey(d)
}

/** Số ngày học giữa hai mốc thời gian (b - a) */
export function studyDaysBetween(a: number, b: number): number {
  return Math.round((startOfStudyDay(b) - startOfStudyDay(a)) / DAY)
}

const oneDecimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

/** "10 phút", "3 ngày", "1,5 tháng" */
export function formatDuration(ms: number): string {
  if (ms < MINUTE) return '< 1 phút'
  if (ms < HOUR) return `${Math.round(ms / MINUTE)} phút`
  if (ms < DAY) return `${Math.round(ms / HOUR)} giờ`
  const days = ms / DAY
  if (days < 30) return `${Math.round(days)} ngày`
  if (days < 365) return `${oneDecimal.format(days / 30)} tháng`
  return `${oneDecimal.format(days / 365)} năm`
}

/** Thời điểm đến hạn so với hiện tại: "Đến hạn", "Hôm nay", "Ngày mai", "5 ngày nữa" */
export function formatDue(due: number, now: number): string {
  if (due <= now) return 'Đến hạn'
  const days = studyDaysBetween(now, due)
  if (days <= 0) return `${formatDuration(due - now)} nữa`
  if (days === 1) return 'Ngày mai'
  return `${formatDuration(days * DAY)} nữa`
}

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })

export function formatDate(ts: number): string {
  return dateFormatter.format(ts)
}
