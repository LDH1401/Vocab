import { Snail, Volume2 } from 'lucide-react'
import type { MouseEvent } from 'react'
import type { Settings } from '../db/types'
import { cn } from '../lib/cn'
import { pronounce } from '../lib/speech'
import { buttonClass } from './styles'

export function SpeakButton({
  text,
  audioUrl = '',
  settings,
  slow = false,
  size = 'icon-sm',
  className,
  label,
}: {
  text: string
  audioUrl?: string
  settings: Settings
  slow?: boolean
  size?: 'icon-sm' | 'icon'
  className?: string
  label?: string
}) {
  const Icon = slow ? Snail : Volume2
  const onClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    void pronounce({ term: text, audioUrl }, settings, slow)
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label ?? (slow ? `Đọc chậm: ${text}` : `Đọc: ${text}`)}
      title={slow ? 'Đọc chậm' : 'Phát âm'}
      className={cn(buttonClass('ghost', size), 'text-ink-2', className)}
    >
      <Icon className={size === 'icon' ? 'size-5' : 'size-4'} />
    </button>
  )
}
