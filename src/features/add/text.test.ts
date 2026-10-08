import { describe, expect, it } from 'vitest'
import { lemmaCandidates, nextSelection, sentenceAround, tokenize } from './text'

const text = 'Prices rose sharply. The economy, however, deteriorated rapidly! Next line\nends here'

describe('tokenize', () => {
  it('kelimeleri konumlarıyla verir, kesme işaretli kelimeleri bölmez', () => {
    expect(tokenize("It's well-known.").map((t) => t.text)).toEqual(["It's", 'well-known'])
    const t = tokenize(text).find((x) => x.text === 'deteriorated')!
    expect(text.slice(t.start, t.end)).toBe('deteriorated')
  })
})

describe('sentenceAround', () => {
  it('kelimenin cümlesini ve cümle içindeki vurgu aralığını bulur', () => {
    const start = text.indexOf('deteriorated')
    const { sentence, hl } = sentenceAround(text, start, start + 'deteriorated'.length)
    expect(sentence).toBe('The economy, however, deteriorated rapidly!')
    expect(sentence.slice(...hl)).toBe('deteriorated')
  })

  it('ilk cümle ve satır sonu sınırları', () => {
    expect(sentenceAround(text, 0, 6).sentence).toBe('Prices rose sharply.')
    const s = text.indexOf('Next')
    expect(sentenceAround(text, s, s + 4).sentence).toBe('Next line')
  })
})

describe('lemmaCandidates', () => {
  it.each([
    ['deteriorated', 'deteriorate'],
    ['stopped', 'stop'],
    ['running', 'run'],
    ['making', 'make'],
    ['studies', 'study'],
    ['boxes', 'box'],
    ['cats', 'cat'],
  ])('%s → %s adaylar arasında', (word, lemma) => {
    const c = lemmaCandidates(word)
    expect(c[0]).toBe(word)
    expect(c).toContain(lemma)
  })

  it('çekimsiz kelimede yalnızca kendisi', () => {
    expect(lemmaCandidates('Glass')).toEqual(['glass'])
  })
})

describe('nextSelection', () => {
  it('bitişik kelimelerle ifade seçilir, uzak kelime seçimi sıfırlar', () => {
    let sel = nextSelection(undefined, 3)
    sel = nextSelection(sel, 4)
    expect(sel).toEqual({ from: 3, to: 4 })
    expect(nextSelection(sel, 2)).toEqual({ from: 2, to: 4 })
    expect(nextSelection(sel, 9)).toEqual({ from: 9, to: 9 })
    expect(nextSelection({ from: 5, to: 5 }, 5)).toBeUndefined()
  })
})
