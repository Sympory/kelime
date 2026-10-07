import { motion, type PanInfo } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Loading } from '../../components/Loading'
import { db, type Settings } from '../../db/db'
import { useSettings } from '../../db/hooks'
import { countIntroducedToday, previewCard, rateWord } from '../../db/repo'
import { useWords } from '../../data/words'
import { newWordOrder } from '../../srs/order'
import { buildQueue, type QueueItem, type StoredCard } from '../../srs/queue'
import {
  formatInterval,
  GRADE_LABELS,
  GRADES,
  preview,
  Rating,
  type Grade,
} from '../../srs/scheduler'
import { answer, counts, nextItem, startSession, type Session } from '../../srs/session'
import type { Cefr, Word } from '../../types/word'
import { StudyCard } from './StudyCard'
import { Summary } from './Summary'

export default function Study() {
  const settings = useSettings()
  // Kartlar oturum başında bir kez okunur; oturum boyunca durum yerelde tutulur
  const [snapshot, setSnapshot] = useState<Snapshot>()
  useEffect(() => {
    let cancelled = false
    void loadSnapshot().then((s) => !cancelled && setSnapshot(s))
    return () => {
      cancelled = true
    }
  }, [])

  // Eski seviyelerden kalan tekrar kartlarının kelimeleri de yüklenmeli
  const levels = settings && snapshot ? neededLevels(settings, snapshot.cards) : undefined
  const words = useWords(levels)

  if (settings && settings.levels.length === 0) return <Navigate to="/baslangic" replace />
  if (words.status === 'error') return <p className="py-10 text-red-500">{words.error}</p>
  if (!settings || !snapshot || words.status === 'loading') return <Loading />

  return (
    <StudySession
      settings={settings}
      words={words.byId}
      pool={words.list}
      cards={snapshot.cards}
      introducedToday={snapshot.introducedToday}
      startedAt={snapshot.startedAt}
    />
  )
}

type Snapshot = { cards: StoredCard[]; introducedToday: number; startedAt: Date }

async function loadSnapshot(): Promise<Snapshot> {
  const now = new Date()
  return {
    cards: await db.cards.toArray(),
    introducedToday: await countIntroducedToday(db, now),
    startedAt: now,
  }
}

function neededLevels(settings: Settings, cards: StoredCard[]): Cefr[] {
  const active = cards.filter((c) => c.status === 'active').map((c) => c.cefr)
  return [...new Set([...settings.levels, ...active])]
}

type SessionProps = {
  settings: Settings
  words: Map<string, Word>
  pool: Word[]
  cards: StoredCard[]
  introducedToday: number
  startedAt: Date
}

function StudySession({ settings, words, pool, cards, introducedToday, startedAt }: SessionProps) {
  const [cardMap, setCardMap] = useState(() => new Map(cards.map((c) => [c.wordId, c])))
  const [session, setSession] = useState<Session>(() => {
    const poolIds = newWordOrder(pool.filter((w) => settings.levels.includes(w.cefr))).map(
      (w) => w.id,
    )
    const queue = buildQueue({
      cards,
      poolIds,
      now: startedAt,
      newLimit: settings.dailyNewLimit,
      introducedToday,
    }).filter((item) => words.has(item.wordId)) // veri güncellemesinde kaldırılmış kelimeler
    return startSession(queue)
  })
  const [current, setCurrent] = useState<QueueItem | undefined>(() => nextItem(session, startedAt))
  const [flipped, setFlipped] = useState(false)
  const [intervals, setIntervals] = useState<Record<Grade, string>>()
  const busy = useRef(false)

  const word = current ? words.get(current.wordId) : undefined
  const stored = current ? cardMap.get(current.wordId) : undefined
  // Her tekrarda farklı örnek cümle göster (cümleyi ezberlemek yerine kelimeyi hatırlamak için)
  const example = word?.examples.length
    ? word.examples[(stored?.reps ?? 0) % word.examples.length]
    : undefined

  const flip = useCallback(() => {
    if (!word || flipped) return
    const now = new Date()
    const p = preview(previewCard(stored, word, now), now)
    setIntervals(
      Object.fromEntries(
        GRADES.map((g) => [g, formatInterval(p[g].getTime() - now.getTime())]),
      ) as Record<Grade, string>,
    )
    setFlipped(true)
  }, [word, stored, flipped])

  const grade = useCallback(
    async (g: Grade) => {
      if (!current || !word || !flipped || busy.current) return
      busy.current = true
      try {
        const now = new Date()
        const updated = await rateWord(db, word, g, now)
        const next = answer(session, current, g, updated.due, now)
        setCardMap((m) => new Map(m).set(updated.wordId, updated))
        setSession(next)
        setCurrent(nextItem(next, new Date()))
        setFlipped(false)
      } finally {
        busy.current = false
      }
    },
    [current, word, flipped, session],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if ((e.key === ' ' || e.key === 'Enter') && !flipped) {
        e.preventDefault()
        flip()
      } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
        void grade(Number(e.key) as Grade)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flip, grade, flipped])

  if (!current || !word) {
    return <Summary answered={session.answered} startedAt={startedAt} />
  }

  const c = counts(session)

  function onDragEnd(_: unknown, info: PanInfo) {
    if (!flipped) return
    if (info.offset.x > 100) void grade(Rating.Good)
    else if (info.offset.x < -100) void grade(Rating.Again)
  }

  return (
    <section className="flex min-h-[calc(100dvh-5rem)] flex-col pb-4">
      <div className="flex items-center justify-between py-2 text-sm tabular-nums">
        <Link to="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          ← Bitir
        </Link>
        <span className="flex gap-3 font-semibold">
          <span className="text-sky-600 dark:text-sky-400" title="Yeni">
            {c.new}
          </span>
          <span className="text-rose-600 dark:text-rose-400" title="Öğreniliyor">
            {c.learning}
          </span>
          <span className="text-emerald-600 dark:text-emerald-400" title="Tekrar">
            {c.review}
          </span>
        </span>
      </div>

      <motion.div
        key={current.wordId + session.answered.length}
        drag={flipped ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        onDragEnd={onDragEnd}
        className="mt-2 flex-1 touch-pan-y"
      >
        <StudyCard
          word={word}
          kind={current.kind}
          example={example}
          flipped={flipped}
          onFlip={flip}
          direction={settings.direction}
        />
      </motion.div>

      {/* Başparmak erişimi için butonlar altta, kaydırırken görünür kalır */}
      <div className="sticky bottom-0 mt-4 bg-zinc-50/90 pt-3 pb-1 backdrop-blur dark:bg-zinc-950/90">
        {flipped ? (
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map((g) => (
              <button
                key={g}
                onClick={() => void grade(g)}
                className={`flex flex-col items-center rounded-2xl py-3 font-semibold ${GRADE_STYLES[g]}`}
              >
                <span>{GRADE_LABELS[g]}</span>
                <span className="text-xs font-normal opacity-75">{intervals?.[g]}</span>
                <kbd className="mt-0.5 hidden text-[10px] font-normal opacity-50 sm:block">{g}</kbd>
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={flip}
            className="w-full rounded-2xl bg-zinc-900 py-4 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Cevabı göster
          </button>
        )}
      </div>
    </section>
  )
}

const GRADE_STYLES: Record<Grade, string> = {
  [Rating.Again]: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  [Rating.Hard]: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  [Rating.Good]: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  [Rating.Easy]: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
}
