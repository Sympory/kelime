import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Loading } from '../../components/Loading'
import { db } from '../../db/db'
import { accuracy, dailyCounts, forecast, streak, wordStatus, type DayCount } from '../../srs/stats'

const DAYS = 30
const fmtDay = (d: Date) => d.toLocaleDateString('tr', { day: 'numeric', month: 'long' })
const fmtWeekday = (d: Date) => d.toLocaleDateString('tr', { weekday: 'short' })

export default function StatsPage() {
  const data = useLiveQuery(async () => {
    const now = new Date()
    const [reviews, cards] = await Promise.all([db.reviews.toArray(), db.cards.toArray()])
    const since = new Date(now)
    since.setDate(since.getDate() - DAYS)
    const recent = reviews.filter((r) => r.review >= since)
    const days = dailyCounts(
      reviews.map((r) => r.review),
      now,
      DAYS,
    )
    const statuses = cards.map(wordStatus)
    return {
      days,
      next: forecast(cards, now, 7),
      today: days.at(-1)!.count,
      total: reviews.length,
      acc: accuracy(recent.map((r) => r.rating)),
      streak: streak(
        reviews.map((r) => r.review),
        now,
      ),
      learned: statuses.filter((s) => s === 'learned').length,
      learning: statuses.filter((s) => s === 'learning').length,
      activeDays: days.filter((d) => d.count > 0).length,
    }
  }, [])

  if (!data) return <Loading />

  return (
    <section className="py-6">
      <h1 className="font-display text-3xl font-bold">İstatistik</h1>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Bugün" value={data.today} unit="tekrar" />
        <Tile
          label="Doğru oranı"
          value={data.acc === undefined ? '–' : `%${Math.round(data.acc * 100)}`}
          unit="son 30 gün"
        />
        <Tile label="Seri" value={data.streak} unit="gün" />
        <Tile label="Öğrenildi" value={data.learned} unit={`${data.learning} öğreniliyor`} />
      </dl>

      <Heatmap days={data.days} activeDays={data.activeDays} />
      <Forecast days={data.next} />

      <p className="mt-8 text-xs text-zinc-500 tabular-nums">
        Toplam {data.total.toLocaleString('tr')} tekrar. “Doğru”: Zor, İyi ya da Kolay; “Tekrar”
        dışındaki her değerlendirme.
      </p>
    </section>
  )
}

function Tile({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <div className="surface p-4">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 text-3xl font-bold tabular-nums">{value}</dd>
      <dd className="text-xs text-zinc-500">{unit}</dd>
    </div>
  )
}

/** Değeri 0–4 basamağa çevirir (0 = hiç; diğerleri en yüksek güne göre çeyrekler). */
function level(count: number, max: number): number {
  if (count === 0 || max === 0) return 0
  return Math.min(4, Math.ceil((count / max) * 4))
}
const LEVEL_VARS = [
  'var(--chart-empty)',
  'var(--chart-seq-1)',
  'var(--chart-seq-2)',
  'var(--chart-seq-3)',
  'var(--chart-seq-4)',
]

