/** 32 bit FNV-1a özeti — kelime kimliğinden kararlı bir sayı üretir. */
function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Yeni kelimelerin sunulma sırası. Veri alfabetik sıralı olduğu için olduğu gibi kullanmak
 * hep "a…" ile başlayan kelimeleri getirirdi; kimliğe göre kararlı bir karıştırma kullanılır.
 * Seviyeler korunur: düşük seviyedeki kelimeler önce gelir.
 */
export function newWordOrder<T extends { id: string; cefr?: string }>(words: T[]): T[] {
  return [...words].sort(
    (a, b) => (a.cefr ?? 'Z').localeCompare(b.cefr ?? 'Z') || hash(a.id) - hash(b.id),
  )
}
