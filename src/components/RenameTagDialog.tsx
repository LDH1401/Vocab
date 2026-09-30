import { Merge, PencilLine } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { renameTag } from '../db/words'
import { errorMessage } from '../lib/api'
import type { TagCount } from '../lib/tags'
import { Button, Dialog, Field, Input, Select, Spinner } from './ui'

/** Đổi tên một nhãn cho toàn bộ từ đang mang nhãn đó */
export function RenameTagDialog({
  open,
  onClose,
  tags,
  initialTag,
  onRenamed,
}: {
  open: boolean
  onClose: () => void
  tags: TagCount[]
  initialTag?: string
  onRenamed?: (from: string, to: string) => void
}) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [saving, setSaving] = useState(false)
  const wasOpen = useRef(false)

  // Đặt lại các ô mỗi lần mở hộp thoại (không đụng vào khi người dùng đang gõ)
  useEffect(() => {
    if (open && !wasOpen.current) {
      const tag = initialTag && tags.some((t) => t.tag === initialTag) ? initialTag : (tags[0]?.tag ?? '')
      setFrom(tag)
      setTo(tag)
    }
    wasOpen.current = open
  }, [open, initialTag, tags])

  const target = to.trim()
  const count = tags.find((t) => t.tag === from)?.count ?? 0
  const mergesInto = tags.find((t) => t.tag !== from && t.tag.toLowerCase() === target.toLowerCase())
  const canSave = Boolean(from) && target !== '' && target !== from && !saving

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const changed = await renameTag(from, target)
      toast.success(
        mergesInto
          ? `Đã gộp nhãn “${from}” vào “${mergesInto.tag}” cho ${changed} từ.`
          : `Đã đổi nhãn “${from}” thành “${target}” cho ${changed} từ.`,
      )
      onRenamed?.(from, mergesInto?.tag ?? target)
      onClose()
    } catch (err) {
      toast.error('Không đổi được tên nhãn', { description: errorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void save()
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Đổi tên nhãn"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button variant="primary" onClick={save} disabled={!canSave}>
            {saving ? <Spinner /> : <PencilLine className="size-4" />} Đổi tên
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nhãn cần đổi" htmlFor="rename-tag-from">
          <Select
            id="rename-tag-from"
            value={from}
            onChange={(v) => {
              setFrom(v)
              setTo(v)
            }}
            options={tags.map((t) => ({ value: t.tag, label: `#${t.tag}`, meta: `${t.count} từ` }))}
          />
        </Field>

        <Field
          label="Tên mới"
          htmlFor="rename-tag-to"
          hint={count > 0 ? `Áp dụng cho ${count} từ đang mang nhãn này.` : undefined}
        >
          <Input
            id="rename-tag-to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Tên nhãn mới"
            autoFocus
          />
        </Field>

        {mergesInto && (
          <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-wash px-3.5 py-2.5 text-[13px] text-ink">
            <Merge aria-hidden className="mt-0.5 size-4 shrink-0 text-warning-ink" />
            Đã có nhãn “{mergesInto.tag}”. Hai nhãn sẽ được gộp làm một, từ nào có cả hai chỉ còn lại một nhãn.
          </p>
        )}
      </div>
    </Dialog>
  )
}
