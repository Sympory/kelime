import { useLiveQuery } from 'dexie-react-hooks'
import { Link, Navigate } from 'react-router-dom'
import { CefrBadge } from '../../components/CefrBadge'
import { FlameIcon, SparkIcon } from '../../components/icons'
import { Loading } from '../../components/Loading'
import { db } from '../../db/db'
import { useSettings } from '../../db/hooks'
import { countIntroducedToday, getSettings } from '../../db/repo'
import { loadIndex } from '../../data/words'
import { isDueLearning, isDueReview } from '../../srs/queue'
import { State } from '../../srs/scheduler'
import { dayStart } from '../../srs/day'
import { levelProgress, streak, wordStatus, type LevelProgress } from '../../srs/stats'

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
      doneToday: reviewDates.filter((d) => d >= dayStart(now)).length,
      learned: cards.filter((c) => ['learned', 'known'].includes(wordStatus(c))).length,
      progress: levelProgress(cards, shown),
    }
  }, [])

  if (settings && settings.levels.length === 0) return <Navigate to="/baslangic" replace />
  if (!settings || !today) return <Loading />

  const total = today.due + today.newAvailable

  return (
    <section className="space-y-6 py-4">
      <header>
        <p className="eyebrow">{dateLine()}</p>
        <h1 className="font-display mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
          {greeting()}
        </h1>
      </header>

      {total > 0 ? (
        <Link
          to="/calis"
          className="group relative block overflow-hidden rounded-3xl bg-linear-to-br from-amber-300 via-amber-400 to-orange-500 p-6 text-zinc-950 shadow-xl shadow-amber-500/25 transition-transform duration-150 active:scale-[0.98]"
        >
          {/* Arka planda dönük kart siluetleri (logodaki iki kart) */}
          <span
            aria-hidden
            className="absolute -top-6 -right-6 h-36 w-28 rotate-12 rounded-2xl bg-white/25 transition-transform duration-300 group-hover:rotate-[18deg]"
          />
          <span
            aria-hidden
            className="absolute -top-2 right-10 h-36 w-28 -rotate-6 rounded-2xl bg-white/35 transition-transform duration-300 group-hover:-rotate-12"
          />
          <p className="relative text-sm font-semibold opacity-80">Bugünün oturumu</p>
          <p className="font-display relative mt-1 text-3xl font-bold">
            {total} kart seni bekliyor
          </p>
          <div className="relative mt-4 flex gap-2 text-sm font-semibold">
            <span className="rounded-full bg-zinc-950/10 px-3 py-1">{today.due} tekrar</span>
            <span className="rounded-full bg-zinc-950/10 px-3 py-1">{today.newAvailable} yeni</span>
          </div>
          <span className="relative mt-6 inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 font-semibold text-white transition-transform group-hover:translate-x-1">
            Çalışmaya başla →
          </span>
        </Link>
      ) : (
        <div className="surface p-6 text-center">
          <SparkIcon className="animate-pop mx-auto size-10 text-amber-500" />
          <p className="font-display mt-3 text-2xl font-bold">Bugünlük tamam</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Vadesi gelen kart yok ve günlük yeni kelime limitine ulaştın. Yarın görüşürüz!
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Bugün" value={today.doneToday} tone="text-sky-600 dark:text-sky-400" />
        <Stat
          label="Öğrenilen"
          value={today.learned}
          tone="text-emerald-600 dark:text-emerald-400"
        />
        <div className="surface p-4">
          <p className="text-xs font-medium text-zinc-500">Seri</p>
          <p className="mt-1 flex items-center gap-1 text-3xl font-bold text-amber-600 tabular-nums dark:text-amber-400">
            {today.streak}
            <FlameIcon
              className={`size-6 ${today.streak > 0 ? 'animate-flame text-orange-500' : 'text-zinc-300 dark:text-zinc-700'}`}
            />
          </p>
        </div>
      </div>

      <section className="surface p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="eyebrow">İlerleme</h2>
          <Link
            to="/istatistik"
            className="text-xs font-medium text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
          >
            İstatistikler →
          </Link>
        </div>
        <ul className="mt-4 space-y-4">
          {today.progress.map((p, i) => (
            <ProgressRow key={p.cefr} p={p} delay={i * 80} />
          ))}
        </ul>
        <p className="mt-4 flex gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500" /> öğrenildi / biliyorum
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-400" /> öğreniliyor
          </span>
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <QuickLink to="/eleme" title="Hızlı eleme" text="Bildiklerini kaydırarak ayıkla" />
        <QuickLink to="/ekle" title="Makaleden ekle" text="Okuduğun metinden kelime al" />
        <QuickLink to="/kelimeler" title="Kelimeler" text="Ara, filtrele, göz at" />
        <QuickLink to="/baslangic" title="Seviyeyi değiştir" text="Çalışılan seviyeler" />
      </div>
    </section>
  )
}

/** Günün saatine göre selam (gece 04:00'e kadar "İyi geceler"; uygulamanın gün sınırıyla uyumlu). */
function greeting(now = new Date()): string {
  const h = now.getHours()
  if (h < 4) return 'İyi geceler'
  if (h < 12) return 'Günaydın'
  if (h < 18) return 'İyi günler'
  return 'İyi akşamlar'
}

function dateLine(now = new Date()): string {
  return now.toLocaleDateString('tr', { weekday: 'long', day: 'numeric', month: 'long' })
}

function ProgressRow({ p, delay }: { p: LevelProgress; delay: number }) {
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
          className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-zinc-900/8 dark:bg-white/10"
          role="progressbar"
          aria-label={`${p.cefr} ilerlemesi`}
          aria-valuemin={0}
          aria-valuemax={p.total}
          aria-valuenow={p.done}
        >
          {/* Açılışta soldan dolar */}
          <div
            className="animate-grow flex origin-left"
            style={{ width: `${pct(p.done + p.learning)}%`, animationDelay: `${delay}ms` }}
          >
            <div
              className="bg-emerald-500"
              style={{ width: `${(p.done / Math.max(1, p.done + p.learning)) * 100}%` }}
            />
            <div className="flex-1 bg-amber-400" />
          </div>
        </div>
      </Link>
    </li>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="surface p-4">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  )
}

function QuickLink({ to, title, text }: { to: string; title: string; text: string }) {
  return (
    <Link
      to={to}
      className="surface group block p-4 transition-transform duration-150 active:scale-[0.98]"
    >
      <p className="flex items-center justify-between font-semibold">
        {title}
        <span className="text-zinc-400 transition-transform group-hover:translate-x-0.5">→</span>
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">{text}</p>
    </Link>
  )
}
