import { describe, expect, it } from 'vitest'
import { dayEnd, dayKey, dayStart } from './day'

describe('çalışma günü (04:00 sınırı)', () => {
  it('04:00 sonrası aynı güne aittir', () => {
    const now = new Date(2026, 9, 7, 15, 30)
    expect(dayStart(now)).toEqual(new Date(2026, 9, 7, 4, 0))
    expect(dayEnd(now)).toEqual(new Date(2026, 9, 8, 4, 0))
    expect(dayKey(now)).toBe('2026-10-07')
  })

  it('gece 01:00 önceki güne sayılır', () => {
    const now = new Date(2026, 9, 8, 1, 0)
    expect(dayStart(now)).toEqual(new Date(2026, 9, 7, 4, 0))
    expect(dayKey(now)).toBe('2026-10-07')
  })

  it('tam 04:00 yeni günün başıdır', () => {
    expect(dayKey(new Date(2026, 9, 8, 4, 0))).toBe('2026-10-08')
  })

  it('ay sonunu doğru geçer', () => {
    expect(dayKey(new Date(2026, 10, 1, 2, 0))).toBe('2026-10-31')
  })
})
