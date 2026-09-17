export type Verdict = 'correct' | 'close' | 'wrong'

const EDGE_PUNCTUATION = /^[\s"\u201c\u201d.,!?;:]+|[\s"\u201c\u201d.,!?;:]+$/g

export function normalizeAnswer(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc`\u00b4]/g, "'")
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(EDGE_PUNCTUATION, '')
}

const PLACEHOLDERS = /\b(sth|sb|sbd|smb|smt)\b/g

/**
 * Các cách viết được chấp nhận cho một từ:
 * "colour / color" -> cả hai; "(to) run" -> "run", "to run"; "take care of sb" -> "take care of".
 */
export function acceptedAnswers(term: string): string[] {
  const variants = new Set<string>()
  const add = (s: string) => {
    const n = normalizeAnswer(s)
    if (n) variants.add(n)
  }
  const parts = [term, ...term.split(/\s+\/\s+|\s*;\s*/)]
  for (const part of parts) {
    add(part)
    add(part.replace(/\([^)]*\)/g, ' '))
    add(part.replace(/[()]/g, ''))
    add(part.replace(/\([^)]*\)/g, ' ').replace(PLACEHOLDERS, ' '))
  }
  return [...variants]
}

/** Cách viết chính để hiện làm đáp án: "(to) run" -> "run", "colour / color" -> "colour" */
export function primaryAnswer(term: string): string {
  const first = term.split(/\s+\/\s+|\s*;\s*/)[0]
  const simple = first.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
  return simple || term.trim()
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

/** Số lỗi gõ được bỏ qua ("gần đúng") theo độ dài từ */
function typoTolerance(length: number): number {
  if (length >= 8) return 2
  if (length >= 4) return 1
  return 0
}

/** `accepted` phải là các chuỗi đã chuẩn hóa (kết quả của acceptedAnswers) */
export function checkAnswer(input: string, accepted: string[]): Verdict {
  const x = normalizeAnswer(input)
  if (!x || accepted.length === 0) return 'wrong'
  if (accepted.includes(x)) return 'correct'
  return accepted.some((t) => levenshtein(x, t) <= typoTolerance(t.length)) ? 'close' : 'wrong'
}

export function closestAnswer(input: string, accepted: string[]): string {
  const x = normalizeAnswer(input)
  let best = accepted[0] ?? ''
  let bestDistance = Infinity
  for (const t of accepted) {
    const d = levenshtein(x, t)
    if (d < bestDistance) {
      best = t
      bestDistance = d
    }
  }
  return best
}

export type DiffKind = 'same' | 'wrong' | 'extra' | 'missing'
export interface DiffPart {
  text: string
  kind: DiffKind
}

function pushPart(parts: DiffPart[], text: string, kind: DiffKind) {
  const last = parts[parts.length - 1]
  if (last && last.kind === kind) last.text += text
  else parts.push({ text, kind })
}

/**
 * So từng ký tự giữa câu trả lời và đáp án.
 * typed: ký tự gõ sai (wrong) hoặc thừa (extra); expected: ký tự bị gõ sai (wrong) hoặc bị thiếu (missing).
 */
export function diffAnswer(input: string, target: string): { typed: DiffPart[]; expected: DiffPart[] } {
  const a = [...input]
  const b = [...target]
  const dist: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  const same = (i: number, j: number) => a[i - 1].toLowerCase() === b[j - 1].toLowerCase()
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + (same(i, j) ? 0 : 1))
    }
  }

  const typed: DiffPart[] = []
  const expected: DiffPart[] = []
  let i = a.length
  let j = b.length
  const typedRev: [string, DiffKind][] = []
  const expectedRev: [string, DiffKind][] = []
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dist[i][j] === dist[i - 1][j - 1] + (same(i, j) ? 0 : 1)) {
      const kind = same(i, j) ? 'same' : 'wrong'
      typedRev.push([a[i - 1], kind])
      expectedRev.push([b[j - 1], kind])
      i--
      j--
    } else if (i > 0 && dist[i][j] === dist[i - 1][j] + 1) {
      typedRev.push([a[i - 1], 'extra'])
      i--
    } else {
      expectedRev.push([b[j - 1], 'missing'])
      j--
    }
  }
  for (const [ch, kind] of typedRev.reverse()) pushPart(typed, ch, kind)
  for (const [ch, kind] of expectedRev.reverse()) pushPart(expected, ch, kind)
  return { typed, expected }
}

/** Gợi ý dần từng chữ: hintMask("look up", 2) -> "lo__ __" */
export function hintMask(answer: string, revealed: number): string {
  let letters = 0
  return [...answer]
    .map((ch) => {
      if (!/[\p{L}\p{N}]/u.test(ch)) return ch
      letters++
      return letters <= revealed ? ch : '_'
    })
    .join('')
}

export function letterCount(answer: string): number {
  return [...answer].filter((ch) => /[\p{L}\p{N}]/u.test(ch)).length
}
