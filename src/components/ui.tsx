import { ChevronDown, LoaderCircle } from 'lucide-react'
import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { WordStatus } from '../lib/srs'
import { STATUS_LABELS } from '../lib/labels'
import { cn } from '../lib/cn'
import { buttonClass, fieldClass, type ButtonSize, type ButtonVariant } from './styles'

type ButtonStyleProps = { variant?: ButtonVariant; size?: ButtonSize }

export function Button({ variant, size, className, type = 'button', ...props }: ComponentProps<'button'> & ButtonStyleProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & ButtonStyleProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />
}

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('rounded-2xl border border-line bg-surface shadow-card', className)} {...props} />
}

export type ChipTone = 'accent' | 'amber' | 'sky' | 'violet' | 'rose' | 'teal' | 'neutral'

const CHIP_TONES: Record<ChipTone, string> = {
  accent: 'bg-accent-wash text-accent-ink',
  amber: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  sky: 'bg-sky-500/12 text-sky-600 dark:text-sky-400',
  violet: 'bg-violet-500/12 text-violet-600 dark:text-violet-400',
  rose: 'bg-rose-500/12 text-rose-600 dark:text-rose-400',
  teal: 'bg-teal-500/12 text-teal-600 dark:text-teal-400',
  neutral: 'bg-surface-2 text-ink-2',
}

/** Ô vuông bo góc chứa biểu tượng, tô màu nhạt theo tông */
export function IconChip({
  tone = 'accent',
  size = 'md',
  className,
  children,
}: {
  tone?: ChipTone
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children: ReactNode
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        size === 'sm' && 'size-7 rounded-lg [&_svg]:size-4',
        size === 'md' && 'size-9 rounded-xl [&_svg]:size-4.5',
        size === 'lg' && 'size-12 rounded-2xl [&_svg]:size-6',
        CHIP_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Tiêu đề của một khối nội dung: biểu tượng, tên và mô tả ngắn */
export function SectionHeader({
  icon,
  tone,
  title,
  description,
  actions,
  className,
}: {
  icon?: ReactNode
  tone?: ChipTone
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      {icon && <IconChip tone={tone}>{icon}</IconChip>}
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] leading-6 font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Badge({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-line bg-surface-2 px-1.5 py-px text-[11px] font-medium text-ink-2',
        className,
      )}
      {...props}
    />
  )
}

const STATUS_DOT: Record<WordStatus, string> = {
  new: 'bg-state-new',
  learning: 'bg-state-learning',
  mature: 'bg-state-mature',
}

/** Nhãn trạng thái học của từ: chấm màu và chữ */
export function StatusPill({ status, className }: { status: WordStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink-2',
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', STATUS_DOT[status])} />
      {STATUS_LABELS[status]}
    </span>
  )
}

export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'hidden min-w-5 rounded-md border border-current/20 px-1.5 py-px text-center font-sans text-[11px] font-semibold opacity-70 sm:inline-block',
        className,
      )}
      {...props}
    />
  )
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden className={cn('size-4 animate-spin', className)} />
}

export function PageSpinner() {
  return (
    <div className="flex justify-center py-24 text-accent-ink">
      <Spinner className="size-7" />
    </div>
  )
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldClass, 'h-11 text-sm', className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldClass, 'min-h-24 py-2.5 text-sm leading-relaxed', className)} {...props} />
}

/** className áp dụng cho khung bao ngoài để điều chỉnh độ rộng */
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <div className={cn('relative', className)}>
      <select className={cn(fieldClass, 'h-11 cursor-pointer appearance-none pr-9 text-sm font-medium')} {...props} />
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
      />
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
  className,
  htmlFor,
}: {
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
  className?: string
  htmlFor?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  )
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: ReactNode }[]
  label: string
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex gap-0.5 rounded-xl border border-line bg-surface-2 p-1', className)}
    >
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-lg px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-all duration-150',
            o.value === value
              ? 'bg-surface text-ink shadow-card ring-1 ring-line'
              : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className={cn('flex items-start justify-between gap-4', disabled && 'opacity-60')}>
      <label htmlFor={id} className="min-w-0 cursor-pointer select-none">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-2">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-10.5 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-accent' : 'bg-surface-3 ring-1 ring-line-strong ring-inset',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked && 'translate-x-4.5',
          )}
        />
      </button>
    </div>
  )
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-float backdrop:bg-black/50 backdrop:backdrop-blur-[2px] open:animate-fade-up"
    >
      {open && (
        <div>
          <div className="px-6 pt-6">
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink">{title}</h2>
            <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink-2">{children}</div>
          </div>
          {footer && (
            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-line bg-surface-2/60 px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold tracking-wide text-accent-ink uppercase">{eyebrow}</p>}
        <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-tight text-ink sm:text-[2.125rem]">
          {title}
        </h1>
        {description && <p className="mt-1.5 text-sm text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  children,
  actions,
}: {
  icon?: ReactNode
  title: ReactNode
  children?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface/50 px-6 py-14 text-center">
      {icon && (
        <div className="relative mb-5">
          <div aria-hidden className="absolute -inset-3 rounded-[1.75rem] bg-accent-wash" />
          <div className="relative flex size-16 items-center justify-center rounded-2xl border border-line bg-surface text-accent-ink shadow-card [&_svg]:size-7">
            {icon}
          </div>
        </div>
      )}
      <p className="font-display text-xl font-semibold text-ink">{title}</p>
      {children && <div className="mt-2 max-w-md text-sm leading-relaxed text-ink-2">{children}</div>}
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-2.5">{actions}</div>}
    </div>
  )
}
