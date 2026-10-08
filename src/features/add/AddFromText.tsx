import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CefrBadge } from '../../components/CefrBadge'
import { Highlighted } from '../../components/Highlighted'
import { POS_LABELS } from '../../components/pos'
import { StatusPill } from '../../components/StatusPill'
import { db } from '../../db/db'
import { addSentence, makeCustomWord, useUserData } from '../../db/userWords'
import { lookupWords } from '../../data/words'
import { suggestDefinition } from '../../lib/dictionary'
import { wordStatus } from '../../srs/stats'
import type { Pos, Word } from '../../types/word'
import { lemmaCandidates, nextSelection, sentenceAround, tokenize } from './text'

type Selection = { from: number; to: number }
type Picked = { phrase: string; sentence: string; hl: [number, number] }

export default function AddFromText() {
  const [text, setText] = useState('')
  const [editing, setEditing] = useState(true)
  const [sel, setSel] = useState<Selection>()
  const tokens = useMemo(() => tokenize(text), [text])

  const picked: Picked | undefined = useMemo(() => {
    if (!sel) return undefined
    const start = tokens[sel.from].start
    const end = tokens[sel.to].end
    return { phrase: text.slice(start, end), ...sentenceAround(text, start, end) }
  }, [sel, tokens, text])

  return (
    <section className="py-6">
      <h1 className="font-display text-3xl font-bold">Makaleden ekle</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Okuduğun bir metni yapıştır, bilmediğin kelimeye dokun. Cümle o kelimenin kartına örnek
        olarak eklenir ve kelime çalışma sırasına girer. Yan yana kelimelere dokunarak ifade de
        seçebilirsin (ör. “according to”).
      </p>

      {editing ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="İngilizce bir paragraf yapıştır…"
            aria-label="Metin"
            className="mt-5 w-full rounded-2xl border border-zinc-200 bg-white p-4 text-base leading-relaxed outline-none focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900"
          />
          <button
            onClick={() => {
              setSel(undefined)
              setEditing(false)
            }}
            disabled={tokens.length === 0}
            className="mt-3 w-full rounded-2xl bg-zinc-900 py-3 font-semibold text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Kelime seç
          </button>
        </>
      ) : (
        <>
          <TokenText
            text={text}
            tokens={tokens}
            sel={sel}
            onPick={(i) => setSel((s) => nextSelection(s, i))}
          />
          <button
            onClick={() => setEditing(true)}
            className="mt-2 text-sm text-zinc-500 underline underline-offset-4"
          >
            Metni düzenle
          </button>
          {picked ? (
            <Lookup key={`${picked.phrase}|${picked.sentence}`} picked={picked} />
          ) : (
            <p className="mt-6 text-center text-sm text-zinc-400">Bir kelimeye dokun.</p>
          )}
        </>
      )}
    </section>
  )
}

function TokenText({
  text,
  tokens,
  sel,
  onPick,
}: {
  text: string
  tokens: ReturnType<typeof tokenize>
  sel?: Selection
  onPick: (i: number) => void
}) {
  const parts: React.ReactNode[] = []
  let cursor = 0
  tokens.forEach((t, i) => {
    if (t.start > cursor) parts.push(text.slice(cursor, t.start))
    const on = sel && i >= sel.from && i <= sel.to
    parts.push(
      <button
        key={i}
        onClick={() => onPick(i)}
        className={`rounded px-0.5 transition-colors ${
          on ? 'bg-amber-300 text-zinc-950' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'
        }`}
      >
        {t.text}
      </button>,
    )
    cursor = t.end
  })
  parts.push(text.slice(cursor))
  return (
    <div className="mt-5 rounded-2xl bg-white p-4 text-lg leading-loose whitespace-pre-wrap shadow-sm dark:bg-zinc-900">
      {parts}
    </div>
  )
}

/** Seçilen kelimeyi hazır veride ve kullanıcı kelimelerinde arar. */
function Lookup({ picked }: { picked: Picked }) {
  const user = useUserData()
  const [found, setFound] = useState<Word[]>()
  const [trSentence, setTrSentence] = useState('')
  // Başarı mesajı burada tutulur: kayıttan sonra canlı veri güncellenince form kaybolsa da kalır
  const [saved, setSaved] = useState<Word>()

  useEffect(() => {
    let cancelled = false
    void lookupWords(picked.phrase).then((ws) => !cancelled && setFound(ws))
    return () => {
      cancelled = true
    }
  }, [picked.phrase])

  const forms = lemmaCandidates(picked.phrase)
  const own = (user?.words ?? []).filter((w) => forms.includes(w.lemma.toLowerCase()))
  const candidates = [...own, ...(found ?? [])]
  const example = { en: picked.sentence, hl: picked.hl, ...(trSentence ? { tr: trSentence } : {}) }

  return (
    <div className="mt-6">
      <div className="rounded-2xl border-l-4 border-amber-400 bg-amber-50 p-4 dark:bg-amber-400/10">
        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Cümle</p>
        <p className="mt-1">
          <Highlighted text={picked.sentence} hl={picked.hl} />
        </p>
        <input
          value={trSentence}
          onChange={(e) => setTrSentence(e.target.value)}
          placeholder="Türkçesi (isteğe bağlı)"
          aria-label="Cümlenin Türkçesi"
          className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {saved ? (
        <SavedMessage word={saved} />
      ) : !found || !user ? (
        <p className="mt-6 text-center text-sm text-zinc-400">Aranıyor…</p>
      ) : candidates.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {candidates.map((w) => (
            <Candidate
              key={w.id}
              word={w}
              example={example}
              alreadyAdded={Boolean(user.examples.get(w.id)?.some((e) => e.en === picked.sentence))}
            />
          ))}
        </ul>
      ) : (
        <CustomWordForm phrase={picked.phrase} example={example} onSaved={setSaved} />
      )}
    </div>
  )
}

