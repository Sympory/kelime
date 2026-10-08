import { lazy, Suspense, type ComponentType, type SVGProps } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { BooksIcon, ChartIcon, GearIcon, HomeIcon, LogoMark, PlusIcon } from './components/icons'
import { Loading } from './components/Loading'
import { useSettings } from './db/hooks'
import Home from './features/home/Home'
// İlk ziyarette doğrudan açılır: ayrı parça olarak beklenmesin (LCP)
import Onboarding from './features/onboarding/Onboarding'
import { useApplyTheme } from './lib/theme'

// Ana sayfa dışındaki ekranlar ayrı parçalarda: ilk açılış hızlı olsun
const AddFromText = lazy(() => import('./features/add/AddFromText'))
const Browse = lazy(() => import('./features/browse/Browse'))
const Placement = lazy(() => import('./features/placement/Placement'))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'))
const StatsPage = lazy(() => import('./features/stats/StatsPage'))
const Sources = lazy(() => import('./features/sources/Sources'))
const Study = lazy(() => import('./features/study/Study'))
const WordPage = lazy(() => import('./features/word/WordPage'))

type NavItem = { to: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }
const NAV: NavItem[] = [
  { to: '/', label: 'Bugün', Icon: HomeIcon },
  { to: '/kelimeler', label: 'Kelimeler', Icon: BooksIcon },
  { to: '/ekle', label: 'Ekle', Icon: PlusIcon },
  { to: '/istatistik', label: 'İstatistik', Icon: ChartIcon },
  { to: '/ayarlar', label: 'Ayarlar', Icon: GearIcon },
]

/** Odak ekranları: alt gezinme çubuğu gizlenir (kendi alt düğmeleri var). */
const FOCUS_ROUTES = ['/calis', '/eleme', '/baslangic']

export default function App() {
  const settings = useSettings()
  useApplyTheme(settings?.theme)

  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  )
}

function Shell() {
  const { pathname } = useLocation()
  const focus = FOCUS_ROUTES.includes(pathname)

  return (
    <>
      <div className="app-backdrop" aria-hidden />
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4">
        <header className="flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2" aria-label="Kelime — ana sayfa">
            <LogoMark className="size-8" />
            <span className="font-display text-2xl font-bold tracking-tight">Kelime</span>
          </Link>
          {/* Masaüstü: üst menü. Telefonda alt çubuk kullanılır. */}
          <nav className="surface hidden items-center gap-1 rounded-full p-1 text-sm sm:flex">
            {NAV.slice(1).map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className={`flex-1 ${focus ? '' : 'pb-24 sm:pb-0'}`}>
          <Suspense fallback={<Loading />}>
            {/* Sayfa değişince içerik kısa bir yükselme animasyonuyla gelir */}
            <div key={pathname} className="animate-page-in">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/baslangic" element={<Onboarding />} />
                <Route path="/eleme" element={<Placement />} />
                <Route path="/calis" element={<Study />} />
                <Route path="/kelimeler" element={<Browse />} />
                <Route path="/kelime/:id" element={<WordPage />} />
                <Route path="/ekle" element={<AddFromText />} />
                <Route path="/istatistik" element={<StatsPage />} />
                <Route path="/ayarlar" element={<SettingsPage />} />
                <Route path="/kaynaklar" element={<Sources />} />
                <Route path="*" element={<Home />} />
              </Routes>
            </div>
          </Suspense>
        </main>

        <footer
          className={`justify-center gap-4 py-6 text-xs text-zinc-500 ${focus ? 'hidden' : 'hidden sm:flex'}`}
        >
          <Link to="/kaynaklar" className="hover:underline">
            Kaynaklar ve lisanslar
          </Link>
          <a
            href="https://github.com/Sympory/kelime"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            GitHub
          </a>
        </footer>
      </div>

      {!focus && <BottomNav />}
    </>
  )
}

/** Telefon: başparmak erişiminde alt sekme çubuğu; ortada öne çıkan "Ekle". */
function BottomNav() {
  return (
    <nav
      className="surface fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 grid grid-cols-5 items-end rounded-3xl px-1 py-1.5 sm:hidden"
      aria-label="Ana gezinme"
    >
      {NAV.map(({ to, label, Icon }) =>
        to === '/ekle' ? (
          <NavLink key={to} to={to} aria-label={label} className="flex justify-center">
            {({ isActive }) => (
              <span
                className={`-mt-6 flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-amber-300 to-orange-500 text-zinc-950 shadow-lg shadow-amber-500/40 transition-transform active:scale-95 ${
                  isActive ? 'ring-4 ring-amber-400/30' : ''
                }`}
              >
                <Icon className="size-7" />
              </span>
            )}
          </NavLink>
        ) : (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'text-zinc-900 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`size-6 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {label}
              </>
            )}
          </NavLink>
        ),
      )}
    </nav>
  )
}
