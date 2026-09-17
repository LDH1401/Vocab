/** Đoán ký tự phân cách dựa trên dòng đầu tiên (đếm các ký tự nằm ngoài dấu ngoặc kép) */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim() !== '') ?? ''
  const counts = new Map<string, number>([
    [',', 0],
    [';', 0],
    ['\t', 0],
  ])
  let quoted = false
  for (const ch of firstLine) {
    if (ch === '"') quoted = !quoted
    else if (!quoted && counts.has(ch)) counts.set(ch, counts.get(ch)! + 1)
  }
  let best = ','
  for (const [ch, n] of counts) if (n > counts.get(best)!) best = ch
  return best
}

/** Đọc CSV theo RFC 4180: hỗ trợ ngoặc kép, "" bên trong ngoặc, xuống dòng trong ô, CRLF. Bỏ dòng trống. */
export function parseCsv(input: string, delimiter = detectDelimiter(input)): string[][] {
  const text = input.replace(/^\ufeff/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let i = 0

  const endField = () => {
    row.push(field)
    field = ''
  }
  const endRow = () => {
    endField()
    if (row.some((cell) => cell.trim() !== '')) rows.push(row)
    row = []
  }

  while (i < text.length) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"' && field === '') {
      quoted = true
    } else if (ch === delimiter) {
      endField()
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      endRow()
    } else {
      field += ch
    }
    i++
  }
  if (field !== '' || row.length > 0) endRow()
  return rows
}

function escapeCell(value: string | number): string {
  const s = String(value)
  return /[",\r\n;\t]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s
}

/** Ghi CSV kèm BOM để Excel mở đúng tiếng Việt */
export function toCsv(rows: (string | number)[][]): string {
  return '\ufeff' + rows.map((r) => r.map(escapeCell).join(',')).join('\r\n') + '\r\n'
}
