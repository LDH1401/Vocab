const numberFormat = new Intl.NumberFormat('vi-VN')

export interface Segment {
  key: string
  label: string
  value: number
  color: string
}

/** Thanh tỉ lệ các phần của một tổng, chú giải kèm số liệu ngay bên dưới */
export function StackedBar({ segments, label }: { segments: Segment[]; label: string }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const visible = segments.filter((s) => s.value > 0)
  return (
    <div>
      <div role="img" aria-label={label} className="flex h-3 w-full gap-[3px] overflow-hidden rounded-full">
        {total === 0 ? (
          <div className="h-full w-full bg-grid" />
        ) : (
          visible.map((s) => (
            <div key={s.key} className="h-full min-w-1" style={{ flex: `${s.value} 1 0`, background: s.color }} />
          ))
        )}
      </div>
      <ul className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-sm">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="text-ink-2">{s.label}</span>
            <span className="ml-auto font-semibold text-ink tabular-nums">{numberFormat.format(s.value)}</span>
            <span className="w-10 text-right text-xs text-muted tabular-nums">
              {total > 0 ? `${Math.round((s.value / total) * 100)}%` : '–'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
