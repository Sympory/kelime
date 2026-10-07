import { useEffect } from 'react'
import type { Settings } from '../db/db'

/**
 * Tema `<html class="dark">` ile uygulanır. Seçim ayrıca localStorage'da tutulur ki
 * index.html'deki küçük betik sayfa çizilmeden önce doğru temayı kursun (beyaz parlama olmasın).
 */
export const THEME_KEY = 'kelime-theme'

function apply(theme: Settings['theme']) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

export function useApplyTheme(theme: Settings['theme'] | undefined) {
  useEffect(() => {
    if (!theme) return
    apply(theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // gizli pencere vb.: yalnızca parlama önleme etkilenir
    }
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])
}
