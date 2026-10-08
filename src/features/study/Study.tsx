import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CloseIcon } from '../../components/icons'
import { Loading } from '../../components/Loading'
import { db, type Settings } from '../../db/db'
import { useSettings } from '../../db/hooks'
import { countIntroducedToday, previewCard, rateWord } from '../../db/repo'
import { useWords } from '../../data/words'
import { loadUserData, withUserExamples, type UserData } from '../../db/userWords'
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

  // Hazır veri + kullanıcının eklediği kelimeler; makaleden eklenen cümleler örneklerin başına
  const byId = useMemo(() => {
    if (words.status !== 'ready' || !snapshot) return undefined
    const map = new Map(words.byId)
    for (const w of snapshot.user.words) map.set(w.id, w)
    for (const id of snapshot.user.examples.keys()) {
      const w = map.get(id)
      if (w) map.set(id, withUserExamples(w, snapshot.user))
    }
    return map
  }, [words, snapshot])

  if (settings && settings.levels.length === 0) return <Navigate to="/baslangic" replace />
  if (words.status === 'error') return <p className="py-10 text-red-500">{words.error}</p>
  if (!settings || !snapshot || !byId) return <Loading />

  return (
    <StudySession
      settings={settings}
      words={byId}
      pool={words.status === 'ready' ? words.list : []}
      cards={snapshot.cards}
      introducedToday={snapshot.introducedToday}
      startedAt={snapshot.startedAt}
    />
  )
}

type Snapshot = { cards: StoredCard[]; introducedToday: number; startedAt: Date; user: UserData }

async function loadSnapshot(): Promise<Snapshot> {
  const now = new Date()
  return {
    cards: await db.cards.toArray(),
    introducedToday: await countIntroducedToday(db, now),
    user: await loadUserData(),
    startedAt: now,
  }
}

