import { CircleCheck, DatabaseZap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { importBackup } from '../db/backup'
import { deleteLegacyDatabase, readLegacyBackup } from '../db/legacy'
import type { Backup } from '../lib/backupFormat'
import { errorMessage } from '../lib/api'
import { Button, IconChip, Spinner } from './ui'

const DISMISSED_KEY = 'vocab-legacy-dismissed'
const UPLOADED_KEY = 'vocab-legacy-uploaded'
const numberFormat = new Intl.NumberFormat('vi-VN')

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function setFlag(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // Không lưu được thì lần sau vẫn hỏi lại
  }
}

type Phase = 'hidden' | 'found' | 'uploading' | 'uploaded' | 'deleting'

/** Phát hiện dữ liệu của phiên bản cũ (IndexedDB trong trình duyệt) và đề nghị chuyển lên MongoDB */
export function LegacyImport({ ignoreDismissed = false }: { ignoreDismissed?: boolean }) {
  const [phase, setPhase] = useState<Phase>('hidden')
  const [legacy, setLegacy] = useState<Backup | null>(null)

  useEffect(() => {
    if (!ignoreDismissed && readFlag(DISMISSED_KEY)) return
    let cancelled = false
    readLegacyBackup()
      .then((backup) => {
        if (cancelled || !backup) return
        setLegacy(backup)
        setPhase(readFlag(UPLOADED_KEY) ? 'uploaded' : 'found')
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [ignoreDismissed])

  if (phase === 'hidden' || !legacy) return null

  const upload = async () => {
    setPhase('uploading')
    try {
      await importBackup(legacy, 'merge')
      setFlag(UPLOADED_KEY)
      setPhase('uploaded')
      toast.success(`Đã chuyển ${numberFormat.format(legacy.words.length)} từ lên MongoDB.`)
    } catch (err) {
      toast.error('Chưa chuyển được dữ liệu cũ', { description: errorMessage(err) })
      setPhase('found')
    }
  }

  const removeLocal = async () => {
    setPhase('deleting')
    try {
      await deleteLegacyDatabase()
      setFlag(DISMISSED_KEY)
      setPhase('hidden')
      toast.success('Đã xóa bản dữ liệu cũ khỏi trình duyệt.')
    } catch {
      toast.error('Không xóa được dữ liệu cũ trong trình duyệt.')
      setPhase('uploaded')
    }
  }

  const later = () => {
    setFlag(DISMISSED_KEY)
    setPhase('hidden')
  }

  const uploaded = phase === 'uploaded' || phase === 'deleting'

  return (
    <section className="animate-fade-up rounded-2xl border border-accent/30 bg-accent-wash p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <IconChip tone={uploaded ? 'accent' : 'amber'} className="bg-surface">
          {uploaded ? <CircleCheck /> : <DatabaseZap />}
        </IconChip>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-ink">
            {uploaded ? 'Đã chuyển dữ liệu cũ lên MongoDB' : 'Tìm thấy dữ liệu cũ trong trình duyệt'}
          </h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
            {uploaded ? (
              'Bản cũ vẫn còn trong trình duyệt này. Bạn có thể xóa nó để tránh nhầm lẫn, hoặc giữ lại làm bản dự phòng.'
            ) : (
              <>
                {numberFormat.format(legacy.words.length)} từ, {numberFormat.format(legacy.reviews.length)} lượt ôn và{' '}
                {numberFormat.format(legacy.practice.length)} lượt luyện tập từ phiên bản trước. Tải lên để dùng trên
                mọi thiết bị; từ đã có trên MongoDB sẽ được gộp, không bị nhân đôi.
              </>
            )}
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2">
            {uploaded ? (
              <>
                <Button variant="secondary" size="sm" onClick={removeLocal} disabled={phase === 'deleting'}>
                  {phase === 'deleting' && <Spinner />} Xóa bản cũ khỏi trình duyệt
                </Button>
                <Button variant="ghost" size="sm" onClick={later} disabled={phase === 'deleting'}>
                  Giữ lại
                </Button>
              </>
            ) : (
              <>
                <Button variant="primary" size="sm" onClick={upload} disabled={phase === 'uploading'}>
                  {phase === 'uploading' && <Spinner />} Tải lên MongoDB
                </Button>
                <Button variant="ghost" size="sm" onClick={later} disabled={phase === 'uploading'}>
                  Để sau
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
