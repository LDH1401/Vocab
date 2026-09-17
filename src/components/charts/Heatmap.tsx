import { useState, type KeyboardEvent } from 'react'
import { useElementWidth } from '../../hooks/useElementWidth'
import { parseDayKey, shiftDayKey } from '../../lib/date'
import { ChartTooltip } from './Tooltip'

const CELL = 12
const GAP = 3
const STEP = CELL + GAP
const LEFT = 28
const TOP = 18
const LEVEL_COLORS = ['var(--heat-0)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)']
const ROW_LABELS: Record<number, string> = { 0: 'T2', 2: 'T4', 4: 'T6' }

const longDate = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })
const numberFormat = new Intl.NumberFormat('vi-VN')

interface Cell {
  key: string
  col: number
  row: number
  count: number
}

/** Lịch hoạt động kiểu GitHub: mỗi ô một ngày, đậm hơn là học nhiều hơn. Số tuần tự co theo bề rộng. */
export function ActivityHeatmap({ counts, today, unit }: { counts: Map<string, number>; today: string; unit: string }) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const weeks = Math.max(4, Math.min(53, Math.floor((width - LEFT + GAP) / STEP)))
  const mondayIndex = (parseDayKey(today).getDay() + 6) % 7
  const start = shiftDayKey(today, -mondayIndex - (weeks - 1) * 7)

  const cells: Cell[] = []
  for (let col = 0; col < weeks; col++) {
    for (let row = 0; row < 7; row++) {
      const key = shiftDayKey(start, col * 7 + row)
      if (key > today) break
      cells.push({ key, col, row, count: counts.get(key) ?? 0 })
    }
  }

  // Mốc đậm nhất lấy ở phân vị 95 để một ngày học rất nhiều không làm các ngày khác nhạt hết
  const nonZero = cells
    .map((c) => c.count)
    .filter((c) => c > 0)
    .sort((a, b) => a - b)
  const cap = nonZero.length > 0 ? nonZero[Math.floor(0.95 * (nonZero.length - 1))] : 1
  const level = (count: number) => (count === 0 ? 0 : Math.min(4, Math.ceil((4 * count) / cap)))

  const monthLabels: { col: number; text: string }[] = []
  for (let col = 0; col < weeks; col++) {
    const month = parseDayKey(shiftDayKey(start, col * 7)).getMonth()
    const prevMonth = col === 0 ? -1 : parseDayKey(shiftDayKey(start, (col - 1) * 7)).getMonth()
    const lastLabel = monthLabels.at(-1)
    if (month !== prevMonth && (!lastLabel || col - lastLabel.col >= 3)) monthLabels.push({ col, text: `Th${month + 1}` })
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const last = cells.length - 1
    const current = active ?? last
    const delta: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }
    let next: number | null = e.key in delta ? current + delta[e.key] : null
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = last
    if (next === null) return
    e.preventDefault()
    setActive(Math.max(0, Math.min(last, next)))
  }

  const svgWidth = LEFT + weeks * STEP
  const svgHeight = TOP + 7 * STEP
  const activeCell = active !== null ? cells[active] : undefined

  return (
    <div>
      <div ref={ref} className="relative" onPointerLeave={() => setActive(null)}>
        {width > 0 && (
          <svg
            width={svgWidth}
            height={svgHeight}
            role="img"
            aria-label={`Lịch hoạt động ${weeks} tuần gần nhất`}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onFocus={() => setActive((a) => a ?? cells.length - 1)}
            onBlur={() => setActive(null)}
            className="block"
          >
            {monthLabels.map((m) => (
              <text key={m.col} x={LEFT + m.col * STEP} y={11} fill="var(--muted)" fontSize={11}>
                {m.text}
              </text>
            ))}
            {Object.entries(ROW_LABELS).map(([row, text]) => (
              <text key={row} x={0} y={TOP + Number(row) * STEP + CELL - 2} fill="var(--muted)" fontSize={10}>
                {text}
              </text>
            ))}
            {cells.map((cell, i) => (
              <rect
                key={cell.key}
                x={LEFT + cell.col * STEP}
                y={TOP + cell.row * STEP}
                width={CELL}
                height={CELL}
                rx={3}
                fill={LEVEL_COLORS[level(cell.count)]}
                stroke={active === i ? 'var(--ink)' : 'none'}
                strokeWidth={active === i ? 1.5 : 0}
                onPointerEnter={() => setActive(i)}
                onPointerDown={() => setActive(i)}
              />
            ))}
          </svg>
        )}
        {activeCell && (
          <ChartTooltip
            x={LEFT + activeCell.col * STEP + CELL / 2}
            y={TOP + activeCell.row * STEP}
            containerWidth={Math.max(width, svgWidth)}
            value={`${numberFormat.format(activeCell.count)} ${unit}`}
            label={longDate.format(parseDayKey(activeCell.key))}
          />
        )}
      </div>
      <div className="mt-4 flex items-center justify-end gap-1.5 text-xs text-muted" aria-hidden>
        Ít
        {LEVEL_COLORS.map((color) => (
          <span key={color} className="size-3 rounded-[3px]" style={{ background: color }} />
        ))}
        Nhiều
      </div>
    </div>
  )
}
