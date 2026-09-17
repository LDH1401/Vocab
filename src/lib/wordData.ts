import type { Word, WordInput } from '../db/types'
import { toCsv, parseCsv, detectDelimiter } from './csv'
import { splitList, stripHtml, uniq } from './text'

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const strList = (v: unknown) =>
  Array.isArray(v) ? uniq(v.map(str).filter(Boolean)) : typeof v === 'string' ? splitList(v) : []

/** Chuẩn hóa dữ liệu từ nguồn bất kỳ (form, CSV, file sao lưu) về đúng kiểu WordInput */
export function sanitizeWordInput(raw: Record<string, unknown>): WordInput {
  return {
    term: str(raw.term).replace(/\s+/g, ' '),
    meaning: str(raw.meaning),
    ipa: str(raw.ipa),
    partOfSpeech: str(raw.partOfSpeech),
    definition: str(raw.definition),
    examples: Array.isArray(raw.examples) ? raw.examples.map(str).filter(Boolean) : [],
    synonyms: strList(raw.synonyms),
    note: str(raw.note),
    tags: strList(raw.tags),
    audioUrl: str(raw.audioUrl),
  }
}

export const CSV_COLUMNS = [
  'term',
  'meaning',
  'ipa',
  'part_of_speech',
  'definition',
  'examples',
  'synonyms',
  'tags',
  'note',
] as const

type Column = (typeof CSV_COLUMNS)[number]

const HEADER_ALIASES: Record<string, Column> = {
  term: 'term',
  word: 'term',
  'từ': 'term',
  'từ vựng': 'term',
  english: 'term',
  front: 'term',
  meaning: 'meaning',
  'nghĩa': 'meaning',
  vietnamese: 'meaning',
  back: 'meaning',
  ipa: 'ipa',
  phonetic: 'ipa',
  pronunciation: 'ipa',
  'phiên âm': 'ipa',
  part_of_speech: 'part_of_speech',
  'part of speech': 'part_of_speech',
  pos: 'part_of_speech',
  'loại từ': 'part_of_speech',
  definition: 'definition',
  'định nghĩa': 'definition',
  examples: 'examples',
  example: 'examples',
  'ví dụ': 'examples',
  synonyms: 'synonyms',
  'đồng nghĩa': 'synonyms',
  tags: 'tags',
  tag: 'tags',
  note: 'note',
  notes: 'note',
  'ghi chú': 'note',
}

const EXAMPLE_SEPARATOR = ' | '

export function wordsToCsv(words: Word[]): string {
  return toCsv([
    [...CSV_COLUMNS],
    ...words.map((w) => [
      w.term,
      w.meaning,
      w.ipa,
      w.partOfSpeech,
      w.definition,
      w.examples.join(EXAMPLE_SEPARATOR),
      w.synonyms.join(', '),
      w.tags.join(', '),
      w.note,
    ]),
  ])
}

/**
 * Đọc danh sách từ từ CSV/TSV. Dòng đầu là tên cột (term, meaning, ipa, ...).
 * Không có dòng tiêu đề thì cột 1 là từ, cột 2 là nghĩa. Hỗ trợ file "Notes in Plain Text" của Anki.
 */
export function parseWordsCsv(text: string): { words: WordInput[]; skipped: number } {
  const lines = text.replace(/^\ufeff/, '').split(/\r?\n/)
  let delimiter: string | undefined
  let start = 0
  // Các dòng khai báo ở đầu file Anki: #separator:tab, #html:true, ...
  while (start < lines.length && /^#[a-z ]+:/i.test(lines[start])) {
    const sep = /^#separator:(\w+)/i.exec(lines[start])?.[1].toLowerCase()
    if (sep) delimiter = { tab: '\t', comma: ',', semicolon: ';', pipe: '|', space: ' ' }[sep]
    start++
  }
  const body = lines.slice(start).join('\n')
  const rows = parseCsv(body, delimiter ?? detectDelimiter(body))
  if (rows.length === 0) return { words: [], skipped: 0 }

  const header = rows[0].map((h) => HEADER_ALIASES[h.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ')])
  const hasHeader = header.includes('term')
  const columns: (Column | undefined)[] = hasHeader ? header : ['term', 'meaning']
  const dataRows = hasHeader ? rows.slice(1) : rows

  const words: WordInput[] = []
  let skipped = 0
  for (const row of dataRows) {
    const get = (col: Column) => {
      const i = columns.indexOf(col)
      return i >= 0 && i < row.length ? stripHtml(row[i]).trim() : ''
    }
    const word = sanitizeWordInput({
      term: get('term'),
      meaning: get('meaning'),
      ipa: get('ipa'),
      partOfSpeech: get('part_of_speech'),
      definition: get('definition'),
      examples: get('examples')
        .split(/\s\|\s|\n/)
        .map((s) => s.trim()),
      synonyms: get('synonyms'),
      tags: get('tags'),
      note: get('note'),
    })
    if (!word.term || !word.meaning) {
      skipped++
      continue
    }
    words.push(word)
  }
  return { words, skipped }
}
