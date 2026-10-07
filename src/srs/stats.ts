import type { Cefr } from '../types/word'
import { dayKey } from './day'
import type { StoredCard } from './queue'
import { State } from './scheduler'

/** Bir kartın tekrar aralığı bu kadar güne ulaşınca kelime "öğrenildi" sayılır (Anki'deki "olgun"). */
export const MATURE_DAYS = 21

export type WordStatus = 'new' | 'learning' | 'learned' | 'known'

export const STATUS_LABELS: Record<WordStatus, string> = {
  new: 'Yeni',
  learning: 'Öğreniliyor',
  learned: 'Öğrenildi',
  known: 'Biliyorum',
}

/** Kart yoksa ya da hiç değerlendirilmemişse yeni; elemede "biliyorum" denildiyse known. */
export function wordStatus(card: StoredCard | undefined): WordStatus {
  if (!card) return 'new'
  if (card.status === 'known') return 'known'
  if (card.state === State.New) return 'new'
  if (card.state === State.Review && card.scheduled_days >= MATURE_DAYS) return 'learned'
  return 'learning'
}

/**
 * Art arda çalışılan gün sayısı. Bugün henüz çalışılmadıysa seri dünden itibaren sayılır
 * (gün bitmeden seri kırılmış görünmesin).
 */
export function streak(reviewDates: Date[], now: Date): number {
  const days = new Set(reviewDates.map((d) => dayKey(d)))
  const cursor = new Date(now)
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let n = 0
  while (days.has(dayKey(cursor))) {
    n++
    cursor.setDate(cursor.getDate() - 1)
  }
  return n
}

export type LevelProgress = {
  cefr: Cefr
  total: number
  /** "Öğrenildi" + "biliyorum" */
  done: number
  learning: number
}

export function levelProgress(
  cards: StoredCard[],
  levels: { cefr: Cefr; count: number }[],
): LevelProgress[] {
  return levels.map(({ cefr, count }) => {
    const mine = cards.filter((c) => c.cefr === cefr).map(wordStatus)
    return {
      cefr,
      total: count,
      done: mine.filter((s) => s === 'learned' || s === 'known').length,
      learning: mine.filter((s) => s === 'learning').length,
    }
  })
}
