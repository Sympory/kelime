import type { Example, Word } from '../types/word'
import { AutoBadge } from './AutoBadge'
import { Highlighted } from './Highlighted'
import { SpeakButton } from './SpeakButton'

/** Kelime başlığı: lemma, seslendirme ve IPA */
export function WordHeading({ word, as: Tag = 'h2' }: { word: Word; as?: 'h1' | 'h2' }) {
  return (
    <div>
      <div className="flex items-center gap-1">
        <Tag className="font-display text-4xl font-bold tracking-tight break-words">
          {word.lemma}
        </Tag>
        <SpeakButton text={word.lemma} label="Telaffuz" />
      </div>
      {word.ipa && <p className="mt-1 font-mono text-sm text-zinc-500">{word.ipa}</p>}
    </div>
  )
}

/** Türkçe karşılıklar (otomatikse etiketli) ve İngilizce tanımlar */
export function Meaning({ word }: { word: Word }) {
  return (
    <>
      {word.tr.length > 0 ? (
        <p className="mt-4 text-xl font-semibold text-amber-700 dark:text-amber-300">
          {word.tr.join(', ')}
          {word.trAuto && <AutoBadge />}
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
    </>
  )
}

export function ExampleView({ example }: { example: Example }) {
  return (
    <div className="flex items-start gap-1 text-sm">
      <div className="min-w-0 flex-1">
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
            {example.trAuthor && example.trAuthor !== example.author
              ? ` / ${example.trAuthor}`
              : ''}
          </a>
        )}
      </div>
      <SpeakButton text={example.en} label="Cümleyi seslendir" className="-mt-1" />
    </div>
  )
}

export function Chips({ title, items }: { title: string; items: string[] }) {
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

/** Collocation, eş anlamlı ve kelime ailesi */
export function Relations({ word }: { word: Word }) {
  return (
    <>
      <Chips title="Sık birlikte" items={word.collocations} />
      <Chips title="Eş anlamlı" items={word.synonyms} />
      <Chips title="Kelime ailesi" items={word.family} />
    </>
  )
}
