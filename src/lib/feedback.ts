/*
 * Puan verince kısa ses ve titreşim: doğru cevap yükselen iki nota, "Tekrar" alçak tek nota.
 * Ses dosyası indirilmez; Web Audio ile birkaç yüz milisaniyelik ton üretilir.
 * Titreşim yalnızca destekleyen cihazlarda (çoğu Android) çalışır; iOS Safari yok sayar.
 */

let ctx: AudioContext | undefined

function audio(): AudioContext | undefined {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return undefined
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(ac: AudioContext, freq: number, start: number, length: number, volume: number) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  const t = ac.currentTime + start
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(volume, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + length + 0.02)
}

export type FeedbackKind = 'correct' | 'again' | 'combo'

export function playFeedback(kind: FeedbackKind): void {
  try {
    navigator.vibrate?.(kind === 'again' ? [30, 40, 30] : 12)
    const ac = audio()
    if (!ac) return
    if (kind === 'again') tone(ac, 220, 0, 0.18, 0.08)
    else if (kind === 'correct') {
      tone(ac, 660, 0, 0.12, 0.06)
      tone(ac, 880, 0.07, 0.16, 0.06)
    } else {
      tone(ac, 660, 0, 0.1, 0.06)
      tone(ac, 880, 0.07, 0.1, 0.06)
      tone(ac, 1175, 0.14, 0.22, 0.07)
    }
  } catch {
    // Ses/titreşim isteğe bağlı; hata çalışmayı bozmamalı
  }
}
