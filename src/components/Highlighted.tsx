/** Cümlede [başlangıç, bitiş) aralığını vurgular; aralık yoksa cümleyi olduğu gibi gösterir. */
export function Highlighted({ text, hl }: { text: string; hl?: [number, number] }) {
  if (!hl) return <>{text}</>
  return (
    <>
      {text.slice(0, hl[0])}
      <mark className="rounded bg-amber-300/30 px-0.5 font-semibold text-inherit underline decoration-amber-400 decoration-2 underline-offset-4">
        {text.slice(hl[0], hl[1])}
      </mark>
      {text.slice(hl[1])}
    </>
  )
}
