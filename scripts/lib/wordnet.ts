import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import type { Pos } from '../../src/types/word.ts'

const { path: DICT } = createRequire(import.meta.url)('wordnet-db') as { path: string }

type WnPos = 'noun' | 'verb' | 'adj' | 'adv'
const FILE_POS: WnPos[] = ['noun', 'verb', 'adj', 'adv']
const POS_CHAR: Record<string, WnPos> = { n: 'noun', v: 'verb', a: 'adj', s: 'adj', r: 'adv' }

type Synset = {
  words: string[]
  /** "+" (türetme) ve "\" (zarf → sıfat) işaretçileri: kaynak kelime sırası (0 = tümü) → hedef */
  derivations: { src: number; pos: WnPos; offset: number; tgt: number }[]
}

const clean = (w: string) => w.replace(/\(\w+\)$/, '').replaceAll('_', ' ')

export class WordNet {
  private index = new Map<string, number[]>() // "pos:lemma" → synset offsetleri (sıklık sırasıyla)
  private data = new Map<string, Synset>() // "pos:offset" → synset

  constructor() {
    for (const pos of FILE_POS) {
      for (const line of readFileSync(join(DICT, `index.${pos}`), 'utf8').split('\n')) {
        if (!line || line.startsWith(' ')) continue
        const parts = line.trim().split(' ')
        const synsetCnt = Number(parts[2])
        const ptrCnt = Number(parts[3])
        const offsets = parts.slice(6 + ptrCnt, 6 + ptrCnt + synsetCnt).map(Number)
        this.index.set(`${pos}:${parts[0]}`, offsets)
      }
      for (const line of readFileSync(join(DICT, `data.${pos}`), 'utf8').split('\n')) {
        if (!line || line.startsWith(' ')) continue
        const parts = line.split(' | ')[0].trim().split(' ')
        const offset = Number(parts[0])
        const wCnt = parseInt(parts[3], 16)
        const words: string[] = []
        for (let i = 0; i < wCnt; i++) words.push(clean(parts[4 + i * 2]))
        let p = 4 + wCnt * 2
        const pCnt = Number(parts[p++])
        const derivations: Synset['derivations'] = []
        for (let i = 0; i < pCnt; i++, p += 4) {
          if (parts[p] !== '+' && parts[p] !== '\\') continue
          const st = parts[p + 3]
          derivations.push({
            offset: Number(parts[p + 1]),
            pos: POS_CHAR[parts[p + 2]],
            src: parseInt(st.slice(0, 2), 16),
            tgt: parseInt(st.slice(2), 16),
          })
        }
        this.data.set(`${pos}:${offset}`, { words, derivations })
      }
    }
  }

  private synsets(lemma: string, pos: WnPos): Synset[] {
    const key = lemma.toLowerCase().replaceAll(' ', '_')
    return (this.index.get(`${pos}:${key}`) ?? []).map((o) => this.data.get(`${pos}:${o}`)!)
  }

  /** İlk birkaç anlamın eş anlamlıları (en yaygın anlam önce). */
  synonyms(lemma: string, pos: Pos, max = 5, senses = 3): string[] {
    if (pos === 'other') return []
    const out = new Set<string>()
    for (const s of this.synsets(lemma, pos).slice(0, senses)) {
      for (const w of s.words) if (w.toLowerCase() !== lemma.toLowerCase()) out.add(w)
    }
    return [...out].slice(0, max)
  }

  /** Türetme ilişkili kelimeler (deteriorate → deterioration); tüm türlerden toplanır. */
  family(lemma: string, max = 6): string[] {
    const lower = lemma.toLowerCase()
    const out = new Set<string>()
    for (const pos of FILE_POS) {
      for (const s of this.synsets(lemma, pos)) {
        const myIndex = s.words.findIndex((w) => w.toLowerCase() === lower) + 1
        for (const d of s.derivations) {
          if (d.src !== 0 && d.src !== myIndex) continue
          const target = this.data.get(`${d.pos}:${d.offset}`)
          const w = target?.words[d.tgt - 1]
          if (w && w.toLowerCase() !== lower && !w.includes(' ')) out.add(w)
        }
      }
    }
    return [...out].slice(0, max)
  }
}
