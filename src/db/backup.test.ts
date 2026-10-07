import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { Rating } from '../srs/scheduler'
import { BackupError, exportBackup, importBackup, resetAll } from './backup'
import { KelimeDB } from './db'
import { getSettings, placeWord, rateWord, saveSettings } from './repo'

const now = new Date(2026, 9, 7, 12, 0)
let n = 0
const dbs: KelimeDB[] = []
const freshDb = () => {
  const db = new KelimeDB(`backup-${n++}`)
  dbs.push(db)
  return db
}
afterEach(async () => {
  await Promise.all(dbs.splice(0).map((d) => d.delete()))
})

async function seed(db: KelimeDB) {
  await saveSettings(db, { levels: ['B1', 'B2'], dailyNewLimit: 20, theme: 'dark' })
  await rateWord(db, { id: 'decline-v', cefr: 'B1' }, Rating.Good, now)
  await placeWord(db, { id: 'slip-n', cefr: 'B1' }, true, now)
}

describe('yedekleme', () => {
  it('JSON üzerinden gidiş-dönüş tüm veriyi (tarihler dahil) korur', async () => {
    const a = freshDb()
    await seed(a)
    const json = JSON.parse(JSON.stringify(await exportBackup(a, now)))

    const b = freshDb()
    await saveSettings(b, { levels: ['C1'] })
    await rateWord(b, { id: 'other-n', cefr: 'C1' }, Rating.Again, now)

    expect(await importBackup(b, json)).toEqual({ cards: 2, reviews: 1 })
    expect(await b.cards.get('other-n')).toBeUndefined() // eski veri silindi
    const card = await b.cards.get('decline-v')
    expect(card?.due).toBeInstanceOf(Date)
    expect(card?.due).toEqual((await a.cards.get('decline-v'))?.due)
    expect((await b.reviews.toArray())[0].review).toBeInstanceOf(Date)
    expect(await getSettings(b)).toMatchObject({
      levels: ['B1', 'B2'],
      dailyNewLimit: 20,
      theme: 'dark',
    })
  })

  it('geçersiz dosyayı reddeder ve mevcut veriye dokunmaz', async () => {
    const db = freshDb()
    await seed(db)
    await expect(importBackup(db, { foo: 1 })).rejects.toBeInstanceOf(BackupError)
    await expect(
      importBackup(db, { app: 'kelime', version: 99, cards: [], reviews: [] }),
    ).rejects.toThrow(/daha yeni/)
    expect(await db.cards.count()).toBe(2)
  })

  it('sıfırlama her şeyi siler', async () => {
    const db = freshDb()
    await seed(db)
    await resetAll(db)
    expect(await db.cards.count()).toBe(0)
    expect(await db.reviews.count()).toBe(0)
    expect((await getSettings(db)).levels).toEqual([])
  })
})
