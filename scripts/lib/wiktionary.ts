import { createReadStream, createWriteStream, existsSync, readFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { createGunzip } from 'node:zlib'
import type { Example, Pos } from '../../src/types/word.ts'
import { ensureDownloaded } from './download.ts'
import { CACHE_DIR } from './paths.ts'
import type { BaseWord } from './wordlist.ts'

/** Ham Wiktionary kaydının bize gereken küçültülmüş hâli */
type WkEntry = {
  word: string
  pos: string
  ipa: { ipa: string; tags: string[] }[]
  forms: string[]
  senses: {
    gloss: string
    tags: string[]
    /** Uzmanlık alanı ("computing", "chemistry"…) — bu anlamlar tanımda geriye alınır */
    topics: string[]
    examples: { text: string; hl?: [number, number] }[]
  }[]
  tr: string[]
  synonyms: string[]
}

export type WkInfo = {
  ipa?: string
  defEn: string[]
  tr: string[]
  forms: string[]
  synonyms: string[]
  examples: Example[]
}

// Alt küme biçimi değişirse sürümü artırın; eski önbellek yok sayılır ve yeniden üretilir.
const SUBSET = join(CACHE_DIR, 'wiktionary-subset-v2.jsonl')

const SKIP_TAGS = new Set([
  'obsolete',
  'archaic',
  'rare',
  'dialectal',
  'historical',
  'nonstandard',
  'form-of',
  'alt-of',
  'misspelling',
  'dated',
  'vulgar',
  'derogatory',
  'offensive',
])
const SKIP_GLOSS =
  /^(\.\.\.|…|plural of|alternative (form|spelling) of|obsolete|archaic|misspelling of)/i

/* eslint-disable @typescript-eslint/no-explicit-any -- ham JSON */
function compact(o: any): WkEntry {
  const sensesRaw: any[] = o.senses ?? []
  const tr = [...(o.translations ?? []), ...sensesRaw.flatMap((s) => s.translations ?? [])]
    .filter((t) => (t.lang_code ?? t.code) === 'tr' && t.word)
    .map((t) => String(t.word))
  return {
    word: o.word,
    pos: o.pos,
    ipa: (o.sounds ?? [])
      .filter((s: any) => s.ipa)
      .map((s: any) => ({ ipa: s.ipa, tags: s.tags ?? [] })),
    forms: (o.forms ?? [])
      .filter(
        (f: any) =>
          f.form && !f.tags?.some((t: string) => t === 'table-tags' || t === 'inflection-template'),
      )
      .map((f: any) => f.form),
    senses: sensesRaw.map((s) => ({
      gloss: (s.glosses ?? []).at(-1) ?? '',
      tags: s.tags ?? [],
      topics: s.topics ?? [],
      examples: (s.examples ?? [])
        .filter((e: any) => e.type !== 'quotation' && e.text)
        .map((e: any) => ({ text: e.text, hl: e.bold_text_offsets?.[0] })),
    })),
    tr,
    synonyms: [...(o.synonyms ?? []), ...sensesRaw.flatMap((s) => s.synonyms ?? [])]
      .map((s: any) => s.word)
      .filter(Boolean),
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * 3 GB'lık dökümden yalnızca listemizdeki kelimelerin İngilizce kayıtlarını ayıklar.
 * Sonuç scripts/.cache altında saklanır; sonraki çalıştırmalar saniyeler sürer.
 */
async function buildSubset(lemmas: Set<string>): Promise<void> {
  const gz = await ensureDownloaded('wiktionary')
  console.log('Wiktionary dökümü taranıyor (birkaç dakika sürebilir)…')
  const out = createWriteStream(`${SUBSET}.part`)
  const rl = createInterface({
    input: createReadStream(gz).pipe(createGunzip()),
    crlfDelay: Infinity,
  })
  let lines = 0
  let kept = 0
  const wordRe = /"word": "((?:[^"\\]|\\.)*)"/g
  for await (const line of rl) {
    if (++lines % 200000 === 0) console.log(`  ${lines.toLocaleString('tr')} satır, ${kept} kayıt`)
    // Hızlı ön eleme: satırdaki "word" değerlerinden biri listede değilse JSON'u hiç ayrıştırma
    let hit = false
    for (const m of line.matchAll(wordRe)) {
      if (lemmas.has(m[1].toLowerCase())) {
        hit = true
        break
      }
    }
    if (!hit) continue
    const o = JSON.parse(line)
    if (o.lang_code !== 'en' || !lemmas.has(String(o.word).toLowerCase())) continue
    out.write(JSON.stringify(compact(o)) + '\n')
    kept++
  }
  await new Promise<void>((res, rej) => out.end((err?: Error | null) => (err ? rej(err) : res())))
  renameSync(`${SUBSET}.part`, SUBSET)
  console.log(`✓ Wiktionary alt kümesi: ${kept} kayıt`)
}

