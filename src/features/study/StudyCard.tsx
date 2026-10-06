import { AnimatePresence, motion } from 'motion/react'
import { CefrBadge } from '../../components/CefrBadge'
import { Highlighted } from '../../components/Highlighted'
import { POS_LABELS } from '../../components/pos'
import type { QueueKind } from '../../srs/queue'
import type { Example, Word } from '../../types/word'

const KIND_LABELS: Record<QueueKind, { label: string; className: string }> = {
  new: { label: 'Yeni', className: 'text-sky-600 dark:text-sky-400' },
  learning: { label: 'Öğreniliyor', className: 'text-rose-600 dark:text-rose-400' },
  review: { label: 'Tekrar', className: 'text-emerald-600 dark:text-emerald-400' },
}

/** Yarım çevirme süresi; toplam animasyon 2 × 120 ms (plan: ≤ 300 ms). */
const HALF_FLIP_S = 0.12

type Props = {
  word: Word
  kind: QueueKind
  /** Ön yüzde gösterilecek örnek (her tekrarda farklı örnek seçilir) */
  example?: Example
  flipped: boolean
  onFlip: () => void
}

export function StudyCard({ word, kind, example, flipped, onFlip }: Props) {
  return (
    <div className="[perspective:1200px]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.article
          key={flipped ? 'back' : 'front'}
          initial={{ rotateY: flipped ? -90 : 90 }}
          animate={{ rotateY: 0, transition: { duration: HALF_FLIP_S, ease: 'easeOut' } }}
          exit={{
            rotateY: flipped ? 90 : -90,
            transition: { duration: HALF_FLIP_S, ease: 'easeIn' },
          }}
          onClick={flipped ? undefined : onFlip}
          className={`rounded-3xl bg-white p-6 shadow-xl shadow-zinc-900/10 sm:p-8 dark:bg-zinc-900 dark:shadow-black/40 ${
            flipped ? '' : 'cursor-pointer'
          }`}
        >
          <header className="flex items-center gap-2 text-xs font-semibold">
            <CefrBadge level={word.cefr} />
            <span className={KIND_LABELS[kind].className}>{KIND_LABELS[kind].label}</span>
            <span className="ml-auto text-zinc-400">{POS_LABELS[word.pos]}</span>
          </header>
          {flipped ? (
            <Back word={word} example={example} />
          ) : (
            <Front word={word} example={example} />
          )}
        </motion.article>
      </AnimatePresence>
    </div>
  )
}

function Front({ word, example }: { word: Word; example?: Example }) {
  return (
    <div className="flex min-h-56 flex-col justify-center py-6">
      {example ? (
        <p className="font-display text-2xl leading-snug sm:text-3xl">
          <Highlighted text={example.en} hl={example.hl} />
        </p>
      ) : (
        <p className="font-display text-center text-5xl font-bold tracking-tight">{word.lemma}</p>
      )}
      <p className="mt-8 text-center text-sm text-zinc-400">
        Anlamını düşün, sonra çevir{' '}
        <kbd className="ml-1 hidden rounded border px-1 text-xs sm:inline">Boşluk</kbd>
      </p>
    </div>
  )
}

function Back({ word, example }: { word: Word; example?: Example }) {
  const others = word.examples.filter((e) => e !== example).slice(0, 2)
  return (
    <div className="pt-4">
      <h2 className="font-display text-4xl font-bold tracking-tight break-words">{word.lemma}</h2>
      {word.ipa && <p className="mt-1 font-mono text-sm text-zinc-500">{word.ipa}</p>}

      {word.tr.length > 0 ? (
        <p className="mt-4 text-xl font-semibold text-amber-700 dark:text-amber-300">
          {word.tr.join(', ')}
        </p>
      ) : (
        <p className="mt-4 text-sm text-zinc-400 italic">Türkçe karşılık henüz yok</p>
      )}

      {word.defEn.length > 0 && (
        <ol className="mt-3 list-inside list-decimal space-y-1 text-zinc-700 dark:text-zinc-300">
          {word.defEn.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ol>
      )}

      {example && (
        <div className="mt-5 border-l-2 border-amber-400 pl-3">
          <ExampleView example={example} />
        </div>
      )}

      <Chips title="Sık birlikte" items={word.collocations} />
      <Chips title="Eş anlamlı" items={word.synonyms} />
      <Chips title="Kelime ailesi" items={word.family} />

      {others.length > 0 && (
        <section className="mt-5">
          <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Diğer örnekler
          </h3>
          <ul className="mt-2 space-y-3">
            {others.map((e) => (
              <li key={e.en}>
                <ExampleView example={e} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function ExampleView({ example }: { example: Example }) {
  return (
    <div className="text-sm">
      <p>
        <Highlighted text={example.en} hl={example.hl} />
      </p>
      {example.tr && <p className="mt-0.5 text-zinc-500">{example.tr}</p>}
      {example.source === 'tatoeba' && example.tatoebaId && (
        <a
          href={`https://tatoeba.org/sentences/show/${example.tatoebaId}`}
          target="_blank"
          rel="noreferrer"
          className="mt-0.5 inline-block text-[11px] text-zinc-400 hover:underline"
        >
          Tatoeba{example.author ? ` · ${example.author}` : ''}
          {example.trAuthor && example.trAuthor !== example.author ? ` / ${example.trAuthor}` : ''}
        </a>
      )}
    </div>
  )
}

function Chips({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <section className="mt-5">
      <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{title}</h3>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {items.map((i) => (
          <li key={i} className="rounded-full bg-zinc-100 px-2.5 py-1 text-sm dark:bg-zinc-800">
            {i}
          </li>
        ))}
      </ul>
    </section>
  )
}
