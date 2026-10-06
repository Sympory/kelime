import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Pos } from '../../src/types/word.ts'
import { CACHE_DIR } from './paths.ts'

const CACHE = join(CACHE_DIR, 'datamuse.jsonl')
const API = 'https://api.datamuse.com/words'
const CONCURRENCY = 4
const DELAY_MS = 120 // istekler arası bekleme (Datamuse'a saygılı kullanım: günde 100k altı)

type Hit = { word: string; score: number }
type Rel = 'rel_jja' | 'rel_jjb' | 'rel_bga' | 'rel_bgb'

const STOP = new Set(
  `a an the and or but if of to in on at by for with from into onto over under about as than then
  that this these those it its is are was were be been being am do does did have has had will would
  can could may might must shall should not no so too very just also there here what which who whom
  whose when where why how all any some each every i you he she we they me him her us them my your
  his our their up out off down s t one more most much many other such own same only during after
  before while because since until although though yet`.split(/\s+/),
)

const cache = new Map<string, Hit[]>()
if (existsSync(CACHE)) {
  for (const line of readFileSync(CACHE, 'utf8').split('\n')) {
    if (!line) continue
    const { q, r } = JSON.parse(line) as { q: string; r: Hit[] }
    cache.set(q, r)
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function query(rel: Rel, word: string): Promise<Hit[]> {
  const q = `${rel}=${encodeURIComponent(word)}&max=40`
  const hit = cache.get(q)
  if (hit) return hit
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${API}?${q}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const r = ((await res.json()) as Hit[]).map(({ word, score }) => ({ word, score }))
      cache.set(q, r)
      appendFileSync(CACHE, JSON.stringify({ q, r }) + '\n')
      await sleep(DELAY_MS)
      return r
    } catch (err) {
      if (attempt >= 4) throw err
      await sleep(1000 * 2 ** attempt)
    }
  }
}

const content = (hits: Hit[]) =>
  hits.map((h) => h.word).filter((w) => /^[a-z][a-z-]+$/.test(w) && !STOP.has(w))

/** Türe göre en sık birlikte kullanılan kelimelerden collocation ifadeleri üretir. */
async function collocationsFor(lemma: string, pos: Pos, max = 5): Promise<string[]> {
  if (lemma.includes(' ') || STOP.has(lemma)) return []
  const out: string[] = []
  if (pos === 'noun') {
    out.push(
      ...content(await query('rel_jjb', lemma))
        .slice(0, 3)
        .map((a) => `${a} ${lemma}`),
    )
  } else if (pos === 'adj') {
    out.push(
      ...content(await query('rel_jja', lemma))
        .slice(0, 3)
        .map((n) => `${lemma} ${n}`),
    )
  }
  const after = content(await query('rel_bga', lemma))
    .slice(0, 3)
    .map((w) => `${lemma} ${w}`)
  const before = content(await query('rel_bgb', lemma))
    .slice(0, 2)
    .map((w) => `${w} ${lemma}`)
  // Bigram'ları sırayla karıştır: önce takip eden, sonra önce gelen
  for (let i = 0; i < 3; i++) {
    if (after[i]) out.push(after[i])
    if (before[i]) out.push(before[i])
  }
  return [...new Set(out)].slice(0, max)
}

export async function fetchCollocations(
  words: { id: string; lemma: string; pos: Pos }[],
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  let i = 0
  let done = 0
  console.log(`Datamuse: ${words.length} kelime (önbellekte ${cache.size} sorgu)`)
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < words.length) {
        const w = words[i++]
        out.set(w.id, await collocationsFor(w.lemma, w.pos))
        if (++done % 500 === 0) console.log(`  Datamuse: ${done}/${words.length}`)
      }
    }),
  )
  return out
}
