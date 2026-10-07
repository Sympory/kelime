import { describe, expect, it } from 'vitest'
import type { StoredCard } from '../../srs/queue'
import { newCard, State } from '../../srs/scheduler'
import type { Word } from '../../types/word'
import { filterWords } from './filter'

const word = (id: string, lemma: string, tr: string[], pos: Word['pos'] = 'noun'): Word => ({
  id,
  lemma,
  pos,
  cefr: 'B1',
  defEn: [],
  tr,
  examples: [],
  collocations: [],
  synonyms: [],
  family: [],
})

const words = [
  word('decline-v', 'decline', ['reddetmek', 'azalmak'], 'verb'),
  word('decision-n', 'decision', ['karar']),
  word('indecisive-adj', 'indecisive', ['kararsız'], 'adj'),
  word('deck-n', 'deck', ['güverte']),
]
const ids = (ws: Word[]) => ws.map((w) => w.id)
const none = new Map<string, StoredCard>()

describe('filterWords', () => {
  it('tam > baştan > içinde > Türkçe sırasıyla getirir', () => {
    expect(ids(filterWords(words, none, { query: 'deci' }))).toEqual([
      'decision-n',
      'indecisive-adj',
    ])
    expect(ids(filterWords(words, none, { query: 'deck' }))).toEqual(['deck-n'])
  })

  it('Türkçede tam eşleşme kelime başı ve içinde geçenden önce gelir', () => {
    const more = [
      ...words,
      word('gloomy-adj', 'gloomy', ['iç karartıcı']),
      word('obscure-v', 'obscure', ['karartmak'], 'verb'),
    ]
    expect(ids(filterWords(more, none, { query: 'karar' }))).toEqual([
      'decision-n', // tam: "karar"
      'gloomy-adj', // kelime başı: "iç karartıcı" (alfabetik)
      'indecisive-adj', // kelime başı: "kararsız"
      'obscure-v', // kelime başı: "karartmak"
    ])
  })

  it('Türkçe karşılıkta arar (büyük/küçük harf ve İ/ı duyarsız)', () => {
    expect(ids(filterWords(words, none, { query: 'KARAR' }))).toEqual([
      'decision-n',
      'indecisive-adj',
    ])
    expect(ids(filterWords(words, none, { query: 'GÜVERTE' }))).toEqual(['deck-n'])
  })

  it('tür ve durum filtreleri', () => {
    const cards = new Map<string, StoredCard>([
      [
        'decline-v',
        {
          ...newCard(new Date()),
          wordId: 'decline-v',
          cefr: 'B1',
          status: 'active',
          addedAt: new Date(),
          state: State.Learning,
        },
      ],
    ])
    expect(ids(filterWords(words, cards, { query: '', pos: 'verb' }))).toEqual(['decline-v'])
    expect(ids(filterWords(words, cards, { query: '', status: 'learning' }))).toEqual(['decline-v'])
    expect(filterWords(words, cards, { query: '', status: 'new' })).toHaveLength(3)
  })
})
