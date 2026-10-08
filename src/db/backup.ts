import type { StoredCard } from '../srs/queue'
import type { Word } from '../types/word'
import {
  DEFAULT_SETTINGS,
  type KelimeDB,
  type ReviewRecord,
  type Settings,
  type UserExample,
} from './db'
import { getSettings } from './repo'

/**
 * Yedek dosyası biçimi. Alan eklenirse sürümü artırıp `importBackup` içinde eski sürümü dönüştürün.
 * 1: ayarlar, kartlar, tekrarlar · 2: + kullanıcı kelimeleri ve örnek cümleleri
 */
export const BACKUP_VERSION = 2

export type Backup = {
  app: 'kelime'
  version: number
  exportedAt: string
  settings: Settings
  cards: StoredCard[]
  reviews: ReviewRecord[]
  userWords: Word[]
  userExamples: UserExample[]
}

export async function exportBackup(db: KelimeDB, now = new Date()): Promise<Backup> {
  const [settings, cards, reviews, userWords, userExamples] = await Promise.all([
    getSettings(db),
    db.cards.toArray(),
    db.reviews.toArray(),
    db.userWords.toArray(),
    db.userExamples.toArray(),
  ])
  return {
    app: 'kelime',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    settings,
    cards,
    reviews,
    userWords,
    userExamples,
  }
}

const CARD_DATES = ['due', 'last_review', 'addedAt'] as const
const REVIEW_DATES = ['due', 'review'] as const

/** JSON'dan gelen ISO metinlerini tekrar Date'e çevirir. */
function revive<T extends object>(row: T, keys: readonly string[]): T {
  const out = { ...row } as Record<string, unknown>
  for (const k of keys) if (typeof out[k] === 'string') out[k] = new Date(out[k] as string)
  return out as T
}

export class BackupError extends Error {}

/** Yedeği doğrular ve mevcut verinin **yerine** yazar (tek işlemde; hata olursa hiçbir şey değişmez). */
export async function importBackup(
  db: KelimeDB,
  raw: unknown,
): Promise<{ cards: number; reviews: number }> {
  const b = raw as Partial<Backup>
  if (!b || b.app !== 'kelime' || typeof b.version !== 'number')
    throw new BackupError('Bu dosya bir Kelime yedeği değil.')
  if (b.version > BACKUP_VERSION)
    throw new BackupError('Bu yedek uygulamanın daha yeni bir sürümünden; önce sayfayı yenileyin.')
  if (!Array.isArray(b.cards) || !Array.isArray(b.reviews))
    throw new BackupError('Yedek dosyası eksik ya da bozuk.')

  const cards = b.cards.map((c) => revive(c, CARD_DATES))
  const reviews = b.reviews.map((r) => revive(r, REVIEW_DATES))
  const settings = { ...DEFAULT_SETTINGS, ...b.settings }
  // Sürüm 1 yedeklerinde kullanıcı kelimeleri yok
  const userWords = Array.isArray(b.userWords) ? b.userWords : []
  const userExamples = (Array.isArray(b.userExamples) ? b.userExamples : []).map((e) =>
    revive(e, ['addedAt']),
  )

  await db.transaction(
    'rw',
    [db.cards, db.reviews, db.settings, db.userWords, db.userExamples],
    async () => {
      await clearAll(db)
      await db.cards.bulkPut(cards)
      await db.reviews.bulkPut(reviews)
      await db.userWords.bulkPut(userWords)
      await db.userExamples.bulkPut(userExamples)
      await db.settings.bulkPut(
        Object.entries(settings).map(([key, value]) => ({ key: key as keyof Settings, value })),
      )
    },
  )
  return { cards: cards.length, reviews: reviews.length }
}

/** Tüm ilerlemeyi siler (ayarlar dahil). */
export async function resetAll(db: KelimeDB): Promise<void> {
  await db.transaction(
    'rw',
    [db.cards, db.reviews, db.settings, db.userWords, db.userExamples],
    async () => {
      await clearAll(db)
    },
  )
}

function clearAll(db: KelimeDB) {
  return Promise.all([
    db.cards.clear(),
    db.reviews.clear(),
    db.settings.clear(),
    db.userWords.clear(),
    db.userExamples.clear(),
  ])
}

/** Tarayıcıda dosya indirtir. */
export function downloadJson(data: unknown, filename: string): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
