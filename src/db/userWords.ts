import { useLiveQuery } from 'dexie-react-hooks'
import type { Example, Pos, Word } from '../types/word'
import { db, type KelimeDB } from './db'
import { placeWord } from './repo'

const POS_SUFFIX: Record<Pos, string> = { noun: 'n', verb: 'v', adj: 'adj', adv: 'adv', other: 'x' }

/** Kullanıcı kelimesi kimliği; hazır veriyle çakışmasın diye `u-` önekli. */
export function customWordId(lemma: string, pos: Pos): string {
  const slug = lemma
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `u-${slug || 'kelime'}-${POS_SUFFIX[pos]}`
}

export function makeCustomWord(
  fields: Pick<Word, 'lemma' | 'pos'> & Partial<Pick<Word, 'cefr' | 'tr' | 'defEn' | 'ipa'>>,
): Word {
  const word: Word = {
    id: customWordId(fields.lemma, fields.pos),
    lemma: fields.lemma.trim(),
    pos: fields.pos,
    custom: true,
    defEn: fields.defEn ?? [],
    tr: fields.tr ?? [],
    examples: [],
    collocations: [],
    synonyms: [],
    family: [],
  }
  if (fields.cefr) word.cefr = fields.cefr
  if (fields.ipa) word.ipa = fields.ipa
  return word
}

/**
 * Kelimeyi çalışma sırasına alır: hiç kartı yoksa ya da "biliyorum" denmişse yeni kart olarak
 * (yeni kelimelerin başına). Zaten çalışılıyorsa dokunmaz. Sıraya alındıysa true döner.
 */
export async function queueWord(db: KelimeDB, word: Pick<Word, 'id' | 'cefr'>, now: Date) {
  const card = await db.cards.get(word.id)
  if (card && card.status === 'active') return false
  await placeWord(db, word, false, now)
  return true
}

/** Makaleden ekle: cümleyi örnek olarak kaydeder ve kelimeyi çalışma sırasına alır. */
export async function addSentence(
  db: KelimeDB,
  word: Word,
  example: Pick<Example, 'en' | 'hl' | 'tr'>,
  now: Date,
): Promise<{ queued: boolean }> {
  return db.transaction('rw', db.userWords, db.userExamples, db.cards, async () => {
    if (word.custom) await db.userWords.put(word)
    const exists = await db.userExamples
      .where('wordId')
      .equals(word.id)
      .filter((e) => e.en === example.en)
      .count()
    if (!exists)
      await db.userExamples.add({ ...example, source: 'user', wordId: word.id, addedAt: now })
    return { queued: await queueWord(db, word, now) }
  })
}

export type UserData = { words: Word[]; examples: Map<string, Example[]> }

/** Kullanıcı kelimeleri ve örnekleri (en yeni örnek önce). */
export async function loadUserData(from: KelimeDB = db): Promise<UserData> {
  const [words, examples] = await Promise.all([
    from.userWords.toArray(),
    from.userExamples.toArray(),
  ])
  const byWord = new Map<string, Example[]>()
  examples.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime())
  for (const { wordId, id: _id, addedAt: _at, ...ex } of examples) {
    byWord.set(wordId, [...(byWord.get(wordId) ?? []), ex])
  }
  return { words, examples: byWord }
}

/** Kullanıcı kelimeleri ve örnekleri; değişince otomatik güncellenir. */
export function useUserData(): UserData | undefined {
  return useLiveQuery(() => loadUserData(), [])
}

/** Kullanıcının eklediği cümleler kelimenin örneklerinin başına gelir (ilk tekrarda bu cümle görünür). */
export function withUserExamples(word: Word, user: UserData | undefined): Word {
  const extra = user?.examples.get(word.id)
  if (!extra?.length) return word
  const own = new Set(extra.map((e) => e.en))
  return { ...word, examples: [...extra, ...word.examples.filter((e) => !own.has(e.en))] }
}

/** Kullanıcı kelimesini, kartını ve eklediği örnekleri siler (tekrar günlüğü istatistik için kalır). */
export async function deleteUserWord(db: KelimeDB, id: string): Promise<void> {
  await db.transaction('rw', db.userWords, db.userExamples, db.cards, async () => {
    await db.userWords.delete(id)
    await db.cards.delete(id)
    await db.userExamples.where('wordId').equals(id).delete()
  })
}
