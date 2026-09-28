/** Datas como "YYYY-MM-DD" (dia civil). Quem chama decide o fuso ao gerar a string do dia. */
export function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

export function todayOf(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function dayDiff(fromDay: string, toDay: string): number {
  return Math.round((Date.parse(`${toDay}T00:00:00Z`) - Date.parse(`${fromDay}T00:00:00Z`)) / 86_400_000);
}

export function weekdayOf(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}
