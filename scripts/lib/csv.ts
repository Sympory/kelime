/** Tırnaklı alanları destekleyen basit CSV ayrıştırıcı (çok satırlı alan yok). */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  const [header, ...rows] = lines.map(parseLine)
  return rows.map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ''])))
}

function parseLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') quoted = false
      else cur += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      cells.push(cur)
      cur = ''
    } else cur += c
  }
  cells.push(cur)
  return cells.map((s) => s.trim())
}
