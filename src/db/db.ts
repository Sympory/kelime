import Dexie, { type EntityTable } from 'dexie'
import type { StoredCard } from '../srs/queue'
import type { ReviewLog } from '../srs/scheduler'
import type { Cefr } from '../types/word'

export type ReviewRecord = ReviewLog & { id?: number; wordId: string }

export type Settings = {
  /** Çalışılan seviyeler; boşsa kullanıcı henüz başlangıç ekranını tamamlamamıştır */
  levels: Cefr[]
  dailyNewLimit: number
  placementDone: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  levels: [],
  dailyNewLimit: 10,
  placementDone: false,
}

type SettingRow = { key: keyof Settings; value: Settings[keyof Settings] }

export class KelimeDB extends Dexie {
  cards!: EntityTable<StoredCard, 'wordId'>
  reviews!: EntityTable<ReviewRecord, 'id'>
  settings!: EntityTable<SettingRow, 'key'>

  constructor(name = 'kelime') {
    super(name)
    // Şema değişikliklerinde sürümü artırıp yeni .stores() ekleyin; eskisini silmeyin.
    this.version(1).stores({
      cards: '&wordId, due, status, state, cefr',
      reviews: '++id, wordId, review',
      settings: '&key',
    })
  }
}

export const db = new KelimeDB()
