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
  /** Telaffuz aksanı (Web Speech API dil kodu) */
  accent: 'en-US' | 'en-GB'
  /** en-tr: cümledeki kelimeyi tanı (varsayılan) · tr-en: Türkçeden İngilizceyi hatırla */
  direction: 'en-tr' | 'tr-en'
  theme: 'system' | 'light' | 'dark'
}

export const DEFAULT_SETTINGS: Settings = {
  levels: [],
  dailyNewLimit: 10,
  placementDone: false,
  accent: 'en-US',
  direction: 'en-tr',
  theme: 'system',
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
