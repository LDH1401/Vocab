import { CornerDownLeft, Tag, X } from 'lucide-react'
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../lib/cn'
import { foldText, uniq } from '../lib/text'
import { FloatingPanel } from './Floating'
import { fieldClass } from './styles'

const MAX_SUGGESTIONS = 8

/**
 * Ô nhập danh sách (tag, từ đồng nghĩa): Enter hoặc dấu phẩy để thêm, Backspace để xóa mục cuối.
 * Có gợi ý thì hiện danh sách thả xuống, chọn bằng chuột hoặc ↑ ↓ Enter.
 */
export function TagInput({
  id,
  value,
  onChange,
  suggestions = [],
  placeholder,
}: {
  id?: string
  value: string[]
  onChange: (value: string[]) => void
  suggestions?: string[]
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const listId = useId()
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pointer = useRef({ x: -1, y: -1 })

  const matches = useMemo(() => {
    const taken = new Set(value.map((v) => v.toLowerCase()))
    const query = foldText(draft.trim())
    return suggestions
      .filter((s) => !taken.has(s.toLowerCase()) && foldText(s).includes(query))
      .sort((a, b) => Number(!foldText(a).startsWith(query)) - Number(!foldText(b).startsWith(query)))
      .slice(0, MAX_SUGGESTIONS)
  }, [suggestions, value, draft])

  const showList = open && matches.length > 0
  const draftIsNew = draft.trim() !== '' && !suggestions.some((s) => s.toLowerCase() === draft.trim().toLowerCase())

  const commit = (raw: string) => {
    const items = raw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (items.length > 0) onChange(uniq([...value, ...items]))
    setDraft('')
    setActive(-1)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'ArrowDown' && matches.length > 0) {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(matches.length - 1, i + 1))
    } else if (e.key === 'ArrowUp' && showList) {
      e.preventDefault()
      setActive((i) => Math.max(-1, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commit(showList && active >= 0 ? matches[active] : draft)
    } else if (e.key === ',') {
      e.preventDefault()
      commit(draft)
    } else if (e.key === 'Escape' && showList) {
      // Không để Esc đóng luôn hộp thoại chứa ô nhập
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <>
      <div
        ref={boxRef}
        // Bấm vào khoảng trống trong khung cũng đưa con trỏ vào ô nhập
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault()
            inputRef.current?.focus()
          }
        }}
        className={cn(
          fieldClass,
          'flex min-h-11 cursor-text flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15',
        )}
      >
        {value.map((item) => (
          <span
            key={item}
            className="inline-flex animate-pop items-center gap-0.5 rounded-lg bg-accent-wash py-0.5 pr-0.5 pl-2 text-[13px] font-medium text-accent-ink"
          >
            {item}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== item))}
              aria-label={`Bỏ ${item}`}
              className="rounded-md p-0.5 opacity-70 hover:bg-accent/15 hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            commit(draft)
            setOpen(false)
          }}
          role={suggestions.length > 0 ? 'combobox' : undefined}
          aria-autocomplete={suggestions.length > 0 ? 'list' : undefined}
          aria-expanded={suggestions.length > 0 ? showList : undefined}
          aria-controls={showList ? listId : undefined}
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          placeholder={value.length === 0 ? placeholder : undefined}
          className="h-7 min-w-24 flex-1 bg-transparent px-1.5 text-sm text-ink outline-none placeholder:text-muted"
        />
      </div>

      <FloatingPanel
        anchorRef={boxRef}
        open={showList}
        maxHeight={300}
        className="max-w-80"
        // Giữ tiêu điểm ở ô nhập khi bấm chọn gợi ý
        onMouseDown={(e) => e.preventDefault()}
      >
        <div>
          <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">Nhãn đã dùng</p>
          <ul id={listId} role="listbox" aria-label="Gợi ý nhãn">
            {matches.map((suggestion, index) => (
              <li
                key={suggestion}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onPointerMove={(e) => {
                  // Bỏ qua sự kiện di chuột giả khi con trỏ đứng yên (xem Select.tsx)
                  if (e.clientX === pointer.current.x && e.clientY === pointer.current.y) return
                  pointer.current = { x: e.clientX, y: e.clientY }
                  if (active !== index) setActive(index)
                }}
                onClick={() => commit(suggestion)}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink transition-colors duration-75',
                  index === active && 'bg-surface-2',
                )}
              >
                <Tag aria-hidden className="size-3.5 shrink-0 text-muted" />
                <span className="truncate">{suggestion}</span>
              </li>
            ))}
          </ul>
          {draftIsNew && (
            <p className="mt-1 flex items-center gap-1.5 border-t border-line px-2.5 pt-2 pb-1.5 text-xs text-muted">
              <CornerDownLeft className="size-3.5" /> Enter để thêm nhãn mới “{draft.trim()}”
            </p>
          )}
        </div>
      </FloatingPanel>
    </>
  )
}
