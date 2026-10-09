import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { Rating, State } from '../srs/scheduler'
import { KelimeDB } from './db'
import { countIntroducedToday, getSettings, placeWord, rateWord, saveSettings } from './repo'

const now = new Date(2026, 9, 7, 12, 0)
const word = { id: 'reluctant-adj', cefr: 'B2' as const }
let n = 0
const dbs: KelimeDB[] = []
const freshDb = () => {
  const db = new KelimeDB(`test-${n++}`)
  dbs.push(db)
  return db
}

afterEach(async () => {
  await Promise.all(dbs.splice(0).map((d) => d.delete()))
})

describe('repo', () => {
  it('ayarlar: varsayılanlar + kaydedilenler', async () => {
    const db = freshDb()
    expect(await getSettings(db)).toEqual({
      levels: [],
      dailyNewLimit: 10,
      reinforceLimit: 5,
      placementDone: false,
      accent: 'en-US',
      direction: 'en-tr',
      theme: 'system',
    })
    await saveSettings(db, { levels: ['B1', 'B2'], dailyNewLimit: 15 })
    expect(await getSettings(db)).toEqual({
      levels: ['B1', 'B2'],
      dailyNewLimit: 15,
      reinforceLimit: 5,
      placementDone: false,
      accent: 'en-US',
      direction: 'en-tr',
      theme: 'system',
    })
  })

  it('değerlendirme kartı günceller ve günlüğe yazar', async () => {
    const db = freshDb()
    const card = await rateWord(db, word, Rating.Good, now)
    expect(card.state).toBe(State.Learning)
    expect((await db.cards.get(word.id))?.due).toEqual(card.due)
    expect(await db.reviews.count()).toBe(1)
  })

  it('yalnızca ilk değerlendirme "bugün tanıtılan" sayılır', async () => {
    const db = freshDb()
    await rateWord(db, word, Rating.Again, now)
    await rateWord(db, word, Rating.Good, new Date(now.getTime() + 60_000))
    await rateWord(db, { id: 'other-n', cefr: 'B1' }, Rating.Good, now)
    expect(await countIntroducedToday(db, now)).toBe(2)
    // ertesi gün sayaç sıfırlanır
    expect(await countIntroducedToday(db, new Date(2026, 9, 8, 12, 0))).toBe(0)
  })

  it('yerleştirme: biliyorum → known, bilmiyorum → yeni kart', async () => {
    const db = freshDb()
    await placeWord(db, word, true, now)
    await placeWord(db, { id: 'other-n', cefr: 'B1' }, false, now)
    expect((await db.cards.get(word.id))?.status).toBe('known')
    const other = await db.cards.get('other-n')
    expect(other?.status).toBe('active')
    expect(other?.state).toBe(State.New)
  })
})
