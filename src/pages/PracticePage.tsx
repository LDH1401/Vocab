import {
  ArrowRight,
  BookOpen,
  Check,
  CircleCheck,
  CircleX,
  Dumbbell,
  Headphones,
  House,
  ListChecks,
  PenLine,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  TextCursorInput,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Question } from '../components/quiz/Question'
import { SessionShell } from '../components/quiz/SessionShell'
import type { AnswerResult } from '../components/quiz/result'
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  IconChip,
  PageHeader,
  SectionHeader,
  Select,
  type ChipTone,
} from '../components/ui'
import { addPracticeRecord } from '../db/practice'
import { useData } from '../db/store'
import type { PracticeMode, Word } from '../db/types'
import { useSettings } from '../hooks/useSettings'
import { canCloze } from '../lib/cloze'
import { cn } from '../lib/cn'
import { formatDuration } from '../lib/date'
import { newId } from '../lib/id'
import { PRACTICE_MODE_INFO } from '../lib/labels'
import { shuffle } from '../lib/random'

type ExtendedMode = PracticeMode | 'mixed'

const MODE_CONFIG: Record<
  ExtendedMode,
  { name: string; desc: string; icon: typeof Dumbbell; tone: ChipTone }
> = {
  mixed: {
    name: 'Hỗn hợp',
    desc: 'Tự động chọn ngẫu nhiên các kiểu bài tập phù hợp cho từng từ',
    icon: Sparkles,
    tone: 'accent',
  },
  flip: {
    name: PRACTICE_MODE_INFO.flip.name,
    desc: PRACTICE_MODE_INFO.flip.description,
    icon: BookOpen,
    tone: 'sky',
  },
  choice: {
    name: PRACTICE_MODE_INFO.choice.name,
    desc: PRACTICE_MODE_INFO.choice.description,
    icon: ListChecks,
    tone: 'teal',
  },
  spelling: {
    name: PRACTICE_MODE_INFO.spelling.name,
    desc: PRACTICE_MODE_INFO.spelling.description,
    icon: PenLine,
    tone: 'amber',
  },
  dictation: {
    name: PRACTICE_MODE_INFO.dictation.name,
    desc: PRACTICE_MODE_INFO.dictation.description,
    icon: Headphones,
    tone: 'violet',
  },
  cloze: {
    name: PRACTICE_MODE_INFO.cloze.name,
    desc: PRACTICE_MODE_INFO.cloze.description,
    icon: TextCursorInput,
    tone: 'rose',
  },
}

interface PracticeItem {
  word: Word
  mode: PracticeMode
}

interface PracticeSummary {
  total: number
  correct: number
  durationMs: number
  missedWords: Word[]
}

