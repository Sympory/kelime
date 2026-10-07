const TOKEN = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g

export type Token = { text: string; start: number; end: number }

/** Metni İngilizce kelimelere ayırır (konumlarıyla). */
export function tokenize(text: string): Token[] {
  return [...text.matchAll(TOKEN)].map((m) => ({
    text: m[0],
    start: m.index!,
    end: m.index! + m[0].length,
  }))
}

/**
 * [start, end) aralığını içeren cümleyi ve aralığın cümle içindeki konumunu döndürür.
 * Cümle sınırı: . ! ? ya da satır sonu.
 */
export function sentenceAround(
  text: string,
  start: number,
  end: number,
): { sentence: string; hl: [number, number] } {
  let from = start
  while (from > 0 && !/[.!?\n]/.test(text[from - 1])) from--
  let to = end
  while (to < text.length && !/[.!?\n]/.test(text[to])) to++
  if (to < text.length && text[to] !== '\n') to++ // noktalama cümleye dahil
  // Baştaki boşlukları ve tırnakları at, vurgu konumunu kaydır
  const raw = text.slice(from, to)
  const lead = raw.length - raw.trimStart().length
  const sentence = raw.trim()
  return { sentence, hl: [start - from - lead, end - from - lead] }
}

/**
 * Çekimli bir İngilizce kelimenin olası kök hâlleri (kaba kurallar; sözlükte denenmek için).
 * "deteriorated" → deteriorated, deteriorate, deteriorat · "running" → running, runn, run, runne
 */
export function lemmaCandidates(word: string): string[] {
  const w = word.toLowerCase()
  const out = [w]
  const add = (s: string) => s.length > 1 && !out.includes(s) && out.push(s)
  const undouble = (s: string) => (/([bdgklmnprt])\1$/.test(s) ? s.slice(0, -1) : s)
  if (w.endsWith('ies') || w.endsWith('ied')) add(w.slice(0, -3) + 'y')
  if (w.endsWith('ing')) {
    const stem = w.slice(0, -3)
    add(stem + 'e')
    add(undouble(stem))
    add(stem)
  }
  if (w.endsWith('ed')) {
    add(w.slice(0, -1)) // deteriorated → deteriorate
    add(undouble(w.slice(0, -2))) // stopped → stop
    add(w.slice(0, -2))
  }
  if (w.endsWith('es')) add(w.slice(0, -2))
  if (w.endsWith('s') && !w.endsWith('ss')) add(w.slice(0, -1))
  return out
}

/** Seçim genişletme: bitişik kelimeye dokunulursa aralığı büyüt, değilse yalnızca onu seç. */
export function nextSelection(
  sel: { from: number; to: number } | undefined,
  i: number,
): { from: number; to: number } | undefined {
  if (!sel) return { from: i, to: i }
  if (i === sel.to + 1) return { from: sel.from, to: i }
  if (i === sel.from - 1) return { from: i, to: sel.to }
  if (i === sel.from && i === sel.to) return undefined // aynı kelimeye tekrar dokunmak seçimi kaldırır
  return { from: i, to: i }
}
