import { Rating, type Grade } from 'ts-fsrs'
import type { CardType, PracticeMode } from '../db/types'
import type { WordStatus } from './srs'

export const CARD_TYPE_INFO: Record<CardType, { name: string; description: string }> = {
  meaning: { name: 'Từ → Nghĩa', description: 'Nhìn từ tiếng Anh, nhớ lại nghĩa tiếng Việt.' },
  spelling: { name: 'Nghĩa → Gõ từ', description: 'Nhìn nghĩa tiếng Việt, gõ lại từ tiếng Anh cho đúng chính tả.' },
  cloze: { name: 'Điền vào câu', description: 'Điền từ còn thiếu trong câu ví dụ. Chỉ tạo cho từ có câu ví dụ chứa từ đó.' },
  dictation: { name: 'Nghe & viết', description: 'Nghe phát âm rồi gõ lại từ.' },
}

export const PRACTICE_MODE_INFO: Record<PracticeMode, { name: string; description: string }> = {
  flip: { name: 'Lật thẻ', description: 'Nhìn từ, tự nhớ nghĩa rồi lật thẻ kiểm tra.' },
  choice: { name: 'Trắc nghiệm', description: 'Chọn nghĩa đúng trong 4 đáp án.' },
  spelling: { name: 'Gõ từ theo nghĩa', description: 'Nhìn nghĩa, gõ lại từ tiếng Anh.' },
  dictation: { name: 'Nghe & viết', description: 'Nghe phát âm, gõ lại từ.' },
  cloze: { name: 'Điền vào câu', description: 'Điền từ còn thiếu vào câu ví dụ.' },
}

export const GRADE_LABELS: Record<Grade, string> = {
  [Rating.Again]: 'Quên',
  [Rating.Hard]: 'Khó',
  [Rating.Good]: 'Được',
  [Rating.Easy]: 'Dễ',
}

export const STATUS_LABELS: Record<WordStatus, string> = {
  new: 'Mới',
  learning: 'Đang học',
  mature: 'Đã thuộc',
}

export const PARTS_OF_SPEECH = [
  { value: 'noun', label: 'Danh từ', short: 'n' },
  { value: 'verb', label: 'Động từ', short: 'v' },
  { value: 'adjective', label: 'Tính từ', short: 'adj' },
  { value: 'adverb', label: 'Trạng từ', short: 'adv' },
  { value: 'preposition', label: 'Giới từ', short: 'prep' },
  { value: 'conjunction', label: 'Liên từ', short: 'conj' },
  { value: 'pronoun', label: 'Đại từ', short: 'pron' },
  { value: 'determiner', label: 'Từ hạn định', short: 'det' },
  { value: 'interjection', label: 'Thán từ', short: 'interj' },
  { value: 'phrasal verb', label: 'Cụm động từ', short: 'phr v' },
  { value: 'idiom', label: 'Thành ngữ', short: 'idiom' },
  { value: 'phrase', label: 'Cụm từ', short: 'phr' },
]

export function posInfo(pos: string): { label: string; short: string } {
  const found = PARTS_OF_SPEECH.find((p) => p.value === pos.toLowerCase())
  return found ?? { label: pos, short: pos }
}
