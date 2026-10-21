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

const DISMISS_KEY = 'vocab-streak-connect-dismissed'

function readDismissed(): string {
  try {
    return localStorage.getItem(DISMISS_KEY) ?? ''
  } catch {
    return ''
  }
}

/**
 * Cho dùng mạng để bù khoảng trống gần nhất:
 * - chuỗi vừa đứt (chưa học lại): báo gián đoạn, nhắc ngay;
 * - đã học lại được một chuỗi mới: gợi ý nối chuỗi trước đó vào, có thể bỏ qua.
 */
export function StreakRestoreCard({ streak }: { streak: StreakState }) {
  const [saving, setSaving] = useState(false)
  const [dismissed, setDismissed] = useState(readDismissed)
  const missed = streak.missedDays
  if (missed.length === 0) return null

  const enough = streak.lives >= missed.length
  const broken = streak.current === 0
  const gapKey = missed.join(',')
  // Đang giữ chuỗi mới thì chỉ gợi ý khi đủ mạng và chưa bấm "Để sau" cho khoảng trống này
  if (!broken && (!enough || dismissed === gapKey)) return null

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

  const later = () => {
    try {
      localStorage.setItem(DISMISS_KEY, gapKey)
    } catch {
      // Không lưu được thì lần sau vẫn hiện lại
    }
    setDismissed(gapKey)
  }

  const warn = broken && enough

  return (
    <section
      className={cn(
        'animate-fade-up rounded-2xl border p-4 sm:p-5',
        warn ? 'border-warning/30 bg-warning-wash' : 'border-line bg-surface',
      )}
    >
      <div className="flex items-start gap-3">
        <IconChip tone={broken ? (enough ? 'amber' : 'neutral') : 'rose'} className={warn ? 'bg-surface' : undefined}>
          {broken ? <HeartCrack /> : <Heart />}
        </IconChip>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-ink">
            {broken
              ? `Chuỗi ${streak.restorableStreak} ngày đang bị gián đoạn`
              : `Nối lại chuỗi ${streak.previousStreak} ngày trước đó?`}
          </h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
            {broken ? (
              <>
                Bạn chưa học ngày {dates}.{' '}
                {enough
                  ? `Dùng ${missed.length} mạng để nối lại chuỗi ${streak.restorableStreak} ngày.`
                  : `Cần ${missed.length} mạng để nối lại, bạn đang có ${streak.lives}. Học đều 15 ngày liên tục sẽ được thêm 1 mạng.`}
              </>
            ) : (
              <>
                Bạn đã bỏ lỡ ngày {dates} trước chuỗi {streak.current} ngày hiện tại. Dùng {missed.length} mạng bù
                {missed.length > 1 ? ' các ngày đó' : ' ngày đó'} để gộp thành chuỗi{' '}
                <strong className="font-semibold text-ink">{streak.restorableStreak} ngày</strong>.
              </>
            )}
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm" onClick={restore} disabled={!enough || saving}>
              {saving ? <Spinner /> : <Heart className="size-4" />} Dùng {missed.length} mạng khôi phục
            </Button>
            {!broken && (
              <Button variant="ghost" size="sm" onClick={later} disabled={saving}>
                Để sau
              </Button>
            )}
            <StreakLives lives={streak.lives} />
          </div>
        </div>
      </div>
    </section>
  )
}
