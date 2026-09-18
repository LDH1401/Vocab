import {
  Activity,
  ArrowLeft,
  BookOpen,
  Check,
  Languages,
  Plus,
  Quote,
  RotateCcw,
  SearchX,
  Sparkles,
  Tag as TagIcon,
  Trash2,
  TriangleAlert,
  Volume2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { SpeakButton } from '../components/SpeakButton'
import { ExampleSentence } from '../components/WordDetails'
import { TagInput } from '../components/TagInput'
import {
  Button,
  ButtonLink,
  Card,
  Dialog,
  EmptyState,
  Field,
  Input,
  PageHeader,
  SectionHeader,
  Select,
  Spinner,
  StatusPill,
  Textarea,
} from '../components/ui'
import { enrichWordFromDictionary } from '../db/enrich'
import { useData } from '../db/store'
import type { CardRecord, WordInput } from '../db/types'
import { addWord, deleteWord, findWordsByTerm, resetWordProgress, updateWord } from '../db/words'
import { useSettings } from '../hooks/useSettings'
import { formatDate, formatDue } from '../lib/date'
import { lookupWord, pickPhonetic } from '../lib/dictionary'
import { CARD_TYPE_INFO, PARTS_OF_SPEECH, posInfo } from '../lib/labels'
import { pronounce } from '../lib/speech'
import { wordStatus } from '../lib/srs'
import { suggestVietnamese } from '../lib/translate'
import { sanitizeWordInput } from '../lib/wordData'

const EMPTY_INPUT: WordInput = {
  term: '',
  meaning: '',
  ipa: '',
  partOfSpeech: '',
  definition: '',
  examples: [],
  synonyms: [],
  note: '',
  tags: [],
  audioUrl: '',
}

export default function WordEditPage() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const settings = useSettings()

  const data = useData()
  const existingWord = id ? (data.words.find((w) => w.id === id) ?? null) : null
  const existingCards = useMemo(() => (id ? data.cards.filter((c) => c.wordId === id) : []), [data.cards, id])
  const allTags = useMemo(
    () => [...new Set(data.words.flatMap((w) => w.tags))].sort((a, b) => a.localeCompare(b, 'vi')),
    [data.words],
  )

  const [form, setForm] = useState<WordInput>(EMPTY_INPUT)
  const [newExample, setNewExample] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [meaningSuggestions, setMeaningSuggestions] = useState<string[]>([])
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)

  const termInputRef = useRef<HTMLInputElement>(null)
  const loadedVersion = useRef('')

  // Chỉ nạp lại form khi từ thật sự được cập nhật, không phải mỗi lần dữ liệu được tải lại từ server
  useEffect(() => {
    const version = existingWord ? `${existingWord.id}:${existingWord.updatedAt}` : ''
    if (existingWord && version !== loadedVersion.current) {
      loadedVersion.current = version
      setForm({
        term: existingWord.term,
        meaning: existingWord.meaning,
        ipa: existingWord.ipa,
        partOfSpeech: existingWord.partOfSpeech,
        definition: existingWord.definition,
        examples: existingWord.examples,
        synonyms: existingWord.synonyms,
        note: existingWord.note,
        tags: existingWord.tags,
        audioUrl: existingWord.audioUrl,
      })
    }
  }, [existingWord])

  useEffect(() => {
    const trimmed = form.term.trim()
    if (!trimmed) {
      setDuplicateWarning(null)
      return
    }
    let cancelled = false
    findWordsByTerm(trimmed).then((matches) => {
      if (cancelled) return
      const duplicate = matches.find((w) => !id || w.id !== id)
      if (duplicate) {
        setDuplicateWarning(`Từ "${duplicate.term}" đã có trong danh sách (nghĩa: "${duplicate.meaning}").`)
      } else {
        setDuplicateWarning(null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [form.term, id])

  const updateField = <K extends keyof WordInput>(field: K, value: WordInput[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleLookupDictionary = async () => {
    const term = form.term.trim()
    if (!term) {
      toast.info('Vui lòng nhập từ tiếng Anh trước khi tra từ điển.')
      termInputRef.current?.focus()
      return
    }
    setLookingUp(true)
    try {
      const entry = await lookupWord(term)
      if (!entry) {
        toast.info(`Không tìm thấy từ "${term}" trong từ điển.`)
        return
      }

      const { ipa, audio } = pickPhonetic(entry, settings.accent)
      const firstMeaning = entry.meanings[0]
      const dictExamples = entry.meanings
        .flatMap((m) => m.senses.map((s) => s.example))
        .filter(Boolean)
        .slice(0, 3)

      setForm((prev) => ({
        ...prev,
        ipa: prev.ipa || ipa,
        audioUrl: prev.audioUrl || audio,
        partOfSpeech: prev.partOfSpeech || firstMeaning?.partOfSpeech || '',
        definition: prev.definition || firstMeaning?.senses[0]?.definition || '',
        examples: prev.examples.length > 0 ? prev.examples : dictExamples,
        synonyms: prev.synonyms.length > 0 ? prev.synonyms : (firstMeaning?.synonyms.slice(0, 6) ?? []),
      }))

      toast.success('Đã nạp thông tin từ điển!')

      if (!form.meaning.trim()) {
        void handleSuggestMeaning(term)
      }
    } catch {
      toast.error('Lỗi khi tra từ điển trực tuyến.')
    } finally {
      setLookingUp(false)
    }
  }

  const handleSuggestMeaning = async (termToTranslate?: string) => {
    const term = (termToTranslate ?? form.term).trim()
    if (!term) return
    setTranslating(true)
    try {
      const suggestions = await suggestVietnamese(term)
      setMeaningSuggestions(suggestions)
      if (suggestions.length === 0 && !termToTranslate) {
        toast.info('Chưa có gợi ý dịch tự động cho từ này.')
      }
    } catch {
      // Non-fatal
    } finally {
      setTranslating(false)
    }
  }

  const addExample = () => {
    const trimmed = newExample.trim()
    if (!trimmed) return
    if (!form.examples.includes(trimmed)) {
      updateField('examples', [...form.examples, trimmed])
    }
    setNewExample('')
  }

  const removeExample = (index: number) => {
    updateField(
      'examples',
      form.examples.filter((_, i) => i !== index),
    )
  }

  const save = async (andContinue = false) => {
    const cleanInput = sanitizeWordInput(form)
    if (!cleanInput.term || !cleanInput.meaning) {
      toast.error('Vui lòng nhập cả từ tiếng Anh và nghĩa tiếng Việt.')
      return
    }

    setSaving(true)
    try {
      if (isEditing && id) {
        await updateWord(id, cleanInput)
        toast.success(`Đã cập nhật từ "${cleanInput.term}".`)
        navigate('/words')
      } else {
        const created = await addWord(cleanInput)
        toast.success(`Đã thêm từ "${created.term}".`)
        if (!cleanInput.ipa || !cleanInput.audioUrl) {
          enrichWordFromDictionary(created.id, settings.accent).catch(() => {})
        }

        if (andContinue) {
          setForm(EMPTY_INPUT)
          setNewExample('')
          setMeaningSuggestions([])
          setDuplicateWarning(null)
          termInputRef.current?.focus()
        } else {
          navigate('/words')
        }
      }
    } catch {
      toast.error('Không thể lưu từ vựng.')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void save(false)
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteWord(id)
      toast.success('Đã xóa từ vựng.')
      navigate('/words')
    } catch {
      toast.error('Không thể xóa từ vựng.')
    }
  }

  const handleResetProgress = async () => {
    if (!id) return
    try {
      await resetWordProgress(id)
      setShowResetDialog(false)
      toast.success('Đã đặt lại tiến độ học của từ này về ban đầu.')
    } catch {
      toast.error('Không thể đặt lại tiến độ.')
    }
  }

  if (isEditing && existingWord === null) {
    return (
      <EmptyState
        icon={<SearchX />}
        title="Không tìm thấy từ vựng"
        actions={
          <ButtonLink to="/words" variant="primary">
            <ArrowLeft className="size-4" /> Quay lại danh sách
          </ButtonLink>
        }
      >
        Từ này có thể đã bị xóa hoặc đường dẫn không đúng.
      </EmptyState>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <ButtonLink to="/words" variant="ghost" size="sm" className="-ml-2.5 mb-2 text-muted">
          <ArrowLeft className="size-4" /> Kho từ vựng
        </ButtonLink>
        <PageHeader
          title={isEditing ? form.term || 'Chỉnh sửa từ' : 'Thêm từ vựng mới'}
          description={
            isEditing
              ? `Thêm vào sổ ngày ${formatDate(existingWord!.createdAt)}`
              : 'Nhập từ rồi bấm “Tra từ điển” để tự điền phiên âm, định nghĩa và ví dụ.'
          }
        />
      </div>

      {duplicateWarning && (
        <div className="flex animate-fade-up items-start gap-2.5 rounded-xl border border-warning/35 bg-warning-wash px-4 py-3 text-sm text-ink">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-ink" />
          {duplicateWarning}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        {/* Section 1: Core Word & Meaning */}
        <Card className="space-y-5 p-5 sm:p-6">
          <SectionHeader icon={<BookOpen />} title="Thông tin cốt lõi" description="Từ tiếng Anh, nghĩa và cách phát âm." />

          {/* Term input & Dictionary trigger */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="term" className="text-[13px] font-semibold text-ink">
                Từ tiếng Anh <span className="text-critical-ink">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                {form.term.trim() && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => pronounce({ term: form.term, audioUrl: form.audioUrl }, settings)}
                    title="Nghe phát âm"
                  >
                    <Volume2 className="size-4" /> Nghe
                  </Button>
                )}
                <Button
                  type="button"
                  variant="soft"
                  size="sm"
                  disabled={lookingUp || !form.term.trim()}
                  onClick={handleLookupDictionary}
                >
                  {lookingUp ? <Spinner /> : <Sparkles className="size-4" />} Tra từ điển
                </Button>
              </div>
            </div>
            <Input
              id="term"
              ref={termInputRef}
              value={form.term}
              onChange={(e) => updateField('term', e.target.value)}
              placeholder="e.g. resilient, breakthrough, take for granted"
              autoFocus={!isEditing}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              lang="en"
              className="h-13 font-display text-xl font-semibold"
              required
            />
          </div>

          {/* Meaning & translation suggestions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="meaning" className="text-[13px] font-semibold text-ink">
                Nghĩa tiếng Việt <span className="text-critical-ink">*</span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={translating || !form.term.trim()}
                onClick={() => handleSuggestMeaning()}
              >
                {translating ? <Spinner /> : <Languages className="size-4" />} Gợi ý nghĩa
              </Button>
            </div>
            <Input
              id="meaning"
              value={form.meaning}
              onChange={(e) => updateField('meaning', e.target.value)}
              placeholder="e.g. kiên cường, mau hồi phục"
              className="h-12 text-base font-medium"
              required
            />

            {meaningSuggestions.length > 0 && (
              <div className="flex animate-fade-up flex-wrap items-center gap-1.5 pt-1">
                <span className="mr-0.5 text-xs font-medium text-muted">Gợi ý</span>
                {meaningSuggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => updateField('meaning', sug)}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-accent/50 hover:bg-accent-wash hover:text-accent-ink"
                  >
                    <Plus className="size-3" /> {sug}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* IPA & Part of Speech */}
          <div className="grid gap-4 sm:grid-cols-2 pt-1">
            <Field label="Phiên âm IPA" hint="e.g. /rɪˈzɪl.jənt/">
              <Input
                value={form.ipa}
                onChange={(e) => updateField('ipa', e.target.value)}
                placeholder="/.../"
                autoCapitalize="off"
                spellCheck={false}
                className="font-ipa text-[15px]"
              />
            </Field>

            <Field label="Từ loại" htmlFor="pos-select">
              <Select
                id="pos-select"
                value={form.partOfSpeech}
                onChange={(v) => updateField('partOfSpeech', v)}
                options={[
                  { value: '', label: 'Chưa chọn' },
                  ...PARTS_OF_SPEECH.map((p) => ({ value: p.value, label: p.label, meta: p.short })),
                  // Từ loại lạ lấy từ từ điển vẫn được hiện thay vì bị trống
                  ...(form.partOfSpeech && !PARTS_OF_SPEECH.some((p) => p.value === form.partOfSpeech)
                    ? [{ value: form.partOfSpeech, label: posInfo(form.partOfSpeech).label }]
                    : []),
                ]}
              />
            </Field>
          </div>

          {/* Audio URL */}
          <Field label="File phát âm trực tiếp (Audio URL)" hint="Tự điền khi tra từ điển để có phát âm chuẩn từ người bản ngữ">
            <div className="flex gap-2">
              <Input
                value={form.audioUrl}
                onChange={(e) => updateField('audioUrl', e.target.value)}
                placeholder="https://...mp3"
                className="font-mono text-xs"
              />
              {form.audioUrl && (
                <SpeakButton text={form.term} audioUrl={form.audioUrl} settings={settings} />
              )}
            </div>
          </Field>
        </Card>

        {/* Section 2: Examples & Definition */}
        <Card className="space-y-5 p-5 sm:p-6">
          <SectionHeader
            icon={<Quote />}
            tone="sky"
            title="Định nghĩa & câu ví dụ"
            description="Câu ví dụ có chứa từ sẽ tự tạo thẻ “Điền vào câu”."
          />

          <Field label="Định nghĩa tiếng Anh (tùy chọn)" hint="Hiểu nghĩa gốc bằng tiếng Anh để nhớ sâu và chính xác hơn">
            <Textarea
              value={form.definition}
              onChange={(e) => updateField('definition', e.target.value)}
              placeholder="e.g. able to become strong, happy, or successful again after a difficult situation or event"
            />
          </Field>

          {/* Examples list */}
          <div className="space-y-2.5">
            <p className="text-[13px] font-semibold text-ink">Câu ví dụ</p>

            {form.examples.length > 0 && (
              <ul className="space-y-2">
                {form.examples.map((ex, index) => (
                  <li
                    key={index}
                    className="group flex items-start justify-between gap-3 rounded-xl border border-line bg-surface-2/50 py-2.5 pr-2 pl-3.5"
                  >
                    <span className="flex-1 font-display text-base leading-relaxed text-ink">
                      <ExampleSentence word={form} example={ex} />
                    </span>
                    <button
                      type="button"
                      onClick={() => removeExample(index)}
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-critical-wash hover:text-critical-ink"
                      aria-label="Xóa ví dụ"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <Input
                value={newExample}
                onChange={(e) => setNewExample(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addExample()
                  }
                }}
                placeholder="Nhập câu ví dụ rồi bấm Thêm..."
              />
              <Button type="button" variant="secondary" onClick={addExample} disabled={!newExample.trim()} className="h-11">
                <Plus className="size-4.5" /> Thêm
              </Button>
            </div>
          </div>
        </Card>

        {/* Section 3: Classification & Notes */}
        <Card className="space-y-5 p-5 sm:p-6">
          <SectionHeader
            icon={<TagIcon />}
            tone="violet"
            title="Phân loại & ghi chú"
            description="Từ đồng nghĩa, nhãn chủ đề và mẹo ghi nhớ của riêng bạn."
          />

          <Field label="Từ đồng nghĩa" htmlFor="synonyms-input" hint="Gõ rồi nhấn Enter hoặc dấu phẩy để thêm">
            <TagInput
              id="synonyms-input"
              value={form.synonyms}
              onChange={(syns) => updateField('synonyms', syns)}
              placeholder="e.g. robust, durable, tough"
            />
          </Field>

          <Field label="Nhãn / Chủ đề (Tag)" htmlFor="tags-input" hint="Phân loại theo bộ đề (IELTS, TOEIC, Kinh tế, Giao tiếp...)">
            <TagInput
              id="tags-input"
              value={form.tags}
              onChange={(tags) => updateField('tags', tags)}
              suggestions={allTags}
              placeholder="e.g. IELTS, Business, C1"
            />
          </Field>

          <Field label="Ghi chú cá nhân" hint="Mẹo ghi nhớ, collocation thường gặp, ngữ cảnh sử dụng...">
            <Textarea
              value={form.note}
              onChange={(e) => updateField('note', e.target.value)}
              placeholder="e.g. Thường đi kèm: resilient economy, highly resilient..."
            />
          </Field>
        </Card>

        {/* Thanh lưu dính dưới đáy màn hình */}
        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-10 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface/85 p-2.5 shadow-float backdrop-blur-xl md:bottom-4">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={saving || !form.term.trim() || !form.meaning.trim()}
              className="flex-1 sm:flex-none"
            >
              {saving ? <Spinner /> : <Check className="size-4.5" />}
              {isEditing ? 'Lưu thay đổi' : 'Lưu từ vựng'}
            </Button>

            {!isEditing && (
              <Button
                type="button"
                variant="secondary"
                disabled={saving || !form.term.trim() || !form.meaning.trim()}
                onClick={() => save(true)}
                className="flex-1 sm:flex-none"
              >
                <Plus className="size-4.5" /> Lưu & thêm tiếp
              </Button>
            )}

            <ButtonLink to="/words" variant="ghost" className="hidden sm:inline-flex">
              Hủy
            </ButtonLink>
          </div>

          {isEditing && (
            <Button
              type="button"
              variant="danger"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
              aria-label="Xóa từ"
              title="Xóa từ"
            >
              <Trash2 className="size-4.5" />
            </Button>
          )}
        </div>
      </form>

      {/* Card FSRS learning stats for editing mode */}
      {isEditing && existingCards.length > 0 && (
        <Card className="space-y-5 p-5 sm:p-6">
          <SectionHeader
            icon={<Activity />}
            tone="amber"
            title="Tiến trình học FSRS"
            description="Trạng thái ghi nhớ và lịch ôn của từng dạng thẻ."
            actions={
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowResetDialog(true)}>
                <RotateCcw className="size-4" /> <span className="hidden sm:inline">Đặt lại</span>
              </Button>
            }
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {existingCards.map((c: CardRecord) => (
              <div key={c.id} className="rounded-xl border border-line p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{CARD_TYPE_INFO[c.type]?.name ?? c.type}</span>
                  <StatusPill status={wordStatus([c])} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                  <CardStat label="Lịch ôn" value={formatDue(c.due, Date.now())} />
                  <CardStat label="Số lần ôn" value={`${c.reps} · quên ${c.lapses}`} />
                  <CardStat label="Độ ổn định" value={`${c.stability.toFixed(1)} ngày`} />
                  <CardStat label="Độ khó" value={`${c.difficulty.toFixed(1)} / 10`} />
                </dl>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Xác nhận xóa từ vựng"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Xóa vĩnh viễn
            </Button>
          </>
        }
      >
        <p>
          Bạn có chắc chắn muốn xóa từ <strong className="text-ink">"{form.term}"</strong> không?
          Mọi thẻ ôn tập của từ này cũng sẽ bị xóa.
        </p>
      </Dialog>

      {/* Reset progress dialog */}
      <Dialog
        open={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        title="Đặt lại tiến độ học"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowResetDialog(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleResetProgress}>
              <RotateCcw className="size-4" />
              Đặt lại
            </Button>
          </>
        }
      >
        <p>
          Các thẻ của từ <strong className="text-ink">"{form.term}"</strong> sẽ được đưa về trạng thái "Mới" như ban đầu.
        </p>
      </Dialog>
    </div>
  )
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink tabular-nums">{value}</dd>
    </div>
  )
}
