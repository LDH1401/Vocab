import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function QuestionCard({ prompt, children, className }: { prompt: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        'relative animate-fade-up overflow-hidden rounded-3xl border border-line bg-surface px-5 pt-6 pb-8 shadow-float sm:px-10 sm:pt-7 sm:pb-10',
        className,
      )}
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-accent-wash to-transparent" />
      <p className="relative mb-7 flex justify-center">
        <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-2 shadow-card">
          {prompt}
        </span>
      </p>
      <div className="relative">{children}</div>
    </section>
  )
}