function neededLevels(settings: Settings, cards: StoredCard[]): Cefr[] {
  const active = cards.flatMap((c) => (c.status === 'active' && c.cefr ? [c.cefr] : []))
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
    const poolIds = newWordOrder(
      pool.filter((w) => w.cefr && settings.levels.includes(w.cefr)),
    ).map((w) => w.id)
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
  // revealed: cevap bir kez görüldü (puan düğmeleri açılır) · showBack: şu an görünen yüz
  const [revealed, setRevealed] = useState(false)
  const [showBack, setShowBack] = useState(false)
  const [intervals, setIntervals] = useState<Record<Grade, string>>()
  const [exitDir, setExitDir] = useState(1)
  const busy = useRef(false)

  const word = current ? words.get(current.wordId) : undefined
  const stored = current ? cardMap.get(current.wordId) : undefined
  // Her tekrarda farklı örnek cümle göster (cümleyi ezberlemek yerine kelimeyi hatırlamak için)
  const example = word?.examples.length
    ? word.examples[(stored?.reps ?? 0) % word.examples.length]
    : undefined

  /** Kartı çevirir; ilk çevirmede aralık önizlemesini hesaplayıp puan düğmelerini açar. */
  const flip = useCallback(() => {
    if (!word) return
    if (revealed) {
      setShowBack((b) => !b)
      return
    }
    const now = new Date()
    const p = preview(previewCard(stored, word, now), now)
    setIntervals(
      Object.fromEntries(
        GRADES.map((g) => [g, formatInterval(p[g].getTime() - now.getTime())]),
      ) as Record<Grade, string>,
    )
    setRevealed(true)
    setShowBack(true)
  }, [word, stored, revealed])

  const grade = useCallback(
    async (g: Grade) => {
      if (!current || !word || !revealed || busy.current) return
      busy.current = true
      try {
        setExitDir(EXIT_DIR[g])
        const now = new Date()
        const updated = await rateWord(db, word, g, now)
        const next = answer(session, current, g, updated.due, now)
        setCardMap((m) => new Map(m).set(updated.wordId, updated))
        setSession(next)
        setCurrent(nextItem(next, new Date()))
        setRevealed(false)
        setShowBack(false)
      } finally {
        busy.current = false
      }
    },
    [current, word, revealed, session],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === ' ' || (e.key === 'Enter' && !revealed)) {
        e.preventDefault()
        flip()
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        void grade(Number(e.key) as Grade)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flip, grade, revealed])

  if (!current || !word) {
    return <Summary answered={session.answered} startedAt={startedAt} />
  }

  const c = counts(session)
  const remaining = c.new + c.learning + c.review
  const progress = session.answered.length / Math.max(1, session.answered.length + remaining)

  function onDragEnd(_: unknown, info: PanInfo) {
    if (!revealed) return
    if (info.offset.x > 100) void grade(Rating.Good)
    else if (info.offset.x < -100) void grade(Rating.Again)
  }

  return (
    <section className="flex min-h-[calc(100dvh-5rem)] flex-col pb-4">
      <div className="flex items-center gap-3 py-2">
        <Link
          to="/"
          aria-label="Oturumu bitir"
          className="btn-ghost size-10 shrink-0 rounded-full p-0"
        >
          <CloseIcon className="size-5" />
        </Link>
        {/* Oturum ilerlemesi (yeniden öğrenilen kartlar eklendikçe hedef de büyür) */}
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-900/8 dark:bg-white/10"
          role="progressbar"
          aria-label="Oturum ilerlemesi"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-amber-300 to-orange-500 transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(3, progress * 100)}%` }}
          />
        </div>
        <span className="flex gap-1.5 text-xs font-semibold tabular-nums">
          <Count n={c.new} title="Yeni" className="bg-sky-500/15 text-sky-700 dark:text-sky-300" />
          <Count
            n={c.learning}
            title="Öğreniliyor"
            className="bg-rose-500/15 text-rose-700 dark:text-rose-300"
          />
          <Count
            n={c.review}
            title="Tekrar"
            className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          />
        </span>
      </div>

      <div className="relative mt-3 flex-1">
        <AnimatePresence mode="popLayout" initial={false} custom={exitDir}>
          <motion.div
            key={current.wordId + session.answered.length}
            custom={exitDir}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
            }}
            exit="exit"
            variants={{
              // Puan yönüne göre çıkış: Tekrar sola, İyi/Kolay sağa, Zor yukarı
              exit: (dir: number) => ({
                x: dir * 420,
                y: dir === 0 ? -40 : 0,
                rotate: dir * 14,
                opacity: 0,
                transition: { duration: 0.28, ease: [0.4, 0, 1, 1] },
              }),
            }}
            drag={revealed ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={onDragEnd}
            className="touch-pan-y"
          >
            <StudyCard
              word={word}
              kind={current.kind}
              example={example}
              flipped={showBack}
              onFlip={flip}
              direction={settings.direction}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Başparmak erişimi için butonlar altta, kaydırırken görünür kalır */}
      <div className="sticky bottom-0 mt-4 pt-3 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {revealed ? (
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map((g) => (
              <button
                key={g}
                onClick={() => void grade(g)}
                className={`flex flex-col items-center rounded-2xl py-3 font-semibold ring-1 backdrop-blur-xl transition-transform duration-150 active:scale-95 ${GRADE_STYLES[g]}`}
              >
                <span>{GRADE_LABELS[g]}</span>
                <span className="text-xs font-normal opacity-75">{intervals?.[g]}</span>
                <kbd className="mt-0.5 hidden text-[10px] font-normal opacity-50 sm:block">{g}</kbd>
              </button>
            ))}
          </div>
        ) : (
          <button onClick={flip} className="btn-primary w-full py-4 text-base">
            Cevabı göster
          </button>
        )}
      </div>
    </section>
  )
}

function Count({ n, title, className }: { n: number; title: string; className: string }) {
  return (
    <span title={title} className={`min-w-7 rounded-full px-2 py-0.5 text-center ${className}`}>
      {n}
    </span>
  )
}

const GRADE_STYLES: Record<Grade, string> = {
  [Rating.Again]: 'bg-rose-500/15 text-rose-700 ring-rose-500/20 dark:text-rose-300',
  [Rating.Hard]: 'bg-amber-500/15 text-amber-700 ring-amber-500/20 dark:text-amber-300',
  [Rating.Good]: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
  [Rating.Easy]: 'bg-sky-500/15 text-sky-700 ring-sky-500/20 dark:text-sky-300',
}

/** Puanın kartı fırlattığı yön: Tekrar sola (-1), Zor yukarı (0), İyi/Kolay sağa (1) */
const EXIT_DIR: Record<Grade, number> = {
  [Rating.Again]: -1,
  [Rating.Hard]: 0,
  [Rating.Good]: 1,
  [Rating.Easy]: 1,
}
