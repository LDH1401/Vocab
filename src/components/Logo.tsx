import { cn } from '../lib/cn'

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative flex size-9 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-button',
        className,
      )}
    >
      <svg viewBox="0 0 40 40" fill="none" aria-hidden className="size-5.5">
        <path
          d="M8 12.5s4-1.8 12 1.8c8-3.6 12-1.8 12-1.8V30s-4-1.8-12 1.8C12 28.2 8 30 8 30V12.5Z"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path d="M20 14.3v17.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="31" cy="8" r="3" fill="currentColor" opacity="0.7" />
      </svg>
    </span>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-[1.375rem] leading-none font-semibold tracking-tight text-ink">Vocab</span>
    </span>
  )
}
