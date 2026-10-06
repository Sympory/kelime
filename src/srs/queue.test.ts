import { describe, expect, it } from 'vitest'
import { newWordOrder } from './order'
import { buildQueue, type StoredCard } from './queue'
import { newCard, State } from './scheduler'
import { answer, counts, isFinished, nextItem, startSession } from './session'
import { Rating } from './scheduler'

const now = new Date(2026, 9, 7, 12, 0)
const at = (min: number) => new Date(now.getTime() + min * 60_000)

function card(wordId: string, patch: Partial<StoredCard> = {}): StoredCard {
  return {
    ...newCard(now),
    wordId,
    cefr: 'B1',
    status: 'active',
    addedAt: now,
    ...patch,
  }
}

describe('buildQueue', () => {
  const base = { now, newLimit: 3, introducedToday: 0 }

  it('sıra: öğrenme → tekrar → yeni', () => {
    const q = buildQueue({
      ...base,
      cards: [
        card('rev', { state: State.Review, due: at(-60) }),
        card('learn', { state: State.Learning, due: at(-1) }),
      ],
      poolIds: ['rev', 'learn', 'n1'],
    })
    expect(q.map((i) => `${i.kind}:${i.wordId}`)).toEqual([
      'learning:learn',
      'review:rev',
      'new:n1',
    ])
  })

  it('günlük yeni limiti, bugün tanıtılanları düşer', () => {
    const q = buildQueue({ ...base, introducedToday: 2, cards: [], poolIds: ['a', 'b', 'c'] })
    expect(q.map((i) => i.wordId)).toEqual(['a'])
  })

  it('limit dolduysa yeni kart gelmez', () => {
    const q = buildQueue({ ...base, introducedToday: 5, cards: [], poolIds: ['a'] })
    expect(q).toEqual([])
  })

  it('"biliyorum" denen ve zaten görülen kelimeler yeni olarak gelmez', () => {
    const q = buildQueue({
      ...base,
      cards: [
        card('known', { status: 'known' }),
        card('rev', { state: State.Review, due: at(60 * 48) }),
      ],
      poolIds: ['known', 'rev', 'fresh'],
    })
    expect(q.map((i) => i.wordId)).toEqual(['fresh'])
  })

  it('yerleştirmede "bilmiyorum" denenler havuzdakilerden önce gelir', () => {
    const q = buildQueue({
      ...base,
      cards: [card('queued', { addedAt: at(-5) })],
      poolIds: ['p1', 'queued', 'p2'],
    })
    expect(q.map((i) => i.wordId)).toEqual(['queued', 'p1', 'p2'])
  })

  it('tekrarlar günün sonuna (ertesi 04:00) kadar dahildir, sonrası değil', () => {
    const q = buildQueue({
      ...base,
      newLimit: 0,
      cards: [
        card('tonight', { state: State.Review, due: new Date(2026, 9, 8, 2, 0) }),
        card('tomorrow', { state: State.Review, due: new Date(2026, 9, 8, 5, 0) }),
      ],
      poolIds: [],
    })
    expect(q.map((i) => i.wordId)).toEqual(['tonight'])
  })

  it('öğrenme adımları 20 dk öncesinden gösterilebilir, daha uzağı değil', () => {
    const q = buildQueue({
      ...base,
      newLimit: 0,
      cards: [
        card('soon', { state: State.Learning, due: at(15) }),
        card('later', { state: State.Learning, due: at(30) }),
      ],
      poolIds: [],
    })
    expect(q.map((i) => i.wordId)).toEqual(['soon'])
  })
})

describe('oturum', () => {
  it('"Tekrar" denen kart vakti gelince yeniden gösterilir', () => {
    let s = startSession([
      { wordId: 'a', kind: 'new', due: now },
      { wordId: 'b', kind: 'new', due: now },
    ])
    const a = nextItem(s, now)!
    s = answer(s, a, Rating.Again, at(1), now)
    expect(counts(s)).toEqual({ new: 1, learning: 1, review: 0 })

    // 1 dk dolmadan sıradaki yeni kart gelir
    expect(nextItem(s, at(0.5))?.wordId).toBe('b')
    s = answer(s, nextItem(s, at(0.5))!, Rating.Easy, at(60 * 24 * 3), at(0.5))

    // ana kuyruk bittiğinde öğrenme kartı vakti gelmese de gösterilir
    expect(nextItem(s, at(0.6))?.wordId).toBe('a')
    s = answer(s, nextItem(s, at(2))!, Rating.Good, at(12), at(2))
    // 10 dk sonrası hâlâ öğrenme penceresinde → oturumda kalır
    expect(isFinished(s)).toBe(false)
    s = answer(s, nextItem(s, at(12))!, Rating.Good, at(60 * 24), at(12))
    expect(isFinished(s)).toBe(true)
    expect(s.answered.map((x) => x.wordId)).toEqual(['a', 'b', 'a', 'a'])
  })
})

describe('newWordOrder', () => {
  it('kararlıdır, seviyeleri korur ve alfabetik değildir', () => {
    const words = ['apple', 'apply', 'april', 'arm', 'art', 'ask', 'bad', 'bag', 'ball'].map(
      (w) => ({
        id: `${w}-n`,
        cefr: 'A1',
      }),
    )
    const once = newWordOrder([...words, { id: 'zebra-n', cefr: 'A2' }])
    const twice = newWordOrder([{ id: 'zebra-n', cefr: 'A2' }, ...[...words].reverse()])
    expect(once).toEqual(twice)
    expect(once.at(-1)?.id).toBe('zebra-n')
    expect(once.map((w) => w.id)).not.toEqual(words.map((w) => w.id))
  })
})
