import { db, type KelimeDB } from '../../db/db'
import { makeCustomWord, queueWord } from '../../db/userWords'
import { lookupWords } from '../../data/words'
import { parseCsv } from '../../lib/csv'
import type { Cefr, Pos, Word } from '../../types/word'

export type ListRow = { lemma: string; pos?: Pos; cefr?: Cefr; tr: string[] }

/** Başlıklar küçük harfe çevrilip bu adlardan biriyle eşleşirse ilgili sütun sayılır. */
const COLUMNS = {
  lemma: ['word', 'words', 'lemma', 'headword', 'english', 'en', 'kelime', 'ingilizce'],
  pos: ['pos', 'part of speech', 'type', 'tür', 'tur'],
  cefr: ['level', 'cefr', 'seviye'],
  tr: ['tr', 'turkish', 'türkçe', 'turkce', 'meaning', 'anlam', 'translation'],
} as const

const POS_MAP: Record<string, Pos> = {
  n: 'noun',
  noun: 'noun',
  isim: 'noun',
  v: 'verb',
  verb: 'verb',
  fiil: 'verb',
  adj: 'adj',
  adjective: 'adj',
  sıfat: 'adj',
  adv: 'adv',
  adverb: 'adv',
  zarf: 'adv',
}
const LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])

/** CSV metnini kelime satırlarına çevirir. Kelime sütunu bulunamazsa ilk sütun kullanılır. */
export function parseWordList(text: string): ListRow[] {
  const rows = parseCsv(text)
  if (rows.length === 0) return []
  const headers = Object.keys(rows[0])
  const find = (names: readonly string[]) =>
    headers.find((h) => names.includes(h.toLocaleLowerCase('tr').trim()))
  const col = {
    lemma: find(COLUMNS.lemma) ?? headers[0],
    pos: find(COLUMNS.pos),
    cefr: find(COLUMNS.cefr),
    tr: find(COLUMNS.tr),
  }
  const out: ListRow[] = []
  for (const r of rows) {
    const lemma = r[col.lemma]?.trim()
    if (!lemma) continue
    const pos = col.pos ? POS_MAP[r[col.pos].toLowerCase().replace(/\.$/, '')] : undefined
    const cefr = col.cefr ? r[col.cefr].toUpperCase().trim() : undefined
    out.push({
      lemma,
      ...(pos ? { pos } : {}),
      ...(cefr && LEVELS.has(cefr) ? { cefr: cefr as Cefr } : {}),
      tr: col.tr
        ? r[col.tr]
            .split(/[;,/]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    })
  }
  return out
}

/** Listedeki satıra en uygun hazır kelimeyi seçer: tür ve seviye eşleşmesi öncelikli. */
export function bestMatch(row: ListRow, candidates: Word[]): Word | undefined {
  const exact = candidates.filter((w) => w.lemma.toLowerCase() === row.lemma.toLowerCase())
  const pool = exact.length ? exact : candidates
  return (
    pool.find((w) => (!row.pos || w.pos === row.pos) && (!row.cefr || w.cefr === row.cefr)) ??
    pool.find((w) => !row.pos || w.pos === row.pos) ??
    pool[0]
  )
}

export type ImportSummary = { matched: number; queued: number; created: number; skipped: number }

/**
 * Listeyi içe aktarır: hazır veride bulunan kelimeler çalışma sırasına alınır (yeni kelimelerin
 * başına), bulunamayanlar kendi kelimesi olarak oluşturulur. Liste yalnızca bu tarayıcıda kalır.
 */
export async function importWordList(
  rows: ListRow[],
  onProgress?: (done: number) => void,
  target: KelimeDB = db,
): Promise<ImportSummary> {
  const summary: ImportSummary = { matched: 0, queued: 0, created: 0, skipped: 0 }
  const now = new Date()
  let i = 0
  for (const row of rows) {
    const match = bestMatch(row, await lookupWords(row.lemma))
    if (match) {
      summary.matched++
      if (await queueWord(target, match, now)) summary.queued++
    } else if (row.tr.length || row.pos) {
      // Hazır veride yok: kendi kelimesi olarak ekle (en azından tür ya da Türkçe varsa)
      const word = makeCustomWord({ ...row, pos: row.pos ?? 'other' })
      if (!(await target.userWords.get(word.id))) {
        await target.userWords.put(word)
        await queueWord(target, word, now)
        summary.created++
      } else summary.skipped++
    } else summary.skipped++
    if (++i % 50 === 0) onProgress?.(i)
  }
  onProgress?.(rows.length)
  return summary
}
