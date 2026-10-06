import { LEARN_AHEAD_MS, type QueueItem } from './queue'
import type { Grade } from './scheduler'

/**
 * Bir çalışma oturumunun durumu (saf veri; React dışında test edilebilir).
 * Değerlendirilen kart kısa süre içinde tekrar vadesine giriyorsa (ör. "Tekrar" → 1 dk)
 * oturum içi öğrenme listesine alınır ve vakti gelince yeniden gösterilir.
 */
export type Session = {
  queue: QueueItem[]
  learning: QueueItem[]
  answered: { wordId: string; grade: Grade; kind: QueueItem['kind'] }[]
}

export function startSession(queue: QueueItem[]): Session {
  return { queue, learning: [], answered: [] }
}

/** Sıradaki kart: vakti gelmiş öğrenme adımı > ana kuyruk > (başka bir şey yoksa) en yakın öğrenme adımı. */
export function nextItem(s: Session, now: Date): QueueItem | undefined {
  const dueLearning = s.learning.find((l) => l.due <= now)
  return dueLearning ?? s.queue[0] ?? s.learning[0]
}

export function answer(
  s: Session,
  item: QueueItem,
  grade: Grade,
  nextDue: Date,
  now: Date,
): Session {
  const queue = s.queue.filter((q) => q.wordId !== item.wordId)
  const learning = s.learning.filter((l) => l.wordId !== item.wordId)
  if (nextDue.getTime() <= now.getTime() + LEARN_AHEAD_MS) {
    learning.push({ wordId: item.wordId, kind: 'learning', due: nextDue })
    learning.sort((a, b) => a.due.getTime() - b.due.getTime())
  }
  return {
    queue,
    learning,
    answered: [...s.answered, { wordId: item.wordId, grade, kind: item.kind }],
  }
}

/** Ekrandaki sayaçlar: yeni / öğreniliyor / tekrar */
export function counts(s: Session): Record<QueueItem['kind'], number> {
  const c = { new: 0, learning: s.learning.length, review: 0 }
  for (const q of s.queue) c[q.kind]++
  return c
}

export function isFinished(s: Session): boolean {
  return s.queue.length === 0 && s.learning.length === 0
}
