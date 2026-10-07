import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CefrBadge } from '../../components/CefrBadge'
import { Loading } from '../../components/Loading'
import { POS_LABELS } from '../../components/pos'
import { db } from '../../db/db'
import { useSettings } from '../../db/hooks'
import { placeWord, saveSettings } from '../../db/repo'
import { useWords } from '../../data/words'
import { newWordOrder } from '../../srs/order'
import type { Word } from '../../types/word'

const SWIPE_PX = 100

export default function Placement() {
  const settings = useSettings()
  const words = useWords(settings?.levels)
  const seenIds = useLiveQuery(() => db.cards.toCollection().primaryKeys(), [])

  if (settings && settings.levels.length === 0) return <Navigate to="/baslangic" replace />
  if (words.status === 'error') return <p className="py-10 text-red-500">{words.error}</p>
  if (!settings || words.status === 'loading' || !seenIds) return <Loading />

  return <PlacementDeck words={words.list} seen={new Set(seenIds)} />
}

function PlacementDeck({ words, seen }: { words: Word[]; seen: Set<string> }) {
  const navigate = useNavigate()
  // Destenin sırası ekran açıldığında sabitlenir; karar verdikçe değişmez
  const [deck] = useState(() => newWordOrder(words).filter((w) => !seen.has(w.id)))
  const [index, setIndex] = useState(0)
  const [stats, setStats] = useState({ known: 0, unknown: 0 })
  const [exitDir, setExitDir] = useState(0)
  const [showMeaning, setShowMeaning] = useState(false)
  const current = deck[index]

  const decide = useCallback(
    (known: boolean) => {
      if (!current) return
      setExitDir(known ? 1 : -1)
      setShowMeaning(false)
      setStats((s) => (known ? { ...s, known: s.known + 1 } : { ...s, unknown: s.unknown + 1 }))
      setIndex((i) => i + 1)
      void placeWord(db, current, known, new Date())
    },
    [current],
  )

  const finish = useCallback(async () => {
    await saveSettings(db, { placementDone: true })
    navigate('/')
  }, [navigate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') decide(true)
      else if (e.key === 'ArrowLeft') decide(false)
      else if (e.key === ' ') {
        e.preventDefault()
        setShowMeaning((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [decide])

  const total = stats.known + stats.unknown

  return (
    <section className="flex min-h-[calc(100dvh-5rem)] flex-col pb-4">
      <div className="flex items-baseline justify-between pt-2">
        <h1 className="font-display text-2xl font-bold">Hızlı eleme</h1>
        <span className="text-sm text-zinc-500 tabular-nums">
          {total} / {deck.length}
        </span>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Biliyorsan sağa, bilmiyorsan sola kaydır. Klavyede → / ←, anlam için boşluk.
      </p>

      <div className="relative mt-6 flex flex-1 items-center justify-center">
        <AnimatePresence mode="popLayout" custom={exitDir}>
          {current ? (
            <SwipeCard
              key={current.id}
              word={current}
              exitDir={exitDir}
              showMeaning={showMeaning}
              onToggleMeaning={() => setShowMeaning((v) => !v)}
              onDecide={decide}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-zinc-500"
            >
              Bu seviyelerde elenecek kelime kalmadı.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => decide(false)}
          disabled={!current}
          className="rounded-2xl bg-rose-500/15 py-4 font-semibold text-rose-600 disabled:opacity-40 dark:text-rose-400"
        >
          ← Bilmiyorum
        </button>
        <button
          onClick={() => decide(true)}
          disabled={!current}
          className="rounded-2xl bg-emerald-500/15 py-4 font-semibold text-emerald-700 disabled:opacity-40 dark:text-emerald-400"
        >
          Biliyorum →
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-zinc-500">
          <span className="text-emerald-600 dark:text-emerald-400">{stats.known} biliyorum</span>
          {' · '}
          <span className="text-rose-600 dark:text-rose-400">{stats.unknown} çalışılacak</span>
        </span>
        <button onClick={finish} className="font-semibold underline underline-offset-4">
          Bitir
        </button>
      </div>
    </section>
  )
}

function SwipeCard({
  word,
  exitDir,
  showMeaning,
  onToggleMeaning,
  onDecide,
}: {
  word: Word
  exitDir: number
  showMeaning: boolean
  onToggleMeaning: () => void
  onDecide: (known: boolean) => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const knownOpacity = useTransform(x, [20, SWIPE_PX], [0, 1])
  const unknownOpacity = useTransform(x, [-SWIPE_PX, -20], [1, 0])
  const meaning = useMemo(
    () => (word.tr.length ? word.tr.slice(0, 3).join(', ') : word.defEn[0]),
    [word],
  )

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_PX) onDecide(true)
    else if (info.offset.x < -SWIPE_PX) onDecide(false)
  }

  return (
    <motion.div
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={onDragEnd}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ x: exitDir * 400, opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.15 }}
      onTap={onToggleMeaning}
      className="relative w-full max-w-md cursor-grab touch-pan-y rounded-3xl bg-white p-8 text-center shadow-xl shadow-zinc-900/10 select-none active:cursor-grabbing dark:bg-zinc-900 dark:shadow-black/40"
    >
      <motion.span
        aria-hidden
        style={{ opacity: knownOpacity }}
        className="absolute top-5 left-5 rounded-lg border-2 border-emerald-500 px-2 py-0.5 text-sm font-bold text-emerald-500"
      >
        BİLİYORUM
      </motion.span>
      <motion.span
        aria-hidden
        style={{ opacity: unknownOpacity }}
        className="absolute top-5 right-5 rounded-lg border-2 border-rose-500 px-2 py-0.5 text-sm font-bold text-rose-500"
      >
        BİLMİYORUM
      </motion.span>

      <CefrBadge level={word.cefr} />
      <p className="font-display mt-6 text-5xl font-bold tracking-tight break-words">
        {word.lemma}
      </p>
      <p className="mt-2 text-sm text-zinc-500">
        {POS_LABELS[word.pos]}
        {word.ipa && <span className="ml-2 font-mono">{word.ipa}</span>}
      </p>
      <p className="mt-6 min-h-12 text-lg text-zinc-600 dark:text-zinc-300">
        {showMeaning ? (
          <>
            {meaning}
            {word.trAuto && word.tr.length > 0 && (
              <span className="ml-2 align-middle text-[10px] tracking-wide text-zinc-400 uppercase">
                otomatik
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-zinc-400">anlamı görmek için dokun</span>
        )}
      </p>
    </motion.div>
  )
}
