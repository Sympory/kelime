import type { SVGProps } from 'react'

/** Uygulama ikonları: 24×24, 1.8 çizgi, `currentColor` (Lucide tarzı, satır içi SVG). */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  )
}

export const HomeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20h14V9.5" />
    <path d="M10 20v-5h4v5" />
  </Icon>
)

export const BooksIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="3" y="4" width="5" height="16" rx="1.2" />
    <rect x="10" y="4" width="5" height="16" rx="1.2" />
    <path d="m17 5.5 3.5 13.5" />
    <path d="m15.6 6 3.4-.9" />
  </Icon>
)

export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const ChartIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 20h16" />
    <rect x="5" y="11" width="3" height="6" rx="1" />
    <rect x="10.5" y="6" width="3" height="11" rx="1" />
    <rect x="16" y="13" width="3" height="4" rx="1" />
  </Icon>
)

export const GearIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </Icon>
)

export const FlameIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 3c.5 3 3.5 4.5 3.5 8.5a3.5 3.5 0 0 1-7 0c0-1.6.7-2.6 1.5-3.5.2 1.3.9 2 1.7 2C11.5 8 11 5.5 12 3Z" />
    <path d="M7 14.5A5 5 0 0 0 17 15c0-1-.2-1.9-.6-2.7" />
  </Icon>
)

export const ArrowLeftIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </Icon>
)

export const SparkIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
  </Icon>
)

/** Logo işareti (public/logo.svg'nin sade hâli; başlıkta kullanılır) */
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect
        x="10"
        y="5"
        width="15"
        height="20"
        rx="3"
        fill="#a855f7"
        transform="rotate(12 17.5 15)"
      />
      <rect
        x="7"
        y="7"
        width="15"
        height="20"
        rx="3"
        fill="#f59e0b"
        transform="rotate(-6 14.5 17)"
      />
      <g transform="rotate(-6 14.5 17)" fill="#18181b">
        <rect x="9.5" y="12" width="8" height="2" rx="1" />
        <rect x="9.5" y="16" width="10" height="1.2" rx=".6" opacity=".55" />
        <rect x="9.5" y="22" width="5" height="2" rx="1" fill="#22c55e" />
      </g>
    </svg>
  )
}

export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)
