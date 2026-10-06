import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import bz2 from 'unbzip2-stream'
import type { Example, Pos } from '../../src/types/word.ts'
import { ensureDownloaded, type SourceKey } from './download.ts'

async function* readTsv(key: SourceKey): AsyncGenerator<string[]> {
  const file = await ensureDownloaded(key)
  const rl = createInterface({ input: createReadStream(file).pipe(bz2()), crlfDelay: Infinity })
  for await (const line of rl) if (line) yield line.split('\t')
}

const TOKEN = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g

export type FormIndex = {
  single: Map<string, string[]> // "deteriorated" → ["deteriorate-v"]
  multi: Map<string, { tokens: string[]; id: string }[]> // ilk token → çok kelimeli ifadeler
  pos: Map<string, Pos>
  /** Listede farklı türlerdeki kelimelere ait yazımlar ("saw": saw-n + see-v, "change": change-n + change-v) */
  ambiguous: Set<string>
}

/**
 * @param ambiguityForms Belirsizliği hesaplamak için kullanılacak (filtrelenmemiş) biçimler.
 *   Ör. "saw" see-v'nin eşleştirme biçimlerinden çıkarılmış olsa da see'nin geçmiş zamanıdır.
 */
export function buildFormIndex(
  formsById: Map<string, string[]>,
  posById: Map<string, Pos> = new Map(),
  ambiguityForms: Map<string, string[]> = formsById,
): FormIndex {
  const single = new Map<string, string[]>()
  const multi = new Map<string, { tokens: string[]; id: string }[]>()
  for (const [id, forms] of formsById) {
    for (const form of new Set(forms.map((f) => f.toLowerCase()))) {
      const tokens = form.match(TOKEN)?.map((t) => t.toLowerCase()) ?? []
      if (tokens.length === 0) continue
      if (tokens.length === 1) single.set(tokens[0], [...(single.get(tokens[0]) ?? []), id])
      else multi.set(tokens[0], [...(multi.get(tokens[0]) ?? []), { tokens, id }])
    }
  }
  const posByForm = new Map<string, Set<Pos | undefined>>()
  for (const [id, forms] of ambiguityForms) {
    for (const f of forms) {
      const key = f.toLowerCase()
      posByForm.set(key, (posByForm.get(key) ?? new Set()).add(posById.get(id)))
    }
  }
  const ambiguous = new Set([...posByForm].filter(([, p]) => p.size > 1).map(([f]) => f))
  return { single, multi, pos: posById, ambiguous }
}

/** Cümlede kelimeyi bulur, [başlangıç, bitiş) döndürür. */
export function findSpan(text: string, forms: string[]): [number, number] | undefined {
  const index = buildFormIndex(new Map([['x', forms]]))
  return matchSentence(text, index).get('x')?.hl
}

type Token = { t: string; start: number; end: number }
type Match = { hl: [number, number]; posPenalty: number }

const words = (s: string) => new Set(s.split(' '))
const DET = words(
  'a an the my your his her its our their this these those every each another no some any whose many few several both much',
)
const PREP = words('in of on at for with by from about into through without')
const SUBJ = words('i you he she we they who')
const OBJ = words('me him us them')
const AUX = words(
  'to can could will would shall should may might must do does did not never also just already always often usually sometimes still last really',
)
const NOUN_FOLLOWERS = words('and or but is was are were has had')
const COPULA = words(
  'very too so quite rather extremely is are was were be been being seems seemed looks looked feel felt become became',
)

/** Kelimenin cümledeki konumuna bakarak hangi türlerin akla yatkın olduğunu kabaca tahmin eder. */
function contextSignals(toks: Token[], i: number): Set<Pos> {
  const prev = toks[i - 1]?.t ?? ''
  const prev2 = toks[i - 2]?.t ?? ''
  const next = toks[i + 1]?.t ?? ''
  const signals = new Set<Pos>()
  const verbish = SUBJ.has(prev) || AUX.has(prev) || /'(ll|d|ve|re)$|n't$/.test(prev)
  if (verbish || OBJ.has(next) || (DET.has(next) && !DET.has(prev))) signals.add('verb')
  // "in the long run." gibi: belirleyici + sıfat + kelime, ardından cümle sonu / edat / bağlaç.
  // ("the policeman saw him" yanlışlıkla isim sayılmasın diye sonraki kelimeye de bakılır.)
  const nounPhraseEnd = next === '' || PREP.has(next) || NOUN_FOLLOWERS.has(next)
  if (
    DET.has(prev) ||
    PREP.has(prev) ||
    next === 'of' ||
    (DET.has(prev2) && !verbish && !COPULA.has(prev) && nounPhraseEnd)
  )
    signals.add('noun')
  if (COPULA.has(prev) && !DET.has(next)) signals.add('adj')
  return signals
}

/**
 * Basit bağlam sezgisi: aynı yazım listede farklı türlerde varsa ("I saw a dog" → see, testere değil)
 * cümledeki kullanımın aradığımız türe uyup uymadığına bakar. Bağlam açıkça başka türü
 * gösteriyorsa cümle elenir (REJECT); belirsizse küçük bir ceza verilir.
 */
const REJECT = Number.POSITIVE_INFINITY
function posPenalty(pos: Pos | undefined, toks: Token[], i: number): number {
  if (!pos || pos === 'other' || pos === 'adv') return 0
  const signals = contextSignals(toks, i)
  if (signals.has(pos)) return 0
  return signals.size > 0 ? REJECT : 30
}

