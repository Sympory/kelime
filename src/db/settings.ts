import { dayStart } from '../srs/day'
import { State } from '../srs/state'
import { DEFAULT_SETTINGS, type KelimeDB, type Settings } from './db'

/*
 * İlk açılışta gereken veritabanı işlemleri. Zamanlayıcı kütüphanesine (ts-fsrs) bağımlı
 * değildir; böylece ana sayfa açılırken o kütüphane indirilmez (bkz. srs/state.ts).
 */

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
