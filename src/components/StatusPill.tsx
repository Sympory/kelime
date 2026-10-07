import { STATUS_LABELS, type WordStatus } from '../srs/stats'

const STYLES: Record<WordStatus, string> = {
  new: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  learning: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  learned: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  known: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300',
}

export function StatusPill({ status }: { status: WordStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
