import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import { Loading } from './components/Loading'
import { useSettings } from './db/hooks'
import Home from './features/home/Home'
import { useApplyTheme } from './lib/theme'

// Ana sayfa dışındaki ekranlar ayrı parçalarda: ilk açılış hızlı olsun
const AddFromText = lazy(() => import('./features/add/AddFromText'))
const Browse = lazy(() => import('./features/browse/Browse'))
const Onboarding = lazy(() => import('./features/onboarding/Onboarding'))
const Placement = lazy(() => import('./features/placement/Placement'))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'))
const StatsPage = lazy(() => import('./features/stats/StatsPage'))
const Sources = lazy(() => import('./features/sources/Sources'))
const Study = lazy(() => import('./features/study/Study'))
const WordPage = lazy(() => import('./features/word/WordPage'))

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'text-zinc-900 dark:text-zinc-100' : 'hover:text-zinc-900 dark:hover:text-zinc-100'

export default function App() {
  const settings = useSettings()
  useApplyTheme(settings?.theme)

  return (
    <BrowserRouter>
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4">
        <header className="flex items-center justify-between py-5">
          <Link to="/" className="font-display text-2xl font-bold tracking-tight">
            Kelime
          </Link>
          <nav className="flex gap-4 text-sm text-zinc-500 dark:text-zinc-400">
            <NavLink to="/calis" className={navClass}>
              Çalış
            </NavLink>
            <NavLink to="/kelimeler" className={navClass}>
              Kelimeler
            </NavLink>
            <NavLink to="/ayarlar" className={navClass}>
              Ayarlar
            </NavLink>
          </nav>
        </header>
        <main className="flex-1">
          <Suspense fallback={<Loading />}>
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
          </Suspense>
        </main>
        <footer className="flex justify-center gap-4 py-6 text-xs text-zinc-400">
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
    </BrowserRouter>
  )
}
