import type { Pos } from '../types/word'

/**
 * Hazır veride olmayan kelimeler için tanım önerisi: Datamuse API (ücretsiz, anahtarsız,
 * CORS açık; veri hattında da kullanılıyor). Çekimli kelimelerde kök hâli de verir
 * ("deteriorated" → "deteriorate"). Ağ hatasında `undefined` döner.
 */
export type DictionarySuggestion = { word: string; pos: Pos; defEn: string[]; ipa?: string }

const POS: Record<string, Pos> = { n: 'noun', v: 'verb', adj: 'adj', adv: 'adv' }
const TIMEOUT_MS = 6000

type DatamuseHit = { word: string; tags?: string[]; defs?: string[]; defHeadword?: string }

async function query(word: string): Promise<DatamuseHit | undefined> {
  try {
    const params = new URLSearchParams({ sp: word, md: 'dpr', ipa: '1', qe: 'sp', max: '1' })
    const res = await fetch(`https://api.datamuse.com/words?${params}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return undefined
    const [hit] = (await res.json()) as DatamuseHit[]
    return hit?.word.toLowerCase() === word.toLowerCase() ? hit : undefined
  } catch {
    return undefined
  }
}

export async function suggestDefinition(word: string): Promise<DictionarySuggestion | undefined> {
  const hit = await query(word.trim())
  if (!hit?.defs?.length) return undefined
  // Çekimli kelime: kökün kendi kaydı (IPA'sı ve tanımları köke ait olsun)
  const head =
    hit.defHeadword && hit.defHeadword !== hit.word ? ((await query(hit.defHeadword)) ?? hit) : hit
  const defs = (head.defs ?? hit.defs).map((d) => d.split('\t'))
  return {
    word: hit.defHeadword ?? hit.word,
    pos: POS[defs[0][0]] ?? 'other',
    defEn: defs
      .filter(([p]) => p === defs[0][0])
      .map(([, text]) => text.replace(/^\([^)]*\)\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 2),
    ipa: head.tags?.find((t) => t.startsWith('ipa_pron:'))?.slice('ipa_pron:'.length),
  }
}
