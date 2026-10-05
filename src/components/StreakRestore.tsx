import { Heart, HeartCrack } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { restoreStreak } from '../db/settings'
import { errorMessage } from '../lib/api'
import { cn } from '../lib/cn'
import { parseDayKey } from '../lib/date'
import { MAX_LIVES, type StreakState } from '../lib/streak'
import { Button, IconChip, Spinner } from './ui'

const dayFormat = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'numeric' })

/** Số mạng đang có, hiện dưới dạng trái tim */
export function StreakLives({ lives, className }: { lives: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} title={`${lives}/${MAX_LIVES} mạng`}>
      {Array.from({ length: MAX_LIVES }, (_, i) => (
        <Heart
          key={i}
          aria-hidden
          className={cn('size-3.5', i < lives ? 'fill-critical text-critical' : 'text-line-strong')}
        />
      ))}
      <span className="sr-only">
        {lives} trên {MAX_LIVES} mạng
      </span>
    </span>
  )
}

/** Báo chuỗi bị đứt và cho dùng mạng để nối lại */
export function StreakRestoreCard({ streak }: { streak: StreakState }) {
  const [saving, setSaving] = useState(false)
  const missed = streak.missedDays
  if (missed.length === 0) return null

  const enough = streak.lives >= missed.length
  const dates = missed.map((d) => dayFormat.format(parseDayKey(d))).join(', ')

  const restore = async () => {
    setSaving(true)
    try {
      await restoreStreak(missed)
      toast.success(`Đã khôi phục chuỗi ${streak.restorableStreak} ngày.`, {
        description: `Dùng ${missed.length} mạng để bù ngày ${dates}.`,
      })
    } catch (err) {
      toast.error('Không khôi phục được chuỗi', { description: errorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className={cn(
        'animate-fade-up rounded-2xl border p-4 sm:p-5',
        enough ? 'border-warning/30 bg-warning-wash' : 'border-line bg-surface',
      )}
    >
      <div className="flex items-start gap-3">
        <IconChip tone={enough ? 'amber' : 'neutral'} className={enough ? 'bg-surface' : undefined}>
          <HeartCrack />
        </IconChip>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-ink">
            Chuỗi {streak.restorableStreak} ngày đang bị gián đoạn
          </h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
            Bạn chưa học ngày {dates}.{' '}
            {enough
              ? `Dùng ${missed.length} mạng để nối lại chuỗi ${streak.restorableStreak} ngày.`
              : `Cần ${missed.length} mạng để nối lại, bạn đang có ${streak.lives}. Học đều 15 ngày liên tục sẽ được thêm 1 mạng.`}
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm" onClick={restore} disabled={!enough || saving}>
              {saving ? <Spinner /> : <Heart className="size-4" />} Dùng {missed.length} mạng khôi phục
            </Button>
            <StreakLives lives={streak.lives} />
          </div>
        </div>
      </div>
    </section>
  )
}
