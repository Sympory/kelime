import { useCallback, useEffect, useState } from 'react'

/*
 * Kalıcı depolama: tarayıcıdan bu sitenin verisini (IndexedDB'deki ilerleme) yer darlığında ya da
 * uzun süre kullanılmadığında kendiliğinden silmemesini ister. Hesap olmadığı için ilerlemenin tek
 * kopyası tarayıcıda; bu izin kaybolma riskini azaltır. Chrome genelde sessizce karar verir
 * (ana ekrana eklenmiş uygulamaya kolay verir), Firefox kullanıcıya sorar.
 */

const supported = () => typeof navigator !== 'undefined' && Boolean(navigator.storage?.persist)

export async function requestPersistence(): Promise<boolean> {
  if (!supported()) return false
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export type PersistenceState = { supported: boolean; persisted?: boolean }

/** Kalıcı depolama durumu ve izni isteme işlevi (Ayarlar sayfası için). */
export function usePersistence(): [PersistenceState, () => Promise<void>] {
  const [state, setState] = useState<PersistenceState>({ supported: supported() })

  useEffect(() => {
    if (!supported()) return
    let cancelled = false
    void navigator.storage
      .persisted()
      .then((persisted) => !cancelled && setState({ supported: true, persisted }))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const request = useCallback(async () => {
    const persisted = await requestPersistence()
    setState({ supported: supported(), persisted })
  }, [])

  return [state, request]
}
