import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card,
  type Grade,
  type ReviewLog,
} from 'ts-fsrs'

export { Rating, State }
export type { Card, Grade, ReviewLog }

/** Arayüzdeki dört buton: Tekrar (1) / Zor (2) / İyi (3) / Kolay (4) */
export const GRADES: readonly Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]

export const GRADE_LABELS: Record<Grade, string> = {
  [Rating.Again]: 'Tekrar',
  [Rating.Hard]: 'Zor',
  [Rating.Good]: 'İyi',
  [Rating.Easy]: 'Kolay',
}

const scheduler = fsrs(
  generatorParameters({
    request_retention: 0.9,
    maximum_interval: 365 * 3,
    enable_fuzz: true, // aynı gün eklenen kartlar aynı güne yığılmasın
    enable_short_term: true,
    learning_steps: ['1m', '10m'],
    relearning_steps: ['10m'],
  }),
)

export function newCard(now: Date): Card {
  return createEmptyCard(now)
}

export function rate(card: Card, grade: Grade, now: Date): { card: Card; log: ReviewLog } {
  return scheduler.next(card, now, grade)
}

/** Her buton için bir sonraki tekrar zamanı (buton üzerindeki "10 dk", "3 g" etiketleri için). */
export function preview(card: Card, now: Date): Record<Grade, Date> {
  const p = scheduler.repeat(card, now)
  return Object.fromEntries(GRADES.map((g) => [g, p[g].card.due])) as Record<Grade, Date>
}

/** Süreyi kısa Türkçe etikete çevirir: 45 sn → "<1 dk", 10 dk, 5 sa, 3 g, 2 ay, 1,5 yıl */
export function formatInterval(ms: number): string {
  const min = ms / 60_000
  if (min < 1) return '<1 dk'
  if (min < 60) return `${Math.round(min)} dk`
  const h = min / 60
  if (h < 24) return `${Math.round(h)} sa`
  const d = h / 24
  if (d < 30) return `${Math.round(d)} g`
  const mo = d / 30
  if (mo < 12) return `${Math.round(mo)} ay`
  return `${(d / 365).toLocaleString('tr', { maximumFractionDigits: 1 })} yıl`
}
