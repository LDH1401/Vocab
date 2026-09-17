import { BookOpen, ChevronRight, Clock, Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { SpeakButton } from '../components/SpeakButton'
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Segmented,
  Select,
  StatusPill,
} from '../components/ui'
import { useData } from '../db/store'
import type { CardRecord, Word } from '../db/types'
import { useSettings } from '../hooks/useSettings'
import { formatDue } from '../lib/date'
import { posInfo, STATUS_LABELS } from '../lib/labels'
import { wordStatus, type WordStatus } from '../lib/srs'
import { foldText } from '../lib/text'
import { State } from 'ts-fsrs'

const PAGE_SIZE = 50

type StatusFilter = 'all' | WordStatus
type Sort = 'newest' | 'oldest' | 'az' | 'due' | 'lapses'

interface Row {
  word: Word
  status: WordStatus
  nextDue: number | null
  lapses: number
}

export default function WordsPage() {
  const settings = useSettings()
  const [params, setParams] = useSearchParams()
  const [limit, setLimit] = useState(PAGE_SIZE)
  const query = params.get('q') ?? ''
  const status = (params.get('status') ?? 'all') as StatusFilter
  const tag = params.get('tag') ?? ''
  const sort = (params.get('sort') ?? 'newest') as Sort

  const setParam = (key: string, value: string, fallback: string) => {
    const next = new URLSearchParams(params)
    if (value === fallback) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
    setLimit(PAGE_SIZE)
  }

  const data = useData()

  const rows = useMemo<Row[]>(() => {
    const enabled = new Set(settings.enabledCardTypes)
    const byWord = new Map<string, CardRecord[]>()
    for (const card of data.cards) {
      if (!enabled.has(card.type)) continue
      byWord.set(card.wordId, [...(byWord.get(card.wordId) ?? []), card])
    }
    return data.words.map((word) => {
      const cards = byWord.get(word.id) ?? []
      const reviewed = cards.filter((c) => c.state !== State.New)
      return {
        word,
        status: wordStatus(cards),
        nextDue: reviewed.length > 0 ? Math.min(...reviewed.map((c) => c.due)) : null,
        lapses: cards.reduce((sum, c) => sum + c.lapses, 0),
      }
    })
  }, [data, settings.enabledCardTypes])

  const allTags = useMemo(
    () => [...new Set(data.words.flatMap((w) => w.tags))].sort((a, b) => a.localeCompare(b, 'vi')),
    [data.words],
  )

  const filtered = useMemo(() => {
    const q = foldText(query.trim())
    const result = rows.filter(
      (r) =>
        (status === 'all' || r.status === status) &&
        (!tag || r.word.tags.includes(tag)) &&
        (!q || foldText(`${r.word.term} ${r.word.meaning} ${r.word.tags.join(' ')}`).includes(q)),
    )
    const compare: Record<Sort, (a: Row, b: Row) => number> = {
      newest: (a, b) => b.word.createdAt - a.word.createdAt,
      oldest: (a, b) => a.word.createdAt - b.word.createdAt,
      az: (a, b) => a.word.term.localeCompare(b.word.term, 'en'),
      due: (a, b) => (a.nextDue ?? Infinity) - (b.nextDue ?? Infinity),
      lapses: (a, b) => b.lapses - a.lapses,
    }
    return result.sort(compare[sort])
  }, [rows, query, status, tag, sort])

  const now = Date.now()

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Kho từ vựng"
        description={`${rows.length} từ trong sổ tay của bạn`}
        actions={
          <ButtonLink to="/words/new" variant="primary">
            <Plus className="size-4.5" /> Thêm từ mới
          </ButtonLink>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title="Sổ từ vựng đang trống"
          actions={
            <>
              <ButtonLink to="/words/new" variant="primary" size="lg">
                <Plus className="size-4.5" /> Thêm từ đầu tiên
              </ButtonLink>
              <ButtonLink to="/settings#data" variant="secondary" size="lg">
                Nhập file CSV / Anki
              </ButtonLink>
            </>
          }
        >
          Thêm từ vựng để bắt đầu xếp lịch học thông minh với FSRS, hoặc nạp cả danh sách có sẵn từ file CSV / Anki.
        </EmptyState>
      ) : (
        <>
          {/* Tìm kiếm và bộ lọc */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setParam('q', e.target.value, '')}
                placeholder="Tìm từ, nghĩa hoặc nhãn…"
                aria-label="Tìm kiếm"
                className="h-12 pr-10 pl-11 text-[15px]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setParam('q', '', '')}
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-ink"
                  aria-label="Xóa ô tìm kiếm"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <Segmented<StatusFilter>
                label="Lọc theo trạng thái"
                value={status}
                onChange={(v) => setParam('status', v, 'all')}
                options={[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'new', label: STATUS_LABELS.new },
                  { value: 'learning', label: STATUS_LABELS.learning },
                  { value: 'mature', label: STATUS_LABELS.mature },
                ]}
                className="max-w-full overflow-x-auto"
              />

              <div className="flex flex-1 items-center justify-end gap-2">
                {allTags.length > 0 && (
                  <Select
                    value={tag}
                    onChange={(e) => setParam('tag', e.target.value, '')}
                    aria-label="Lọc theo tag"
                    className="min-w-0 flex-1 sm:w-40 sm:flex-none"
                  >
                    <option value="">Tất cả nhãn</option>
                    {allTags.map((t) => (
                      <option key={t} value={t}>
                        #{t}
                      </option>
                    ))}
                  </Select>
                )}
                <Select
                  value={sort}
                  onChange={(e) => setParam('sort', e.target.value, 'newest')}
                  aria-label="Sắp xếp"
                  className="min-w-0 flex-1 sm:w-44 sm:flex-none"
                >
                  <option value="newest">Mới thêm trước</option>
                  <option value="oldest">Cũ nhất trước</option>
                  <option value="az">Theo thứ tự A → Z</option>
                  <option value="due">Sắp đến hạn ôn</option>
                  <option value="lapses">Hay quên nhất</option>
                </Select>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={<Search />} title="Không tìm thấy từ phù hợp">
              Thử từ khóa khác hoặc bỏ bớt bộ lọc.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              <p className="px-1 text-xs font-medium text-muted">
                Hiển thị {Math.min(limit, filtered.length)} / {filtered.length} từ
              </p>

              <Card className="divide-y divide-line overflow-hidden">
                {filtered.slice(0, limit).map((row) => (
                  <div
                    key={row.word.id}
                    className="group relative flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/60 sm:px-5 sm:py-4"
                  >
                    <Link to={`/words/${row.word.id}`} className="min-w-0 flex-1 after:absolute after:inset-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-display text-lg leading-snug font-semibold text-ink">
                          {row.word.term}
                        </span>
                        {row.word.partOfSpeech && (
                          <span className="font-display text-sm text-muted italic">
                            {posInfo(row.word.partOfSpeech).short}
                          </span>
                        )}
                        {row.word.ipa && <span className="font-ipa text-[13px] text-muted">{row.word.ipa}</span>}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-sm text-ink-2">{row.word.meaning}</p>
                      {row.word.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {row.word.tags.map((t) => (
                            <Badge key={t}>#{t}</Badge>
                          ))}
                        </div>
                      )}
                    </Link>

                    <div className="relative flex shrink-0 items-center gap-1.5 sm:gap-3">
                      <div className="flex flex-col items-end gap-1">
                        <StatusPill status={row.status} />
                        {row.nextDue !== null && (
                          <span className="flex items-center gap-1 text-[11px] text-muted">
                            <Clock className="size-3" /> {formatDue(row.nextDue, now)}
                          </span>
                        )}
                      </div>
                      <SpeakButton text={row.word.term} audioUrl={row.word.audioUrl} settings={settings} />
                      <ChevronRight
                        aria-hidden
                        className="hidden size-4 text-muted transition-transform group-hover:translate-x-0.5 sm:block"
                      />
                    </div>
                  </div>
                ))}
              </Card>

              {filtered.length > limit && (
                <div className="flex justify-center pt-2">
                  <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                    Xem thêm {Math.min(PAGE_SIZE, filtered.length - limit)} từ
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
