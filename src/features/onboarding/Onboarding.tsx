import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CefrBadge } from '../../components/CefrBadge'
import { db } from '../../db/db'
import { saveSettings } from '../../db/settings'
import { requestPersistence } from '../../lib/storage'
import { levelsFrom, LEVELS } from '../../data/words'
import type { Cefr } from '../../types/word'

const DESCRIPTIONS: Record<Cefr, string> = {
  A1: 'Yeni başlıyorum',
  A2: 'Temel ifadeleri anlıyorum',
  B1: 'Günlük konuşmaları takip edebiliyorum',
  B2: 'Dizi, haber ve makaleleri büyük ölçüde anlıyorum',
  C1: 'Akıcıyım, ince anlamları geliştirmek istiyorum',
  C2: 'İleri düzeyim, nadir kelimelere çalışacağım',
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [level, setLevel] = useState<Cefr>()

  async function start(placement: boolean) {
    if (!level) return
    // Kullanıcı dokunuşuyla birlikte: tarayıcıdan ilerlemeyi silmemesini iste (sonucu beklenmez)
    void requestPersistence()
    await saveSettings(db, { levels: levelsFrom(level), placementDone: !placement })
    navigate(placement ? '/eleme' : '/')
  }

  return (
    <section className="py-8">
      <p className="eyebrow">Hoş geldin</p>
      <h1 className="font-display mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
        Seviyeni seç
      </h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        Seçtiğin seviyeden C1’e kadar olan kelimeler çalışma havuzuna girer. Daha alt seviyeleri
        baştan çalışmak zorunda kalmazsın.
      </p>

      <div className="mt-8 grid gap-2">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            aria-pressed={level === l}
            className={`surface flex items-center gap-4 rounded-2xl px-4 py-3.5 text-left transition-[transform,box-shadow] duration-150 active:scale-[0.98] ${
              level === l
                ? 'ring-2 ring-amber-400 dark:ring-amber-400'
                : 'hover:ring-zinc-900/15 dark:hover:ring-white/20'
            }`}
          >
            <CefrBadge level={l} className="w-10 text-center" />
            <span className="text-sm">{DESCRIPTIONS[l]}</span>
            {level === l && <span className="animate-pop ml-auto text-amber-500">✓</span>}
          </button>
        ))}
      </div>

      {level && (
        <div className="surface animate-page-in mt-8 p-5">
          <p className="font-medium">
            Çalışılacak seviyeler:{' '}
            {levelsFrom(level).map((l) => (
              <CefrBadge key={l} level={l} className="ml-1" />
            ))}
          </p>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Hızlı eleme ile zaten bildiğin kelimeleri kaydırarak ayıklayabilirsin; böylece yalnızca
            bilmediklerin çalışılır. İstediğin zaman bırakabilirsin.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button onClick={() => start(true)} className="btn-brand">
              Hızlı elemeye başla
            </button>
            <button onClick={() => start(false)} className="btn-ghost px-5 py-3">
              Elemeden çalışmaya geç
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
