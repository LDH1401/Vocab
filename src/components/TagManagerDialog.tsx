import { Merge, PencilLine, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { deleteTag, renameTag } from '../db/words'
import { errorMessage } from '../lib/api'
import type { TagCount } from '../lib/tags'
import { Button, Dialog, Field, Input, Select, Spinner } from './ui'

/** Đổi tên hoặc xóa một nhãn, áp dụng cho mọi từ đang mang nhãn đó */
export function TagManagerDialog({
  open,
  onClose,
  tags,
  initialTag,
  onRenamed,
  onDeleted,
}: {
  open: boolean
  onClose: () => void
  tags: TagCount[]
  initialTag?: string
  onRenamed?: (from: string, to: string) => void
  onDeleted?: (tag: string) => void
}) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const wasOpen = useRef(false)

  // Đặt lại các ô mỗi lần mở hộp thoại (không đụng vào khi người dùng đang gõ)
  useEffect(() => {
    if (open && !wasOpen.current) {
      const tag = initialTag && tags.some((t) => t.tag === initialTag) ? initialTag : (tags[0]?.tag ?? '')
      setFrom(tag)
      setTo(tag)
      setConfirmingDelete(false)
    }
    wasOpen.current = open
  }, [open, initialTag, tags])

  const target = to.trim()
  const count = tags.find((t) => t.tag === from)?.count ?? 0
  const mergesInto = tags.find((t) => t.tag !== from && t.tag.toLowerCase() === target.toLowerCase())
  const canRename = Boolean(from) && target !== '' && target !== from && !busy

  const save = async () => {
    if (!canRename) return
    setBusy(true)
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
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!from || busy) return
    setBusy(true)
    try {
      const changed = await deleteTag(from)
      toast.success(`Đã xóa nhãn “${from}” khỏi ${changed} từ.`)
      onDeleted?.(from)
      onClose()
    } catch (err) {
      toast.error('Không xóa được nhãn', { description: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void save()
    }
  }

  if (confirmingDelete) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        title="Xóa nhãn"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={busy}>
              Quay lại
            </Button>
            <Button variant="danger" onClick={remove} disabled={busy}>
              {busy ? <Spinner /> : <Trash2 className="size-4" />} Xóa nhãn
            </Button>
          </>
        }
      >
        <p className="flex items-start gap-2 rounded-xl border border-critical/25 bg-critical-wash px-3.5 py-2.5 text-[13px] text-ink">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-critical-ink" />
          <span>
            Nhãn <strong className="font-semibold">“{from}”</strong> sẽ bị bỏ khỏi {count} từ. Các từ vựng vẫn còn
            nguyên cùng tiến độ học, chỉ mất nhãn này.
          </span>
        </p>
      </Dialog>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Quản lý nhãn"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Đóng
          </Button>
          <Button variant="primary" onClick={save} disabled={!canRename}>
            {busy ? <Spinner /> : <PencilLine className="size-4" />} Đổi tên
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nhãn" htmlFor="manage-tag-from">
          <Select
            id="manage-tag-from"
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
          htmlFor="manage-tag-to"
          hint={count > 0 ? `Áp dụng cho ${count} từ đang mang nhãn này.` : undefined}
        >
          <Input
            id="manage-tag-to"
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

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <p className="text-[13px] text-ink-2">Không dùng nhãn này nữa?</p>
          <Button variant="danger" size="sm" onClick={() => setConfirmingDelete(true)} disabled={!from || busy}>
            <Trash2 className="size-4" /> Xóa nhãn
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
