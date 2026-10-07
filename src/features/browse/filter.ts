import type { StoredCard } from '../../srs/queue'
import { wordStatus, type WordStatus } from '../../srs/stats'
import type { Pos, Word } from '../../types/word'

export type BrowseFilter = {
  query: string
  pos?: Pos
  status?: WordStatus
}

const fold = (s: string) => s.toLocaleLowerCase('tr').normalize('NFC').trim()

/**
 * Gezgin araması: İngilizce kelimede ya da Türkçe karşılıklarda geçen metin.
 * Sıralama: İngilizcede tam > baştan > içinde; sonra Türkçede tam > kelime başı > içinde;
 * aynı sıradakiler alfabetik.
 */
export function filterWords(
  words: Word[],
  cards: Map<string, StoredCard>,
  { query, pos, status }: BrowseFilter,
): Word[] {
  const q = fold(query)
  const scored: { w: Word; rank: number }[] = []
  for (const w of words) {
    if (pos && w.pos !== pos) continue
    if (status && wordStatus(cards.get(w.id)) !== status) continue
    if (!q) {
      scored.push({ w, rank: 3 })
      continue
    }
    const lemma = fold(w.lemma)
    let rank: number
    if (lemma === q) rank = 0
    else if (lemma.startsWith(q)) rank = 1
    else if (lemma.includes(q)) rank = 2
    else {
      const tr = w.tr.map(fold)
      if (tr.includes(q)) rank = 3
      else if (tr.some((t) => t.split(/\s+/).some((part) => part.startsWith(q)))) rank = 4
      else if (tr.some((t) => t.includes(q))) rank = 5
      else continue
    }
    scored.push({ w, rank })
  }
  return scored
    .sort((a, b) => a.rank - b.rank || a.w.lemma.localeCompare(b.w.lemma, 'en'))
    .map((s) => s.w)
}