function ChartCard({
  title,
  summary,
  readout,
  children,
  table,
}: {
  title: string
  summary: string
  readout: string
  children: React.ReactNode
  table: { head: [string, string]; rows: [string, number][] }
}) {
  return (
    <section className="surface mt-8 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs text-zinc-500">{summary}</p>
      </div>
      {children}
      {/* Üzerine gelinen/dokunulan günün değeri (fare ve dokunmatik için ortak okuma satırı) */}
      <p
        className="mt-3 h-5 text-sm text-zinc-600 tabular-nums dark:text-zinc-400"
        aria-live="polite"
      >
        {readout}
      </p>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-xs text-zinc-500">Tablo olarak göster</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-xs text-zinc-500">
            <tr>
              <th className="py-1 font-medium">{table.head[0]}</th>
              <th className="py-1 text-right font-medium">{table.head[1]}</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map(([k, v]) => (
              <tr key={k} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-1">{k}</td>
                <td className="py-1 text-right">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}

function Heatmap({ days, activeDays }: { days: DayCount[]; activeDays: number }) {
  const [focus, setFocus] = useState<DayCount>()
  const max = Math.max(0, ...days.map((d) => d.count))
  return (
    <ChartCard
      title="Son 30 gün"
      summary={`${activeDays} gün çalışıldı`}
      readout={
        focus ? `${fmtDay(focus.date)}: ${focus.count} tekrar` : 'Bir güne dokun ya da üzerine gel'
      }
      table={{
        head: ['Gün', 'Tekrar'],
        rows: days.map((d) => [fmtDay(d.date), d.count]),
      }}
    >
      <div
        className="mt-4 grid grid-cols-10 gap-1 sm:grid-cols-15"
        role="img"
        aria-label={`Son 30 günün tekrar ısı haritası; en yoğun gün ${max} tekrar`}
        onMouseLeave={() => setFocus(undefined)}
      >
        {days.map((d) => (
          <button
            key={d.key}
            type="button"
            aria-label={`${fmtDay(d.date)}: ${d.count} tekrar`}
            onMouseEnter={() => setFocus(d)}
            onFocus={() => setFocus(d)}
            onClick={() => setFocus(d)}
            className={`aspect-square rounded-[4px] outline-offset-1 hover:outline-2 hover:outline-zinc-400 focus-visible:outline-2 ${
              focus?.key === d.key ? 'outline-2 outline-zinc-500' : ''
            }`}
            style={{ background: LEVEL_VARS[level(d.count, max)] }}
          />
        ))}
      </div>
      <div
        className="mt-3 flex items-center justify-end gap-1 text-[11px] text-zinc-500"
        aria-hidden
      >
        Az
        {LEVEL_VARS.map((v) => (
          <span key={v} className="size-3 rounded-[3px]" style={{ background: v }} />
        ))}
        Çok
      </div>
    </ChartCard>
  )
}

function Forecast({ days }: { days: DayCount[] }) {
  const [focus, setFocus] = useState<DayCount>()
  const max = Math.max(1, ...days.map((d) => d.count))
  const total = days.reduce((s, d) => s + d.count, 0)
  const label = (d: DayCount, i: number) =>
    i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : fmtWeekday(d.date)
  return (
    <ChartCard
      title="Önümüzdeki 7 gün"
      summary={`${total} tekrar bekliyor`}
      readout={
        focus
          ? `${fmtDay(focus.date)}: ${focus.count} kart`
          : 'Yeni kelimeler hariç; yalnızca vadesi gelecek tekrarlar'
      }
      table={{
        head: ['Gün', 'Kart'],
        rows: days.map((d, i) => [`${label(d, i)} (${fmtDay(d.date)})`, d.count]),
      }}
    >
      <div
        className="mt-4 flex h-36 items-end gap-2 border-b border-zinc-300 dark:border-zinc-700"
        role="img"
        aria-label={`Önümüzdeki 7 günün tekrar yükü; toplam ${total}`}
        onMouseLeave={() => setFocus(undefined)}
      >
        {days.map((d) => (
          // Tıklama alanı çubuğun tamamı kadar yüksek (çubuk kısa olsa da kolay hedeflenir)
          <button
            key={d.key}
            type="button"
            aria-label={`${fmtDay(d.date)}: ${d.count} kart`}
            onMouseEnter={() => setFocus(d)}
            onFocus={() => setFocus(d)}
            onClick={() => setFocus(d)}
            className="group flex h-full flex-1 flex-col items-center justify-end"
          >
            {d.count === max && max > 0 && (
              <span className="mb-1 text-[11px] text-zinc-500 tabular-nums">{d.count}</span>
            )}
            <span
              className={`w-full max-w-10 rounded-t-[4px] transition-opacity ${
                focus && focus.key !== d.key ? 'opacity-60' : ''
              }`}
              style={{
                height: d.count ? `${Math.max(2, (d.count / max) * 100)}%` : 0,
                background: 'var(--chart-bar)',
              }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-2 text-[11px] text-zinc-500" aria-hidden>
        {days.map((d, i) => (
          <span key={d.key} className="flex-1 text-center">
            {label(d, i)}
          </span>
        ))}
      </div>
    </ChartCard>
  )
}
