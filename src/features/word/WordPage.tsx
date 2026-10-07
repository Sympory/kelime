import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CefrBadge } from '../../components/CefrBadge'
import { Loading } from '../../components/Loading'
import { POS_LABELS } from '../../components/pos'
import { StatusPill } from '../../components/StatusPill'
import { ExampleView, Meaning, Relations, WordHeading } from '../../components/WordParts'
import { db } from '../../db/db'
import { useSettings } from '../../db/hooks'
import { placeWord } from '../../db/repo'
import { findWord } from '../../data/words'
import { State } from '../../srs/scheduler'
import { wordStatus } from '../../srs/stats'
import type { Word } from '../../types/word'

export default function WordPage() {
  const { id = '' } = useParams()
  const settings = useSettings()
  const [word, setWord] = useState<Word | null>()

  useEffect(() => {
    if (!settings) return
    let cancelled = false
    void findWord(id, settings.levels).then((w) => !cancelled && setWord(w ?? null))
    return () => {
      cancelled = true
    }
  }, [id, settings])

  if (word === null)
    return (
      <section className="py-16 text-center">
        <p className="text-zinc-500">“{id}” bulunamadı.</p>
        <Link to="/kelimeler" className="mt-4 inline-block underline underline-offset-4">
          Kelimelere dön
        </Link>
      </section>
    )
  if (!word) return <Loading />
  return <WordDetail word={word} />
}

function WordDetail({ word }: { word: Word }) {
  const navigate = useNavigate()
  const card = useLiveQuery(() => db.cards.get(word.id), [word.id])
  const status = wordStatus(card)
  const fmt = (d: Date) =>
    d.toLocaleDateString('tr', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <article className="py-6">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← Geri
      </button>

      <header className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
        <CefrBadge level={word.cefr} />
        <span className="text-zinc-500">{POS_LABELS[word.pos]}</span>
        <span className="ml-auto">
          <StatusPill status={status} />
        </span>
      </header>

      <div className="mt-3">
        <WordHeading word={word} as="h1" />
        <Meaning word={word} />
      </div>

      {word.examples.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Örnekler</h2>
          <ul className="mt-2 space-y-4">
            {word.examples.map((e) => (
              <li key={e.en} className="border-l-2 border-amber-400/60 pl-3">
                <ExampleView example={e} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Relations word={word} />

      <section className="mt-8 rounded-2xl bg-zinc-100 p-5 dark:bg-zinc-900">
        {card && card.status === 'active' && card.state !== State.New ? (
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-zinc-500">Sonraki tekrar</dt>
              <dd className="font-semibold">{fmt(card.due)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Tekrar</dt>
              <dd className="font-semibold tabular-nums">{card.reps}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Unutma</dt>
              <dd className="font-semibold tabular-nums">{card.lapses}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {status === 'known'
              ? 'Bu kelimeyi bildiğini işaretledin; çalışma havuzunda değil.'
              : card
                ? 'Sırada: günlük yeni kelime limiti dahilinde ilk gelenlerden.'
                : 'Henüz çalışılmadı.'}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {(status === 'known' || !card) && (
            <button
              onClick={() => placeWord(db, word, false, new Date())}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Çalışmaya ekle
            </button>
          )}
          {status !== 'known' && (
            <button
              onClick={() => {
                if (
                  card?.reps &&
                  !confirm('Bu kelimedeki ilerlemen sıfırlanıp "biliyorum" olarak işaretlenecek.')
                )
                  return
                void placeWord(db, word, true, new Date())
              }}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Biliyorum olarak işaretle
            </button>
          )}
        </div>
      </section>
    </article>
  )
}
