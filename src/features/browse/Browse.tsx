import { useLiveQuery } from 'dexie-react-hooks'
import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CefrBadge } from '../../components/CefrBadge'
import { Loading } from '../../components/Loading'
import { POS_LABELS } from '../../components/pos'
import { StatusPill } from '../../components/StatusPill'
import { db } from '../../db/db'
import { useSettings } from '../../db/hooks'
import { LEVELS, useWords } from '../../data/words'
import { useUserData } from '../../db/userWords'
import { STATUS_LABELS, wordStatus, type WordStatus } from '../../srs/stats'
import type { Cefr, Pos } from '../../types/word'
import { filterWords } from './filter'

const PAGE = 100
const POS_OPTIONS = Object.keys(POS_LABELS) as Pos[]
const STATUS_OPTIONS = Object.keys(STATUS_LABELS) as WordStatus[]

export default function Browse() {
  const settings = useSettings()
  const [params, setParams] = useSearchParams()
  const [limit, setLimit] = useState(PAGE)

  // Filtreler adreste tutulur: detay sayfasından geri dönünce kaybolmaz, paylaşılabilir
  const query = params.get('q') ?? ''
  const pos = (params.get('tur') as Pos | null) ?? undefined
  const status = (params.get('durum') as WordStatus | null) ?? undefined
  const levelParam = params.get('seviye')
  const levels: Cefr[] | undefined = levelParam
    ? (levelParam.split(',').filter((l) => LEVELS.includes(l as Cefr)) as Cefr[])
    : settings && (settings.levels.length ? settings.levels : LEVELS)

  const words = useWords(levels)
  const user = useUserData()
  const cardList = useLiveQuery(() => db.cards.toArray(), [])
  const cards = useMemo(() => new Map((cardList ?? []).map((c) => [c.wordId, c])), [cardList])
  const deferredQuery = useDeferredValue(query)

  const results = useMemo(
    () =>
      words.status === 'ready'
        ? filterWords(
            // Kendi eklenen kelimeler: seviyesi yoksa her zaman, varsa seçili seviyedeyse
            [
              ...(user?.words ?? []).filter((w) => !w.cefr || levels?.includes(w.cefr)),
              ...words.list,
            ],
            cards,
            { query: deferredQuery, pos, status },
          )
        : [],
    [words, user, levels, cards, deferredQuery, pos, status],
  )

  function update(key: string, value: string | undefined) {
    setLimit(PAGE)
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  function toggleLevel(l: Cefr) {
    const current = new Set(levels ?? [])
    if (current.has(l)) current.delete(l)
    else current.add(l)
    update('seviye', LEVELS.filter((x) => current.has(x)).join(',') || 'none')
  }

  return (
    <section className="py-6">
      <h1 className="font-display text-3xl font-bold">Kelimeler</h1>

      <input
        type="search"
        value={query}
        onChange={(e) => update('q', e.target.value)}
        placeholder="İngilizce ya da Türkçe ara…"
        aria-label="Kelime ara"
        className="mt-5 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900"
      />

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Seviye">
        {LEVELS.map((l) => {
          const on = levels?.includes(l)
          return (
            <button
              key={l}
              onClick={() => toggleLevel(l)}
              aria-pressed={on}
              className={`rounded-full transition-opacity ${on ? '' : 'opacity-35 grayscale'}`}
            >
              <CefrBadge level={l} className="px-3 py-1" />
            </button>
          )
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <select
          value={pos ?? ''}
          onChange={(e) => update('tur', e.target.value || undefined)}
          aria-label="Tür"
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <option value="">Tüm türler</option>
          {POS_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {POS_LABELS[p]}
            </option>
          ))}
        </select>
        <select
          value={status ?? ''}
          onChange={(e) => update('durum', e.target.value || undefined)}
          aria-label="Durum"
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <option value="">Tüm durumlar</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {words.status === 'error' ? (
        <p className="py-10 text-red-500">{words.error}</p>
      ) : words.status === 'loading' || !cardList ? (
        <Loading />
      ) : (
        <>
          <p className="mt-5 flex flex-wrap items-baseline gap-x-3 text-sm text-zinc-500 tabular-nums">
            {results.length.toLocaleString('tr')} kelime
            {query && levels && levels.length < LEVELS.length && (
              <button
                onClick={() => update('seviye', LEVELS.join(','))}
                className="font-medium underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Tüm seviyelerde ara
              </button>
            )}
          </p>
          <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
            {results.slice(0, limit).map((w) => (
              <li key={w.id}>
                <Link
                  to={`/kelime/${w.id}`}
                  className="flex items-center gap-3 py-3 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60"
                >
                  <CefrBadge level={w.cefr} className="w-9 text-center" />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{w.lemma}</span>
                    <span className="ml-2 text-xs text-zinc-500">{POS_LABELS[w.pos]}</span>
                    <span className="block truncate text-sm text-zinc-600 dark:text-zinc-400">
                      {w.tr.slice(0, 3).join(', ') || w.defEn[0]}
                    </span>
                  </span>
                  <StatusPill status={wordStatus(cards.get(w.id))} />
                </Link>
              </li>
            ))}
          </ul>
          {results.length > limit && (
            <button
              onClick={() => setLimit((n) => n + PAGE)}
              className="mt-4 w-full rounded-xl py-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Daha fazla göster ({(results.length - limit).toLocaleString('tr')} kaldı)
            </button>
          )}
        </>
      )}
    </section>
  )
}