function Candidate({
  word,
  example,
  alreadyAdded,
}: {
  word: Word
  example: Parameters<typeof addSentence>[2]
  alreadyAdded: boolean
}) {
  const card = useLiveQuery(() => db.cards.get(word.id), [word.id])
  const [done, setDone] = useState<string>()
  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <CefrBadge level={word.cefr} />
        <Link to={`/kelime/${word.id}`} className="font-semibold hover:underline">
          {word.lemma}
        </Link>
        <span className="text-xs text-zinc-500">{POS_LABELS[word.pos]}</span>
        <span className="ml-auto">
          <StatusPill status={wordStatus(card)} />
        </span>
      </div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {word.tr.slice(0, 3).join(', ') || word.defEn[0]}
      </p>
      {done || alreadyAdded ? (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400" role="status">
          {done ?? 'Bu cümle zaten bu kelimenin örneklerinde.'}
        </p>
      ) : (
        <button
          onClick={async () => {
            const { queued } = await addSentence(db, word, example, new Date())
            setDone(
              queued
                ? 'Cümle eklendi; kelime yeni kelimelerin başına alındı.'
                : 'Cümle bu kelimenin örneklerine eklendi.',
            )
          }}
          className="mt-3 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Bu cümleyle çalışmaya ekle
        </button>
      )}
    </li>
  )
}

/** Hazır veride olmayan kelime: Datamuse'tan tanım önerisi alıp kullanıcıya düzenletir. */
function CustomWordForm({
  phrase,
  example,
  onSaved,
}: {
  phrase: string
  example: Parameters<typeof addSentence>[2]
  onSaved: (w: Word) => void
}) {
  const [lemma, setLemma] = useState(phrase.toLowerCase())
  const [pos, setPos] = useState<Pos>('other')
  const [tr, setTr] = useState('')
  const [def, setDef] = useState('')
  const [ipa, setIpa] = useState<string>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void suggestDefinition(phrase).then((s) => {
      if (cancelled) return
      if (s) {
        setLemma(s.word)
        setPos(s.pos)
        setDef(s.defEn.join('\n'))
        setIpa(s.ipa)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [phrase])

  const input =
    'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900'

  return (
    <form
      className="mt-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900"
      onSubmit={async (e) => {
        e.preventDefault()
        const word = makeCustomWord({
          lemma,
          pos,
          ipa,
          tr: tr
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean),
          defEn: def
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        })
        await addSentence(db, word, example, new Date())
        onSaved(word)
      }}
    >
      <p className="text-sm">
        <span className="font-semibold">“{phrase}”</span> listede yok. Kendi kelimen olarak ekle:
        {loading && <span className="ml-2 text-zinc-400">tanım aranıyor…</span>}
      </p>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          value={lemma}
          onChange={(e) => setLemma(e.target.value)}
          required
          aria-label="Kelime"
          className={input}
        />
        <select
          value={pos}
          onChange={(e) => setPos(e.target.value as Pos)}
          aria-label="Tür"
          className={input}
        >
          {(Object.keys(POS_LABELS) as Pos[]).map((p) => (
            <option key={p} value={p}>
              {POS_LABELS[p]}
            </option>
          ))}
        </select>
      </div>
      <input
        value={tr}
        onChange={(e) => setTr(e.target.value)}
        placeholder="Türkçe karşılıklar (virgülle)"
        aria-label="Türkçe karşılıklar"
        className={input}
      />
      <textarea
        value={def}
        onChange={(e) => setDef(e.target.value)}
        rows={2}
        placeholder="İngilizce tanım (isteğe bağlı)"
        aria-label="İngilizce tanım"
        className={input}
      />
      <button
        type="submit"
        className="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Kelimeyi ekle ve çalışmaya al
      </button>
      <p className="text-[11px] text-zinc-400">
        Tanım önerisi:{' '}
        <a
          href="https://www.datamuse.com/api/"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Datamuse
        </a>{' '}
        (yalnızca seçtiğin kelime gönderilir)
      </p>
    </form>
  )
}

function SavedMessage({ word }: { word: Word }) {
  return (
    <p
      className="mt-4 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300"
      role="status"
    >
      “{word.lemma}” kendi kelimelerine eklendi ve çalışma sırasına alındı.{' '}
      <Link to={'/kelime/' + word.id} className="underline underline-offset-4">
        Kelimeye git
      </Link>
    </p>
  )
}
