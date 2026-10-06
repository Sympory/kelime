import { createWriteStream, existsSync, renameSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { RAW_DIR } from './paths.ts'

const CEFRJ = 'https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master'
const TATOEBA = 'https://downloads.tatoeba.org/exports/per_language'

export const SOURCES = {
  cefrj: `${CEFRJ}/cefrj-vocabulary-profile-1.5.csv`,
  octanove: `${CEFRJ}/octanove-vocabulary-profile-c1c2-1.0.csv`,
  wiktionary: 'https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl.gz',
  tatoebaEng: `${TATOEBA}/eng/eng_sentences_detailed.tsv.bz2`,
  tatoebaTur: `${TATOEBA}/tur/tur_sentences_detailed.tsv.bz2`,
  tatoebaLinks: `${TATOEBA}/eng/eng-tur_links.tsv.bz2`,
  // Türkçe Vikisözlük'teki İngilizce maddeler (tanımlar doğrudan Türkçe)
  trWiktionary:
    'https://kaikki.org/trwiktionary/%C4%B0ngilizce/kaikki.org-dictionary-%C4%B0ngilizce.jsonl',
} as const

export type SourceKey = keyof typeof SOURCES

/** URL'den türetilen ad uygun değilse (ör. ASCII dışı karakter) kullanılacak dosya adı */
const FILE_NAMES: Partial<Record<SourceKey, string>> = {
  trWiktionary: 'trwiktionary-English.jsonl',
}

export function rawPath(key: SourceKey): string {
  return join(RAW_DIR, FILE_NAMES[key] ?? SOURCES[key].split('/').pop()!)
}

/** Dosya data/raw altında yoksa indirir. Yarım kalan indirmeler .part olarak kalır ve tekrar denenir. */
export async function ensureDownloaded(key: SourceKey): Promise<string> {
  const target = rawPath(key)
  if (existsSync(target)) return target

  const url = SOURCES[key]
  console.log(`↓ ${url}`)
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`İndirme başarısız (${res.status}): ${url}`)

  const total = Number(res.headers.get('content-length') ?? 0)
  let done = 0
  let lastLog = 0
  const body = Readable.fromWeb(res.body as import('node:stream/web').ReadableStream)
  body.on('data', (chunk: Buffer) => {
    done += chunk.length
    if (total && Date.now() - lastLog > 5000) {
      lastLog = Date.now()
      console.log(`  ${key}: %${((done / total) * 100).toFixed(1)} (${(done / 1e6).toFixed(0)} MB)`)
    }
  })

  const part = `${target}.part`
  await pipeline(body, createWriteStream(part))
  renameSync(part, target)
  console.log(`✓ ${key} (${(statSync(target).size / 1e6).toFixed(1)} MB)`)
  return target
}

export async function downloadAll(): Promise<void> {
  await Promise.all((Object.keys(SOURCES) as SourceKey[]).map(ensureDownloaded))
}
