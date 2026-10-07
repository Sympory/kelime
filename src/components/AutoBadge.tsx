const REPORT_URL = 'https://github.com/Sympory/kelime/blob/main/data/overrides/README.md'

/** Yapay zekâ ile üretilmiş Türkçe karşılıkların yanında gösterilir; düzeltme rehberine bağlanır. */
export function AutoBadge() {
  return (
    <a
      href={REPORT_URL}
      target="_blank"
      rel="noreferrer"
      title="Bu karşılık otomatik üretildi; yanlışsa düzeltmeye katkı verebilirsin"
      className="ml-2 inline-block rounded-full border border-current px-1.5 align-middle text-[10px] font-medium tracking-wide text-zinc-400 uppercase hover:text-zinc-600 dark:hover:text-zinc-300"
    >
      otomatik
    </a>
  )
}
