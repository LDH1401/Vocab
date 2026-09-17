import type { Word } from '../db/types'
import { normalizeAnswer } from './answer'
import { shuffle } from './random'

export const CHOICE_COUNT = 4

/** Chọn các nghĩa gây nhiễu cho câu trắc nghiệm, ưu tiên từ cùng loại từ */
export function buildChoices(word: Word, pool: Word[], random: () => number = Math.random): Word[] {
  const target = normalizeAnswer(word.meaning)
  const seen = new Set([target])
  const candidates = shuffle(
    pool.filter((w) => w.id !== word.id),
    random,
  ).sort((a, b) => Number(b.partOfSpeech === word.partOfSpeech) - Number(a.partOfSpeech === word.partOfSpeech))
  const distractors: Word[] = []
  for (const w of candidates) {
    const key = normalizeAnswer(w.meaning)
    if (!key || seen.has(key)) continue
    seen.add(key)
    distractors.push(w)
    if (distractors.length === CHOICE_COUNT - 1) break
  }
  return shuffle([word, ...distractors], random)
}

/** Cần ít nhất 2 nghĩa gây nhiễu thì trắc nghiệm mới có ý nghĩa */
export function canBuildChoices(word: Word, pool: Word[]): boolean {
  const target = normalizeAnswer(word.meaning)
  const keys = new Set(pool.filter((w) => w.id !== word.id).map((w) => normalizeAnswer(w.meaning)))
  keys.delete(target)
  keys.delete('')
  return keys.size >= 2
}
