import { Clock, Dumbbell, House, PartyPopper, Trophy, Undo2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Rating, type Grade } from 'ts-fsrs'
import { Question } from '../components/quiz/Question'
import { RatingBar } from '../components/quiz/RatingBar'
import { suggestGrade } from '../components/quiz/result'
import { SessionShell } from '../components/quiz/SessionShell'
import { Button, ButtonLink, EmptyState, PageSpinner } from '../components/ui'
import { loadReviewData, saveReview, undoReview, type ReviewData } from '../db/review'
import type { CardRecord } from '../db/types'
import { hasModifier, isTypingInField, useKeydown } from '../hooks/useKeydown'
import { formatDue, formatDuration } from '../lib/date'
import { afterAnswer, countQueue, pickNext, type SessionQueue } from '../lib/queue'
import { gradeCard, previewIntervals } from '../lib/srs'

interface Snapshot {
  queue: SessionQueue
  card: CardRecord
  reviewId: string
  lastWordId: string | null
  reviewed: number
  again: number
}

interface Session {
  queue: SessionQueue
  current: CardRecord | null
  turn: number
  shownAt: number
  lastWordId: string | null
  history: Snapshot[]
  reviewed: number
  again: number
  startedAt: number
}

function startSession(queue: SessionQueue): Session {
  const now = Date.now()
  return {
    queue,
    current: pickNext(queue, now, null),
    turn: 0,
    shownAt: now,
    lastWordId: null,
    history: [],
    reviewed: 0,
    again: 0,
    startedAt: now,
  }
}

