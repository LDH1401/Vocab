import { ChartColumn, Table } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '../ui'

/** Khung biểu đồ: tiêu đề, và nút chuyển sang dạng bảng để đọc chính xác từng giá trị */
export function ChartCard({
  title,
  subtitle,
  children,
  table,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  table?: ReactNode
}) {
  const [showTable, setShowTable] = useState(false)
  return (
    <figure className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <figcaption className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{subtitle}</p>}
        </figcaption>
        {table && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
            className="-mt-1 -mr-2"
          >
            {showTable ? <ChartColumn className="size-4" /> : <Table className="size-4" />}
            {showTable ? 'Biểu đồ' : 'Bảng'}
          </Button>
        )}
      </div>
      <div className="mt-5">{showTable ? table : children}</div>
    </figure>
  )
}

export function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-ink-2">Chưa có dữ liệu.</p>
  return (
    <div className="max-h-80 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-line text-left text-xs text-muted">
            {headers.map((h, i) => (
              <th key={h} scope="col" className={i > 0 ? 'py-2 text-right font-semibold' : 'py-2 font-semibold'}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-b border-line last:border-0">
              {row.map((cell, i) => (
                <td key={i} className={i > 0 ? 'py-2 text-right text-ink tabular-nums' : 'py-2 text-ink-2'}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
