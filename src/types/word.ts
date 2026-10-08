export type Cefr = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type Pos = 'noun' | 'verb' | 'adj' | 'adv' | 'other'

export type Example = {
  en: string
  tr?: string
  source: 'tatoeba' | 'wiktionary' | 'user'
  /** Tatoeba cümle kimliği ve yazarı (CC BY 2.0 FR atfı için) */
  tatoebaId?: number
  author?: string
  /** Türkçe çevirinin Tatoeba kimliği ve yazarı */
  trTatoebaId?: number
  trAuthor?: string
  /** `en` içinde kelimenin geçtiği aralık [başlangıç, bitiş) — kart ön yüzündeki vurgu/boşluk için */
  hl?: [number, number]
}

export type Word = {
  id: string // "deteriorate-v"
  lemma: string // "deteriorate"
  pos: Pos
  /** Hazır veride her zaman dolu; kullanıcının eklediği kelimelerde bilinmeyebilir */
  cefr?: Cefr
  /** Kullanıcının makaleden ya da CSV'den eklediği, hazır veride olmayan kelime */
  custom?: true
  ipa?: string
  defEn: string[] // kısa İngilizce tanımlar (en fazla 2)
  tr: string[] // Türkçe karşılıklar
  /** Türkçe karşılıklar yapay zekâ ile üretildi (data/overrides/tr-auto.json); gözden geçirilmeli */
  trAuto?: true
  examples: Example[] // en fazla 3
  collocations: string[] // "deteriorate rapidly", "health deteriorated"
  synonyms: string[]
  family: string[] // deterioration, deteriorating
}

/** public/data/index.json */
export type DataIndex = {
  generatedAt: string
  levels: { cefr: Cefr; file: string; count: number }[]
}

/** public/data/lookup.json — küçük harfli yazılış → ["kelime-kimliği|SEVİYE", …] */
export type DataLookup = Record<string, string[]>
