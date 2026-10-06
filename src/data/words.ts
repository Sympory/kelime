import { useEffect, useState } from 'react'
import type { Cefr, DataIndex, Word } from '../types/word'

export const LEVELS: Cefr[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

let indexPromise: Promise<DataIndex> | undefined

/** Seviye başına kelime sayıları (`public/data/index.json`, ~0,5 KB). */
export function loadIndex(): Promise<DataIndex> {
  indexPromise ??= fetch('/data/index.json').then((r) => {
    if (!r.ok) throw new Error(`Veri dizini yüklenemedi (${r.status})`)
    return r.json() as Promise<DataIndex>
  })
  return indexPromise
}

const cache = new Map<Cefr, Promise<Word[]>>()

/** Bir seviyenin kelimelerini yükler (`public/data/b1.json` …); aynı oturumda bir kez indirilir. */
export function loadLevel(cefr: Cefr): Promise<Word[]> {
  let p = cache.get(cefr)
  if (!p) {
    p = fetch(`/data/${cefr.toLowerCase()}.json`).then((r) => {
      if (!r.ok) throw new Error(`${cefr} kelimeleri yüklenemedi (${r.status})`)
      return r.json() as Promise<Word[]>
    })
    p.catch(() => cache.delete(cefr)) // hata olursa sonraki denemede yeniden indir
    cache.set(cefr, p)
  }
  return p
}

export type WordsState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; byId: Map<string, Word>; list: Word[] }

/** İstenen seviyelerin kelimelerini yükler. `levels` dizisinin içeriği değişince yeniden yükler. */
export function useWords(levels: Cefr[] | undefined): WordsState {
  const [state, setState] = useState<WordsState>({ status: 'loading' })
  const key = levels ? [...new Set(levels)].sort().join(',') : undefined

  useEffect(() => {
    if (key === undefined) return
    let cancelled = false
    const wanted = key ? (key.split(',') as Cefr[]) : []
    Promise.all(wanted.map(loadLevel))
      .then((lists) => {
        if (cancelled) return
        const list = lists.flat()
        setState({ status: 'ready', list, byId: new Map(list.map((w) => [w.id, w])) })
      })
      .catch((e: Error) => !cancelled && setState({ status: 'error', error: e.message }))
    return () => {
      cancelled = true
    }
  }, [key])

  return state
}

/** Başlangıçta seçilen seviyeden C1'e kadar (C1/C2 seçildiyse C2 de) çalışılır. */
export function levelsFrom(start: Cefr): Cefr[] {
  const i = LEVELS.indexOf(start)
  return start === 'C1' || start === 'C2'
    ? LEVELS.slice(i)
    : LEVELS.slice(i, LEVELS.indexOf('C1') + 1)
}
