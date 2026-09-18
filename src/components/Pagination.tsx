import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/cn'
import { Button } from './ui'

type PageItem = number | 'gap-start' | 'gap-end'

/** Luôn trả về tối đa 7 ô để thanh phân trang không co giãn: 1 … 4 5 6 … 20 */
function pageItems(page: number, pageCount: number): PageItem[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  let start = Math.max(2, page - 1)
  let end = Math.min(pageCount - 1, page + 1)
  if (page <= 4) {
    start = 2
    end = 5
  } else if (page >= pageCount - 3) {
    start = pageCount - 4
    end = pageCount - 1
  }
  const middle = Array.from({ length: end - start + 1 }, (_, i) => start + i)
  return [1, ...(start > 2 ? ['gap-start' as const] : []), ...middle, ...(end < pageCount - 1 ? ['gap-end' as const] : []), pageCount]
}

export function Pagination({
  page,
  pageCount,
  onChange,
  className,
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
  className?: string
}) {
  if (pageCount <= 1) return null
  return (
    <nav aria-label="Phân trang" className={cn('flex items-center justify-between gap-2', className)}>
      <Button variant="secondary" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Trang trước">
        <ChevronLeft className="size-4" />
        <span className="hidden sm:inline">Trước</span>
      </Button>

      <p className="text-[13px] font-medium text-ink-2 tabular-nums sm:hidden">
        Trang <span className="text-ink">{page}</span> / {pageCount}
      </p>

      <ul className="hidden items-center gap-1 sm:flex">
        {pageItems(page, pageCount).map((item) =>
          typeof item === 'number' ? (
            <li key={item}>
              <button
                type="button"
                onClick={() => onChange(item)}
                aria-label={`Trang ${item}`}
                aria-current={item === page ? 'page' : undefined}
                className={cn(
                  'flex h-8.5 min-w-8.5 items-center justify-center rounded-lg px-2 text-[13px] font-semibold tabular-nums transition-colors',
                  item === page ? 'bg-accent text-accent-fg shadow-button' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                )}
              >
                {item}
              </button>
            </li>
          ) : (
            <li key={item} aria-hidden className="flex w-6 justify-center text-muted">
              …
            </li>
          ),
        )}
      </ul>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Trang sau"
      >
        <span className="hidden sm:inline">Sau</span>
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  )
}
