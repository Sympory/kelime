/** Gün 04:00'te başlar: gece 01:00'de yapılan çalışma önceki güne sayılır (Anki ile aynı). */
export const ROLLOVER_HOUR = 4

/** `now` anının ait olduğu çalışma gününün başlangıcı (yerel saat). */
export function dayStart(now: Date, rolloverHour = ROLLOVER_HOUR): Date {
  const d = new Date(now)
  d.setHours(rolloverHour, 0, 0, 0)
  if (now < d) d.setDate(d.getDate() - 1)
  return d
}

/** Çalışma gününün bitişi (bir sonraki günün başlangıcı, hariç). */
export function dayEnd(now: Date, rolloverHour = ROLLOVER_HOUR): Date {
  const d = dayStart(now, rolloverHour)
  d.setDate(d.getDate() + 1)
  return d
}

/** "2026-10-07" biçiminde çalışma günü anahtarı (seri/istatistik için). */
export function dayKey(now: Date, rolloverHour = ROLLOVER_HOUR): string {
  const d = dayStart(now, rolloverHour)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
