import Dexie, { type EntityTable } from 'dexie'
import type { StoredCard } from '../srs/queue'
import type { ReviewLog } from '../srs/scheduler'
import type { Cefr, Example, Word } from '../types/word'

export type ReviewRecord = ReviewLog & { id?: number; wordId: string }

/** Kullanıcının makaleden eklediği örnek cümle; kelimenin örneklerinin başına eklenir. */
export type UserExample = Example & { id?: number; wordId: string; addedAt: Date }

export type Settings = {
  /** Çalışılan seviyeler; boşsa kullanıcı henüz başlangıç ekranını tamamlamamıştır */
  levels: Cefr[]
  dailyNewLimit: number
  /** Her oturuma yeni kelimelerin arasında karışan, vakti gelmemiş eski kelime sayısı */
  reinforceLimit: number
  placementDone: boolean
  /** Telaffuz aksanı (Web Speech API dil kodu) */
  accent: 'en-US' | 'en-GB'
  /** en-tr: cümledeki kelimeyi tanı (varsayılan) · tr-en: Türkçeden İngilizceyi hatırla */
  direction: 'en-tr' | 'tr-en'
  theme: 'system' | 'light' | 'dark'
  /** Puan verince kısa ses ve titreşim */
  feedback: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  levels: [],
  dailyNewLimit: 10,
  reinforceLimit: 5,
  placementDone: false,
  accent: 'en-US',
  direction: 'en-tr',
  theme: 'system',
  feedback: true,
}

type SettingRow = { key: keyof Settings; value: Settings[keyof Settings] }

export class KelimeDB extends Dexie {
  cards!: EntityTable<StoredCard, 'wordId'>
  reviews!: EntityTable<ReviewRecord, 'id'>
  settings!: EntityTable<SettingRow, 'key'>
  /** Hazır veride olmayan, kullanıcının eklediği kelimeler (`custom: true`, kimlik `u-…`) */
  userWords!: EntityTable<Word, 'id'>
  userExamples!: EntityTable<UserExample, 'id'>

  constructor(name = 'kelime') {
    super(name)
    // Şema değişikliklerinde sürümü artırıp yeni .stores() ekleyin; eskisini silmeyin.
    this.version(1).stores({
      cards: '&wordId, due, status, state, cefr',
      reviews: '++id, wordId, review',
      settings: '&key',
    })
    this.version(2).stores({
      userWords: '&id, lemma',
      userExamples: '++id, wordId',
    })
  }
}

export const db = new KelimeDB()
