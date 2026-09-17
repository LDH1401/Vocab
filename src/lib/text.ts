/** Bỏ dấu tiếng Việt để tìm kiếm: "kiên cường" khớp với "kien cuong" */
export function foldText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

export function uniq(items: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const key = item.toLowerCase()
    if (!item || seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result
}

/** "a, b; c" -> ["a", "b", "c"] */
export function splitList(s: string, separators = /[,;]/): string[] {
  return uniq(
    s
      .split(separators)
      .map((x) => x.trim())
      .filter(Boolean),
  )
}

export function stripHtml(s: string): string {
  if (!/<[a-z/][^>]*>|&[a-z#0-9]+;/i.test(s)) return s
  const doc = new DOMParser().parseFromString(s.replace(/<br\s*\/?>/gi, '\n'), 'text/html')
  return doc.body.textContent ?? ''
}
