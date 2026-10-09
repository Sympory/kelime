import type { Cefr } from '../types/word'
import { dayEnd, dayStart } from './day'
import type { Card } from './scheduler'
import { State } from './state'

/** IndexedDB'deki kart kaydı: ts-fsrs kartı + kelime bilgisi. `due` indekslidir. */
export type StoredCard = Card & {
  wordId: string
  /** Kullanıcının eklediği kelimelerde bilinmeyebilir */
  cefr?: Cefr
  /** active: çalışma havuzunda · known: yerleştirmede "biliyorum" denildi, çalışılmaz */
  status: 'active' | 'known'
  addedAt: Date
}

/** reinforce: vakti gelmemiş ama unutulmaya en yakın eski kelime (pekiştirme) */
export type QueueKind = 'learning' | 'review' | 'new' | 'reinforce'
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
  /** Oturuma karıştırılacak en fazla pekiştirme kartı sayısı (varsayılan 0) */
  reinforce?: number
}

/**
 * Unutulma riski: son tekrardan geçen gün / kararlılık (stability). FSRS'de hatırlama olasılığı
 * bu oranla monoton düşer; sıralama için kütüphaneye gerek yok (ana sayfa onu indirmesin diye).
 */
function forgettingRisk(c: Card, now: Date): number {
  if (!c.last_review || c.stability <= 0) return 0
  const days = (now.getTime() - c.last_review.getTime()) / 86_400_000
  return days / c.stability
}

/**
 * Pekiştirme adayları: öğrenilmiş (tekrar aşamasında), bugün vadesi gelmeyen ve bugün hiç
 * görülmemiş kartlardan unutulmaya en yakın olanlar.
 */
export function reinforcementCandidates(cards: StoredCard[], now: Date, max: number): StoredCard[] {
  if (max <= 0) return []
  const today = dayStart(now)
  return cards
    .filter(
      (c) =>
        c.status === 'active' &&
        c.state === State.Review &&
        !isDueReview(c, now) &&
        c.last_review !== undefined &&
        c.last_review < today,
    )
    .sort((a, b) => forgettingRisk(b, now) - forgettingRisk(a, now))
    .slice(0, max)
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
  reinforce = 0,
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

  // Yeni kelimelerin arasına eski kelimeler serpiştirilir: her iki yeniden sonra bir pekiştirme
  const fresh: QueueItem[] = newIds.map((wordId) => ({ wordId, kind: 'new' as const, due: now }))
  const old: QueueItem[] = reinforcementCandidates(cards, now, reinforce).map((c) => ({
    wordId: c.wordId,
    kind: 'reinforce' as const,
    due: now,
  }))
  const mixed: QueueItem[] = []
  while (fresh.length || old.length) {
    mixed.push(...fresh.splice(0, 2))
    if (old.length) mixed.push(old.shift()!)
  }

  return [
    ...learning.map((c) => ({ wordId: c.wordId, kind: 'learning' as const, due: c.due })),
    ...reviews.map((c) => ({ wordId: c.wordId, kind: 'review' as const, due: c.due })),
    ...mixed,
  ]
}
