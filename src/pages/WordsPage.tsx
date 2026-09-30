import {
  ArrowDownAZ,
  BookOpen,
  CalendarClock,
  ChevronRight,
  Clock,
  History,
  Tag as TagIcon,
  SquareCheck,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Tags,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AddTagsDialog } from '../components/AddTagsDialog'
import { Pagination } from '../components/Pagination'
import { TagManagerDialog } from '../components/TagManagerDialog'
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
import { cn } from '../lib/cn'
import { formatDue } from '../lib/date'
import { posInfo, STATUS_LABELS } from '../lib/labels'
import { countTags } from '../lib/tags'
import { wordStatus, type WordStatus } from '../lib/srs'
import { foldText } from '../lib/text'
import { State } from 'ts-fsrs'

/** Giá trị riêng của bộ lọc nhãn để chọn các từ chưa được gắn nhãn nào */
const NO_TAG = '__none__'
const SEARCH_DEBOUNCE_MS = 250
const PAGE_SIZES = [20, 50, 100] as const
const DEFAULT_PAGE_SIZE = 20

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
  const listTopRef = useRef<HTMLDivElement>(null)
  const [managingTags, setManagingTags] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [taggingSelection, setTaggingSelection] = useState(false)
  const query = params.get('q') ?? ''
  const status = (params.get('status') ?? 'all') as StatusFilter
  const tag = params.get('tag') ?? ''
  const sort = (params.get('sort') ?? 'newest') as Sort
  const perParam = Number(params.get('per'))
  const pageSize = PAGE_SIZES.find((size) => size === perParam) ?? DEFAULT_PAGE_SIZE
  const requestedPage = Math.max(1, Math.floor(Number(params.get('page'))) || 1)

  /** Đổi bộ lọc, tìm kiếm hay số từ mỗi trang thì quay về trang 1 */
  const setParam = (key: string, value: string, fallback: string) => {
    const next = new URLSearchParams(params)
    if (value === fallback) next.delete(key)
    else next.set(key, value)
    next.delete('page')
    setParams(next, { replace: true })
  }

  /**
   * Ô tìm kiếm giữ chữ ngay trong state của nó rồi mới ghi lên URL sau khi ngừng gõ.
   * Nếu lấy thẳng giá trị từ URL, React ghi đè ô nhập chậm một nhịp và bộ gõ tiếng Việt bị hỏng
   * (gõ "kiên" ra "kkikiekiêkiên").
   */
  const [searchDraft, setSearchDraft] = useState(query)
  const pushedQuery = useRef(query)
  const searchTimer = useRef(0)

  useEffect(() => () => window.clearTimeout(searchTimer.current), [])

  // URL đổi từ nơi khác (nút Quay lại, mở lại trang) thì đồng bộ lại ô tìm kiếm
  useEffect(() => {
    if (query !== pushedQuery.current) {
      pushedQuery.current = query
      setSearchDraft(query)
    }
  }, [query])

  const pushQuery = (value: string, delay: number) => {
    window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => {
      pushedQuery.current = value
      setParam('q', value, '')
    }, delay)
  }

  const onSearchChange = (value: string) => {
    setSearchDraft(value)
    pushQuery(value, SEARCH_DEBOUNCE_MS)
  }

  const clearSearch = () => {
    setSearchDraft('')
    pushQuery('', 0)
  }

  /** Mỗi lần chuyển trang là một mục trong lịch sử, nút Quay lại của trình duyệt về trang trước đó */
  const goToPage = (page: number) => {
    const next = new URLSearchParams(params)
    if (page <= 1) next.delete('page')
    else next.set('page', String(page))
    setParams(next)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    listTopRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
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

  const tagCounts = useMemo(() => countTags(data.words), [data.words])

  const filtered = useMemo(() => {
    const q = foldText(query.trim())
    const result = rows.filter(
      (r) =>
        (status === 'all' || r.status === status) &&
        (!tag || (tag === NO_TAG ? r.word.tags.length === 0 : r.word.tags.includes(tag))) &&
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

  const untaggedCount = useMemo(() => data.words.filter((w) => w.tags.length === 0).length, [data.words])

  // Bỏ chọn những từ không còn nằm trong kết quả lọc (vừa xóa từ, vừa đổi bộ lọc)
  const visibleIds = useMemo(() => new Set(filtered.map((r) => r.word.id)), [filtered])
  const selectedIds = useMemo(() => [...selected].filter((id) => visibleIds.has(id)), [selected, visibleIds])
  const allSelected = selectedIds.length > 0 && selectedIds.length === filtered.length

  const toggleWord = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  const stopSelecting = () => {
    setSelecting(false)
    setSelected(new Set())
  }

  // Trang trên URL có thể vượt quá số trang hiện có (vừa xóa từ, đổi bộ lọc) nên được kẹp lại
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = Math.min(requestedPage, pageCount)
  const pageStart = (page - 1) * pageSize
  const pageEnd = Math.min(filtered.length, pageStart + pageSize)

  const now = Date.now()

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Kho từ vựng"
        description={`${rows.length} từ trong sổ tay của bạn`}
        actions={
          <>
            {tagCounts.length > 0 && (
              <Button variant="secondary" onClick={() => setManagingTags(true)}>
                <TagIcon className="size-4" /> Quản lý nhãn
              </Button>
            )}
            <ButtonLink to="/words/new" variant="primary">
              <Plus className="size-4.5" /> Thêm từ mới
            </ButtonLink>
          </>
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
                value={searchDraft}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Tìm từ, nghĩa hoặc nhãn…"
                aria-label="Tìm kiếm"
                className="h-12 pr-10 pl-11 text-[15px]"
              />
              {searchDraft && (
                <button
                  type="button"
                  onClick={clearSearch}
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
                {tagCounts.length > 0 && (
                  <Select
                    value={tag}
                    onChange={(v) => setParam('tag', v, '')}
                    aria-label="Lọc theo nhãn"
                    className="min-w-0 flex-1 sm:w-44 sm:flex-none"
                    options={[
                      { value: '', label: 'Tất cả nhãn', icon: <Tags />, meta: String(rows.length) },
                      ...(untaggedCount > 0
                        ? [{ value: NO_TAG, label: 'Chưa có nhãn', icon: <TagIcon />, meta: String(untaggedCount) }]
                        : []),
                      ...tagCounts.map((t) => ({ value: t.tag, label: `#${t.tag}`, meta: String(t.count) })),
                    ]}
                  />
                )}
                <Select<Sort>
                  value={sort}
                  onChange={(v) => setParam('sort', v, 'newest')}
                  aria-label="Sắp xếp"
                  className="min-w-0 flex-1 sm:w-48 sm:flex-none"
                  options={[
                    { value: 'newest', label: 'Mới thêm trước', icon: <Sparkles /> },
                    { value: 'oldest', label: 'Cũ nhất trước', icon: <History /> },
                    { value: 'az', label: 'Theo A → Z', icon: <ArrowDownAZ /> },
                    { value: 'due', label: 'Sắp đến hạn ôn', icon: <CalendarClock /> },
                    { value: 'lapses', label: 'Hay quên nhất', icon: <RotateCcw /> },
                  ]}
                />
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={<Search />} title="Không tìm thấy từ phù hợp">
              Thử từ khóa khác hoặc bỏ bớt bộ lọc.
            </EmptyState>
          ) : (
            <div ref={listTopRef} className="scroll-mt-20 space-y-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="text-xs font-medium text-muted tabular-nums">
                  {filtered.length > pageSize ? (
                    <>
                      Từ <span className="text-ink-2">{pageStart + 1}–{pageEnd}</span> trong {filtered.length} từ
                    </>
                  ) : (
                    `${filtered.length} từ`
                  )}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  {selecting ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelected(allSelected ? new Set() : new Set(filtered.map((r) => r.word.id)))}
                    >
                      <SquareCheck className="size-4" />
                      {allSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả ${filtered.length}`}
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => setSelecting(true)}>
                      <SquareCheck className="size-4" /> Chọn
                    </Button>
                  )}
                  <div className="w-32">
                  <Select
                    size="sm"
                    value={pageSize}
                    onChange={(v) => setParam('per', String(v), String(DEFAULT_PAGE_SIZE))}
                    aria-label="Số từ mỗi trang"
                    options={PAGE_SIZES.map((size) => ({ value: size, label: `${size} / trang` }))}
                  />
                  </div>
                </div>
              </div>

              <Card className="divide-y divide-line overflow-hidden">
                {filtered.slice(pageStart, pageEnd).map((row) => {
                  const isSelected = selected.has(row.word.id)
                  const info = (
                    <>
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
                    </>
                  )
                  return (
                  <div
                    key={row.word.id}
                    className={cn(
                      'group relative flex items-center gap-3 px-4 py-3.5 transition-colors sm:px-5 sm:py-4',
                      isSelected ? 'bg-accent-wash' : 'hover:bg-surface-2/60',
                    )}
                  >
                    {selecting ? (
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleWord(row.word.id)}
                          aria-label={`Chọn ${row.word.term}`}
                          className="size-4.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">{info}</div>
                      </label>
                    ) : (
                      <Link to={`/words/${row.word.id}`} className="min-w-0 flex-1 after:absolute after:inset-0">
                        {info}
                      </Link>
                    )}

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
                      {!selecting && (
                        <ChevronRight
                          aria-hidden
                          className="hidden size-4 text-muted transition-transform group-hover:translate-x-0.5 sm:block"
                        />
                      )}
                    </div>
                  </div>
                  )
                })}
              </Card>

              {selecting && (
                <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-10 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface/90 p-2.5 shadow-float backdrop-blur-xl md:bottom-4">
                  <p className="px-1.5 text-[13px] font-medium text-ink-2 tabular-nums">
                    {selectedIds.length > 0 ? (
                      <>
                        Đã chọn <span className="font-semibold text-ink">{selectedIds.length}</span> từ
                      </>
                    ) : (
                      'Tích chọn các từ muốn gắn nhãn'
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={stopSelecting}>
                      Xong
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={selectedIds.length === 0}
                      onClick={() => setTaggingSelection(true)}
                    >
                      <Tags className="size-4" /> Gắn nhãn
                    </Button>
                  </div>
                </div>
              )}

              <Pagination page={page} pageCount={pageCount} onChange={goToPage} className="pt-1" />
            </div>
          )}
        </>
      )}
      <AddTagsDialog
        open={taggingSelection}
        onClose={() => setTaggingSelection(false)}
        wordIds={selectedIds}
        suggestions={tagCounts.map((t) => t.tag)}
        onDone={stopSelecting}
      />

      <TagManagerDialog
        open={managingTags}
        onClose={() => setManagingTags(false)}
        tags={tagCounts}
        initialTag={tag}
        onRenamed={(from, to) => {
          // Đang lọc theo nhãn vừa đổi tên thì giữ nguyên bộ lọc với tên mới
          if (tag === from) setParam('tag', to, '')
        }}
        onDeleted={(deleted) => {
          // Nhãn đang lọc bị xóa thì quay về xem tất cả
          if (tag === deleted) setParam('tag', '', '')
        }}
      />
    </div>
  )
}
