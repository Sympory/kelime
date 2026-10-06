import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import Home from './features/home/Home'
import Sources from './features/sources/Sources'

export default function App() {
  return (
    <BrowserRouter>
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4">
        <header className="flex items-center justify-between py-5">
          <Link to="/" className="font-display text-2xl font-bold tracking-tight">
            Kelime
          </Link>
          <nav className="text-sm text-zinc-500 dark:text-zinc-400">
            <Link to="/kaynaklar" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Kaynaklar
            </Link>
          </nav>
        </header>
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/kaynaklar" element={<Sources />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
