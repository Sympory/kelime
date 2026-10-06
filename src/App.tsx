import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import { Loading } from './components/Loading'
import Home from './features/home/Home'

// Animasyon kütüphanesini kullanan ekranlar ayrı parçalarda: ana sayfa hızlı açılsın
const Onboarding = lazy(() => import('./features/onboarding/Onboarding'))
const Placement = lazy(() => import('./features/placement/Placement'))
const Sources = lazy(() => import('./features/sources/Sources'))
const Study = lazy(() => import('./features/study/Study'))

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'text-zinc-900 dark:text-zinc-100' : 'hover:text-zinc-900 dark:hover:text-zinc-100'

export default function App() {
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
            <NavLink to="/kaynaklar" className={navClass}>
              Kaynaklar
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
              <Route path="/kaynaklar" element={<Sources />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  )
}
