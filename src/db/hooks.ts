import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { getSettings } from './repo'

/** Ayarlar; veritabanı okunana kadar `undefined`. Ayar değişince otomatik güncellenir. */
export function useSettings() {
  return useLiveQuery(() => getSettings(db), [])
}
