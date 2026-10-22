import { Check } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useData } from '../db/store'
import type { Word, WordInput } from '../db/types'
import { updateWord } from '../db/words'
import { PARTS_OF_SPEECH, posInfo } from '../lib/labels'
import { countTags } from '../lib/tags'
import { sanitizeWordInput } from '../lib/wordData'
import { TagInput } from './TagInput'
import { Button, Dialog, Field, Input, Select, Textarea } from './ui'

function toForm(word: Word): WordInput & { examplesText: string } {
  return { ...word, examplesText: word.examples.join('\n') }
}

/** Sửa nhanh một từ ngay trong lúc ôn tập/luyện tập, không phải rời phiên học */
export function EditWordDialog({ open, onClose, word }: { open: boolean; onClose: () => void; word: Word }) {
  const { words } = useData()
  const tagSuggestions = useMemo(() => countTags(words).map((t) => t.tag), [words])
  const [form, setForm] = useState(() => toForm(word))
  const wasOpen = useRef(false)

  // Mỗi lần mở thì nạp lại dữ liệu mới nhất của từ
  useEffect(() => {
    if (open && !wasOpen.current) setForm(toForm(word))
    wasOpen.current = open
  }, [open, word])

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  const input = sanitizeWordInput({ ...form, examples: form.examplesText.split('\n') })
  const canSave = input.term !== '' && input.meaning !== ''

  const save = async () => {
    if (!canSave) return
    await updateWord(word.id, input)
    toast.success(`Đã lưu “${input.term}”.`)
    onClose()
  }

  const posOptions = [
    { value: '', label: 'Chưa chọn' },
    ...PARTS_OF_SPEECH.map((p) => ({ value: p.value, label: p.label, meta: p.short })),
    ...(form.partOfSpeech && !PARTS_OF_SPEECH.some((p) => p.value === form.partOfSpeech)
      ? [{ value: form.partOfSpeech, label: posInfo(form.partOfSpeech).label }]
      : []),
  ]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Sửa từ vựng"
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" onClick={save} disabled={!canSave}>
            <Check className="size-4" /> Lưu
          </Button>
        </>
      }
    >
      <div className="grid gap-4 pt-2 text-ink sm:grid-cols-2">
        <Field label="Từ tiếng Anh" htmlFor="edit-term">
          <Input
            id="edit-term"
            value={form.term}
            onChange={(e) => set('term', e.target.value)}
            autoCapitalize="off"
            spellCheck={false}
            lang="en"
            className="font-display text-base font-semibold"
          />
        </Field>
        <Field label="Nghĩa tiếng Việt" htmlFor="edit-meaning">
          <Input id="edit-meaning" value={form.meaning} onChange={(e) => set('meaning', e.target.value)} />
        </Field>
        <Field label="Phiên âm IPA" htmlFor="edit-ipa">
          <Input
            id="edit-ipa"
            value={form.ipa}
            onChange={(e) => set('ipa', e.target.value)}
            spellCheck={false}
            className="font-ipa text-[15px]"
          />
        </Field>
        <Field label="Từ loại" htmlFor="edit-pos">
          <Select id="edit-pos" value={form.partOfSpeech} onChange={(v) => set('partOfSpeech', v)} options={posOptions} />
        </Field>
        <Field label="Định nghĩa tiếng Anh" htmlFor="edit-definition" className="sm:col-span-2">
          <Textarea
            id="edit-definition"
            value={form.definition}
            onChange={(e) => set('definition', e.target.value)}
            className="min-h-16"
          />
        </Field>
        <Field label="Câu ví dụ" htmlFor="edit-examples" hint="Mỗi dòng một câu." className="sm:col-span-2">
          <Textarea
            id="edit-examples"
            value={form.examplesText}
            onChange={(e) => set('examplesText', e.target.value)}
            className="min-h-20"
          />
        </Field>
        <Field label="Từ đồng nghĩa" htmlFor="edit-synonyms">
          <TagInput id="edit-synonyms" value={form.synonyms} onChange={(v) => set('synonyms', v)} />
        </Field>
        <Field label="Nhãn" htmlFor="edit-tags">
          <TagInput id="edit-tags" value={form.tags} onChange={(v) => set('tags', v)} suggestions={tagSuggestions} />
        </Field>
        <Field label="Ghi chú" htmlFor="edit-note" className="sm:col-span-2">
          <Textarea id="edit-note" value={form.note} onChange={(e) => set('note', e.target.value)} className="min-h-16" />
        </Field>
      </div>
    </Dialog>
  )
}
