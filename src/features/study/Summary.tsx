import { useState } from 'react'
import { Link } from 'react-router-dom'
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

  if (answered.length === 0) {
    return (
      <section className="py-16 text-center">
        <p className="font-display text-3xl font-bold">Bugünlük her şey tamam 🎉</p>
        <p className="mt-3 text-zinc-500">
          Vadesi gelen tekrar ya da günlük limit dahilinde yeni kelime kalmadı.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block rounded-xl bg-zinc-900 px-6 py-3 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
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
    <section className="py-10">
      <p className="font-display text-4xl font-bold">Oturum bitti 🎉</p>
      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Kelime" value={words} />
        <Stat label="Yeni" value={newWords} />
        <Stat label="Doğru oranı" value={`%${accuracy}`} />
        <Stat label="Süre" value={`${minutes} dk`} />
      </dl>
      <ul className="mt-6 flex flex-wrap gap-2 text-sm">
        {GRADES.map((g) => (
          <li key={g} className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-900">
            {GRADE_LABELS[g]}: <span className="font-semibold tabular-nums">{byGrade[g]}</span>
          </li>
        ))}
      </ul>
      <Link
        to="/"
        className="mt-10 inline-block rounded-xl bg-zinc-900 px-6 py-3 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Ana sayfa
      </Link>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  )
}
