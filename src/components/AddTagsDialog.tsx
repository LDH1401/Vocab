import { Tag } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { addTagsToWords } from '../db/words'
import { errorMessage } from '../lib/api'
import { TagInput } from './TagInput'
import { Button, Dialog, Field, Spinner } from './ui'

/** Gắn nhãn cho nhiều từ cùng lúc */
export function AddTagsDialog({
  open,
  onClose,
  wordIds,
  suggestions,
  onDone,
}: {
  open: boolean
  onClose: () => void
  wordIds: string[]
  suggestions: string[]
  onDone?: () => void
}) {
  const [tags, setTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (open && !wasOpen.current) setTags([])
    wasOpen.current = open
  }, [open])

  const save = async () => {
    if (tags.length === 0 || saving) return
    setSaving(true)
    try {
      const changed = await addTagsToWords(wordIds, tags)
      const names = tags.map((t) => `“${t}”`).join(', ')
      toast.success(
        changed > 0
          ? `Đã gắn nhãn ${names} cho ${changed} từ.`
          : `${wordIds.length} từ đã có sẵn nhãn ${names}, không có gì thay đổi.`,
      )
      onDone?.()
      onClose()
    } catch (err) {
      toast.error('Không gắn được nhãn', { description: errorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Gắn nhãn cho từ đã chọn"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button variant="primary" onClick={save} disabled={tags.length === 0 || saving}>
            {saving ? <Spinner /> : <Tag className="size-4" />} Gắn cho {wordIds.length} từ
          </Button>
        </>
      }
    >
      <Field
        label="Nhãn muốn gắn"
        htmlFor="add-tags-input"
        hint="Gõ rồi nhấn Enter để thêm. Từ nào đã có sẵn nhãn này sẽ được giữ nguyên."
      >
        <TagInput id="add-tags-input" value={tags} onChange={setTags} suggestions={suggestions} placeholder="e.g. IELTS, Business" />
      </Field>
    </Dialog>
  )
}
