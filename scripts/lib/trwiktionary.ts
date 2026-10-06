import { readFileSync } from 'node:fs'
import type { Pos } from '../../src/types/word.ts'
import { ensureDownloaded } from './download.ts'
import type { BaseWord } from './wordlist.ts'

const POS_MAP: Record<string, Pos> = { noun: 'noun', verb: 'verb', adj: 'adj', adv: 'adv' }

/** Bir tanım satırını kısa Türkçe karşılıklara böler; açıklama cümlelerini atar. */
function split(gloss: string): string[] {
  // Parantez içindeki virgülleri bölme: "(borca, vasıtaya v.s.) binmek" tek parça kalmalı
  const parts: string[] = []
  let depth = 0
  let cur = ''
  for (const c of gloss) {
    if (c === '(') depth++
    if (c === ')') depth = Math.max(0, depth - 1)
    if (depth === 0 && (c === ';' || c === ',')) {
      parts.push(cur)
      cur = ''
    } else cur += c
  }
  parts.push(cur)
  return parts
    .map((s) => s.trim().replace(/\.$/, '').trim())
    .filter((s) => s.length > 0 && s.length <= 30 && s.split(' ').length <= 4)
}

/**
 * Türkçe Vikisözlük'teki İngilizce maddeler: tanımlar zaten Türkçe karşılıktır
 * ("reluctant" → "isteksiz; gönülsüz"). İngilizce Vikisözlük çevirilerini tamamlamak için kullanılır.
 */
export class TrWiktionary {
  private byKey = new Map<string, string[]>() // "lemma:pos" → karşılıklar

  static async load(): Promise<TrWiktionary> {
    const tw = new TrWiktionary()
    const file = await ensureDownloaded('trWiktionary')
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (!line) continue
      const o = JSON.parse(line) as {
        word: string
        pos: string
        senses?: { glosses?: string[] }[]
      }
      // Yalnızca içerik kelimeleri: işlev kelimelerinin tanımları açıklama cümlesidir
      const pos = POS_MAP[o.pos]
      if (!pos) continue
      const key = `${o.word}:${pos}`
      const glosses = (o.senses ?? []).flatMap((s) => s.glosses ?? [])
      tw.byKey.set(key, [...(tw.byKey.get(key) ?? []), ...glosses.flatMap(split)])
    }
    return tw
  }

  lookup(w: BaseWord): string[] {
    // Büyük/küçük harf duyarlı: "may" ile "May" (Mayıs) karışmasın
    return [...new Set(w.variants.flatMap((v) => this.byKey.get(`${v}:${w.pos}`) ?? []))]
  }
}
