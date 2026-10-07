import { describe, expect, it } from 'vitest'
import type { Word } from '../../types/word'
import { bestMatch, parseWordList } from './wordList'

describe('parseWordList', () => {
  it('İngilizce başlıklı virgüllü CSV (Oxford listesi biçimi)', () => {
    expect(parseWordList('word,pos,level\nabandon,v.,B2\nability,n.,A2\n')).toEqual([
      { lemma: 'abandon', pos: 'verb', cefr: 'B2', tr: [] },
      { lemma: 'ability', pos: 'noun', cefr: 'A2', tr: [] },
    ])
  })

  it('Türkçe Excel: noktalı virgül, BOM, Türkçe başlıklar', () => {
    expect(parseWordList('\uFEFFKelime;Türkçe;Seviye\nreluctant;isteksiz, gönülsüz;b2\n')).toEqual([
      { lemma: 'reluctant', cefr: 'B2', tr: ['isteksiz', 'gönülsüz'] },
    ])
  })

  it('tanınmayan başlıkta ilk sütunu kelime sayar, geçersiz seviye/türü atar', () => {
    expect(parseWordList('vocab\tx\ncloak\tfoo\n')).toEqual([{ lemma: 'cloak', tr: [] }])
  })
})

describe('bestMatch', () => {
  const w = (id: string, lemma: string, pos: Word['pos'], cefr: Word['cefr']): Word => ({
    id,
    lemma,
    pos,
    cefr,
    defEn: [],
    tr: [],
    examples: [],
    collocations: [],
    synonyms: [],
    family: [],
  })
  const saw = [
    w('saw-n', 'saw', 'noun', 'A1'),
    w('saw-v', 'saw', 'verb', 'B2'),
    w('see-v', 'see', 'verb', 'A1'),
  ]

  it('aynı yazılışı farklı kelimelere tercih eder, türe göre seçer', () => {
    expect(bestMatch({ lemma: 'saw', pos: 'verb', tr: [] }, saw)?.id).toBe('saw-v')
    expect(bestMatch({ lemma: 'saw', tr: [] }, saw)?.id).toBe('saw-n')
    expect(bestMatch({ lemma: 'saw', tr: [] }, [])).toBeUndefined()
  })
})
