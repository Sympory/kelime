import { describe, expect, it } from 'vitest'
import type { StoredCard } from './queue'
import { newCard, State } from './scheduler'
import { accuracy, dailyCounts, forecast, levelProgress, streak, wordStatus } from './stats'

const now = new Date(2026, 9, 7, 12, 0)
const card = (patch: Partial<StoredCard> = {}): StoredCard => ({
  ...newCard(now),
  wordId: 'w',
  cefr: 'B1',
  status: 'active',
  addedAt: now,
  ...patch,
})
const daysAgo = (n: number, hour = 12) => new Date(2026, 9, 7 - n, hour, 0)

describe('wordStatus', () => {
  it.each([
    [undefined, 'new'],
    [card(), 'new'],
    [card({ status: 'known' }), 'known'],
    [card({ state: State.Learning }), 'learning'],
    [card({ state: State.Relearning }), 'learning'],
    [card({ state: State.Review, scheduled_days: 5 }), 'learning'],
    [card({ state: State.Review, scheduled_days: 21 }), 'learned'],
  ])('%#', (c, expected) => {
    expect(wordStatus(c)).toBe(expected)
  })
})

describe('streak', () => {
  it('bugün dahil art arda günleri sayar', () => {
    expect(streak([daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(4)], now)).toBe(3)
  })

  it('bugün henüz çalışılmadıysa dünden itibaren sayar', () => {
    expect(streak([daysAgo(1), daysAgo(2)], now)).toBe(2)
  })

  it('dün de çalışılmadıysa seri sıfırdır', () => {
    expect(streak([daysAgo(2), daysAgo(3)], now)).toBe(0)
  })

  it('gece 02:00 çalışması önceki güne sayılır (04:00 sınırı)', () => {
    // 6 Ekim 12:00 ve 7 Ekim 02:00 aynı çalışma günü → seri 1, bugün (7 Ekim 12:00) çalışılmadı
    expect(streak([daysAgo(1), new Date(2026, 9, 7, 2, 0)], now)).toBe(1)
  })

  it('boş geçmiş', () => {
    expect(streak([], now)).toBe(0)
  })
})

describe('levelProgress', () => {
  it('öğrenildi + biliyorum "tamam", geri kalan çalışılanlar "öğreniliyor" sayılır', () => {
    const cards = [
      card({ wordId: 'a', status: 'known' }),
      card({ wordId: 'b', state: State.Review, scheduled_days: 30 }),
      card({ wordId: 'c', state: State.Learning }),
      card({ wordId: 'd' }),
      card({ wordId: 'e', cefr: 'B2', status: 'known' }),
    ]
    expect(
      levelProgress(cards, [
        { cefr: 'B1', count: 100 },
        { cefr: 'B2', count: 50 },
      ]),
    ).toEqual([
      { cefr: 'B1', total: 100, done: 2, learning: 1 },
      { cefr: 'B2', total: 50, done: 1, learning: 0 },
    ])
  })
})

describe('dailyCounts', () => {
  it('son N günü bugün dahil sayar, boş günler 0', () => {
    const d = dailyCounts([daysAgo(0), daysAgo(0), daysAgo(2), daysAgo(40)], now, 3)
    expect(d.map((x) => [x.key, x.count])).toEqual([
      ['2026-10-05', 1],
      ['2026-10-06', 0],
      ['2026-10-07', 2],
    ])
  })
})

describe('accuracy', () => {
  it('"Tekrar" dışındakilerin oranı', () => {
    expect(accuracy([1, 3, 3, 4])).toBe(0.75)
    expect(accuracy([])).toBeUndefined()
  })
})

describe('forecast', () => {
  it('gecikmişler bugüne, sonrakiler kendi gününe; yeni ve "biliyorum" sayılmaz', () => {
    const at = (d: number) => new Date(2026, 9, 7 + d, 10, 0)
    const cards = [
      card({ wordId: 'late', state: State.Review, due: at(-3) }),
      card({ wordId: 't', state: State.Learning, due: new Date(2026, 9, 7, 18, 0) }),
      card({ wordId: 'd2', state: State.Review, due: at(2) }),
      card({ wordId: 'far', state: State.Review, due: at(30) }),
      card({ wordId: 'new' }),
      card({ wordId: 'known', status: 'known', state: State.Review, due: at(1) }),
    ]
    expect(forecast(cards, now, 3).map((d) => d.count)).toEqual([2, 0, 1])
  })
})
