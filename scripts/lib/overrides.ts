import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Example } from '../../src/types/word.ts'
import { OVERRIDES_DIR } from './paths.ts'

function read<T>(file: string): Map<string, T> {
  const path = join(OVERRIDES_DIR, file)
  if (!existsSync(path)) return new Map()
  const obj = JSON.parse(readFileSync(path, 'utf8')) as Record<string, T>
  return new Map(Object.entries(obj).filter(([k]) => !k.startsWith('$')))
}

export function loadOverrides() {
  return {
    tr: read<string[]>('tr.json'),
    examples: read<Omit<Example, 'source'>[]>('examples.json'),
  }
}
