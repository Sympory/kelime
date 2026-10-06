import type { Cefr } from '../types/word'
import { dayEnd } from './day'
import { State, type Card } from './scheduler'

/** IndexedDB'deki kart kaydı: ts-fsrs kartı + kelime bilgisi. `due` indekslidir. */
export type StoredCard = Card & {
  wordId: string
  cefr: Cefr
  /** active: çalışma havuzunda · known: yerleştirmede "biliyorum" denildi, çalışılmaz */
  status: 'active' | 'known'
  addedAt: Date
}

export type QueueKind = 'learning' | 'review' | 'new'
export type QueueItem = { wordId: string; kind: QueueKind; due: Date }

/** Öğrenme adımındaki kartlar bu kadar erken gösterilebilir (Anki'deki "learn ahead"). */
export const LEARN_AHEAD_MS = 20 * 60_000

/** Öğrenme adımında ve vakti gelmiş (ya da 20 dk içinde gelecek) kart */
export function isDueLearning(c: Card, now: Date): boolean {
  return (
    (c.state === State.Learning || c.state === State.Relearning) &&
    c.due.getTime() <= now.getTime() + LEARN_AHEAD_MS
  )
}

/** Tekrar aşamasında ve bugün (ertesi 04:00'e kadar) vadesi gelen kart */
export function isDueReview(c: Card, now: Date): boolean {
  return c.state === State.Review && c.due < dayEnd(now)
}

export type BuildQueueInput = {
  cards: StoredCard[]
  /** Seçili seviyelerdeki tüm kelimeler, sunulma sırasıyla (bkz. newWordOrder) */
  poolIds: string[]
  now: Date
  newLimit: number
  /** Bugün ilk kez değerlendirilen yeni kart sayısı */
  introducedToday: number
}

/**
 * Günün kuyruğu: önce vadesi gelmiş öğrenme adımları, sonra bugünün tekrarları,
 * en son günlük limite kadar yeni kelimeler (yerleştirmede "bilmiyorum" denenler önce).
 */
export function buildQueue({
  cards,
  poolIds,
  now,
  newLimit,
  introducedToday,
}: BuildQueueInput): QueueItem[] {
  const active = cards.filter((c) => c.status === 'active')
  const byDue = (a: { due: Date }, b: { due: Date }) => a.due.getTime() - b.due.getTime()

  const learning = active.filter((c) => isDueLearning(c, now)).sort(byDue)
  const reviews = active.filter((c) => isDueReview(c, now)).sort(byDue)

  const seen = new Set(cards.map((c) => c.wordId))
  const queuedNew = active
    .filter((c) => c.state === State.New)
    .sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime())
    .map((c) => c.wordId)
  const unseen = poolIds.filter((id) => !seen.has(id))
  const newIds = [...queuedNew, ...unseen].slice(0, Math.max(0, newLimit - introducedToday))

  return [
    ...learning.map((c) => ({ wordId: c.wordId, kind: 'learning' as const, due: c.due })),
    ...reviews.map((c) => ({ wordId: c.wordId, kind: 'review' as const, due: c.due })),
    ...newIds.map((wordId) => ({ wordId, kind: 'new' as const, due: now })),
  ]
}
