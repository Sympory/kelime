import type { Cefr } from '../types/word'

const COLORS: Record<Cefr, string> = {
  A1: 'bg-cefr-a1',
  A2: 'bg-cefr-a2',
  B1: 'bg-cefr-b1',
  B2: 'bg-cefr-b2',
  C1: 'bg-cefr-c1',
  C2: 'bg-cefr-c2',
}

export function CefrBadge({ level, className = '' }: { level: Cefr; className?: string }) {
  return (
    <span
      className={`${COLORS[level]} inline-block rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide text-zinc-950 ${className}`}
    >
      {level}
    </span>
  )
}
