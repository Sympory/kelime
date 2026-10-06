export function Loading({ label = 'Yükleniyor…' }: { label?: string }) {
  return (
    <div className="flex justify-center py-20 text-zinc-500" role="status">
      {label}
    </div>
  )
}
