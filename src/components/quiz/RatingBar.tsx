import { Rating, type Grade } from 'ts-fsrs'
import { hasModifier, isActivatingControl, isTypingInField, useKeydown } from '../../hooks/useKeydown'
import { cn } from '../../lib/cn'
import { formatDuration } from '../../lib/date'
import { GRADE_LABELS } from '../../lib/labels'
import { GRADES } from '../../lib/srs'

const GRADE_STYLES: Record<Grade, { dot: string; text: string; active: string }> = {
  [Rating.Again]: {
    dot: 'bg-critical',
    text: 'text-critical-ink',
    active: 'border-critical/60 bg-critical-wash ring-critical/15',
  },
  [Rating.Hard]: {
    dot: 'bg-warning',
    text: 'text-warning-ink',
    active: 'border-warning/60 bg-warning-wash ring-warning/15',
  },
  [Rating.Good]: {
    dot: 'bg-good',
    text: 'text-good-ink',
    active: 'border-good/60 bg-good-wash ring-good/15',
  },
  [Rating.Easy]: {
    dot: 'bg-state-new',
    text: 'text-state-new',
    active: 'border-state-new/60 bg-state-new/10 ring-state-new/15',
  },
}

export function RatingBar({
  intervals,
  suggested,
  onRate,
  disabled,
}: {
  intervals: Record<Grade, number>
  suggested: Grade | null
  onRate: (grade: Grade) => void
  disabled?: boolean
}) {
  const fallback = suggested ?? Rating.Good

  useKeydown((e) => {
    if (disabled || isTypingInField(e) || hasModifier(e)) return
    const n = Number(e.key)
    if (n >= 1 && n <= 4) {
      e.preventDefault()
      onRate(n as Grade)
    } else if ((e.key === 'Enter' || e.key === ' ') && !isActivatingControl(e)) {
      e.preventDefault()
      onRate(fallback)
    }
  })

  return (
    <div className="animate-fade-up space-y-3 pt-1">
      <p className="text-center text-[13px] font-medium text-ink-2">Bạn nhớ từ này thế nào?</p>
      <div className="grid grid-cols-4 gap-2 sm:gap-3" role="group" aria-label="Bạn nhớ từ này thế nào?">
        {GRADES.map((grade) => {
          const style = GRADE_STYLES[grade]
          const isFallback = grade === fallback
          return (
            <button
              key={grade}
              type="button"
              disabled={disabled}
              onClick={() => onRate(grade)}
              className={cn(
                'group flex flex-col items-center gap-1 rounded-2xl border px-1 pt-3 pb-2.5 shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-float active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 sm:pt-3.5 sm:pb-3',
                isFallback ? cn('ring-4', style.active) : 'border-line bg-surface hover:border-line-strong',
              )}
            >
              <span className="flex items-center gap-1.5">
                <span aria-hidden className={cn('size-2 rounded-full', style.dot)} />
                <span className={cn('text-[15px] font-semibold sm:text-base', isFallback ? style.text : 'text-ink')}>
                  {GRADE_LABELS[grade]}
                </span>
              </span>
              <span className="text-xs text-ink-2 tabular-nums">{formatDuration(intervals[grade])}</span>
              <kbd className="mt-0.5 hidden rounded border border-line px-1.5 font-sans text-[10px] font-semibold text-muted sm:block">
                {grade}
              </kbd>
            </button>
          )
        })}
      </div>
      <p className="hidden text-center text-xs text-muted sm:block">
        Phím <strong className="font-semibold text-ink-2">1–4</strong> để chọn ·{' '}
        <strong className="font-semibold text-ink-2">Enter</strong> chọn “{GRADE_LABELS[fallback]}”
      </p>
    </div>
  )
}
