import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Cefr, Word } from '../../src/types/word.ts'
import { ROOT } from './paths.ts'

const FIELDS = {
  tr: (w: Word) => w.tr.length > 0 && !w.trAuto,
  trAny: (w: Word) => w.tr.length > 0,
  defEn: (w: Word) => w.defEn.length > 0,
  ipa: (w: Word) => Boolean(w.ipa),
  examples: (w: Word) => w.examples.length > 0,
  examplesTr: (w: Word) => w.examples.some((e) => e.tr),
  collocations: (w: Word) => w.collocations.length > 0,
  synonyms: (w: Word) => w.synonyms.length > 0,
  family: (w: Word) => w.family.length > 0,
} as const

const LABELS: Record<keyof typeof FIELDS, string> = {
  tr: 'Türkçe (kaynaklı)',
  trAny: 'Türkçe (otomatik dahil)',
  defEn: 'Tanım',
  ipa: 'IPA',
  examples: 'Örnek',
  examplesTr: 'Çevirili örnek',
  collocations: 'Collocation',
  synonyms: 'Eş anlamlı',
  family: 'Kelime ailesi',
}

const pct = (n: number, total: number) => (total ? `${Math.round((n / total) * 100)}%` : '-')

export function report(byLevel: Map<Cefr, Word[]>): void {
  const all = [...byLevel.values()].flat()
  const keys = Object.keys(FIELDS) as (keyof typeof FIELDS)[]

  const groups: [string, Word[]][] = [...byLevel, ['Toplam', all]]
  const rows = groups.map(([level, words]) => ({
    Seviye: level,
    Kelime: words.length,
    ...Object.fromEntries(
      keys.map((k) => [LABELS[k], pct(words.filter(FIELDS[k]).length, words.length)]),
    ),
  }))
  console.log('\nKapsama (alanı dolu kelime oranı):')
  console.table(rows)

  const header = ['Seviye', 'Kelime', ...keys.map((k) => LABELS[k])]
  const listByLevel = (pick: (w: Word) => boolean) =>
    [...byLevel].flatMap(([level, words]) => {
      const picked = words.filter(pick)
      if (picked.length === 0) return []
      return [
        `<details><summary><strong>${level}</strong> — ${picked.length} kelime</summary>`,
        '',
        picked.map((w) => `\`${w.id}\``).join(' · '),
        '',
        '</details>',
        '',
      ]
    })
  const missingTr = listByLevel((w) => !FIELDS.trAny(w))
  const autoTr = listByLevel((w) => Boolean(w.trAuto))

  const md = [
    '# Veri raporu',
    '',
    '`npm run build:data` tarafından üretilir — elle düzenlemeyin.',
    '',
    '## Kapsama',
    '',
    'Her sütun, o alanı dolu olan kelimelerin oranıdır.',
    '',
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${Object.values(r).join(' | ')} |`),
    '',
    '## Türkçe karşılığı eksik kelimeler',
    '',
    missingTr.length
      ? 'Katkı vermek için [`data/overrides/tr.json`](overrides/tr.json) dosyasına ekleyin (bkz. [README](overrides/README.md)).'
      : 'Yok — her kelimenin bir Türkçe karşılığı var.',
    '',
    ...missingTr,
    '## Gözden geçirilmeyi bekleyen otomatik çeviriler',
    '',
    'Bu kelimelerin Türkçesi Vikisözlük’te bulunmadığı için yapay zekâ ile üretildi ([`tr-auto.json`](overrides/tr-auto.json)); uygulamada “otomatik” etiketiyle görünür. Yanlış ya da eksik bulduğunuzu [`tr.json`](overrides/tr.json) ile düzeltin — düzeltme otomatik çevirinin yerine geçer ve etiket kalkar.',
    '',
    ...autoTr,
  ].join('\n')
  writeFileSync(join(ROOT, 'data', 'report.md'), md)
  console.log('Rapor: data/report.md')
}
