import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { IconChip, type ChipTone } from '../ui'

export function StatTile({
  label,
  value,
  detail,
  icon,
  tone = 'accent',
  className,
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  icon?: ReactNode
  tone?: ChipTone
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="pt-1 text-[13px] leading-tight font-medium text-ink-2">{label}</p>
        {icon && (
          <IconChip tone={tone} size="sm">
            {icon}
          </IconChip>
        )}
      </div>
      <p className="mt-3 font-display text-[1.75rem] leading-none font-semibold tracking-tight text-ink tabular-nums sm:text-[2rem]">
        {value}
      </p>
      {detail && <div className="mt-2 text-xs leading-snug text-muted">{detail}</div>}
    </div>
  )
}