const KAIKKI_POS: Record<Pos, string[]> = {
  noun: ['noun'],
  verb: ['verb'],
  adj: ['adj'],
  adv: ['adv'],
  other: [],
}
const RAW_POS_TO_KAIKKI: Record<string, string[]> = {
  preposition: ['prep', 'prep_phrase'],
  pronoun: ['pron'],
  determiner: ['det', 'article'],
  conjunction: ['conj'],
  interjection: ['intj'],
  number: ['num'],
  'modal auxiliary': ['verb'],
  'infinitive-to': ['particle', 'prep'],
}

function pickIpa(entries: WkEntry[]): string | undefined {
  const all = entries.flatMap((e) => e.ipa)
  const pref = (tag: string) => all.find((s) => s.tags.includes(tag))?.ipa
  return pref('General-American') ?? pref('US') ?? pref('Received-Pronunciation') ?? all[0]?.ipa
}

function shorten(s: string, max = 160): string {
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  return cut.slice(0, cut.lastIndexOf(' ')) + '…'
}

const uniq = <T>(xs: T[]) => [...new Set(xs)]

export class Wiktionary {
  private byWord = new Map<string, WkEntry[]>()

  static async load(words: BaseWord[]): Promise<Wiktionary> {
    const lemmas = new Set(words.flatMap((w) => w.variants.map((v) => v.toLowerCase())))
    if (!existsSync(SUBSET)) await buildSubset(lemmas)
    const wk = new Wiktionary()
    for (const line of readFileSync(SUBSET, 'utf8').split('\n')) {
      if (!line) continue
      const e = JSON.parse(line) as WkEntry
      const key = e.word.toLowerCase()
      wk.byWord.set(key, [...(wk.byWord.get(key) ?? []), e])
    }
    return wk
  }

  lookup(w: BaseWord): WkInfo {
    const all = w.variants.flatMap((v) => this.byWord.get(v.toLowerCase()) ?? [])
    // Büyük harfle başlayan özel adları (ör. "May" ↔ "may") yalnızca lemma da öyleyse kullan
    const sameCase = all.filter((e) => w.variants.includes(e.word) || e.word === w.lemma)
    const pool = sameCase.length ? sameCase : all
    const wanted =
      w.pos === 'other' ? w.rawPos.flatMap((p) => RAW_POS_TO_KAIKKI[p] ?? []) : KAIKKI_POS[w.pos]
    const matching = pool.filter((e) => wanted.includes(e.pos))
    const entries = matching.length ? matching : pool.filter((e) => e.pos !== 'name')

    const senses = entries
      .flatMap((e) => e.senses)
      .filter((s) => s.gloss && !s.tags.some((t) => SKIP_TAGS.has(t)) && !SKIP_GLOSS.test(s.gloss))

    const examples: Example[] = []
    for (const s of senses) {
      for (const ex of s.examples) {
        if (ex.text.length < 15 || ex.text.length > 140 || examples.some((e) => e.en === ex.text))
          continue
        examples.push({ en: ex.text, source: 'wiktionary', ...(ex.hl ? { hl: ex.hl } : {}) })
      }
    }

    return {
      ipa: pickIpa(entries.length ? entries : pool),
      defEn: uniq(
        senses.toSorted((a, b) => a.topics.length - b.topics.length).map((s) => shorten(s.gloss)),
      ).slice(0, 2),
      tr: uniq(entries.flatMap((e) => e.tr)).slice(0, 4),
      forms: uniq(entries.flatMap((e) => e.forms).filter((f) => !/[()]/.test(f))),
      synonyms: uniq(entries.flatMap((e) => e.synonyms)),
      examples: examples.slice(0, 3),
    }
  }
}
