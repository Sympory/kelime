/**
 * Veri hattı: listeleri indir → birleştir → zenginleştir (Wiktionary, WordNet, Tatoeba, Datamuse)
 * → overrides uygula → public/data/*.json üret.
 *
 *   npm run build:data                  # tam çalıştırma
 *   npm run build:data -- --no-datamuse # collocation'ları atla (ağ isteği yok)
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Cefr, DataIndex, DataLookup, Example, Word } from '../src/types/word.ts'
import { fetchCollocations } from './lib/datamuse.ts'
import { loadOverrides } from './lib/overrides.ts'
import { OUT_DIR } from './lib/paths.ts'
import { report } from './lib/report.ts'
import { buildFormIndex, findSpan, findTatoebaExamples } from './lib/tatoeba.ts'
import { TrWiktionary } from './lib/trwiktionary.ts'
import { Wiktionary } from './lib/wiktionary.ts'
import { loadWordlist } from './lib/wordlist.ts'
import { WordNet } from './lib/wordnet.ts'

const args = new Set(process.argv.slice(2))
const LEVELS: Cefr[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const MAX_EXAMPLES = 3

console.time('build:data')

const base = await loadWordlist()
console.log(`Liste: ${base.length} kelime`)

const wordnet = new WordNet()
const wiktionary = await Wiktionary.load(base)
const trWiktionary = await TrWiktionary.load()
const wk = new Map(base.map((w) => [w.id, wiktionary.lookup(w)]))

// Eşleştirme biçimleri: yazım varyantları + çekimli hâller. Başka bir kelimenin lemması olan
// biçimler çıkarılır ("saw" → see değil saw; "am" → a.m. değil) ki yanlış örnek seçilmesin.
const lemmaOwner = new Map<string, string>()
for (const w of base) for (const v of w.variants) lemmaOwner.set(v.toLowerCase(), w.lemma)
const allForms = new Map(
  base.map((w) => [
    w.id,
    [...new Set([...w.variants, ...wk.get(w.id)!.forms].map((f) => f.toLowerCase()))],
  ]),
)
const forms = new Map(
  base.map((w) => [
    w.id,
    allForms.get(w.id)!.filter((f) => (lemmaOwner.get(f) ?? w.lemma) === w.lemma),
  ]),
)

const tatoeba = await findTatoebaExamples(
  buildFormIndex(forms, new Map(base.map((w) => [w.id, w.pos])), allForms),
  MAX_EXAMPLES,
)

/**
 * Türkçe karşılıklar: İngilizce Vikisözlük çeviri tabloları anlam sırasına göre olduğu için önce gelir.
 * 2'den azsa Türkçe Vikisözlük tanımlarıyla 3'e tamamlanır.
 */
function turkish(b: (typeof base)[number], fromEn: string[]): string[] {
  if (fromEn.length >= 2) return fromEn.slice(0, 4)
  return [...new Set([...fromEn, ...trWiktionary.lookup(b)])].slice(0, 3)
}

const collocations = args.has('--no-datamuse')
  ? new Map<string, string[]>()
  : await fetchCollocations(base)

const overrides = loadOverrides()

function withSpan<T extends { en: string; hl?: [number, number] }>(ex: T, id: string): T {
  const hl = ex.hl ?? findSpan(ex.en, forms.get(id)!)
  return hl ? { ...ex, hl } : ex
}

const words: Word[] = base.map((b) => {
  const info = wk.get(b.id)!
  const notSelf = (s: string) => !b.variants.some((v) => v.toLowerCase() === s.toLowerCase())

  let examples: Example[] = [...(tatoeba.get(b.id) ?? [])]
  for (const ex of info.examples) {
    if (examples.length >= MAX_EXAMPLES) break
    examples.push(withSpan(ex, b.id))
  }
  const exOverride = overrides.examples.get(b.id)
  if (exOverride) {
    examples = exOverride
      .slice(0, MAX_EXAMPLES)
      .map((ex) => withSpan({ ...ex, source: 'user' as const }, b.id))
  }

  // Türkçe önceliği: topluluk düzeltmesi > Vikisözlük > yapay zekâ ile üretilmiş (işaretli)
  const sourcedTr = overrides.tr.get(b.id) ?? turkish(b, info.tr)
  const autoTr = sourcedTr.length === 0 ? overrides.trAuto.get(b.id) : undefined

  const word: Word = {
    id: b.id,
    lemma: b.lemma,
    pos: b.pos,
    cefr: b.cefr,
    defEn: info.defEn,
    tr: autoTr ?? sourcedTr,
    ...(autoTr ? { trAuto: true as const } : {}),
    examples,
    collocations: collocations.get(b.id) ?? [],
    synonyms: [...new Set([...wordnet.synonyms(b.lemma, b.pos), ...info.synonyms])]
      .filter(notSelf)
      .slice(0, 5),
    family: wordnet.family(b.lemma).filter(notSelf),
  }
  if (info.ipa) word.ipa = info.ipa
  return word
})

const ids = new Set(words.map((w) => w.id))
for (const id of [
  ...overrides.tr.keys(),
  ...overrides.trAuto.keys(),
  ...overrides.examples.keys(),
]) {
  if (!ids.has(id)) console.warn(`⚠ overrides: bilinmeyen kelime kimliği "${id}"`)
}

const byLevel = new Map<Cefr, Word[]>(LEVELS.map((l) => [l, []]))
words.sort((a, b) => a.lemma.localeCompare(b.lemma, 'en') || a.id.localeCompare(b.id))
for (const w of words) byLevel.get(w.cefr!)!.push(w) // hazır veride seviye her zaman dolu

const index: DataIndex = { generatedAt: new Date().toISOString(), levels: [] }
for (const [level, list] of byLevel) {
  const file = `${level.toLowerCase()}.json`
  // Satır başına bir kelime: küçük dosya + okunabilir git diff'leri
  writeFileSync(join(OUT_DIR, file), `[\n${list.map((w) => JSON.stringify(w)).join(',\n')}\n]\n`)
  index.levels.push({ cefr: level, file, count: list.length })
}
writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n')

// Yazılış → kelime sözlüğü ("declined" → decline-v): makaleden ekleme ve CSV içe aktarmada
// kelimeyi bulmak için. Belirsiz yazılışlar birden çok adaya gider ("saw" → saw-n, see-v).
const lookup: DataLookup = {}
for (const w of words) {
  for (const form of allForms.get(w.id) ?? [w.lemma.toLowerCase()]) {
    ;(lookup[form] ??= []).push(`${w.id}|${w.cefr}`)
  }
}
writeFileSync(join(OUT_DIR, 'lookup.json'), JSON.stringify(lookup) + '\n')
console.log(`Sözlük: ${Object.keys(lookup).length} yazılış`)

report(byLevel)
console.timeEnd('build:data')
