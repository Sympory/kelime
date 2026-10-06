import { dayStart } from '../srs/day'
import type { StoredCard } from '../srs/queue'
import { newCard, rate, State, type Grade } from '../srs/scheduler'
import type { Cefr } from '../types/word'
import { DEFAULT_SETTINGS, type KelimeDB, type Settings } from './db'

export async function getSettings(db: KelimeDB): Promise<Settings> {
  const rows = await db.settings.toArray()
  return { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) }
}

export async function saveSettings(db: KelimeDB, patch: Partial<Settings>): Promise<void> {
  await db.settings.bulkPut(
    Object.entries(patch).map(([key, value]) => ({ key: key as keyof Settings, value })),
  )
}

/** Bugün ilk kez değerlendirilen (yeni → öğreniliyor) kart sayısı; günlük yeni limiti için. */
export async function countIntroducedToday(db: KelimeDB, now: Date): Promise<number> {
  return db.reviews
    .where('review')
    .aboveOrEqual(dayStart(now))
    .filter((r) => r.state === State.New)
    .count()
}

function stored(wordId: string, cefr: Cefr, status: StoredCard['status'], now: Date): StoredCard {
  return { ...newCard(now), wordId, cefr, status, addedAt: now }
}

/** Yerleştirme: "biliyorum" → çalışılmaz; "bilmiyorum" → yeni kart olarak sıranın başına. */
export async function placeWord(
  db: KelimeDB,
  word: { id: string; cefr: Cefr },
  known: boolean,
  now: Date,
): Promise<void> {
  await db.cards.put(stored(word.id, word.cefr, known ? 'known' : 'active', now))
}

/** Kartı değerlendirir, kaydı günceller ve tekrar günlüğüne ekler. Güncel kartı döner. */
export async function rateWord(
  db: KelimeDB,
  word: { id: string; cefr: Cefr },
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
  word: { id: string; cefr: Cefr },
  now: Date,
): StoredCard {
  return existing ?? stored(word.id, word.cefr, 'active', now)
}
