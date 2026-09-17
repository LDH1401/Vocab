import type { Accent } from '../db/types'
import { withTimeout } from './http'
import { uniq } from './text'

const API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/'

export interface Phonetic {
  text: string
  audio: string
  accent: 'us' | 'uk' | 'au' | ''
}

export interface Sense {
  definition: string
  example: string
}

export interface DictMeaning {
  partOfSpeech: string
  senses: Sense[]
  synonyms: string[]
}

export interface DictEntry {
  word: string
  phonetics: Phonetic[]
  meanings: DictMeaning[]
  sourceUrl: string
}

interface RawEntry {
  word?: string
  phonetic?: string
  phonetics?: { text?: string; audio?: string }[]
  meanings?: {
    partOfSpeech?: string
    definitions?: { definition?: string; example?: string; synonyms?: string[] }[]
    synonyms?: string[]
  }[]
  sourceUrls?: string[]
}

export class DictionaryError extends Error {}

function accentOf(audio: string): Phonetic['accent'] {
  const m = /-(us|uk|au)\.mp3$/i.exec(audio)
  return m ? (m[1].toLowerCase() as Phonetic['accent']) : ''
}

function mergeEntries(term: string, raw: RawEntry[]): DictEntry {
  const phonetics: Phonetic[] = []
  const meanings = new Map<string, DictMeaning>()

  for (const entry of raw) {
    const list = [...(entry.phonetics ?? [])]
    if (entry.phonetic) list.push({ text: entry.phonetic })
    for (const p of list) {
      const text = (p.text ?? '').trim()
      let audio = (p.audio ?? '').trim()
      if (audio.startsWith('//')) audio = `https:${audio}`
      if (!text && !audio) continue
      if (phonetics.some((x) => x.text === text && x.audio === audio)) continue
      // Bỏ bản chỉ có phiên âm nếu đã có bản cùng phiên âm kèm file ghi âm
      if (!audio && phonetics.some((x) => x.text === text)) continue
      phonetics.push({ text, audio, accent: accentOf(audio) })
    }

    for (const m of entry.meanings ?? []) {
      const pos = (m.partOfSpeech ?? '').trim()
      let target = meanings.get(pos)
      if (!target) {
        target = { partOfSpeech: pos, senses: [], synonyms: [] }
        meanings.set(pos, target)
      }
      for (const d of m.definitions ?? []) {
        const definition = (d.definition ?? '').trim()
        if (definition) target.senses.push({ definition, example: (d.example ?? '').trim() })
        target.synonyms.push(...(d.synonyms ?? []))
      }
      target.synonyms.push(...(m.synonyms ?? []))
    }
  }

  for (const m of meanings.values()) m.synonyms = uniq(m.synonyms)
  return {
    word: raw[0]?.word ?? term,
    phonetics,
    meanings: [...meanings.values()].filter((m) => m.senses.length > 0),
    sourceUrl: raw[0]?.sourceUrls?.[0] ?? '',
  }
}

/** Trả về null nếu từ điển không có từ này */
export async function lookupWord(term: string, signal?: AbortSignal): Promise<DictEntry | null> {
  const q = term.trim().toLowerCase()
  if (!q) return null
  let res: Response
  try {
    res = await fetch(API_URL + encodeURIComponent(q), { signal: withTimeout(signal, 12_000) })
  } catch (e) {
    if (signal?.aborted) throw e
    throw new DictionaryError('Không kết nối được từ điển: mất mạng hoặc máy chủ phản hồi quá chậm.')
  }
  if (res.status === 404) return null
  if (!res.ok) throw new DictionaryError(`Máy chủ từ điển đang lỗi (mã ${res.status}), thử lại sau.`)
  const data: unknown = await res.json().catch(() => null)
  if (!Array.isArray(data) || data.length === 0) return null
  const entry = mergeEntries(q, data as RawEntry[])
  return entry.meanings.length > 0 || entry.phonetics.length > 0 ? entry : null
}

/** Chọn phiên âm và file ghi âm theo giọng ưu tiên */
export function pickPhonetic(entry: DictEntry, accent: Accent): { ipa: string; audio: string } {
  const want = accent === 'en-GB' ? 'uk' : 'us'
  const withAudio = entry.phonetics.filter((p) => p.audio)
  const audioPick = withAudio.find((p) => p.accent === want) ?? withAudio[0]
  const textPick =
    (audioPick?.text ? audioPick : undefined) ??
    entry.phonetics.find((p) => p.text && p.accent === want) ??
    entry.phonetics.find((p) => p.text)
  return { ipa: textPick?.text ?? '', audio: audioPick?.audio ?? '' }
}
