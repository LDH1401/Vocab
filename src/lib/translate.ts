import { normalizeAnswer } from './answer'
import { withTimeout } from './http'

interface MyMemoryResponse {
  responseData?: { translatedText?: string }
  quotaFinished?: boolean
  matches?: { segment?: string; translation?: string; quality?: string | number; match?: number }[]
}

/**
 * Gợi ý nghĩa tiếng Việt qua MyMemory (miễn phí, không cần key, khoảng 5000 ký tự/ngày).
 * Chất lượng không ổn định nên chỉ dùng làm gợi ý để người dùng chọn.
 */
export async function suggestVietnamese(term: string, signal?: AbortSignal): Promise<string[]> {
  const q = term.trim()
  if (!q) return []
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent('en|vi')}`
  const res = await fetch(url, { signal: withTimeout(signal, 10_000) })
  if (!res.ok) return []
  const data = (await res.json()) as MyMemoryResponse
  if (data.quotaFinished) return []

  const key = normalizeAnswer(q)
  const lowercase = q === q.toLowerCase()
  const out: string[] = []
  const push = (raw: string | undefined) => {
    let t = (raw ?? '').replace(/<[^>]+>/g, '').trim().replace(/[.,;:!?]+$/, '')
    if (lowercase) t = t.toLowerCase()
    if (!t || /MYMEMORY WARNING|INVALID/i.test(t) || normalizeAnswer(t) === key) return
    if (out.some((o) => o.toLowerCase() === t.toLowerCase())) return
    out.push(t)
  }

  push(data.responseData?.translatedText)
  for (const m of data.matches ?? []) {
    if ((m.match ?? 0) >= 0.9 && Number(m.quality ?? 0) >= 50 && normalizeAnswer(m.segment ?? '') === key) {
      push(m.translation)
    }
  }
  return out.slice(0, 4)
}
