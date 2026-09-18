import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { foldText } from '../lib/text'
import { FloatingPanel } from './Floating'
import { fieldClass } from './styles'

export interface SelectOption<T extends string | number> {
  value: T
  label: string
  /** Dòng phụ bên dưới nhãn trong danh sách, cũng hiện mờ trên nút khi được chọn */
  description?: string
  /** Chữ nhỏ canh phải trong danh sách, ví dụ số từ của một nhãn */
  meta?: string
  icon?: ReactNode
}

const TYPEAHEAD_RESET_MS = 600

/**
 * Hộp chọn thả xuống theo mẫu "select-only combobox" của WAI-ARIA:
 * tiêu điểm luôn ở nút, mục đang trỏ tới được báo qua aria-activedescendant.
 */
export function Select<T extends string | number>({
  value,
  onChange,
  options,
  id,
  placeholder = 'Chọn…',
  disabled,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}: {
  value: T
  onChange: (value: T) => void
  options: SelectOption<T>[]
  id?: string
  placeholder?: string
  disabled?: boolean
  size?: 'md' | 'sm'
  /** Áp dụng cho nút, dùng để chỉnh độ rộng */
  className?: string
  'aria-label'?: string
}) {
  const listId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const typeahead = useRef({ text: '', timer: 0 })
  const pointer = useRef({ x: -1, y: -1 })

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = options[selectedIndex]
  const optionId = (index: number) => `${listId}-${index}`

  const openList = (index = selectedIndex) => {
    if (disabled || options.length === 0) return
    setActive(Math.max(0, index))
    setOpen(true)
  }

  const choose = (index: number) => {
    const option = options[index]
    setOpen(false)
    if (option && option.value !== value) onChange(option.value)
  }

  // Đóng khi bấm ra ngoài
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Giữ mục đang trỏ tới trong vùng nhìn thấy. Tự cuộn khung danh sách thay vì scrollIntoView để trang không bị giật.
  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current
      const item = document.getElementById(`${listId}-${active}`)
      if (!panel || !item) return
      const top = item.offsetTop - 4
      const bottom = item.offsetTop + item.offsetHeight + 4
      if (top < panel.scrollTop) panel.scrollTop = top
      else if (bottom > panel.scrollTop + panel.clientHeight) panel.scrollTop = bottom - panel.clientHeight
    })
    return () => cancelAnimationFrame(frame)
  }, [open, active, listId])

  useEffect(() => () => window.clearTimeout(typeahead.current.timer), [])

  /** Gõ chữ để nhảy tới mục bắt đầu bằng các chữ đó (không phân biệt dấu) */
  const findByTyping = (key: string): number => {
    const state = typeahead.current
    window.clearTimeout(state.timer)
    state.text += foldText(key)
    state.timer = window.setTimeout(() => (state.text = ''), TYPEAHEAD_RESET_MS)
    const from = open ? active : Math.max(0, selectedIndex)
    // Gõ lặp một chữ thì đi vòng qua các mục cùng chữ cái đầu
    const repeated = state.text.length > 1 && [...state.text].every((c) => c === state.text[0])
    const query = repeated ? state.text[0] : state.text
    const start = repeated || state.text.length === 1 ? from + 1 : from
    for (let i = 0; i < options.length; i++) {
      const index = (start + i) % options.length
      if (foldText(options[index].label).startsWith(query)) return index
    }
    return -1
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList(e.key === 'ArrowUp' && selectedIndex < 0 ? last : selectedIndex)
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const index = findByTyping(e.key)
        if (index >= 0) openList(index)
      }
      return
    }
    const move = (index: number) => {
      e.preventDefault()
      setActive(Math.max(0, Math.min(last, index)))
    }
    switch (e.key) {
      case 'ArrowDown':
        return move(active + 1)
      case 'ArrowUp':
        if (e.altKey) {
          e.preventDefault()
          return choose(active)
        }
        return move(active - 1)
      case 'Home':
        return move(0)
      case 'End':
        return move(last)
      case 'PageDown':
        return move(active + 8)
      case 'PageUp':
        return move(active - 8)
      case 'Enter':
      case ' ':
        e.preventDefault()
        return choose(active)
      case 'Escape':
        // Không để Esc đóng luôn hộp thoại chứa ô chọn
        e.preventDefault()
        e.stopPropagation()
        return setOpen(false)
      case 'Tab':
        return setOpen(false)
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const index = findByTyping(e.key)
          if (index >= 0) setActive(index)
        }
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? optionId(active) : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          fieldClass,
          'flex cursor-pointer items-center gap-2 text-left',
          size === 'md' ? 'h-11 pr-3 pl-3.5 text-sm' : 'h-9 pr-2.5 pl-3 text-[13px]',
          open && 'border-accent ring-4 ring-accent/15',
          className,
        )}
      >
        {selected?.icon && <span className="shrink-0 text-muted [&_svg]:size-4">{selected.icon}</span>}
        <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <span className={cn('truncate font-medium', !selected && 'text-muted')}>{selected?.label ?? placeholder}</span>
          {selected?.description && (
            <span className="hidden min-w-0 truncate text-xs text-muted sm:inline">{selected.description}</span>
          )}
        </span>
        <ChevronDown
          aria-hidden
          className={cn('size-4 shrink-0 text-muted transition-transform duration-200', open && 'rotate-180 text-accent-ink')}
        />
      </button>

      <FloatingPanel
        anchorRef={triggerRef}
        panelRef={panelRef}
        open={open}
        minWidth={200}
        // Giữ tiêu điểm ở nút khi bấm vào danh sách hoặc thanh cuộn
        onMouseDown={(e) => e.preventDefault()}
      >
        <ul id={listId} role="listbox" aria-label={ariaLabel} aria-labelledby={ariaLabel ? undefined : id}>
          {options.map((option, index) => {
            const isSelected = index === selectedIndex
            return (
              <li
                key={String(option.value)}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                onPointerMove={(e) => {
                  // Chrome phát sự kiện di chuột giả khi danh sách vẽ lại dưới con trỏ đứng yên:
                  // bỏ qua để con trỏ không giành mất mục đang chọn bằng bàn phím
                  if (e.clientX === pointer.current.x && e.clientY === pointer.current.y) return
                  pointer.current = { x: e.clientX, y: e.clientY }
                  if (active !== index) setActive(index)
                }}
                onClick={() => choose(index)}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors duration-75',
                  index === active && 'bg-surface-2',
                  isSelected ? 'text-accent-ink' : 'text-ink',
                )}
              >
                {option.icon && (
                  <span className={cn('shrink-0 [&_svg]:size-4', isSelected ? 'text-accent-ink' : 'text-muted')}>
                    {option.icon}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate', isSelected ? 'font-semibold' : 'font-medium')}>
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="mt-0.5 block text-xs leading-snug text-muted">{option.description}</span>
                  )}
                </span>
                {option.meta && <span className="shrink-0 text-xs text-muted tabular-nums">{option.meta}</span>}
                <Check aria-hidden className={cn('size-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
              </li>
            )
          })}
        </ul>
      </FloatingPanel>
    </>
  )
}
