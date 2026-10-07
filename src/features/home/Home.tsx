import { useLiveQuery } from 'dexie-react-hooks'
import { Link, Navigate } from 'react-router-dom'
import { CefrBadge } from '../../components/CefrBadge'
import { Loading } from '../../components/Loading'
import { db } from '../../db/db'
import { useSettings } from '../../db/hooks'
import { countIntroducedToday, getSettings } from '../../db/repo'
import { loadIndex } from '../../data/words'
import { isDueLearning, isDueReview } from '../../srs/queue'
import { State } from '../../srs/scheduler'
import { levelProgress, streak, type LevelProgress } from '../../srs/stats'

export default function Home() {
  const settings = useSettings()
  const today = useLiveQuery(async () => {
    const now = new Date()
    const [s, cards, introduced, index, reviewDates] = await Promise.all([
      getSettings(db),
      db.cards.toArray(),
      countIntroducedToday(db, now),
      loadIndex(),
      db.reviews.orderBy('review').keys() as Promise<Date[]>,
    ])
    const active = cards.filter((c) => c.status === 'active')
    const due = active.filter((c) => isDueLearning(c, now) || isDueReview(c, now)).length
    const poolSize = index.levels
      .filter((l) => s.levels.includes(l.cefr))
      .reduce((sum, l) => sum + l.count, 0)
    const seenInPool = cards.filter((c) => c.cefr && s.levels.includes(c.cefr)).length
    const queuedNew = active.filter((c) => c.state === State.New).length
    const newAvailable = Math.min(
      Math.max(0, s.dailyNewLimit - introduced),
      queuedNew + Math.max(0, poolSize - seenInPool),
    )
    // Çalışılan seviyeler + eskiden çalışılıp kartı kalan seviyeler
    const shown = index.levels.filter(
      (l) => s.levels.includes(l.cefr) || cards.some((c) => c.cefr === l.cefr),
    )
    return {
      due,
      newAvailable,
      streak: streak(reviewDates, now),
      progress: levelProgress(cards, shown),
    }
  }, [])

  if (settings && settings.levels.length === 0) return <Navigate to="/baslangic" replace />
  if (!settings || !today) return <Loading />

  const total = today.due + today.newAvailable

  return (
    <section className="py-8">
      <h1 className="font-display text-5xl font-bold tracking-tight">
        {total > 0 ? 'Bugün' : 'Bugünlük tamam'}
      </h1>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Tekrar" value={today.due} className="text-emerald-600 dark:text-emerald-400" />
        <Stat label="Yeni" value={today.newAvailable} className="text-sky-600 dark:text-sky-400" />
        <Stat
          label="Seri"
          value={today.streak}
          suffix={today.streak > 0 ? '🔥' : undefined}
          className="text-amber-600 dark:text-amber-400"
        />
      </div>

      {total > 0 ? (
        <Link
          to="/calis"
          className="mt-6 block rounded-2xl bg-zinc-900 py-4 text-center text-lg font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Çalışmaya başla
        </Link>
      ) : (
        <p className="mt-6 rounded-2xl bg-zinc-100 p-4 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          Vadesi gelen kart yok ve günlük yeni kelime limitine ulaştın. Yarın görüşürüz!
        </p>
      )}

      <section className="mt-10">
        <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">İlerleme</h2>
        <ul className="mt-3 space-y-3">
          {today.progress.map((p) => (
            <ProgressRow key={p.cefr} p={p} />
          ))}
        </ul>
        <p className="mt-3 flex gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500" /> öğrenildi / biliyorum
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-400" /> öğreniliyor
          </span>
        </p>
      </section>

      <div className="mt-8 flex flex-wrap gap-4 text-sm font-medium">
        <Link to="/eleme" className="underline underline-offset-4">
          Hızlı eleme
        </Link>
        <Link to="/ekle" className="underline underline-offset-4">
          Makaleden ekle
        </Link>
        <Link to="/kelimeler" className="underline underline-offset-4">
          Kelimelere göz at
        </Link>
        <Link to="/baslangic" className="underline underline-offset-4">
          Seviyeyi değiştir
        </Link>
      </div>
    </section>
  )
}

function ProgressRow({ p }: { p: LevelProgress }) {
  const pct = (n: number) => (p.total ? (n / p.total) * 100 : 0)
  return (
    <li>
      <Link to={`/kelimeler?seviye=${p.cefr}`} className="group block">
        <div className="flex items-center justify-between text-sm">
          <CefrBadge level={p.cefr} />
          <span className="text-zinc-500 tabular-nums group-hover:text-zinc-900 dark:group-hover:text-zinc-100">
            {p.done.toLocaleString('tr')} / {p.total.toLocaleString('tr')}
          </span>
        </div>
        <div
          className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
          role="progressbar"
          aria-label={`${p.cefr} ilerlemesi`}
          aria-valuemin={0}
          aria-valuemax={p.total}
          aria-valuenow={p.done}
        >
          <div className="bg-emerald-500" style={{ width: `${pct(p.done)}%` }} />
          <div className="bg-amber-400" style={{ width: `${pct(p.learning)}%` }} />
        </div>
      </Link>
    </li>
  )
}

function Stat({
  label,
  value,
  suffix,
  className,
}: {
  label: string
  value: number
  suffix?: string
  className: string
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums sm:text-4xl ${className}`}>
        {value}
        {suffix && <span className="ml-1 text-xl">{suffix}</span>}
      </p>
    </div>
  )
}
