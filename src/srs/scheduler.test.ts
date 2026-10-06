import { describe, expect, it } from 'vitest'
import { formatInterval, GRADES, newCard, preview, rate, Rating, State } from './scheduler'

const now = new Date(2026, 9, 7, 12, 0)
const MIN = 60_000
const DAY = 24 * 60 * MIN

describe('scheduler (ts-fsrs sarmalayıcı)', () => {
  it('yeni kart: Tekrar 1 dk, İyi 10 dk sonra (öğrenme adımları)', () => {
    const p = preview(newCard(now), now)
    expect(p[Rating.Again].getTime() - now.getTime()).toBe(1 * MIN)
    expect(p[Rating.Good].getTime() - now.getTime()).toBe(10 * MIN)
  })

  it('yeni kart: Kolay doğrudan tekrar aşamasına geçer ve en az 1 gün sonraya planlanır', () => {
    const { card } = rate(newCard(now), Rating.Easy, now)
    expect(card.state).toBe(State.Review)
    expect(card.due.getTime() - now.getTime()).toBeGreaterThanOrEqual(DAY)
  })

  it('butonların aralıkları sıralıdır: Tekrar ≤ Zor ≤ İyi ≤ Kolay', () => {
    let card = rate(newCard(now), Rating.Good, now).card
    let t = new Date(now.getTime() + 10 * MIN)
    card = rate(card, Rating.Good, t).card // tekrar aşamasına geçer
    t = card.due
    const p = preview(card, t)
    const ms = GRADES.map((g) => p[g].getTime())
    expect([...ms].sort((a, b) => a - b)).toEqual(ms)
  })

  it('tekrar aşamasındaki kartı unutmak (Tekrar) yeniden öğrenmeye düşürür ve hata sayar', () => {
    let card = rate(newCard(now), Rating.Easy, now).card
    card = rate(card, Rating.Again, card.due).card
    expect(card.state).toBe(State.Relearning)
    expect(card.lapses).toBe(1)
  })

  it('günlük kaydı değerlendirme öncesi durumu tutar', () => {
    const { log } = rate(newCard(now), Rating.Good, now)
    expect(log.state).toBe(State.New)
    expect(log.rating).toBe(Rating.Good)
  })
})

describe('formatInterval', () => {
  it.each([
    [30_000, '<1 dk'],
    [10 * MIN, '10 dk'],
    [5 * 60 * MIN, '5 sa'],
    [3 * DAY, '3 g'],
    [60 * DAY, '2 ay'],
    [548 * DAY, '1,5 yıl'],
  ])('%i ms → %s', (ms, label) => {
    expect(formatInterval(ms)).toBe(label)
  })
})
