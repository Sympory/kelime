/**
 * CI'da çalışır: public/data ve data/overrides dosyalarının geçerli olduğunu doğrular.
 * Ham veri veya ağ gerektirmez.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DataIndex, Word } from '../src/types/word.ts'
import { OUT_DIR, OVERRIDES_DIR } from './lib/paths.ts'

const errors: string[] = []
const fail = (msg: string) => errors.push(msg)

function readJson<T>(path: string): T | undefined {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch (err) {
    fail(`${path}: geçersiz JSON — ${(err as Error).message}`)
    return undefined
  }
}

const isStrArray = (x: unknown): x is string[] =>
  Array.isArray(x) && x.every((s) => typeof s === 'string' && s.trim() !== '')

// public/data
const ids = new Set<string>()
const index = readJson<DataIndex>(join(OUT_DIR, 'index.json'))
for (const level of index?.levels ?? []) {
  const words = readJson<Word[]>(join(OUT_DIR, level.file)) ?? []
  if (words.length !== level.count)
    fail(`${level.file}: index.json ${level.count} diyor, dosyada ${words.length}`)
  for (const w of words) {
    if (ids.has(w.id)) fail(`${level.file}: tekrarlanan kimlik ${w.id}`)
    ids.add(w.id)
    if (w.cefr !== level.cefr) fail(`${level.file}: ${w.id} seviyesi ${w.cefr}`)
    for (const ex of w.examples) {
      if (ex.hl && ex.en.slice(...ex.hl).trim() === '') fail(`${w.id}: geçersiz vurgu aralığı`)
    }
  }
}

// data/overrides
function checkTrFile(file: string): Record<string, unknown> {
  const data = readJson<Record<string, unknown>>(join(OVERRIDES_DIR, file)) ?? {}
  for (const [id, value] of Object.entries(data)) {
    if (id.startsWith('$')) continue
    if (!ids.has(id)) fail(`overrides/${file}: bilinmeyen kelime kimliği "${id}"`)
    if (!isStrArray(value) || value.length === 0 || value.length > 4)
      fail(`overrides/${file}: "${id}" 1–4 elemanlı bir metin listesi olmalı`)
  }
  return data
}
const tr = checkTrFile('tr.json')
checkTrFile('tr-auto.json')

const examples = readJson<Record<string, unknown>>(join(OVERRIDES_DIR, 'examples.json')) ?? {}
for (const [id, value] of Object.entries(examples)) {
  if (id.startsWith('$')) continue
  if (!ids.has(id)) fail(`overrides/examples.json: bilinmeyen kelime kimliği "${id}"`)
  const ok =
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 3 &&
    value.every(
      (e) =>
        typeof e === 'object' &&
        e !== null &&
        typeof e.en === 'string' &&
        e.en.trim() !== '' &&
        (e.tr === undefined || typeof e.tr === 'string'),
    )
  if (!ok) fail(`overrides/examples.json: "${id}" 1–3 elemanlı { "en", "tr"? } listesi olmalı`)
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'))
  process.exit(1)
}
const count = (o: object) => Object.keys(o).filter((k) => !k.startsWith('$')).length
console.log(
  `✓ Veri geçerli: ${ids.size} kelime, ${count(tr)} tr / ${count(examples)} örnek düzeltmesi`,
)
