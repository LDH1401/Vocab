import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react'
import { diffAnswer, type DiffPart, type Verdict } from '../../lib/answer'
import { cn } from '../../lib/cn'

const PART_CLASS: Record<DiffPart['kind'], string> = {
  same: '',
  wrong: 'rounded-sm bg-critical-wash text-critical-ink font-bold underline decoration-critical decoration-2 px-0.5',
  extra: 'rounded-sm bg-critical-wash text-critical-ink line-through px-0.5',
  missing: 'rounded-sm bg-good-wash text-good-ink font-bold underline decoration-good decoration-2 px-0.5',
}

function DiffLine({ label, parts }: { label: string; parts: DiffPart[] }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
      <span className="w-20 shrink-0 text-xs font-medium text-muted">{label}</span>
      <span className="font-mono text-base tracking-wide text-ink">
        {parts.map((part, i) => (
          <span key={i} className={PART_CLASS[part.kind]}>
            {part.text.replace(/ /g, ' ')}
          </span>
        ))}
      </span>
    </p>
  )
}

const HEADLINE: Record<Verdict, { text: string; className: string; iconClass: string; Icon: typeof CircleCheck }> = {
  correct: {
    text: 'Chính xác!',
    className: 'border-good/30 bg-good-wash',
    iconClass: 'text-good-ink',
    Icon: CircleCheck,
  },
  close: {
    text: 'Gần đúng — kiểm tra lại chính tả',
    className: 'border-warning/35 bg-warning-wash',
    iconClass: 'text-warning-ink',
    Icon: TriangleAlert,
  },
  wrong: {
    text: 'Chưa chính xác',
    className: 'border-critical/30 bg-critical-wash',
    iconClass: 'text-critical-ink',
    Icon: CircleX,
  },
}

export function AnswerFeedback({
  verdict,
  typed,
  expected,
  note,
}: {
  verdict: Verdict
  typed: string
  expected: string
  note?: string
}) {
  const { text, className, iconClass, Icon } = HEADLINE[verdict]
  const showDiff = verdict !== 'correct' && typed.trim() !== ''
  const diff = showDiff ? diffAnswer(typed, expected) : null

  return (
    <div role="status" className={cn('animate-fade-up space-y-3 rounded-2xl border px-4 py-3.5', className)}>
      <p className="flex items-center gap-2 font-semibold text-ink">
        <Icon aria-hidden className={cn('size-5 animate-pop', iconClass)} />
        <span>{text}</span>
      </p>

      {diff ? (
        <div className="space-y-1.5 rounded-xl border border-line bg-surface px-3.5 py-3">
          <DiffLine label="Bạn gõ" parts={diff.typed} />
          <DiffLine label="Đáp án" parts={diff.expected} />
        </div>
      ) : (
        verdict !== 'correct' && (
          <p className="text-sm text-ink-2">
            Đáp án đúng: <span className="font-mono text-base font-bold text-ink">{expected}</span>
          </p>
        )
      )}

      {note && <p className="text-[13px] text-ink-2 italic">{note}</p>}
    </div>
  )
}
