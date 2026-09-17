import { CloudAlert, CloudCheck, CloudUpload } from 'lucide-react'
import { useSyncStatus } from '../db/store'
import { cn } from '../lib/cn'

const STATUS = {
  saved: { Icon: CloudCheck, label: 'Đã lưu lên MongoDB', className: 'text-muted' },
  saving: { Icon: CloudUpload, label: 'Đang lưu…', className: 'text-accent-ink' },
  error: { Icon: CloudAlert, label: 'Lỗi lưu dữ liệu', className: 'text-critical-ink' },
}

/** Trạng thái đồng bộ với server. compact: chỉ hiện biểu tượng (thanh trên của điện thoại). */
export function SyncIndicator({ compact = false, className }: { compact?: boolean; className?: string }) {
  const status = useSyncStatus()
  const { Icon, label, className: tone } = STATUS[status]
  return (
    <span
      role="status"
      title={label}
      className={cn('inline-flex items-center gap-1.5 text-xs font-medium', tone, className)}
    >
      <Icon aria-hidden className={cn('size-4', status === 'saving' && 'animate-pulse')} />
      <span className={compact ? 'sr-only' : undefined}>{label}</span>
    </span>
  )
}
