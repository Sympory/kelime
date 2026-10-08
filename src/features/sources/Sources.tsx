const REPO = 'https://github.com/Sympory/kelime'

const sources = [
  {
    name: 'CEFR-J Wordlist 1.5',
    href: 'https://github.com/openlanguageprofiles/olp-en-cefrj',
    use: 'A1–B2 kelime listesi ve seviyeleri',
    license: 'Atıf şartıyla serbest',
    credit: 'Yukio Tono, Tokyo University of Foreign Studies',
  },
  {
    name: 'Octanove Vocabulary Profile C1/C2',
    href: 'https://github.com/openlanguageprofiles/olp-en-cefrj',
    use: 'C1–C2 kelime listesi ve seviyeleri',
    license: 'CC BY-SA 4.0',
    credit: 'Octanove Labs',
  },
  {
    name: 'Wiktionary',
    href: 'https://kaikki.org/dictionary/English/',
    use: 'Tanımlar, IPA, Türkçe karşılıklar',
    license: 'CC BY-SA 4.0',
    credit: 'Vikisözlük katkıcıları, Wiktextract / kaikki.org',
  },
  {
    name: 'Vikisözlük (Türkçe)',
    href: 'https://kaikki.org/trwiktionary/',
    use: 'Ek Türkçe karşılıklar',
    license: 'CC BY-SA 4.0',
    credit: 'Türkçe Vikisözlük katkıcıları, Wiktextract / kaikki.org',
  },
  {
    name: 'Tatoeba',
    href: 'https://tatoeba.org/',
    use: 'Örnek cümleler ve Türkçe çevirileri',
    license: 'CC BY 2.0 FR',
    credit: 'Her cümlenin yazarı cümlenin yanında gösterilir',
  },
  {
    name: 'WordNet 3.1',
    href: 'https://wordnet.princeton.edu/',
    use: 'Eş anlamlılar, kelime ailesi',
    license: 'WordNet lisansı',
    credit: 'WordNet 3.0 Copyright 2006 by Princeton University',
  },
  {
    name: 'Datamuse API',
    href: 'https://www.datamuse.com/api/',
    use: 'Collocation’lar',
    license: 'Ücretsiz',
    credit: 'Datamuse',
  },
]

export default function Sources() {
  return (
    <section className="py-10">
      <h1 className="font-display text-3xl font-bold">Kaynaklar</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Uygulamanın kodu MIT lisanslıdır. Kelime verisi aşağıdaki açık kaynaklardan derlenmiştir ve
        bir bütün olarak CC BY-SA 4.0 ile dağıtılır.
      </p>

      <ul className="mt-8 divide-y divide-zinc-900/5 dark:divide-white/5">
        {sources.map((s) => (
          <li key={s.name} className="py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <a
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline-offset-4 hover:underline"
              >
                {s.name}
              </a>
              <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium dark:bg-zinc-800">
                {s.license}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{s.use}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{s.credit}</p>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-zinc-500">
        Ayrıntılı lisans metinleri:{' '}
        <a
          href={`${REPO}/blob/main/DATA_LICENSES.md`}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4"
        >
          DATA_LICENSES.md
        </a>
      </p>
    </section>
  )
}
