import { acceptedAnswers, normalizeAnswer } from './answer'

export interface ClozePart {
  text: string
  /** Đoạn là từ cần điền */
  blank: boolean
}

export interface Cloze {
  example: string
  parts: ClozePart[]
  /** Các dạng từ xuất hiện trong câu (đã chuẩn hóa), ví dụ "runs" */
  answers: string[]
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['\u2019]")
}

/** Cho phép các biến thể thường gặp: -s, -ed, -ing, -er, -est; make -> making; study -> studied; stop -> stopped */
function wordPattern(word: string): string {
  const w = word.toLowerCase()
  const alts = [`${escapeRegExp(w)}(?:s|es|ed|d|ing|er|est|['\u2019]s)?`]
  if (/[a-z]e$/.test(w)) alts.push(`${escapeRegExp(w.slice(0, -1))}(?:ing|ed|er|est)`)
  if (/[^aeiou]y$/.test(w)) alts.push(`${escapeRegExp(w.slice(0, -1))}i(?:es|ed|er|est)`)
  if (/[^aeiou][aeiou][bdgklmnprt]$/.test(w)) alts.push(`${escapeRegExp(w + w.at(-1))}(?:ed|ing|er|est)`)
  return `(?:${alts.join('|')})`
}

function termRegExp(variant: string): RegExp | null {
  const words = variant.split(/\s+/).filter(Boolean)
  if (words.length === 0 || !/[\p{L}\p{N}]/u.test(variant)) return null
  const body = words.map(wordPattern).join('\\s+')
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, 'giu')
}

export function findClozes(term: string, examples: string[]): Cloze[] {
  const patterns = acceptedAnswers(term)
    .sort((a, b) => b.length - a.length)
    .map(termRegExp)
    .filter((re): re is RegExp => re !== null)
  const result: Cloze[] = []
  for (const example of examples) {
    for (const re of patterns) {
      const matches = [...example.matchAll(re)]
      if (matches.length === 0) continue
      const parts: ClozePart[] = []
      let last = 0
      for (const m of matches) {
        parts.push({ text: example.slice(last, m.index), blank: false }, { text: m[0], blank: true })
        last = m.index + m[0].length
      }
      parts.push({ text: example.slice(last), blank: false })
      result.push({
        example,
        parts: parts.filter((p) => p.text !== ''),
        answers: [...new Set(matches.map((m) => normalizeAnswer(m[0])))],
      })
      break
    }
  }
  return result
}

export function canCloze(term: string, examples: string[]): boolean {
  return findClozes(term, examples).length > 0
}

/** Che từ cần đoán trong một đoạn văn (ví dụ định nghĩa tiếng Anh có chứa chính từ đó) */
export function maskTerm(text: string, term: string): string {
  let masked = text
  for (const variant of acceptedAnswers(term).sort((a, b) => b.length - a.length)) {
    const re = termRegExp(variant)
    if (re) masked = masked.replace(re, '____')
  }
  return masked
}
