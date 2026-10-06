const levels = [
  { name: 'A1', color: 'bg-cefr-a1' },
  { name: 'A2', color: 'bg-cefr-a2' },
  { name: 'B1', color: 'bg-cefr-b1' },
  { name: 'B2', color: 'bg-cefr-b2' },
  { name: 'C1', color: 'bg-cefr-c1' },
]

export default function Home() {
  return (
    <section className="py-16">
      <h1 className="font-display text-5xl font-bold tracking-tight">Merhaba 👋</h1>
      <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
        Açık kaynak, ücretsiz İngilizce kelime kartları. Günde 15 dakika, B1’den C1’e.
      </p>
      <div className="mt-8 flex gap-2">
        {levels.map((l) => (
          <span
            key={l.name}
            className={`${l.color} rounded-full px-3 py-1 text-sm font-semibold text-zinc-950`}
          >
            {l.name}
          </span>
        ))}
      </div>
      <p className="mt-10 text-sm text-zinc-500">Yapım aşamasında — Faz 0.</p>
    </section>
  )
}
