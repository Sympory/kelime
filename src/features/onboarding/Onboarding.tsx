import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CefrBadge } from '../../components/CefrBadge'
import { db } from '../../db/db'
import { saveSettings } from '../../db/repo'
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
    await saveSettings(db, { levels: levelsFrom(level), placementDone: !placement })
    navigate(placement ? '/eleme' : '/')
  }

  return (
    <section className="py-8">
      <h1 className="font-display text-4xl font-bold tracking-tight">Seviyeni seç</h1>
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
            className={`flex items-center gap-4 rounded-2xl border px-4 py-3 text-left transition-colors ${
              level === l
                ? 'border-zinc-900 bg-zinc-900/5 dark:border-zinc-100 dark:bg-zinc-100/10'
                : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600'
            }`}
          >
            <CefrBadge level={l} className="w-10 text-center" />
            <span className="text-sm">{DESCRIPTIONS[l]}</span>
          </button>
        ))}
      </div>

      {level && (
        <div className="mt-8 rounded-2xl bg-zinc-100 p-5 dark:bg-zinc-900">
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
            <button
              onClick={() => start(true)}
              className="rounded-xl bg-zinc-900 px-5 py-3 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Hızlı elemeye başla
            </button>
            <button
              onClick={() => start(false)}
              className="rounded-xl px-5 py-3 font-semibold text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Elemeden çalışmaya geç
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
