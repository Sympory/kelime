/**
 * Tırnaklı alanları destekleyen basit CSV ayrıştırıcı (çok satırlı alan yok).
 * Ayırıcı başlık satırından algılanır: virgül, noktalı virgül (Türkçe Excel) ya da sekme.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^\uFEFF/, '') // Excel'in eklediği BOM
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
  if (lines.length === 0) return []
  const sep = detectSeparator(lines[0])
  const [header, ...rows] = lines.map((l) => parseLine(l, sep))
  return rows.map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ''])))
}

function detectSeparator(header: string): string {
  const counts = [',', ';', '\t'].map((s) => [s, header.split(s).length] as const)
  return counts.sort((a, b) => b[1] - a[1])[0][0]
}

function parseLine(line: string, sep: string): string[] {
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
    else if (c === sep) {
      cells.push(cur)
      cur = ''
    } else cur += c
  }
  cells.push(cur)
  return cells.map((s) => s.trim())
}
