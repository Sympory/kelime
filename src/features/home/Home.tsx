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

export default function Home() {
  const settings = useSettings()
  const today = useLiveQuery(async () => {
    const now = new Date()
    const [s, cards, introduced, index] = await Promise.all([
      getSettings(db),
      db.cards.toArray(),
      countIntroducedToday(db, now),
      loadIndex(),
    ])
    const active = cards.filter((c) => c.status === 'active')
    const due = active.filter((c) => isDueLearning(c, now) || isDueReview(c, now)).length
    const poolSize = index.levels
      .filter((l) => s.levels.includes(l.cefr))
      .reduce((sum, l) => sum + l.count, 0)
    const seenInPool = cards.filter((c) => s.levels.includes(c.cefr)).length
    const queuedNew = active.filter((c) => c.state === State.New).length
    const newAvailable = Math.min(
      Math.max(0, s.dailyNewLimit - introduced),
      queuedNew + Math.max(0, poolSize - seenInPool),
    )
    return {
      due,
      newAvailable,
      learned: active.filter((c) => c.state !== State.New).length,
      known: cards.length - active.length,
    }
  }, [])

  if (settings && settings.levels.length === 0) return <Navigate to="/baslangic" replace />
  if (!settings || !today) return <Loading />

  const total = today.due + today.newAvailable

  return (
    <section className="py-10">
      <p className="text-sm text-zinc-500">
        Çalışılan seviyeler:{' '}
        {settings.levels.map((l) => (
          <CefrBadge key={l} level={l} className="ml-1" />
        ))}
      </p>
      <h1 className="font-display mt-4 text-5xl font-bold tracking-tight">
        {total > 0 ? 'Bugün' : 'Bugünlük tamam'}
      </h1>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Stat label="Tekrar" value={today.due} className="text-emerald-600 dark:text-emerald-400" />
        <Stat label="Yeni" value={today.newAvailable} className="text-sky-600 dark:text-sky-400" />
      </div>

      {total > 0 ? (
        <Link
          to="/calis"
          className="mt-8 block rounded-2xl bg-zinc-900 py-4 text-center text-lg font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Çalışmaya başla
        </Link>
      ) : (
        <p className="mt-8 rounded-2xl bg-zinc-100 p-4 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          Vadesi gelen kart yok ve günlük yeni kelime limitine ulaştın. Yarın görüşürüz!
        </p>
      )}

      <p className="mt-10 text-sm text-zinc-500 tabular-nums">
        {today.learned} kelime çalışılıyor · {today.known} kelime “biliyorum” olarak elendi
      </p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
        <Link to="/eleme" className="underline underline-offset-4">
          Hızlı eleme
        </Link>
        <Link to="/baslangic" className="underline underline-offset-4">
          Seviyeyi değiştir
        </Link>
      </div>
    </section>
  )
}

function Stat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-zinc-900">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-1 text-4xl font-bold tabular-nums ${className}`}>{value}</p>
    </div>
  )
}
