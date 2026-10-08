import { readFileSync } from 'node:fs'
import type { Cefr, Pos } from '../../src/types/word.ts'
import { parseCsv } from '../../src/lib/csv.ts'
import { ensureDownloaded } from './download.ts'

export type BaseWord = {
  id: string
  lemma: string
  /** Yazım varyantları ("analyse", "analyze") — örnek cümle eşleştirmesinde kullanılır */
  variants: string[]
  pos: Pos
  /** Kaynaktaki orijinal tür(ler) ("preposition", "modal auxiliary"...) */
  rawPos: string[]
  cefr: Cefr
  source: 'cefrj' | 'octanove'
}

const LEVELS: Cefr[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const POS_MAP: Record<string, Pos> = {
  noun: 'noun',
  verb: 'verb',
  vern: 'verb', // Octanove'daki yazım hatası
  'be-verb': 'verb',
  'do-verb': 'verb',
  'have-verb': 'verb',
  adjective: 'adj',
  adverb: 'adv',
}

const POS_SUFFIX: Record<Pos, string> = { noun: 'n', verb: 'v', adj: 'adj', adv: 'adv', other: 'x' }

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function wordId(lemma: string, pos: Pos): string {
  return `${slugify(lemma)}-${POS_SUFFIX[pos]}`
}

/** CEFR-J (A1–B2) + Octanove (C1–C2) listelerini birleştirir; aynı kelime+tür için en düşük seviye kalır. */
export async function loadWordlist(): Promise<BaseWord[]> {
  type Row = { headword: string; pos: string; CEFR: string; source: BaseWord['source'] }
  const read = async (source: BaseWord['source']): Promise<Row[]> =>
    parseCsv(readFileSync(await ensureDownloaded(source), 'utf8')).map((r) => ({
      headword: r.headword,
      pos: r.pos,
      CEFR: r.CEFR,
      source,
    }))
  const rows = [...(await read('cefrj')), ...(await read('octanove'))]

  const byId = new Map<string, BaseWord>()
  for (const row of rows) {
    const cefr = row.CEFR?.toUpperCase() as Cefr
    if (!LEVELS.includes(cefr) || !row.headword) continue

    const variants = row.headword
      .split('/')
      .map((v) => v.trim())
      .filter(Boolean)
    // "a.m./A.M./am/AM" gibi durumlarda küçük harfli ilk yazım lemma olur
    const lemma = variants.find((v) => v === v.toLowerCase()) ?? variants[0]
    const rawPos = row.pos.toLowerCase()
    const pos = POS_MAP[rawPos] ?? 'other'
    const id = wordId(lemma, pos)

    const existing = byId.get(id)
    if (existing) {
      if (LEVELS.indexOf(cefr) < LEVELS.indexOf(existing.cefr)) existing.cefr = cefr
      for (const v of variants) if (!existing.variants.includes(v)) existing.variants.push(v)
      if (!existing.rawPos.includes(rawPos)) existing.rawPos.push(rawPos)
      continue
    }
    byId.set(id, { id, lemma, variants, pos, rawPos: [rawPos], cefr, source: row.source })
  }
  return [...byId.values()]
}
