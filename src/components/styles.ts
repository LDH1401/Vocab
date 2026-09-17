import { cn } from '../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft' | 'inverse' | 'glass'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg shadow-button hover:bg-accent-hover',
  secondary: 'border border-line bg-surface text-ink shadow-card hover:border-line-strong hover:bg-surface-2',
  soft: 'bg-accent-wash text-accent-ink hover:bg-accent/15',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'border border-critical/30 bg-surface text-critical-ink hover:border-critical/50 hover:bg-critical-wash',
  /** Dùng trên nền xanh đậm của khối hero */
  inverse: 'bg-white text-[#0b4a34] shadow-lg shadow-black/15 hover:bg-white/90',
  glass: 'bg-white/10 text-white ring-1 ring-white/20 ring-inset hover:bg-white/15',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8.5 gap-1.5 rounded-lg px-3 text-[13px]',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2 rounded-xl px-5 text-[15px]',
  icon: 'size-10 rounded-xl',
  'icon-sm': 'size-8 rounded-lg',
}

export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}

export const fieldClass =
  'w-full rounded-xl border border-line bg-surface px-3.5 text-ink shadow-card placeholder:text-muted transition-[border-color,box-shadow] duration-150 hover:border-line-strong focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:opacity-60'
