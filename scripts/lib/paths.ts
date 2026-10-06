import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const RAW_DIR = join(ROOT, 'data', 'raw')
export const CACHE_DIR = join(ROOT, 'scripts', '.cache')
export const OVERRIDES_DIR = join(ROOT, 'data', 'overrides')
export const OUT_DIR = join(ROOT, 'public', 'data')

for (const dir of [RAW_DIR, CACHE_DIR, OUT_DIR]) mkdirSync(dir, { recursive: true })