export default function PracticePage() {
  const settings = useSettings()

  const { words, cards } = useData()

  const [selectedMode, setSelectedMode] = useState<ExtendedMode>('mixed')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [selectedSubset, setSelectedSubset] = useState<'all' | 'lapses' | 'new' | 'mature'>('all')
  const [limit, setLimit] = useState<number>(20)

  const [activeItems, setActiveItems] = useState<PracticeItem[] | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<Map<number, boolean>>(new Map())
  const [sessionStartTime, setSessionStartTime] = useState<number>(0)
  const [summary, setSummary] = useState<PracticeSummary | null>(null)

  const allTags = useMemo(() => {
    if (!words) return []
    return [...new Set(words.flatMap((w) => w.tags))].sort((a, b) => a.localeCompare(b, 'vi'))
  }, [words])

  const startSession = (customWords?: Word[]) => {
    if (words.length === 0) return

    let candidateWords = customWords ?? [...words]

    if (!customWords && selectedTag !== 'all') {
      candidateWords = candidateWords.filter((w) => w.tags.includes(selectedTag))
    }

    if (!customWords && selectedSubset !== 'all') {
      const cardMap = new Map<string, typeof cards>()
      for (const c of cards) {
        cardMap.set(c.wordId, [...(cardMap.get(c.wordId) ?? []), c])
      }

      if (selectedSubset === 'lapses') {
        candidateWords = candidateWords.filter((w) => {
          const cList = cardMap.get(w.id) ?? []
          return cList.some((c) => c.lapses > 0)
        })
      } else if (selectedSubset === 'new') {
        candidateWords = candidateWords.filter((w) => {
          const cList = cardMap.get(w.id) ?? []
          return cList.every((c) => c.reps === 0)
        })
      } else if (selectedSubset === 'mature') {
        candidateWords = candidateWords.filter((w) => {
          const cList = cardMap.get(w.id) ?? []
          return cList.some((c) => c.state === 2)
        })
      }
    }

    if (candidateWords.length === 0) {
      toast.error('Không có từ nào phù hợp với bộ lọc đã chọn.')
      return
    }

    const shuffledWords = shuffle(candidateWords).slice(0, customWords ? candidateWords.length : limit)

    const items: PracticeItem[] = shuffledWords.map((word) => {
      if (selectedMode !== 'mixed') {
        return { word, mode: selectedMode }
      }
      const availableModes: PracticeMode[] = ['flip', 'spelling', 'dictation']
      if (words.length >= 4) availableModes.push('choice')
      if (canCloze(word.term, word.examples)) availableModes.push('cloze')
      const chosen = availableModes[Math.floor(Math.random() * availableModes.length)]
      return { word, mode: chosen }
    })

    setActiveItems(items)
    setCurrentIndex(0)
    setResults(new Map())
    setSessionStartTime(Date.now())
    setSummary(null)
  }

  const handleAnswer = (correct: boolean) => {
    if (!activeItems) return
    const currentItem = activeItems[currentIndex]
    if (!currentItem) return

    addPracticeRecord({
      id: newId(),
      wordId: currentItem.word.id,
      mode: currentItem.mode,
      correct,
      answeredAt: Date.now(),
    })

    const nextResults = new Map(results)
    nextResults.set(currentIndex, correct)
    setResults(nextResults)

    if (currentIndex + 1 < activeItems.length) {
      setCurrentIndex(currentIndex + 1)
    } else {
      const missed: Word[] = []
      let correctCount = 0
      activeItems.forEach((item, idx) => {
        const isCorrect = nextResults.get(idx) ?? false
        if (isCorrect) {
          correctCount++
        } else {
          missed.push(item.word)
        }
      })

      setSummary({
        total: activeItems.length,
        correct: correctCount,
        durationMs: Date.now() - sessionStartTime,
        missedWords: missed,
      })
      setActiveItems(null)
    }
  }

  if (words.length === 0) {
    return (
      <EmptyState
        icon={<Dumbbell />}
        title="Chưa có từ vựng để luyện tập"
        actions={
          <>
            <ButtonLink to="/words/new" variant="primary" size="lg">
              <Plus className="size-4.5" /> Thêm từ đầu tiên
            </ButtonLink>
            <ButtonLink to="/settings#data" variant="secondary" size="lg">
              Nhập từ file CSV
            </ButtonLink>
          </>
        }
      >
        Hãy thêm từ vựng để bắt đầu các bài tập luyện tập bất kỳ lúc nào.
      </EmptyState>
    )
  }

  // Active Session View
  if (activeItems) {
    const currentItem = activeItems[currentIndex]
    const progress = (currentIndex + 1) / activeItems.length
    const score = [...results.values()].filter(Boolean).length

    const header = (
      <div className="flex items-center gap-2 text-xs font-semibold tabular-nums">
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-ink">
          {currentIndex + 1}/{activeItems.length}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-good-wash px-2.5 py-1 text-good-ink">
          <Check className="size-3.5" /> {score}
        </span>
      </div>
    )

    return (
      <SessionShell progress={progress} onExit={() => setActiveItems(null)} right={header}>
        {currentItem && (
          <Question
            key={`${currentIndex}-${currentItem.word.id}`}
            mode={currentItem.mode}
            word={currentItem.word}
            pool={words}
            settings={settings}
            footer={(result: AnswerResult) => {
              if (result.verdict === null) {
                return (
                  <div className="grid animate-fade-up grid-cols-2 gap-3 pt-1">
                    <Button variant="danger" size="lg" className="h-13" onClick={() => handleAnswer(false)}>
                      <CircleX className="size-5" /> Chưa nhớ
                    </Button>
                    <Button variant="primary" size="lg" className="h-13" onClick={() => handleAnswer(true)}>
                      <CircleCheck className="size-5" /> Đã nhớ
                    </Button>
                  </div>
                )
              }

              const isCorrect = result.verdict === 'correct' || result.verdict === 'close'
              return (
                <div className="flex animate-fade-up justify-end pt-1">
                  <Button
                    variant="primary"
                    size="lg"
                    className="group h-13 w-full sm:w-auto sm:px-7"
                    onClick={() => handleAnswer(isCorrect)}
                  >
                    Tiếp theo <ArrowRight className="size-4.5 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </div>
              )
            }}
          />
        )}
      </SessionShell>
    )
  }

  // Kết quả phiên luyện tập
  if (summary) {
    const percent = Math.round((summary.correct / summary.total) * 100)
    return (
      <div className="space-y-5 sm:space-y-6">
        <PageHeader eyebrow="Luyện tập tự do" title="Kết quả phiên luyện tập" />

        <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
          <div className="flex flex-col items-center gap-6 px-6 py-8 sm:flex-row sm:gap-9 sm:px-9">
            <ScoreRing percent={percent} />
            <div className="text-center sm:text-left">
              <p className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                {percent >= 90 ? 'Xuất sắc!' : percent >= 70 ? 'Rất tốt!' : 'Cố lên nhé!'}
              </p>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-2">
                {percent >= 90
                  ? 'Trí nhớ của bạn về nhóm từ này rất vững chắc.'
                  : percent >= 70
                    ? 'Duy trì luyện tập đều đặn để biến từ vựng thành phản xạ tự nhiên.'
                    : 'Ôn lại các từ chưa đúng để ghi nhớ chắc chắn hơn.'}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-medium sm:justify-start">
                <span className="rounded-full bg-good-wash px-2.5 py-1 text-good-ink">
                  {summary.correct}/{summary.total} câu đúng
                </span>
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-ink-2">
                  {formatDuration(summary.durationMs)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2.5 border-t border-line bg-surface-2/50 px-6 py-4 sm:justify-start sm:px-9">
            {summary.missedWords.length > 0 && (
              <Button variant="primary" onClick={() => startSession(summary.missedWords)}>
                <RefreshCw className="size-4" /> Luyện lại {summary.missedWords.length} từ sai
              </Button>
            )}
            <Button variant="secondary" onClick={() => startSession()}>
              <RefreshCw className="size-4" /> Lượt mới
            </Button>
            <ButtonLink to="/" variant="ghost">
              <House className="size-4" /> Trang chủ
            </ButtonLink>
          </div>
        </section>

        {summary.missedWords.length > 0 && (
          <Card className="overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h3 className="text-[15px] font-semibold text-ink">Từ cần xem lại · {summary.missedWords.length}</h3>
            </div>
            <div className="divide-y divide-line">
              {summary.missedWords.map((word) => (
                <Link
                  key={word.id}
                  to={`/words/${word.id}`}
                  className="group flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-2/60"
                >
                  <div className="min-w-0">
                    <span className="font-display text-lg font-semibold text-ink">{word.term}</span>
                    <p className="truncate text-sm text-ink-2">{word.meaning}</p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    )
  }

  // Chọn dạng bài và bắt đầu
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Luyện tập tự do"
        description="Luyện phản xạ bất kỳ lúc nào — không ảnh hưởng đến lịch ôn FSRS."
      />

      <section className="space-y-3">
        <StepLabel step={1}>Chọn dạng bài tập</StepLabel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Dạng bài tập">
          {(['mixed', 'flip', 'choice', 'spelling', 'dictation', 'cloze'] as const).map((modeKey) => {
            const cfg = MODE_CONFIG[modeKey]
            const Icon = cfg.icon
            const active = selectedMode === modeKey
            return (
              <button
                key={modeKey}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelectedMode(modeKey)}
                className={cn(
                  'group relative flex items-start gap-3.5 rounded-2xl border p-4 text-left shadow-card transition-all duration-150',
                  active
                    ? 'border-accent bg-surface ring-4 ring-accent/15'
                    : 'border-line bg-surface hover:-translate-y-px hover:border-line-strong hover:shadow-float',
                )}
              >
                <IconChip tone={cfg.tone}>
                  <Icon />
                </IconChip>
                <span className="min-w-0 flex-1 pr-5">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {cfg.name}
                    {modeKey === 'mixed' && (
                      <span className="rounded-full bg-accent-wash px-1.5 py-px text-[10px] font-semibold text-accent-ink">
                        Gợi ý
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-ink-2">{cfg.desc}</span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-4 right-4 flex size-5 items-center justify-center rounded-full border transition-all',
                    active ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong bg-surface',
                  )}
                >
                  {active && <Check className="size-3 animate-pop" strokeWidth={3} />}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <StepLabel step={2}>Tùy chọn bài học</StepLabel>
        <Card className="overflow-hidden">
          <div className="p-5 sm:p-6">
            <SectionHeader
              icon={<SlidersHorizontal />}
              tone="neutral"
              title="Phạm vi từ vựng"
              description="Lọc theo chủ đề, nhóm từ và số câu hỏi cho phiên này."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Field label="Chủ đề / Nhãn" htmlFor="tag-filter">
                <Select id="tag-filter" value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
                  <option value="all">Tất cả nhãn ({words.length} từ)</option>
                  {allTags.map((t) => (
                    <option key={t} value={t}>
                      #{t}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Nhóm từ vựng" htmlFor="subset-filter">
                <Select
                  id="subset-filter"
                  value={selectedSubset}
                  onChange={(e) => setSelectedSubset(e.target.value as typeof selectedSubset)}
                >
                  <option value="all">Tất cả từ</option>
                  <option value="lapses">Từ hay quên nhất</option>
                  <option value="new">Từ mới thêm</option>
                  <option value="mature">Từ đã thuộc</option>
                </Select>
              </Field>

              <Field label="Số lượng câu hỏi" htmlFor="limit-select">
                <Select id="limit-select" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                  <option value={10}>10 câu</option>
                  <option value={20}>20 câu</option>
                  <option value={50}>50 câu</option>
                  <option value={100}>100 câu</option>
                  <option value={9999}>Tất cả từ</option>
                </Select>
              </Field>
            </div>
          </div>

          <div className="flex flex-col-reverse items-stretch gap-3 border-t border-line bg-surface-2/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="flex items-center gap-2 text-[13px] text-ink-2">
              <Sparkles className="size-4 text-accent-ink" />
              {MODE_CONFIG[selectedMode].name} · {limit >= 9999 ? 'tất cả từ' : `${limit} câu`}
            </p>
            <Button variant="primary" size="lg" onClick={() => startSession()} className="group">
              <Dumbbell className="size-4.5" /> Bắt đầu luyện tập
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </Card>
      </section>
    </div>
  )
}

function StepLabel({ step, children }: { step: number; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-semibold text-ink">
      <span className="flex size-6 items-center justify-center rounded-full bg-ink text-xs font-semibold text-page">
        {step}
      </span>
      {children}
    </h2>
  )
}

/** Vòng tròn điểm số */
function ScoreRing({ percent }: { percent: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  const color = percent >= 70 ? 'var(--good)' : percent >= 40 ? 'var(--warning)' : 'var(--critical)'
  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl leading-none font-semibold text-ink tabular-nums">{percent}%</span>
        <span className="mt-1 text-xs text-muted">chính xác</span>
      </div>
    </div>
  )
}
