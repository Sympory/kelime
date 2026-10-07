/** Tarayıcının ücretsiz konuşma sentezi (Web Speech API). Desteklenmiyorsa sessizce hiçbir şey yapmaz. */

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

/** İstenen aksana en uygun İngilizce sesi seçer; yoksa tarayıcı `lang` ile kendisi seçer. */
function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  const exact = voices.filter((v) => v.lang.replace('_', '-') === lang)
  return exact.find((v) => v.localService) ?? exact[0]
}

export function speak(text: string, lang: 'en-US' | 'en-GB' = 'en-US', rate = 0.95): void {
  if (!speechSupported || !text) return
  const synth = window.speechSynthesis
  synth.cancel() // önceki okumayı kes
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = rate
  const voice = pickVoice(lang)
  if (voice) u.voice = voice
  synth.speak(u)
}
