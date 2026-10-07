import { useSettings } from '../db/hooks'
import { speak, speechSupported } from '../lib/speech'

/** Hoparlör düğmesi: metni ayarlardaki aksanla seslendirir. Tarayıcı desteklemiyorsa görünmez. */
export function SpeakButton({
  text,
  label = 'Seslendir',
  className = '',
}: {
  text: string
  label?: string
  className?: string
}) {
  const settings = useSettings()
  if (!speechSupported) return null
  return (
    <button
      type="button"
      aria-label={`${label}: ${text}`}
      title={label}
      onClick={(e) => {
        e.stopPropagation() // kartı çevirme / kaydırma hareketini tetiklemesin
        speak(text, settings?.accent)
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M11 5 6 9H3v6h3l5 4V5Z" strokeLinejoin="round" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" strokeLinecap="round" />
      </svg>
    </button>
  )
}
