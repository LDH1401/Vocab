import { useEffect, useRef } from 'react'

/** Lắng nghe phím trên toàn trang. Bỏ qua phím giữ lặp lại và lúc bộ gõ tiếng Việt đang ghép chữ. */
export function useKeydown(handler: (e: KeyboardEvent) => void, enabled = true) {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => {
    if (!enabled) return
    const listener = (e: KeyboardEvent) => {
      if (e.repeat || e.isComposing) return
      ref.current(e)
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [enabled])
}

/** Đang gõ trong ô nhập liệu (ô chỉ đọc không tính) */
export function isTypingInField(e: KeyboardEvent): boolean {
  const t = e.target
  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return !t.readOnly && !t.disabled
  return t instanceof HTMLSelectElement || (t instanceof HTMLElement && t.isContentEditable)
}

/** Enter/Space trên nút hoặc liên kết đang focus: để trình duyệt tự bấm, tránh xử lý hai lần */
export function isActivatingControl(e: KeyboardEvent): boolean {
  if (e.key !== 'Enter' && e.key !== ' ') return false
  return e.target instanceof HTMLElement && e.target.closest('button, a, [role="button"], summary') !== null
}

export function hasModifier(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey || e.altKey
}