export default function ReviewPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<ReviewData | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadReviewData(Date.now())
      .then((loaded) => {
        if (cancelled) return
        setData(loaded)
        setSession(startSession(loaded.queue))
      })
      .catch(() => toast.error('Không tải được dữ liệu ôn tập.'))
    return () => {
      cancelled = true
    }
  }, [])

  const words = useMemo(() => new Map((data?.words ?? []).map((w) => [w.id, w])), [data])

  const rate = async (grade: Grade) => {
    if (!data || !session?.current || busy) return
    setBusy(true)
    const card = session.current
    const now = Date.now()
    try {
      const { updated, review } = gradeCard(
        card,
        grade,
        now,
        data.settings.requestRetention,
        Math.min(now - session.shownAt, 60_000),
      )
      await saveReview(updated, review)
      const queue = afterAnswer(session.queue, card, updated, now)
      setSession({
        ...session,
        queue,
        current: pickNext(queue, now, card.wordId),
        turn: session.turn + 1,
        shownAt: Date.now(),
        lastWordId: card.wordId,
        history: [
          ...session.history,
          {
            queue: session.queue,
            card,
            reviewId: review.id,
            lastWordId: session.lastWordId,
            reviewed: session.reviewed,
            again: session.again,
          },
        ],
        reviewed: session.reviewed + 1,
        again: session.again + (grade === Rating.Again ? 1 : 0),
      })
    } catch {
      toast.error('Không lưu được kết quả, thử lại nhé.')
    } finally {
      setBusy(false)
    }
  }

  const undo = async () => {
    const last = session?.history.at(-1)
    if (!session || !last || busy) return
    setBusy(true)
    try {
      await undoReview(last.card, last.reviewId)
      setSession({
        ...session,
        queue: last.queue,
        current: last.card,
        turn: session.turn + 1,
        shownAt: Date.now(),
        lastWordId: last.lastWordId,
        history: session.history.slice(0, -1),
        reviewed: last.reviewed,
        again: last.again,
      })
    } catch {
      toast.error('Không hoàn tác được.')
    } finally {
      setBusy(false)
    }
  }

  const continueEarly = () => {
    if (!session) return
    const next = session.queue.learning[0]
    if (next) setSession({ ...session, current: next, turn: session.turn + 1, shownAt: Date.now() })
  }

  useKeydown((e) => {
    if (isTypingInField(e)) return
    if ((e.key === 'z' && (e.ctrlKey || e.metaKey)) || (e.key === 'u' && !hasModifier(e))) {
      e.preventDefault()
      void undo()
    }
  })

  const exit = () => navigate('/')

  if (!data || !session) {
    return (
      <SessionShell progress={null} onExit={exit}>
        <PageSpinner />
      </SessionShell>
    )
  }

  const counts = countQueue(session.queue)
  const remaining = session.queue.main.length + session.queue.learning.length
  const progress = session.reviewed + remaining === 0 ? 1 : session.reviewed / (session.reviewed + remaining)
  const word = session.current ? words.get(session.current.wordId) : undefined

  const header = (
    <div className="flex items-center gap-1 sm:gap-2">
      <div className="flex items-center gap-1 text-xs font-semibold tabular-nums">
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-ink sm:hidden">Còn {remaining}</span>
        <span className="hidden items-center gap-3 rounded-full border border-line bg-surface px-3 py-1 sm:flex">
          <CountDot className="bg-state-new" value={counts.newCount} label="mới" />
          <CountDot className="bg-state-learning" value={counts.learningCount} label="đang học" />
          <CountDot className="bg-state-mature" value={counts.reviewCount} label="ôn lại" />
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={undo}
        disabled={session.history.length === 0 || busy}
        aria-label="Hoàn tác lượt vừa rồi"
        title="Hoàn tác (phím U)"
      >
        <Undo2 className="size-4.5" />
      </Button>
    </div>
  )

  if (session.current && word) {
    const card = session.current
    return (
      <SessionShell progress={progress} onExit={exit} right={header}>
        <Question
          key={session.turn}
          mode={card.type}
          word={word}
          pool={data.words}
          settings={data.settings}
          footer={(result) => (
            <RatingBar
              intervals={previewIntervals(card, Date.now(), data.settings.requestRetention)}
              suggested={suggestGrade(result)}
              onRate={rate}
              disabled={busy}
            />
          )}
        />
      </SessionShell>
    )
  }

  const waiting = session.queue.learning[0]
  const minutes = Math.round((Date.now() - session.startedAt) / 60_000)
  const recalled = session.reviewed - session.again

  return (
    <SessionShell progress={session.reviewed > 0 ? progress : null} onExit={exit} right={session.reviewed > 0 ? header : undefined}>
      {session.reviewed === 0 && !waiting ? (
        <EmptyState
          icon={<PartyPopper />}
          title={data.words.length === 0 ? 'Chưa có từ nào để ôn' : 'Hôm nay không còn thẻ nào cần ôn'}
          actions={
            <>
              <ButtonLink to="/" variant="secondary" size="lg">
                <House className="size-4.5" /> Về trang chủ
              </ButtonLink>
              {data.words.length === 0 ? (
                <ButtonLink to="/words/new" variant="primary" size="lg">
                  Thêm từ đầu tiên
                </ButtonLink>
              ) : (
                <ButtonLink to="/practice" variant="primary" size="lg">
                  <Dumbbell className="size-4.5" /> Luyện tập thêm
                </ButtonLink>
              )}
            </>
          }
        >
          {data.nextDue !== null && <p>Thẻ tiếp theo đến hạn {formatDue(data.nextDue, Date.now()).toLowerCase()}.</p>}
        </EmptyState>
      ) : (
        <section className="animate-fade-up overflow-hidden rounded-3xl border border-line bg-surface text-center shadow-float">
          <div className="hero-surface relative px-6 pt-9 pb-8 text-white">
            <span className="inline-flex size-16 animate-pop items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20">
              {waiting ? <Clock className="size-8" /> : <Trophy className="size-8" />}
            </span>
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight">
              {waiting ? 'Nghỉ tay một chút nhé' : 'Hoàn thành phiên ôn tập!'}
            </h2>
            {waiting && (
              <p className="mx-auto mt-2 max-w-sm text-sm text-white/75">
                Còn {session.queue.learning.length} thẻ đang học, thẻ tiếp theo đến hạn sau{' '}
                <strong className="font-semibold text-white">
                  {formatDuration(Math.max(0, waiting.due - Date.now()))}
                </strong>
                .
              </p>
            )}
          </div>

          {session.reviewed > 0 && (
            <dl className="grid grid-cols-3 divide-x divide-line border-b border-line">
              <SummaryStat label="Thẻ đã ôn" value={String(session.reviewed)} />
              <SummaryStat label="Thời gian" value={minutes < 1 ? '< 1 phút' : `${minutes} phút`} />
              <SummaryStat label="Tỉ lệ nhớ" value={`${Math.round((recalled / session.reviewed) * 100)}%`} accent />
            </dl>
          )}

          <div className="flex flex-wrap justify-center gap-2.5 p-6">
            {waiting && (
              <Button variant="secondary" size="lg" onClick={continueEarly}>
                Ôn tiếp không cần chờ
              </Button>
            )}
            <ButtonLink to="/" variant="primary" size="lg">
              <House className="size-4.5" /> Về trang chủ
            </ButtonLink>
            <ButtonLink to="/practice" variant="ghost" size="lg">
              <Dumbbell className="size-4.5" /> Luyện tập tự do
            </ButtonLink>
          </div>
        </section>
      )}
    </SessionShell>
  )
}

function CountDot({ className, value, label }: { className: string; value: number; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={`size-1.5 rounded-full ${className}`} />
      <span className="text-ink">{value}</span>
      <span className="font-medium text-muted">{label}</span>
    </span>
  )
}

function SummaryStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-2 py-5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-1 font-display text-2xl font-semibold tabular-nums ${accent ? 'text-accent-ink' : 'text-ink'}`}>
        {value}
      </dd>
    </div>
  )
}
