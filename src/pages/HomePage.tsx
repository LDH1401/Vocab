import {
  ArrowRight,
  BookOpen,
  Dumbbell,
  Flame,
  GraduationCap,
  Layers,
  PartyPopper,
  Plus,
  Sparkles,
  Upload,
  Zap,
} from 'lucide-react'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { StatTile } from '../components/charts/StatTile'
import { LegacyImport } from '../components/LegacyImport'
import { Button, ButtonLink, Card, IconChip, Input, PageHeader, SectionHeader, Spinner } from '../components/ui'
import { enrichWordFromDictionary } from '../db/enrich'
import { useData } from '../db/store'
import { addWord, findWordsByTerm } from '../db/words'
import { useDueCounts } from '../hooks/useDueCounts'
import { useSettings } from '../hooks/useSettings'
import { dayKey, formatDue } from '../lib/date'
import { computeStreak, countByDay } from '../lib/stats'
import { sanitizeWordInput } from '../lib/wordData'

const numberFormat = new Intl.NumberFormat('vi-VN')

function greeting(hour: number) {
  if (hour < 11) return 'Chào buổi sáng'
  if (hour < 14) return 'Chào buổi trưa'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

function QuickAdd() {
  const settings = useSettings()
  const [term, setTerm] = useState('')
  const [meaning, setMeaning] = useState('')
  const [saving, setSaving] = useState(false)
  const termRef = useRef<HTMLInputElement>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const input = sanitizeWordInput({ term, meaning })
    if (!input.term || !input.meaning) return
    setSaving(true)
    try {
      const duplicates = await findWordsByTerm(input.term)
      const word = await addWord(input)
      setTerm('')
      setMeaning('')
      termRef.current?.focus()
      toast.success(`Đã thêm "${word.term}"`, {
        description:
          duplicates.length > 0
            ? 'Lưu ý: từ này đã có trong danh sách trước đó.'
            : 'Đang tự tra phiên âm IPA và câu ví dụ…',
      })
      enrichWordFromDictionary(word.id, settings.accent).catch(() => {})
    } catch {
      toast.error('Không lưu được từ vựng.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <SectionHeader
        icon={<Sparkles />}
        title="Thêm nhanh từ mới"
        description="Gõ từ và nghĩa tiếng Việt — phiên âm IPA và câu ví dụ sẽ được tự động tra giúp bạn."
      />

      <form onSubmit={onSubmit} className="mt-5 grid gap-2.5 sm:grid-cols-[1fr_1fr_auto]">
        <Input
          ref={termRef}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Từ tiếng Anh, vd. innovate"
          aria-label="Từ tiếng Anh"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          lang="en"
        />
        <Input
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          placeholder="Nghĩa tiếng Việt, vd. đổi mới"
          aria-label="Nghĩa tiếng Việt"
        />
        <Button
          type="submit"
          variant="primary"
          disabled={saving || !term.trim() || !meaning.trim()}
          className="h-11 px-5"
        >
          {saving ? <Spinner /> : <Plus className="size-4.5" />} Thêm
        </Button>
      </form>
    </Card>
  )
}

export default function HomePage() {
  const due = useDueCounts()
  const { words, reviews, practice } = useData()
  const wordCount = words.length
  const activity = useMemo(() => {
    const days = countByDay([...reviews.map((r) => r.reviewedAt), ...practice.map((p) => p.answeredAt)])
    const today = dayKey(Date.now())
    return { streak: computeStreak(new Set(days.keys()), today), today: days.get(today) ?? 0 }
  }, [reviews, practice])

  const now = new Date()

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow={now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
        title={`${greeting(now.getHours())}!`}
      />

      <LegacyImport />

      {/* Khối chính: số thẻ cần ôn */}
      {wordCount === 0 ? (
        <section className="hero-surface relative overflow-hidden rounded-3xl p-6 text-white shadow-float sm:p-9">
          <HeroDecoration />
          <div className="relative max-w-xl">
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20">
              <BookOpen className="size-6" />
            </span>
            <h2 className="mt-5 font-display text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
              Bắt đầu cuốn sổ từ vựng của bạn
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/75 sm:text-[15px]">
              Mỗi từ bạn thêm vào sẽ được FSRS tính chu kỳ ôn tối ưu theo trí nhớ của riêng bạn. Thêm vài từ đầu
              tiên hoặc nạp nhanh từ file CSV.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <ButtonLink to="/words/new" variant="inverse" size="lg">
                <Plus className="size-4.5" /> Thêm từ đầu tiên
              </ButtonLink>
              <ButtonLink to="/settings#data" variant="glass" size="lg">
                <Upload className="size-4.5" /> Nhập CSV / Anki
              </ButtonLink>
            </div>
          </div>
        </section>
      ) : due.total > 0 ? (
        <section className="hero-surface relative overflow-hidden rounded-3xl p-6 text-white shadow-float sm:p-9">
          <HeroDecoration />
          <div className="relative flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-white/75">
                <GraduationCap className="size-4" /> Thẻ cần ôn hôm nay
              </p>
              <p className="mt-2 font-display text-7xl leading-none font-semibold tracking-tight tabular-nums sm:text-8xl">
                {numberFormat.format(due.total)}
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
                <HeroCount color="bg-sky-300" label="mới" value={due.newCount} />
                <HeroCount color="bg-amber-300" label="đang học" value={due.learningCount} />
                <HeroCount color="bg-emerald-300" label="ôn lại" value={due.reviewCount} />
              </div>
            </div>

            <ButtonLink to="/review" variant="inverse" size="lg" className="group w-full sm:w-auto">
              Bắt đầu ôn tập
              <ArrowRight className="size-4.5 transition-transform group-hover:translate-x-0.5" />
            </ButtonLink>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8">
          <div aria-hidden className="dot-pattern absolute inset-y-0 right-0 w-1/2 text-line-strong/60 [mask-image:linear-gradient(to_left,black,transparent)]" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <IconChip tone="accent" size="lg">
                <PartyPopper />
              </IconChip>
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                  Hôm nay đã ôn xong!
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">
                  {due.nextDue !== null
                    ? `Thẻ tiếp theo đến hạn ${formatDue(due.nextDue, Date.now()).toLowerCase()}.`
                    : 'Bạn đã ôn hết toàn bộ từ vựng hiện có.'}
                </p>
              </div>
            </div>
            <ButtonLink to="/practice" variant="secondary" size="lg" className="shrink-0">
              <Dumbbell className="size-4.5" /> Luyện tập tự do
            </ButtonLink>
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile
          label="Chuỗi ngày học"
          value={`${activity.streak.current} ngày`}
          detail={`Dài nhất ${activity.streak.longest} ngày`}
          icon={<Flame />}
          tone="amber"
        />
        <StatTile
          label="Lượt học hôm nay"
          value={numberFormat.format(activity.today)}
          detail="Ôn tập và luyện tập"
          icon={<Zap />}
          tone="accent"
        />
        <StatTile
          label="Kho từ vựng"
          value={numberFormat.format(wordCount)}
          detail={
            <Link to="/words" className="inline-flex items-center gap-1 font-semibold text-accent-ink hover:underline">
              Xem danh sách <ArrowRight className="size-3" />
            </Link>
          }
          icon={<Layers />}
          tone="sky"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <QuickAdd />
    </div>
  )
}

function HeroCount({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
      <span aria-hidden className={`size-1.5 rounded-full ${color}`} />
      <span className="tabular-nums">{value}</span>
      <span className="text-white/70">{label}</span>
    </span>
  )
}

/** Họa tiết chìm: chữ "Aa" lớn và lưới chấm mờ */
function HeroDecoration() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="dot-pattern absolute inset-0 text-white/[0.07] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_65%)]" />
      <span className="absolute -top-10 right-4 font-display text-[11rem] leading-none font-semibold text-white/[0.06] italic select-none sm:-top-14 sm:right-10 sm:text-[15rem]">
        Aa
      </span>
    </div>
  )
}
