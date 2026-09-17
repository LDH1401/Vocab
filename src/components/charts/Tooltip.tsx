import type { ReactNode } from 'react'

/** Chú thích nổi: giá trị in đậm trước, nhãn sau. x, y là tọa độ điểm neo trong khung cha (relative). */
export function ChartTooltip({
  x,
  y,
  containerWidth,
  value,
  label,
}: {
  x: number
  y: number
  containerWidth: number
  value: ReactNode
  label: ReactNode
}) {
  const width = 168
  const left = Math.max(0, Math.min(containerWidth - width, x - width / 2))
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute z-10 animate-fade-in rounded-xl border border-line bg-surface px-3 py-2 text-left shadow-float"
      style={{ left, top: y, width, transform: 'translateY(calc(-100% - 8px))' }}
    >
      <p className="text-sm font-semibold text-ink tabular-nums">{value}</p>
      <p className="text-xs text-ink-2">{label}</p>
    </div>
  )
}
