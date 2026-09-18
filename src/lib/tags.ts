import type { Word } from '../db/types'

export interface TagCount {
  tag: string
  count: number
}

/** Các nhãn đang dùng kèm số từ của mỗi nhãn, sắp theo thứ tự chữ cái tiếng Việt */
export function countTags(words: Pick<Word, 'tags'>[]): TagCount[] {
  const counts = new Map<string, number>()
  for (const word of words) {
    for (const tag of word.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag, 'vi'))
}
