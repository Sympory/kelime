import { AnimatePresence, motion } from 'motion/react'
import { CefrBadge } from '../../components/CefrBadge'
import { Highlighted } from '../../components/Highlighted'
import { POS_LABELS } from '../../components/pos'
import { ExampleView, Meaning, Relations, WordHeading } from '../../components/WordParts'
import type { QueueKind } from '../../srs/queue'
import type { Cefr, Example, Word } from '../../types/word'

const STRIPE: Record<Cefr, string> = {
  A1: 'bg-cefr-a1',
  A2: 'bg-cefr-a2',
  B1: 'bg-cefr-b1',
  B2: 'bg-cefr-b2',
  C1: 'bg-cefr-c1',
  C2: 'bg-cefr-c2',
}

const KIND_LABELS: Record<QueueKind, { label: string; className: string }> = {
  new: { label: 'Yeni', className: 'text-sky-600 dark:text-sky-400' },
  learning: { label: 'Öğreniliyor', className: 'text-rose-600 dark:text-rose-400' },
  review: { label: 'Tekrar', className: 'text-emerald-600 dark:text-emerald-400' },
  reinforce: { label: 'Pekiştirme', className: 'text-violet-600 dark:text-violet-400' },
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
  /** en-tr: cümledeki kelimeyi tanı · tr-en: Türkçeden İngilizceyi hatırla */
  direction?: 'en-tr' | 'tr-en'
}

export function StudyCard({ word, kind, example, flipped, onFlip, direction = 'en-tr' }: Props) {
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
          onClick={(e) => {
            // Seslendirme düğmesi ve Tatoeba bağlantısı kartı çevirmesin
            if ((e.target as HTMLElement).closest('a, button')) return
            onFlip()
          }}
          className="surface relative cursor-pointer overflow-hidden p-6 sm:p-8"
        >
          {/* Üstte seviye renginde ince şerit */}
          <span
            aria-hidden
            className={`absolute inset-x-0 top-0 h-1 ${word.cefr ? STRIPE[word.cefr] : 'bg-zinc-400'}`}
          />
          <header className="flex items-center gap-2 text-xs font-semibold">
            <CefrBadge level={word.cefr} />
            <span className={KIND_LABELS[kind].className}>{KIND_LABELS[kind].label}</span>
            <span className="ml-auto text-zinc-400">{POS_LABELS[word.pos]}</span>
          </header>
          {flipped ? (
            <Back word={word} example={example} />
          ) : direction === 'tr-en' ? (
            <FrontReverse word={word} example={example} />
          ) : (
            <Front word={word} example={example} />
          )}
        </motion.article>
      </AnimatePresence>
    </div>
  )
}

/** Türkçeden İngilizceye: Türkçe karşılık + kelimesi boşluk olarak gizlenmiş örnek cümle */
function FrontReverse({ word, example }: { word: Word; example?: Example }) {
  const hint = word.tr.length ? word.tr.join(', ') : word.defEn[0]
  return (
    <div className="flex min-h-64 flex-col justify-center py-8">
      <p className="font-display text-center text-3xl font-bold text-amber-700 sm:text-4xl dark:text-amber-300">
        {hint}
      </p>
      {example?.hl && (
        <p className="mt-6 text-center text-lg leading-snug text-zinc-600 dark:text-zinc-300">
          {example.en.slice(0, example.hl[0])}
          <span
            className="mx-0.5 inline-block min-w-16 border-b-2 border-amber-400 align-baseline"
            aria-label="boşluk"
          >
            &nbsp;
          </span>
          {example.en.slice(example.hl[1])}
        </p>
      )}
      {example?.tr && example.hl && (
        <p className="mt-2 text-center text-sm text-zinc-500">{example.tr}</p>
      )}
      <p className="mt-8 text-center text-sm text-zinc-400">
        İngilizcesini hatırla, sonra çevir{' '}
        <kbd className="ml-1 hidden rounded border px-1 text-xs sm:inline">Boşluk</kbd>
      </p>
    </div>
  )
}

function Front({ word, example }: { word: Word; example?: Example }) {
  return (
    <div className="flex min-h-64 flex-col justify-center py-8">
      {example ? (
        <p className="font-display text-[1.7rem] leading-snug text-balance sm:text-3xl">
          <Highlighted text={example.en} hl={example.hl} />
        </p>
      ) : (
        <p className="font-display text-center text-5xl font-bold tracking-tight">{word.lemma}</p>
      )}
      <p className="mt-10 text-center text-sm text-zinc-400">
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
      <WordHeading word={word} />
      <Meaning word={word} />

      {example && (
        <div className="mt-5 rounded-2xl border-l-4 border-amber-400 bg-amber-400/10 p-3">
          <ExampleView example={example} />
        </div>
      )}

      <Relations word={word} />

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

      <p className="mt-6 text-center text-xs text-zinc-400">
        Ön yüze dönmek için karta dokun{' '}
        <kbd className="ml-1 hidden rounded border px-1 text-[10px] sm:inline">Boşluk</kbd>
      </p>
    </div>
  )
}
