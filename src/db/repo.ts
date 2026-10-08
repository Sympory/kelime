import type { StoredCard } from '../srs/queue'
import { newCard, rate, type Grade } from '../srs/scheduler'
import type { Cefr } from '../types/word'
import type { KelimeDB } from './db'

// Ayar ve sorgu fonksiyonları hafif modülde (ts-fsrs'siz); eski içe aktarmalar için yeniden dışa aktarılır
export { countIntroducedToday, getSettings, saveSettings } from './settings'

function stored(
  wordId: string,
  cefr: Cefr | undefined,
  status: StoredCard['status'],
  now: Date,
): StoredCard {
  return { ...newCard(now), wordId, cefr, status, addedAt: now }
}

/** Yerleştirme: "biliyorum" → çalışılmaz; "bilmiyorum" → yeni kart olarak sıranın başına. */
export async function placeWord(
  db: KelimeDB,
  word: { id: string; cefr?: Cefr },
  known: boolean,
  now: Date,
): Promise<void> {
  await db.cards.put(stored(word.id, word.cefr, known ? 'known' : 'active', now))
}

/** Kartı değerlendirir, kaydı günceller ve tekrar günlüğüne ekler. Güncel kartı döner. */
export async function rateWord(
  db: KelimeDB,
  word: { id: string; cefr?: Cefr },
  grade: Grade,
  now: Date,
): Promise<StoredCard> {
  return db.transaction('rw', db.cards, db.reviews, async () => {
    const existing = (await db.cards.get(word.id)) ?? stored(word.id, word.cefr, 'active', now)
    const { card, log } = rate(existing, grade, now)
    const next: StoredCard = { ...existing, ...card }
    await db.cards.put(next)
    await db.reviews.add({ ...log, wordId: word.id })
    return next
  })
}

/** Değerlendirilmemiş bir kelime için geçici kart (buton etiketlerindeki aralık önizlemesi için). */
export function previewCard(
  existing: StoredCard | undefined,
  word: { id: string; cefr?: Cefr },
  now: Date,
): StoredCard {
  return existing ?? stored(word.id, word.cefr, 'active', now)
}
