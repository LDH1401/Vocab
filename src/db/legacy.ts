import Dexie from 'dexie'
import { BACKUP_APP, BACKUP_VERSION, parseBackup, type Backup } from '../lib/backupFormat'

/** Tên cơ sở dữ liệu IndexedDB của phiên bản trước (lưu dữ liệu ngay trong trình duyệt) */
const LEGACY_DB = 'vocab'

/** Đọc dữ liệu cũ còn trong trình duyệt để chuyển lên MongoDB. Trả về null nếu không có. */
export async function readLegacyBackup(): Promise<Backup | null> {
  if (!(await Dexie.exists(LEGACY_DB))) return null
  const db = new Dexie(LEGACY_DB)
  db.version(1).stores({
    words: 'id, term, createdAt, *tags',
    cards: 'id, wordId, state, due',
    reviews: 'id, cardId, wordId, reviewedAt',
    practice: 'id, wordId, answeredAt',
    settings: 'id',
  })
  try {
    const [words, cards, reviews, practice, settings] = await Promise.all([
      db.table('words').toArray(),
      db.table('cards').toArray(),
      db.table('reviews').toArray(),
      db.table('practice').toArray(),
      db.table('settings').get('app'),
    ])
    if (words.length === 0 && reviews.length === 0) return null
    // Đi qua bộ đọc file sao lưu để kiểm tra và làm sạch từng bản ghi
    return parseBackup(
      JSON.stringify({ app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: '', words, cards, reviews, practice, settings }),
    )
  } finally {
    db.close()
  }
}

export async function deleteLegacyDatabase(): Promise<void> {
  await Dexie.delete(LEGACY_DB)
}
