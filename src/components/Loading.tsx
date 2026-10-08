/** Yükleniyor iskeleti: içerik gelene kadar sayfanın kabaca şeklini gösterir (parıltılı). */
export function Loading({ label = 'Yükleniyor…' }: { label?: string }) {
  return (
    <div className="space-y-4 py-6" role="status" aria-label={label}>
      <div className="skeleton h-8 w-2/5 rounded-xl" />
      <div className="skeleton h-40 rounded-3xl" />
      <div className="grid grid-cols-3 gap-3">
        <div className="skeleton h-20 rounded-3xl" />
        <div className="skeleton h-20 rounded-3xl" />
        <div className="skeleton h-20 rounded-3xl" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  )
}