export function matchSentence(text: string, index: FormIndex): Map<string, Match> {
  const toks: Token[] = [...text.matchAll(TOKEN)].map((m) => ({
    t: m[0].toLowerCase(),
    start: m.index!,
    end: m.index! + m[0].length,
  }))
  const found = new Map<string, Match>()
  toks.forEach((tok, i) => {
    for (const id of index.single.get(tok.t) ?? []) {
      const penalty = index.ambiguous.has(tok.t) ? posPenalty(index.pos.get(id), toks, i) : 0
      // Kelime cümlede birden çok kez geçiyorsa bağlamı en uygun olanı tut
      const prev = found.get(id)
      if (!prev || penalty < prev.posPenalty)
        found.set(id, { hl: [tok.start, tok.end], posPenalty: penalty })
    }
    for (const { tokens, id } of index.multi.get(tok.t) ?? []) {
      if (found.has(id)) continue
      if (tokens.every((t, k) => toks[i + k]?.t === t))
        found.set(id, { hl: [tok.start, toks[i + tokens.length - 1].end], posPenalty: 0 })
    }
  })
  return found
}

type Candidate = Example & { score: number }

/** Detaylı dökümde sahipsiz cümlelerin kullanıcı adı "\N" olarak gelir. */
const author = (user: string | undefined) => (user && user !== '\\N' ? user : undefined)

function score(en: string, hasTr: boolean): number {
  const words = en.split(/\s+/).length
  let s = hasTr ? 100 : 0
  s -= Math.abs(words - 9) * 3 // 6–12 kelimelik cümleler ideal
  if (words < 4) s -= 30
  if (/\d/.test(en)) s -= 10
  if (/["“”]/.test(en)) s -= 5
  if (!/[.!?]$/.test(en)) s -= 10
  if (/\b(Tom|Mary|John)\b/.test(en)) s -= 4 // Tatoeba'da çok tekrar eden isimler; çeşitlilik için
  return s
}

const wordSet = (s: string) => new Set(s.toLowerCase().match(TOKEN) ?? [])

/** İki cümlenin kelime kümesi benzerliği (Jaccard). */
function similarity(a: string, b: string): number {
  const A = wordSet(a)
  const B = wordSet(b)
  let common = 0
  for (const w of A) if (B.has(w)) common++
  return common / (A.size + B.size - common || 1)
}

/**
 * Tatoeba İngilizce cümlelerini tarar ve her kelime için en iyi `perWord` örneği seçer.
 * Türkçe çevirisi olan, orta uzunluktaki cümleler önceliklidir.
 */
export async function findTatoebaExamples(
  index: FormIndex,
  perWord = 3,
): Promise<Map<string, Example[]>> {
  console.log('Tatoeba: bağlantılar ve Türkçe cümleler okunuyor…')
  const links = new Map<number, number[]>()
  for await (const [en, tr] of readTsv('tatoebaLinks')) {
    const e = Number(en)
    links.set(e, [...(links.get(e) ?? []), Number(tr)])
  }
  const neededTr = new Set([...links.values()].flat())
  const turkish = new Map<number, { text: string; author?: string }>()
  for await (const [id, , text, user] of readTsv('tatoebaTur')) {
    if (neededTr.has(Number(id))) turkish.set(Number(id), { text, author: author(user) })
  }

  console.log(`Tatoeba: ${turkish.size} Türkçe çeviri; İngilizce cümleler taranıyor…`)
  const best = new Map<string, Candidate[]>()
  const keep = perWord * 4
  let n = 0
  for await (const [idStr, , en, user] of readTsv('tatoebaEng')) {
    if (++n % 500000 === 0) console.log(`  ${n.toLocaleString('tr')} cümle`)
    if (en.length > 120) continue
    const matches = matchSentence(en, index)
    if (matches.size === 0) continue
    const id = Number(idStr)
    const trId = links.get(id)?.find((t) => turkish.has(t))
    const tr = trId === undefined ? undefined : turkish.get(trId)!
    const base = score(en, Boolean(tr))
    for (const [wordId, { hl, posPenalty: penalty }] of matches) {
      if (penalty === REJECT) continue
      const s = base - penalty
      const list = best.get(wordId) ?? []
      if (list.length >= keep && list[list.length - 1].score >= s) continue
      list.push({
        en,
        source: 'tatoeba',
        tatoebaId: id,
        ...(author(user) ? { author: author(user) } : {}),
        ...(tr ? { tr: tr.text, trTatoebaId: trId } : {}),
        ...(tr?.author ? { trAuthor: tr.author } : {}),
        hl,
        score: s,
      })
      list.sort((a, b) => b.score - a.score)
      if (list.length > keep) list.pop()
      best.set(wordId, list)
    }
  }

  const out = new Map<string, Example[]>()
  for (const [id, list] of best) {
    const picked: Example[] = []
    for (const { score, ...ex } of list) {
      // Aynı cümlenin küçük varyasyonlarını ("effort" / "efforts" vb.) atla
      if (picked.some((p) => similarity(p.en, ex.en) >= 0.6)) continue
      picked.push(ex)
      if (picked.length === perWord) break
    }
    out.set(id, picked)
  }
  return out
}
