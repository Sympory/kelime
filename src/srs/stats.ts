import type { Cefr } from '../types/word'
import { dayKey } from './day'
import type { StoredCard } from './queue'
import { State } from './state'

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

export type DayCount = { key: string; date: Date; count: number }

/** Son `days` çalışma gününün (bugün dahil) tekrar sayıları, eskiden yeniye. */
export function dailyCounts(reviewDates: Date[], now: Date, days = 30): DayCount[] {
  const byKey = new Map<string, number>()
  for (const d of reviewDates) byKey.set(dayKey(d), (byKey.get(dayKey(d)) ?? 0) + 1)
  const out: DayCount[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const key = dayKey(date)
    out.push({ key, date, count: byKey.get(key) ?? 0 })
  }
  return out
}

/** Doğru oranı: "Tekrar" (1) dışındaki değerlendirmelerin oranı; değerlendirme yoksa undefined. */
export function accuracy(ratings: number[]): number | undefined {
  if (ratings.length === 0) return undefined
  return ratings.filter((r) => r !== 1).length / ratings.length
}

/**
 * Önümüzdeki günlerin yükü: her gün vadesi gelecek kart sayısı (bugün, gecikmişleri de içerir).
 * Yalnızca çalışılan (değerlendirilmiş) aktif kartlar sayılır; yeni kelimeler hariç.
 */
export function forecast(cards: StoredCard[], now: Date, days = 7): DayCount[] {
  const out = dailyCounts([], now, 1).map((d) => ({ ...d }))
  for (let i = 1; i < days; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() + i)
    out.push({ key: dayKey(date), date, count: 0 })
  }
  const index = new Map(out.map((d, i) => [d.key, i]))
  for (const c of cards) {
    if (c.status !== 'active' || c.state === State.New) continue
    const i = c.due <= now ? 0 : index.get(dayKey(c.due))
    if (i !== undefined) out[i].count++
  }
  return out
}
