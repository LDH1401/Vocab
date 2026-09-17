import { BACKUP_APP, BACKUP_VERSION, newerCard, newerWord, type Backup } from '../lib/backupFormat'
import { normalizeAnswer } from '../lib/answer'
import { newId } from '../lib/id'
import { wordsToCsv } from '../lib/wordData'
import type { Op } from '../shared/protocol'
import type { Word, WordInput } from './types'
import { normalizeSettings } from './settings'
import { commit, getData } from './store'
import { ensureCardsForAllWords } from './words'

const LAST_BACKUP_KEY = 'vocab-last-backup'

export function lastBackupAt(): number | null {
  try {
    const value = Number(localStorage.getItem(LAST_BACKUP_KEY))
    return value > 0 ? value : null
  } catch {
    return null
  }
}

function downloadFile(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const fileDate = () => new Date().toISOString().slice(0, 10)

export async function exportJson(): Promise<void> {
  const { words, cards, reviews, practice, settings } = getData()
  const backup: Backup = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    words,
    cards,
    reviews,
    practice,
    settings,
  }
  downloadFile(JSON.stringify(backup), `vocab-backup-${fileDate()}.json`, 'application/json')
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
  } catch {
    // Không lưu được mốc sao lưu cũng không sao
  }
}

export async function exportCsv(): Promise<void> {
  const words = getData().words.toSorted((a, b) => a.createdAt - b.createdAt)
  downloadFile(wordsToCsv(words), `vocab-words-${fileDate()}.csv`, 'text/csv;charset=utf-8')
}

export type ImportMode = 'merge' | 'replace'

/**
 * merge: bản ghi trùng id thì giữ bản mới hơn (từ sửa sau cùng, thẻ ôn gần nhất), cài đặt hiện tại giữ nguyên.
 * replace: xóa toàn bộ dữ liệu hiện tại rồi nạp file sao lưu.
 * Chờ đến khi dữ liệu đã được lưu lên server.
 */
export async function importBackup(backup: Backup, mode: ImportMode): Promise<void> {
  const ops: Op[] = []
  if (mode === 'replace') {
    ops.push(
      { type: 'clear', collection: 'words' },
      { type: 'clear', collection: 'cards' },
      { type: 'clear', collection: 'reviews' },
      { type: 'clear', collection: 'practice' },
      { type: 'put', collection: 'words', docs: backup.words },
      { type: 'put', collection: 'cards', docs: backup.cards },
    )
    if (backup.settings) ops.push({ type: 'put', collection: 'settings', docs: [normalizeSettings(backup.settings)] })
  } else {
    const current = getData()
    const words = new Map(current.words.map((w) => [w.id, w]))
    const cards = new Map(current.cards.map((c) => [c.id, c]))
    ops.push(
      {
        type: 'put',
        collection: 'words',
        docs: backup.words.map((w) => {
          const existing = words.get(w.id)
          return existing ? newerWord(existing, w) : w
        }),
      },
      {
        type: 'put',
        collection: 'cards',
        docs: backup.cards.map((c) => {
          const existing = cards.get(c.id)
          return existing ? newerCard(existing, c) : c
        }),
      },
    )
  }
  ops.push(
    { type: 'put', collection: 'reviews', docs: backup.reviews },
    { type: 'put', collection: 'practice', docs: backup.practice },
  )
  await Promise.all([commit(ops), ensureCardsForAllWords()])
}

/** Nhập từ CSV, bỏ qua từ đã có (trùng cả từ lẫn nghĩa) */
export async function importWords(inputs: WordInput[]): Promise<{ added: number; duplicates: number }> {
  const key = (w: Pick<Word, 'term' | 'meaning'>) => `${normalizeAnswer(w.term)}\u0000${normalizeAnswer(w.meaning)}`
  const seen = new Set(getData().words.map(key))
  const now = Date.now()
  const words: Word[] = []
  for (const [i, input] of inputs.entries()) {
    const k = key(input)
    if (seen.has(k)) continue
    seen.add(k)
    // Cộng thêm i ms để giữ đúng thứ tự trong file khi học thẻ mới
    words.push({ ...input, id: newId(), createdAt: now + i, updatedAt: now + i })
  }
  await Promise.all([commit([{ type: 'put', collection: 'words', docs: words }]), ensureCardsForAllWords()])
  return { added: words.length, duplicates: inputs.length - words.length }
}

export async function clearAllData(): Promise<void> {
  await commit([
    { type: 'clear', collection: 'words' },
    { type: 'clear', collection: 'cards' },
    { type: 'clear', collection: 'reviews' },
    { type: 'clear', collection: 'practice' },
  ])
}
