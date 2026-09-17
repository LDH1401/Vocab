import { lookupWord, pickPhonetic } from '../lib/dictionary'
import type { Accent, WordInput } from './types'
import { getData } from './store'
import { updateWord } from './words'

/** Tra từ điển rồi điền các trường còn trống (dùng cho "Thêm nhanh"). Trả về true nếu có cập nhật. */
export async function enrichWordFromDictionary(wordId: string, accent: Accent): Promise<boolean> {
  const initial = getData().words.find((w) => w.id === wordId)
  if (!initial) return false
  const entry = await lookupWord(initial.term)
  // Lấy lại bản mới nhất vì người dùng có thể đã sửa hoặc xóa từ trong lúc chờ tra từ điển
  const word = getData().words.find((w) => w.id === wordId)
  if (!entry || !word) return false

  const { ipa, audio } = pickPhonetic(entry, accent)
  const first = entry.meanings[0]
  const patch: Partial<WordInput> = {}
  if (!word.ipa && ipa) patch.ipa = ipa
  if (!word.audioUrl && audio) patch.audioUrl = audio
  if (!word.partOfSpeech && first) patch.partOfSpeech = first.partOfSpeech
  if (!word.definition && first?.senses[0]) patch.definition = first.senses[0].definition
  if (word.examples.length === 0) {
    const examples = entry.meanings.flatMap((m) => m.senses.map((s) => s.example)).filter(Boolean).slice(0, 2)
    if (examples.length > 0) patch.examples = examples
  }
  if (word.synonyms.length === 0 && first && first.synonyms.length > 0) patch.synonyms = first.synonyms.slice(0, 5)

  if (Object.keys(patch).length === 0) return false
  await updateWord(wordId, patch)
  return true
}
