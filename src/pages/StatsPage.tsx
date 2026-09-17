import {
  Activity,
  Clock,
  Flame,
  GraduationCap,
  Target,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { BarChart, type BarDatum } from '../components/charts/BarChart'
import { ChartCard, DataTable } from '../components/charts/ChartCard'
import { ActivityHeatmap } from '../components/charts/Heatmap'
import { StackedBar, type Segment } from '../components/charts/StackedBar'
import { StatTile } from '../components/charts/StatTile'
import { ButtonLink, EmptyState, PageHeader } from '../components/ui'
import { useData } from '../db/store'
import type { CardRecord, Word } from '../db/types'
import {
  DAY,
  dayKey,
  formatDate,
  formatDuration,
  formatDue,
  parseDayKey,
  shiftDayKey,
} from '../lib/date'
import { STATUS_LABELS } from '../lib/labels'
import { computeStreak, countByDay, trueRetention } from '../lib/stats'
import { State } from 'ts-fsrs'

const numberFormat = new Intl.NumberFormat('vi-VN')

export default function StatsPage() {
  const data = useData()

  const now = Date.now()
  const today = dayKey(now)

  const overall = useMemo(() => {
    const { words, cards, reviews, practice } = data

    const reviewTimes = reviews.map((r) => r.reviewedAt)
    const practiceTimes = practice.map((p) => p.answeredAt)
    const activeMap = countByDay([...reviewTimes, ...practiceTimes])
    const streak = computeStreak(new Set(activeMap.keys()), today)

    const thirtyDaysAgo = now - 30 * DAY
    const retention30 = trueRetention(reviews, thirtyDaysAgo)
    const retentionAll = trueRetention(reviews, 0)

    const totalDurationMs = reviews.reduce((sum, r) => sum + (r.durationMs || 0), 0)

    return {
      totalWords: words.length,
      totalCards: cards.length,
      totalReviews: reviews.length,
      totalPractice: practice.length,
      streak,
      retention30,
      retentionAll,
      totalDurationMs,
      activeMap,
    }
  }, [data, now, today])

  const cardSegments = useMemo<Segment[]>(() => {
    let newCount = 0
    let learningCount = 0
    let matureCount = 0

    for (const c of data.cards) {
      if (c.state === State.New) newCount++
      else if (c.state === State.Review) matureCount++
      else learningCount++
    }

    return [
      { key: 'new', label: STATUS_LABELS.new, value: newCount, color: 'var(--state-new)' },
      { key: 'learning', label: STATUS_LABELS.learning, value: learningCount, color: 'var(--state-learning)' },
      { key: 'mature', label: STATUS_LABELS.mature, value: matureCount, color: 'var(--state-mature)' },
    ]
  }, [data])

  const ratingSegments = useMemo<Segment[]>(() => {
    let again = 0
    let hard = 0
    let good = 0
    let easy = 0

    for (const r of data.reviews) {
      if (r.rating === 1) again++
      else if (r.rating === 2) hard++
      else if (r.rating === 3) good++
      else if (r.rating === 4) easy++
    }

    return [
      { key: 'again', label: 'Quên (1)', value: again, color: 'var(--critical)' },
      { key: 'hard', label: 'Khó (2)', value: hard, color: 'var(--warning)' },
      { key: 'good', label: 'Được (3)', value: good, color: 'var(--good)' },
      { key: 'easy', label: 'Dễ (4)', value: easy, color: 'var(--state-new)' },
    ]
  }, [data])

  const forecastData = useMemo(() => {
    const dayCounts = new Map<string, number>()
    const startDay = today
    for (let i = 0; i < 14; i++) {
      dayCounts.set(shiftDayKey(startDay, i), 0)
    }

    for (const c of data.cards) {
      if (c.state === State.New) continue
      const dueKey = dayKey(c.due)
      if (c.due <= now) {
        dayCounts.set(today, (dayCounts.get(today) ?? 0) + 1)
      } else if (dayCounts.has(dueKey)) {
        dayCounts.set(dueKey, (dayCounts.get(dueKey) ?? 0) + 1)
      }
    }

    const chart: BarDatum[] = []
    const rows: (string | number)[][] = []
    let i = 0
    for (const [key, count] of dayCounts.entries()) {
      const date = parseDayKey(key)
      const dayLabel = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : `+${i}d`
      const fullDate = formatDate(date.getTime())
      chart.push({
        key,
        value: count,
        tooltipLabel: `${fullDate} (${dayLabel})`,
        axisLabel: (i % 3 === 0 && i < 12) || i === 13 ? dayLabel : undefined,
      })
      rows.push([`${fullDate} (${dayLabel})`, count])
      i++
    }

    return { chart, rows }
  }, [data, now, today])

  const historyData = useMemo(() => {
    const dayCounts = new Map<string, number>()
    const startDay = shiftDayKey(today, -13)
    for (let i = 0; i < 14; i++) {
      dayCounts.set(shiftDayKey(startDay, i), 0)
    }

    for (const r of data.reviews) {
      const k = dayKey(r.reviewedAt)
      if (dayCounts.has(k)) dayCounts.set(k, (dayCounts.get(k) ?? 0) + 1)
    }
    for (const p of data.practice) {
      const k = dayKey(p.answeredAt)
      if (dayCounts.has(k)) dayCounts.set(k, (dayCounts.get(k) ?? 0) + 1)
    }

    const chart: BarDatum[] = []
    const rows: (string | number)[][] = []
    let i = 0
    for (const [key, count] of dayCounts.entries()) {
      const date = parseDayKey(key)
      const dayName = i === 13 ? 'Hôm nay' : `${date.getDate()}/${date.getMonth() + 1}`
      const fullDate = formatDate(date.getTime())
      chart.push({
        key,
        value: count,
        tooltipLabel: fullDate,
        axisLabel: (i % 3 === 0 && i < 12) || i === 13 ? dayName : undefined,
      })
      rows.push([fullDate, count])
      i++
    }

    return { chart, rows }
  }, [data, today])

  const hardestWords = useMemo(() => {
    const wordMap = new Map<string, Word>(data.words.map((w) => [w.id, w]))
    const lapsesByWord = new Map<string, { totalLapses: number; cards: CardRecord[] }>()

    for (const c of data.cards) {
      const entry = lapsesByWord.get(c.wordId) ?? { totalLapses: 0, cards: [] }
      entry.totalLapses += c.lapses
      entry.cards.push(c)
      lapsesByWord.set(c.wordId, entry)
    }

    return [...lapsesByWord.entries()]
      .filter(([, entry]) => entry.totalLapses > 0)
      .sort((a, b) => b[1].totalLapses - a[1].totalLapses)
      .slice(0, 8)
      .map(([wordId, entry]) => {
        const word = wordMap.get(wordId)
        return {
          word,
          lapses: entry.totalLapses,
          nextDue: Math.min(...entry.cards.map((c) => c.due)),
        }
      })
      .filter((item): item is { word: Word; lapses: number; nextDue: number } => Boolean(item.word))
  }, [data])

  if (overall.totalWords === 0) {
    return (
      <EmptyState
        icon={<GraduationCap />}
        title="Chưa có dữ liệu thống kê"
        actions={
          <ButtonLink to="/words/new" variant="primary" size="lg">
            Thêm từ vựng đầu tiên
          </ButtonLink>
        }
      >
        Hãy thêm từ và ôn tập mỗi ngày để theo dõi tiến độ ghi nhớ và thống kê chi tiết.
      </EmptyState>
    )
  }

  const retentionPercent =
    overall.retention30.total > 0
      ? Math.round((overall.retention30.passed / overall.retention30.total) * 100)
      : overall.retentionAll.total > 0
        ? Math.round((overall.retentionAll.passed / overall.retentionAll.total) * 100)
        : null

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Thống kê học tập"
        description="Hiệu quả ghi nhớ, lịch sử ôn tập và dự báo thẻ đến hạn theo FSRS."
      />

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
        <StatTile
          label="Chuỗi ngày học"
          value={`${overall.streak.current} ngày`}
          detail={`Kỷ lục ${overall.streak.longest} ngày`}
          icon={<Flame />}
          tone="amber"
        />
        <StatTile
          label="Tỉ lệ nhớ thực tế"
          value={retentionPercent !== null ? `${retentionPercent}%` : '–'}
          detail={
            overall.retention30.total > 0
              ? 'Trong 30 ngày qua'
              : overall.retentionAll.total > 0
                ? 'Toàn bộ thời gian'
                : 'Cần ôn thêm thẻ'
          }
          icon={<Target />}
          tone="accent"
        />
        <StatTile
          label="Tổng lượt học"
          value={numberFormat.format(overall.totalReviews + overall.totalPractice)}
          detail={`${overall.totalReviews} ôn tập · ${overall.totalPractice} luyện tập`}
          icon={<Activity />}
          tone="violet"
        />
        <StatTile
          label="Thời gian ôn"
          value={overall.totalDurationMs > 0 ? formatDuration(overall.totalDurationMs) : '< 1 phút'}
          detail="Tổng thời gian lật thẻ"
          icon={<Clock />}
          tone="sky"
        />
      </div>

      {/* Activity Heatmap Card */}
      <ChartCard
        title="Lịch hoạt động học tập"
        subtitle="Mỗi ô là một ngày — màu càng đậm là học càng nhiều."
      >
        <ActivityHeatmap counts={overall.activeMap} today={today} unit="lượt" />
      </ChartCard>

      {/* Forecast & Recent History Charts */}
      <div className="grid gap-5 lg:grid-cols-2 sm:gap-6">
        <ChartCard
          title="Dự báo thẻ đến hạn (14 ngày tới)"
          subtitle="Số thẻ cần ôn mỗi ngày được tính tự động bởi FSRS"
          table={<DataTable headers={['Ngày', 'Số thẻ đến hạn']} rows={forecastData.rows} />}
        >
          <BarChart data={forecastData.chart} label="Dự báo ôn tập 14 ngày tới" unit="thẻ" />
        </ChartCard>

        <ChartCard
          title="Lịch sử học (14 ngày qua)"
          subtitle="Tổng lượt ôn tập và luyện tập mỗi ngày"
          table={<DataTable headers={['Ngày', 'Số lượt học']} rows={historyData.rows} />}
        >
          <BarChart data={historyData.chart} label="Lượt học 14 ngày qua" unit="lượt" />
        </ChartCard>
      </div>

      {/* Breakdown: Card States & Ratings */}
      <div className="grid gap-5 lg:grid-cols-2 sm:gap-6">
        <ChartCard
          title="Phân bổ trạng thái thẻ"
          subtitle={`Tổng cộng ${numberFormat.format(overall.totalCards)} thẻ của ${overall.totalWords} từ`}
        >
          <StackedBar segments={cardSegments} label="Phân bổ trạng thái thẻ" />
        </ChartCard>

        <ChartCard
          title="Phân bổ mức đánh giá FSRS"
          subtitle={`${numberFormat.format(overall.totalReviews)} lượt phản hồi trong các phiên ôn tập`}
        >
          <StackedBar segments={ratingSegments} label="Phân bổ mức đánh giá" />
        </ChartCard>
      </div>

      {/* Hardest Words List */}
      {hardestWords.length > 0 && (
        <ChartCard
          title="Từ hay quên nhất"
          subtitle="Những từ bạn bấm “Quên” nhiều nhất — nên dành thêm thời gian luyện tập."
        >
          <ol className="-mx-5 -mb-5 divide-y divide-line border-t border-line sm:-mx-6 sm:-mb-6">
            {hardestWords.map(({ word, lapses, nextDue }, index) => (
              <li key={word.id}>
                <Link
                  to={`/words/${word.id}`}
                  className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/60 sm:px-6"
                >
                  <span className="w-5 shrink-0 font-display text-sm text-muted tabular-nums">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-[17px] font-semibold text-ink">{word.term}</span>
                      {word.ipa && <span className="hidden font-ipa text-xs text-muted sm:inline">{word.ipa}</span>}
                    </div>
                    <p className="truncate text-[13px] text-ink-2">{word.meaning}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-block rounded-full bg-critical-wash px-2 py-0.5 text-xs font-semibold text-critical-ink">
                      Quên {lapses} lần
                    </span>
                    <p className="mt-1 text-[11px] text-muted">{formatDue(nextDue, now)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </ChartCard>
      )}
    </div>
  )
}
