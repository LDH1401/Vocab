import { X } from 'lucide-react'
import { useId, useState, type KeyboardEvent } from 'react'
import { cn } from '../lib/cn'
import { uniq } from '../lib/text'
import { fieldClass } from './styles'

/** Ô nhập danh sách (tag, từ đồng nghĩa): Enter hoặc dấu phẩy để thêm, Backspace để xóa mục cuối */
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
  const listId = useId()

  const commit = (raw: string) => {
    const items = raw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (items.length > 0) onChange(uniq([...value, ...items]))
    setDraft('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(draft)
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div
      className={cn(fieldClass, 'flex min-h-11 flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15')}
    >
      {value.map((item) => (
        <span key={item} className="inline-flex animate-pop items-center gap-0.5 rounded-lg bg-accent-wash py-0.5 pr-0.5 pl-2 text-[13px] font-medium text-accent-ink">
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
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        list={suggestions.length > 0 ? listId : undefined}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="h-7 min-w-24 flex-1 bg-transparent px-1.5 text-sm text-ink outline-none placeholder:text-muted"
      />
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions
            .filter((s) => !value.includes(s))
            .map((s) => (
              <option key={s} value={s} />
            ))}
        </datalist>
      )}
    </div>
  )
}
