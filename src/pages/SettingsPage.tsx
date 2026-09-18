import {
  Check,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  HardDrive,
  LogOut,
  Moon,
  Palette,
  Play,
  RotateCcw,
  Sliders,
  Sun,
  SunMoon,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { toast } from 'sonner'
import { LegacyImport } from '../components/LegacyImport'
import { SyncIndicator } from '../components/SyncIndicator'
import {
  Button,
  Card,
  Dialog,
  Field,
  Input,
  IconChip,
  PageHeader,
  SectionHeader,
  Segmented,
  Select,
  Spinner,
  Switch,
} from '../components/ui'
import {
  clearAllData,
  exportCsv,
  exportJson,
  importBackup,
  importWords,
  lastBackupAt,
  type ImportMode,
} from '../db/backup'
import { updateSettings } from '../db/settings'
import { hasUnsavedChanges, logout } from '../db/store'
import { CARD_TYPES, type Accent, type CardType, type MeaningDisplay, type Settings } from '../db/types'
import { ensureCardsForAllWords } from '../db/words'
import { useSettings } from '../hooks/useSettings'
import { setThemePref, useThemePref, type ThemePref } from '../hooks/useTheme'
import { useEnglishVoices } from '../hooks/useVoices'
import { errorMessage } from '../lib/api'
import { parseBackup, type Backup } from '../lib/backupFormat'
import { formatDate, formatDue } from '../lib/date'
import { cn } from '../lib/cn'
import { CARD_TYPE_INFO } from '../lib/labels'
import { speak } from '../lib/speech'
import { parseWordsCsv } from '../lib/wordData'

export default function SettingsPage() {
  const location = useLocation()
  const settings = useSettings()
  const themePref = useThemePref()
  const voices = useEnglishVoices()

  useEffect(() => {
    if (location.hash === '#data') {
      const el = document.getElementById('data')
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    }
  }, [location.hash])

  const [lastBackup, setLastBackup] = useState<number | null>(lastBackupAt)

  const csvFileRef = useRef<HTMLInputElement>(null)
  const [csvPreview, setCsvPreview] = useState<{
    filename: string
    words: ReturnType<typeof parseWordsCsv>['words']
    skipped: number
  } | null>(null)
  const [importingCsv, setImportingCsv] = useState(false)

  const jsonFileRef = useRef<HTMLInputElement>(null)
  const [pendingBackup, setPendingBackup] = useState<Backup | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [importingBackup, setImportingBackup] = useState(false)

  const [showClearDialog, setShowClearDialog] = useState(false)
  const [clearingData, setClearingData] = useState(false)

  const update = (patch: Partial<Omit<Settings, 'id'>>) => {
    updateSettings(patch)
  }

  const [loggingOut, setLoggingOut] = useState(false)
  const handleLogout = async () => {
    if (hasUnsavedChanges()) {
      toast.info('Đang lưu thay đổi lên máy chủ, thử lại sau giây lát.')
      return
    }
    setLoggingOut(true)
    try {
      await logout()
    } catch (err) {
      toast.error('Không đăng xuất được', { description: errorMessage(err) })
      setLoggingOut(false)
    }
  }

  const toggleCardType = async (type: CardType) => {
    const current = settings.enabledCardTypes
    let next: CardType[]
    if (current.includes(type)) {
      if (current.length <= 1) {
        toast.error('Phải bật ít nhất một kiểu thẻ để ôn tập.')
        return
      }
      next = current.filter((t) => t !== type)
    } else {
      next = [...current, type]
    }
    await update({ enabledCardTypes: next })
    const added = await ensureCardsForAllWords()
    if (added > 0) {
      toast.success(`Đã tạo ${added} thẻ mới cho danh sách từ.`)
    }
  }

  const handleTestVoice = () => {
    speak('Hello, this is a pronunciation test for Vocab.', settings)
  }

  const handleExportJson = async () => {
    try {
      await exportJson()
      setLastBackup(Date.now())
      toast.success('Đã xuất file sao lưu JSON thành công.')
    } catch {
      toast.error('Không thể xuất file sao lưu.')
    }
  }

  const handleExportCsv = async () => {
    try {
      await exportCsv()
      toast.success('Đã xuất danh sách từ CSV thành công.')
    } catch {
      toast.error('Không thể xuất file CSV.')
    }
  }

  const handleSelectCsv = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '')
        const parsed = parseWordsCsv(text)
        if (parsed.words.length === 0) {
          toast.error('Không tìm thấy từ vựng hợp lệ nào trong file.')
          return
        }
        setCsvPreview({
          filename: file.name,
          words: parsed.words,
          skipped: parsed.skipped,
        })
      } catch {
        toast.error('Không đọc được file CSV.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleConfirmCsvImport = async () => {
    if (!csvPreview) return
    setImportingCsv(true)
    try {
      const result = await importWords(csvPreview.words)
      toast.success(`Đã thêm ${result.added} từ mới.`, {
        description: result.duplicates > 0 ? `Bỏ qua ${result.duplicates} từ đã có trước đó.` : undefined,
      })
      setCsvPreview(null)
    } catch (err) {
      toast.error('Lỗi khi nhập từ từ CSV.', { description: errorMessage(err) })
    } finally {
      setImportingCsv(false)
    }
  }

  const handleSelectJson = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '')
        const backup = parseBackup(text)
        setPendingBackup(backup)
      } catch (err) {
        toast.error((err as Error).message || 'File sao lưu không hợp lệ.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleConfirmBackupImport = async () => {
    if (!pendingBackup) return
    setImportingBackup(true)
    try {
      await importBackup(pendingBackup, importMode)
      toast.success(`Đã phục hồi ${pendingBackup.words.length} từ vựng và toàn bộ tiến độ.`)
      setPendingBackup(null)
    } catch (err) {
      toast.error('Lỗi khi khôi phục dữ liệu.', { description: errorMessage(err) })
    } finally {
      setImportingBackup(false)
    }
  }

  const handleClearAll = async () => {
    setClearingData(true)
    try {
      await clearAllData()
      setShowClearDialog(false)
      toast.success('Đã xóa toàn bộ dữ liệu ứng dụng.')
    } catch (err) {
      toast.error('Không thể xóa dữ liệu.', { description: errorMessage(err) })
    } finally {
      setClearingData(false)
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title="Cài đặt" description="Tùy chỉnh giao diện, lịch học FSRS, giọng đọc và sao lưu dữ liệu." />

      {/* 1. Giao diện */}
      <Card className="p-5 sm:p-6">
        <SectionHeader icon={<Palette />} tone="violet" title="Giao diện" description="Chọn chế độ màu sáng, tối hoặc theo thiết bị." />
        <div className="mt-5 grid grid-cols-3 gap-2.5 sm:max-w-md" role="radiogroup" aria-label="Chế độ giao diện">
          {(
            [
              { value: 'light', label: 'Sáng', Icon: Sun },
              { value: 'dark', label: 'Tối', Icon: Moon },
              { value: 'system', label: 'Tự động', Icon: SunMoon },
            ] as const
          ).map(({ value, label, Icon }) => {
            const active = themePref === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setThemePref(value as ThemePref)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border px-3 py-3.5 text-[13px] font-medium transition-all',
                  active
                    ? 'border-accent bg-accent-wash text-accent-ink ring-4 ring-accent/15'
                    : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            )
          })}
        </div>
      </Card>

      {/* 2. Lịch học & FSRS */}
      <Card className="overflow-hidden">
        <div className="p-5 sm:p-6">
          <SectionHeader
            icon={<Sliders />}
            title="Lịch học & thuật toán FSRS"
            description="Mỗi từ tự sinh các thẻ tương ứng, mỗi thẻ được xếp lịch ôn độc lập."
          />

          <p className="mt-6 mb-2 text-[13px] font-semibold text-ink">Các dạng thẻ ôn tập</p>
          <div className="divide-y divide-line rounded-xl border border-line">
            {CARD_TYPES.map((type) => {
              const active = settings.enabledCardTypes.includes(type)
              const info = CARD_TYPE_INFO[type]
              return (
                <div key={type} className="px-4 py-3.5">
                  <Switch
                    checked={active}
                    onChange={() => toggleCardType(type)}
                    label={info.name}
                    description={info.description}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-5 border-t border-line bg-surface-2/40 p-5 sm:p-6">
          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-ink">Kiểu hiển thị thẻ Từ → Nghĩa</p>
            <Segmented<MeaningDisplay>
              label="Kiểu hiển thị thẻ nghĩa"
              value={settings.meaningDisplay}
              onChange={(val) => update({ meaningDisplay: val })}
              options={[
                { value: 'flip', label: 'Lật thẻ' },
                { value: 'choice', label: 'Trắc nghiệm' },
                { value: 'mixed', label: 'Xen kẽ' },
              ]}
              className="w-full sm:w-auto"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Số thẻ mới tối đa mỗi ngày"
              hint="Giới hạn thẻ mới giúp bạn không bị quá tải thẻ ôn trong tương lai."
            >
              <Input
                type="number"
                min={1}
                max={200}
                value={settings.newCardsPerDay}
                onChange={(e) => update({ newCardsPerDay: Math.max(1, Number(e.target.value) || 20) })}
              />
            </Field>

            <Field
              label="Mục tiêu ghi nhớ"
              htmlFor="retention-select"
              hint="Mục tiêu càng cao thì lịch ôn càng dày để giữ tỉ lệ nhớ."
            >
              <Select
                id="retention-select"
                value={settings.requestRetention}
                onChange={(v) => update({ requestRetention: v })}
                options={[
                  { value: 0.8, label: '80%', description: 'Ôn ít, tiết kiệm thời gian' },
                  { value: 0.85, label: '85%', description: 'Cân bằng' },
                  { value: 0.9, label: '90%', description: 'Khuyên dùng — chuẩn FSRS' },
                  { value: 0.95, label: '95%', description: 'Ghi nhớ rất chắc, ôn dày hơn' },
                ]}
              />
            </Field>
          </div>
        </div>
      </Card>

      {/* 3. Âm thanh & giọng đọc */}
      <Card className="overflow-hidden">
        <div className="space-y-5 p-5 sm:p-6">
          <SectionHeader
            icon={<Volume2 />}
            tone="sky"
            title="Âm thanh & phát âm"
            description="Chất giọng, giọng đọc máy và cách phát âm tự động."
          />

          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-ink">Chất giọng ưu tiên</p>
            <Segmented<Accent>
              label="Giọng tiếng Anh"
              value={settings.accent}
              onChange={(val) => update({ accent: val })}
              options={[
                { value: 'en-US', label: '🇺🇸 Anh – Mỹ' },
                { value: 'en-GB', label: '🇬🇧 Anh – Anh' },
              ]}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Giọng đọc của thiết bị"
              htmlFor="voice-select"
              hint="Giọng máy (TTS) đã cài trên thiết bị của bạn."
            >
              <div className="flex gap-2">
                <Select
                  id="voice-select"
                  value={settings.voiceURI}
                  onChange={(v) => update({ voiceURI: v })}
                  placeholder="Mặc định của hệ thống"
                  className="min-w-0 flex-1"
                  options={[
                    { value: '', label: 'Mặc định của hệ thống' },
                    ...voices.map((v) => ({ value: v.voiceURI, label: v.name, meta: v.lang })),
                  ]}
                />
                <Button type="button" variant="secondary" onClick={handleTestVoice} title="Nghe thử giọng đọc" className="h-11">
                  <Play className="size-4" /> Thử
                </Button>
              </div>
            </Field>

            <Field label={`Tốc độ đọc · ${settings.speechRate.toFixed(1)}×`} hint="Tốc độ phát âm của giọng đọc máy.">
              <div className="flex h-11 items-center gap-3">
                <span className="text-xs text-muted">Chậm</span>
                <input
                  type="range"
                  min="0.6"
                  max="1.4"
                  step="0.1"
                  value={settings.speechRate}
                  onChange={(e) => update({ speechRate: Number(e.target.value) })}
                  aria-label="Tốc độ đọc"
                  className="flex-1"
                />
                <span className="text-xs text-muted">Nhanh</span>
              </div>
            </Field>
          </div>
        </div>

        <div className="space-y-4 border-t border-line bg-surface-2/40 p-5 sm:p-6">
          <Switch
            checked={settings.preferRecordedAudio}
            onChange={(val) => update({ preferRecordedAudio: val })}
            label="Ưu tiên giọng người thật từ từ điển"
            description="Phát file ghi âm của từ điển khi có mạng; khi mất mạng sẽ dùng giọng máy."
          />
          <Switch
            checked={settings.autoPlayAudio}
            onChange={(val) => update({ autoPlayAudio: val })}
            label="Tự động phát âm khi hiện từ"
            description="Đọc to từ tiếng Anh khi hiện thẻ hoặc sau khi trả lời câu hỏi."
          />
        </div>
      </Card>

      {/* 4. Dữ liệu & sao lưu */}
      <LegacyImport ignoreDismissed />
      <Card id="data" className="scroll-mt-20 overflow-hidden">
        <div className="p-5 sm:p-6">
          <SectionHeader
            icon={<HardDrive />}
            tone="amber"
            title="Dữ liệu & sao lưu"
            description="Dữ liệu được lưu trên MongoDB và dùng chung giữa các thiết bị. Vẫn nên xuất bản sao lưu định kỳ để phòng sự cố."
          />

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            <ActionTile
              icon={<Download />}
              title="Sao lưu đầy đủ"
              description="Từ vựng, tiến độ và lịch sử (JSON)"
              onClick={handleExportJson}
            />
            <ActionTile
              icon={<FileSpreadsheet />}
              title="Xuất danh sách từ"
              description="Mở được bằng Excel, Google Sheets (CSV)"
              onClick={handleExportCsv}
            />
            <ActionTile
              icon={<Upload />}
              title="Nhập từ CSV / Anki"
              description="Thêm từ từ file .csv, .tsv hoặc .txt"
              onClick={() => csvFileRef.current?.click()}
            />
            <ActionTile
              icon={<RotateCcw />}
              title="Khôi phục bản sao lưu"
              description="Nạp lại từ file JSON đã xuất"
              onClick={() => jsonFileRef.current?.click()}
            />
          </div>
          <input type="file" ref={csvFileRef} accept=".csv,.tsv,.txt" className="hidden" onChange={handleSelectCsv} />
          <input type="file" ref={jsonFileRef} accept=".json" className="hidden" onChange={handleSelectJson} />

          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
            <Clock className="size-3.5" />
            {lastBackup ? (
              <>
                Sao lưu gần nhất: <span className="font-medium text-ink-2">{formatDue(lastBackup, Date.now())}</span> ·{' '}
                {formatDate(lastBackup)}
              </>
            ) : (
              'Chưa sao lưu lần nào trên thiết bị này.'
            )}
          </p>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-critical/20 bg-critical-wash/60 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="text-sm font-semibold text-critical-ink">Xóa toàn bộ dữ liệu</p>
            <p className="text-[13px] text-ink-2">Xóa sạch từ vựng, thẻ học và lịch sử ôn tập. Không thể hoàn tác.</p>
          </div>
          <Button variant="danger" onClick={() => setShowClearDialog(true)}>
            <Trash2 className="size-4" /> Xóa dữ liệu
          </Button>
        </div>
      </Card>

      {/* 5. Tài khoản */}
      <Card className="p-5 sm:p-6">
        <SectionHeader
          icon={<LogOut />}
          tone="neutral"
          title="Phiên đăng nhập"
          description={<SyncIndicator />}
          actions={
            <Button variant="secondary" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? <Spinner /> : <LogOut className="size-4" />} Đăng xuất
            </Button>
          }
        />
      </Card>

      {/* CSV Import Preview Dialog */}
      <Dialog
        open={Boolean(csvPreview)}
        onClose={() => setCsvPreview(null)}
        title="Xác nhận nhập từ vựng từ CSV"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCsvPreview(null)} disabled={importingCsv}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleConfirmCsvImport} disabled={importingCsv}>
              {importingCsv ? <Spinner /> : <Check className="size-4" />} Nhập {csvPreview?.words.length} từ
            </Button>
          </>
        }
      >
        {csvPreview && (
          <div className="space-y-3">
            <p>
              File <strong className="text-ink">"{csvPreview.filename}"</strong> chứa{' '}
              <strong className="text-ink">{csvPreview.words.length}</strong> từ vựng hợp lệ.
              {csvPreview.skipped > 0 && ` (Đã bỏ qua ${csvPreview.skipped} dòng thiếu từ hoặc nghĩa).`}
            </p>
            <p className="text-xs text-ink-2">
              Các từ đã có trùng cả từ lẫn nghĩa trong danh sách hiện tại sẽ tự động được bỏ qua.
            </p>
            <ul className="max-h-48 divide-y divide-line overflow-y-auto rounded-xl border border-line bg-surface-2/60 text-[13px]">
              {csvPreview.words.slice(0, 5).map((w, idx) => (
                <li key={idx} className="flex gap-2 truncate px-3 py-2">
                  <strong className="font-display text-[15px] font-semibold text-ink">{w.term}</strong>
                  <span className="truncate">{w.meaning}</span>
                </li>
              ))}
              {csvPreview.words.length > 5 && (
                <li className="px-3 py-2 text-muted">…và {csvPreview.words.length - 5} từ khác</li>
              )}
            </ul>
          </div>
        )}
      </Dialog>

      {/* JSON Backup Import Dialog */}
      <Dialog
        open={Boolean(pendingBackup)}
        onClose={() => setPendingBackup(null)}
        title="Khôi phục file sao lưu JSON"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingBackup(null)} disabled={importingBackup}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleConfirmBackupImport} disabled={importingBackup}>
              {importingBackup ? <Spinner /> : <RotateCcw className="size-4" />} Bắt đầu phục hồi
            </Button>
          </>
        }
      >
        {pendingBackup && (
          <div className="space-y-4">
            <p>
              File sao lưu chứa <strong className="text-ink">{pendingBackup.words.length}</strong> từ vựng,{' '}
              <strong className="text-ink">{pendingBackup.cards.length}</strong> thẻ học và{' '}
              <strong className="text-ink">{pendingBackup.reviews.length}</strong> lượt ôn tập.
            </p>

            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-ink">Chế độ phục hồi</p>
              <div className="space-y-2 text-sm">
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line p-3 transition-colors hover:bg-surface-2 has-checked:border-accent has-checked:bg-accent-wash">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-semibold text-ink">Gộp dữ liệu (Khuyên dùng)</span>
                    <p className="text-xs text-ink-2">
                      Giữ lại các từ hiện có, thêm từ mới và cập nhật bản ghi mới hơn. Không làm mất từ vựng đã thêm gần đây.
                    </p>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line p-3 transition-colors hover:bg-surface-2 has-checked:border-accent has-checked:bg-accent-wash">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-semibold text-critical-ink">Ghi đè hoàn toàn</span>
                    <p className="text-xs text-ink-2">
                      Xóa sạch toàn bộ từ và dữ liệu hiện tại, chỉ giữ lại đúng những gì trong file sao lưu.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Clear All Dialog */}
      <Dialog
        open={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        title="Xác nhận xóa toàn bộ dữ liệu"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowClearDialog(false)} disabled={clearingData}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleClearAll} disabled={clearingData}>
              {clearingData ? <Spinner /> : <Trash2 className="size-4" />} Xóa vĩnh viễn
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <p>
            Hành động này sẽ <strong className="text-critical-ink">xóa vĩnh viễn toàn bộ từ vựng</strong>,
            tiến độ FSRS, lịch sử ôn tập và bài tập luyện tập.
          </p>
          <p className="text-xs text-ink-2">
            Nếu muốn giữ lại dữ liệu, hãy bấm "Xuất file sao lưu (JSON)" trước khi thực hiện.
          </p>
        </div>
      </Dialog>
    </div>
  )
}

function ActionTile({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 text-left transition-all hover:border-line-strong hover:bg-surface-2/60"
    >
      <IconChip tone="neutral" className="group-hover:bg-accent-wash group-hover:text-accent-ink">
        {icon}
      </IconChip>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block truncate text-xs text-ink-2">{description}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}
