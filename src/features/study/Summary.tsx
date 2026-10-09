import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FlameIcon, SparkIcon } from '../../components/icons'
import { db } from '../../db/db'
import { forecast, streak } from '../../srs/stats'
import { GRADE_LABELS, GRADES, Rating } from '../../srs/scheduler'
import type { Session } from '../../srs/session'

export function Summary({
  answered,
  startedAt,
}: {
  answered: Session['answered']
  startedAt: Date
}) {
  // Bitiş anı özet ilk gösterildiğinde sabitlenir
  const [minutes] = useState(() =>
    Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60_000)),
  )
  // Seri ve yarının yükü: kullanıcıya yarın neden geri gelmesi gerektiğini gösterir
  const outlook = useLiveQuery(async () => {
    const now = new Date()
    const [dates, cards] = await Promise.all([
      db.reviews.orderBy('review').keys() as Promise<Date[]>,
      db.cards.toArray(),
    ])
    return { streak: streak(dates, now), tomorrow: forecast(cards, now, 2)[1].count }
  }, [])

  if (answered.length === 0) {
    return (
      <section className="surface mt-6 p-8 text-center">
        <SparkIcon className="animate-pop mx-auto size-12 text-amber-500" />
        <p className="font-display mt-4 text-3xl font-bold">Bugünlük her şey tamam</p>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Vadesi gelen tekrar ya da günlük limit dahilinde yeni kelime kalmadı.
        </p>
        <Link to="/" className="btn-primary mt-8">
          Ana sayfa
        </Link>
      </section>
    )
  }

  const byGrade = Object.fromEntries(
    GRADES.map((g) => [g, answered.filter((a) => a.grade === g).length]),
  ) as Record<(typeof GRADES)[number], number>
  const words = new Set(answered.map((a) => a.wordId)).size
  const newWords = new Set(answered.filter((a) => a.kind === 'new').map((a) => a.wordId)).size
  const accuracy = Math.round(((answered.length - byGrade[Rating.Again]) / answered.length) * 100)

  return (
    <section className="relative py-6">
      <Confetti />
      <div className="surface relative p-6 text-center sm:p-8">
        <p className="eyebrow">Oturum bitti</p>
        <p className="font-display mt-2 text-4xl font-bold">
          {accuracy >= 90
            ? 'Harika iş!'
            : accuracy >= 70
              ? 'Güzel gidiyor!'
              : 'Devam, tekrar işe yarar!'}
        </p>
        <AccuracyRing value={accuracy} />
        <dl className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Kelime" value={words} />
          <Stat label="Yeni" value={newWords} />
          <Stat label="Süre" value={`${minutes} dk`} />
        </dl>
        {outlook && (
          <div className="animate-page-in mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            {outlook.streak > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 px-3 py-1 text-sm font-semibold text-orange-700 dark:text-orange-300">
                <FlameIcon className="animate-flame size-4" /> {outlook.streak} günlük seri
              </span>
            )}
            <span className="rounded-full bg-zinc-900/5 px-3 py-1 text-sm text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
              {outlook.tomorrow > 0
                ? `Yarın ${outlook.tomorrow} tekrar seni bekliyor`
                : 'Yarın yeni kelimelerle devam'}
            </span>
          </div>
        )}
        <ul className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
          {GRADES.map((g) => (
            <li key={g} className="chip">
              {GRADE_LABELS[g]}: <span className="font-semibold tabular-nums">{byGrade[g]}</span>
            </li>
          ))}
        </ul>
        <Link to="/" className="btn-primary mt-8 w-full sm:w-auto">
          Ana sayfa
        </Link>
      </div>
    </section>
  )
}

/** Doğru oranı halkası: açılışta 0'dan değere dolar. */
function AccuracyRing({ value }: { value: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="relative mx-auto mt-6 size-36">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          className="stroke-zinc-900/8 dark:stroke-white/10"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          className="animate-ring stroke-emerald-500"
          style={{
            strokeDasharray: c,
            strokeDashoffset: c * (1 - value / 100),
            ['--ring-from' as string]: c,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums">%{value}</span>
        <span className="text-xs text-zinc-500">doğru</span>
      </div>
    </div>
  )
}

const CONFETTI_COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#a855f7', '#f59e0b']

/** Kısa konfeti patlaması (yalnızca CSS; hareketi azalt tercihinde gizlenir). */
function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 28 }, (_, i) => ({
      left: 50 + (Math.random() - 0.5) * 30,
      dx: (Math.random() - 0.5) * 340,
      dy: -(120 + Math.random() * 180),
      rot: Math.random() * 720 - 360,
      delay: Math.random() * 120,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      w: 6 + Math.random() * 5,
    })),
  )
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-24 h-0 motion-reduce:hidden"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="animate-confetti absolute top-0 rounded-[2px]"
          style={
            {
              left: `${p.left}%`,
              width: p.w,
              height: p.w * 0.45,
              background: p.color,
              animationDelay: `${p.delay}ms`,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              '--rot': `${p.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-zinc-900/5 p-3 dark:bg-white/5">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  )
}
