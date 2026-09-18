import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEventHandler,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/cn'

const GAP = 6
const VIEWPORT_MARGIN = 8
const MIN_HEIGHT = 120

interface Position {
  left: number
  width: number
  maxHeight: number
  top?: number
  bottom?: number
  placement: 'bottom' | 'top'
}

/**
 * Khung nổi bám theo một phần tử (ô chọn, ô nhập): mở xuống dưới, tự lật lên trên khi gần đáy màn hình.
 * Render qua portal để không bị cắt bởi khung cha có overflow, và vào trong <dialog> nếu phần tử nằm trong đó.
 */
export function FloatingPanel({
  anchorRef,
  panelRef,
  open,
  maxHeight = 320,
  minWidth = 0,
  className,
  onMouseDown,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>
  panelRef?: RefObject<HTMLDivElement | null>
  open: boolean
  maxHeight?: number
  minWidth?: number
  className?: string
  onMouseDown?: MouseEventHandler<HTMLDivElement>
  children: ReactNode
}) {
  const ownRef = useRef<HTMLDivElement>(null)
  const ref = panelRef ?? ownRef
  const [position, setPosition] = useState<Position | null>(null)
  const [container, setContainer] = useState<Element | null>(null)

  // Vào trong <dialog> nếu phần tử neo nằm trong đó, để khung nổi không bị hộp thoại (top layer) che mất
  useLayoutEffect(() => {
    if (open) setContainer(anchorRef.current?.closest('dialog') ?? document.body)
  }, [open, anchorRef])

  useLayoutEffect(() => {
    if (!open || !container) return
    let frame = 0
    const update = () => {
      const anchor = anchorRef.current
      const panel = ref.current
      if (!anchor || !panel) return
      const rect = anchor.getBoundingClientRect()
      const viewportWidth = document.documentElement.clientWidth
      const viewportHeight = window.innerHeight
      const needed = Math.min(maxHeight, panel.scrollHeight)
      const below = viewportHeight - rect.bottom - GAP - VIEWPORT_MARGIN
      const above = rect.top - GAP - VIEWPORT_MARGIN
      const placement = below >= needed || below >= above ? 'bottom' : 'top'
      const width = Math.min(Math.max(rect.width, minWidth), viewportWidth - 2 * VIEWPORT_MARGIN)
      setPosition({
        placement,
        width,
        left: Math.min(Math.max(VIEWPORT_MARGIN, rect.left), viewportWidth - width - VIEWPORT_MARGIN),
        maxHeight: Math.max(MIN_HEIGHT, Math.min(maxHeight, placement === 'bottom' ? below : above)),
        top: placement === 'bottom' ? rect.bottom + GAP : undefined,
        bottom: placement === 'top' ? viewportHeight - rect.top + GAP : undefined,
      })
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    update()
    // Nội dung đổi kích thước (ví dụ lọc gợi ý) thì tính lại chỗ đặt
    const observer = new ResizeObserver(schedule)
    if (ref.current?.firstElementChild) observer.observe(ref.current.firstElementChild)
    window.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
    }
  }, [open, container, anchorRef, ref, maxHeight, minWidth])

  if (!open || !container) return null

  const style: CSSProperties = position
    ? {
        position: 'fixed',
        left: position.left,
        width: position.width,
        top: position.top,
        bottom: position.bottom,
        maxHeight: position.maxHeight,
        transformOrigin: position.placement === 'bottom' ? 'top' : 'bottom',
      }
    : { position: 'fixed', top: 0, left: 0, maxHeight, visibility: 'hidden' }

  return createPortal(
    <div
      ref={ref}
      style={style}
      data-placement={position?.placement}
      onMouseDown={onMouseDown}
      className={cn(
        'z-50 overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-1 shadow-float animate-dropdown',
        className,
      )}
    >
      {children}
    </div>,
    container,
  )
}
