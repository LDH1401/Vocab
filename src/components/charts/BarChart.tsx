import { useState, type KeyboardEvent } from 'react'
import { useElementWidth } from '../../hooks/useElementWidth'
import { niceMax } from '../../lib/chartScale'
import { ChartTooltip } from './Tooltip'

export interface BarDatum {
  key: string
  value: number
  tooltipLabel: string
  /** Nhãn trục hoành, chỉ đặt cho vài cột để khỏi chồng chữ */
  axisLabel?: string
}

const numberFormat = new Intl.NumberFormat('vi-VN')

/** Cột bo góc 4px ở đầu, vuông ở đường gốc */
function columnPath(x: number, base: number, width: number, height: number): string {
  const r = Math.min(4, width / 2, height)
  const top = base - height
  return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + width - r}Q${x + width},${top} ${x + width},${top + r}V${base}Z`
}

const PAD_LEFT = 36
const PAD_TOP = 12
const PAD_BOTTOM = 24

export function BarChart({
  data,
  label,
  unit,
  height = 180,
}: {
  data: BarDatum[]
  label: string
  unit: string
  height?: number
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  const plotWidth = Math.max(0, width - PAD_LEFT)
  const plotHeight = height - PAD_TOP - PAD_BOTTOM
  const band = data.length > 0 ? plotWidth / data.length : 0
  const barWidth = Math.max(1, Math.min(24, band - 2))
  const y = (v: number) => PAD_TOP + plotHeight - (v / max) * plotHeight
  const baseline = PAD_TOP + plotHeight

  const onKeyDown = (e: KeyboardEvent) => {
    const last = data.length - 1
    const current = active ?? last
    const next =
      e.key === 'ArrowLeft' ? current - 1 : e.key === 'ArrowRight' ? current + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? last : null
    if (next === null) return
    e.preventDefault()
    setActive(Math.max(0, Math.min(last, next)))
  }

  const activeDatum = active !== null ? data[active] : undefined

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setActive(null)}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onFocus={() => setActive((a) => a ?? data.length - 1)}
          onBlur={() => setActive(null)}
          className="block"
        >
          {[0, max / 2, max].map((tick) => (
            <g key={tick}>
              <line
                x1={PAD_LEFT}
                x2={width}
                y1={y(tick)}
                y2={y(tick)}
                stroke={tick === 0 ? 'var(--axis)' : 'var(--grid)'}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text x={PAD_LEFT - 8} y={y(tick)} dy="0.32em" textAnchor="end" fill="var(--muted)" fontSize={11} className="tabular-nums">
                {numberFormat.format(tick)}
              </text>
            </g>
          ))}

          {active !== null && (
            <rect x={PAD_LEFT + active * band} y={PAD_TOP} width={band} height={plotHeight} fill="var(--accent-wash)" />
          )}

          {data.map((d, i) => {
            const h = (d.value / max) * plotHeight
            return h > 0 ? (
              <path key={d.key} d={columnPath(PAD_LEFT + i * band + (band - barWidth) / 2, baseline, barWidth, h)} fill="var(--bar)" />
            ) : null
          })}

          {data.map((d, i) =>
            d.axisLabel ? (
              <text
                key={`label-${d.key}`}
                x={i === 0 ? PAD_LEFT + i * band : i === data.length - 1 ? PAD_LEFT + (i + 1) * band : PAD_LEFT + (i + 0.5) * band}
                y={height - 6}
                textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
                fill="var(--muted)"
                fontSize={11}
              >
                {d.axisLabel}
              </text>
            ) : null,
          )}

          {/* Vùng nhận chuột cao hết khung, rộng bằng cả dải cột */}
          {data.map((d, i) => (
            <rect
              key={`hit-${d.key}`}
              x={PAD_LEFT + i * band}
              y={0}
              width={band}
              height={height}
              fill="transparent"
              onPointerEnter={() => setActive(i)}
              onPointerDown={() => setActive(i)}
            />
          ))}
        </svg>
      )}
      {activeDatum && active !== null && (
        <ChartTooltip
          x={PAD_LEFT + (active + 0.5) * band}
          y={y(activeDatum.value)}
          containerWidth={width}
          value={`${numberFormat.format(activeDatum.value)} ${unit}`}
          label={activeDatum.tooltipLabel}
        />
      )}
    </div>
  )
}
