/**
 * MEDUSA — Body — Métricas registradas (sono, passos, calorias, peso, treino)
 *
 * Princípio: só existe o que o usuário registrou (ou uma fonte importou).
 * Dia sem registro NUNCA vira zero — vira "sem dado". Calcular média
 * contando lacuna como 0 faria 3 h de sono medidas em 1 dia de 7 virar
 * "0,4 h/dia", o que é falso e alarmante.
 *
 * Sem sensores: não há HRV, fases do sono, frequência cardíaca ou qualquer
 * dado fisiológico que este contrato não possa garantir de onde veio.
 */

import type { BodyMetricEntry, BodyMetricKey, MetricWindowSummary } from '../model/training';

export function datesInWindow(endDate: string, windowDays: number): string[] {
  const end = Date.parse(`${endDate}T00:00:00Z`);
  const out: string[] = [];
  for (let i = windowDays - 1; i >= 0; i -= 1) out.push(new Date(end - i * 86_400_000).toISOString().slice(0, 10));
  return out;
}

/** Uma entrada por dia: várias fontes no mesmo dia mesclam campo a campo, a mais recente vence campo a campo. */
export function mergeByDate(entries: BodyMetricEntry[]): BodyMetricEntry[] {
  const byDate = new Map<string, BodyMetricEntry>();
  for (const e of [...entries].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))) {
    const prev = byDate.get(e.date);
    byDate.set(e.date, prev ? { ...prev, ...stripUndefined(e) } : e);
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export function summarizeMetric(entries: BodyMetricEntry[], key: BodyMetricKey, endDate: string, windowDays: number): MetricWindowSummary {
  const merged = mergeByDate(entries);
  const window = datesInWindow(endDate, windowDays);
  const byDate = new Map(merged.map((e) => [e.date, e]));

  const points: Array<{ date: string; value: number }> = [];
  const missingDates: string[] = [];
  for (const date of window) {
    const v = byDate.get(date)?.[key];
    if (typeof v === 'number' && Number.isFinite(v)) points.push({ date, value: v });
    else missingDates.push(date);
  }

  const average = points.length > 0 ? Math.round((points.reduce((s, p) => s + p.value, 0) / points.length) * 100) / 100 : undefined;
  return { key, windowDays, daysWithData: points.length, average, latest: points[points.length - 1], missingDates };
}

/** Validação de entrada de registro manual — faixas plausíveis, não diagnóstico. */
export function validateMetricEntry(entry: BodyMetricEntry): string[] {
  const errors: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) errors.push('Data inválida (use YYYY-MM-DD).');
  const check = (label: string, v: number | undefined, min: number, max: number) => {
    if (v === undefined) return;
    if (!Number.isFinite(v) || v < min || v > max) errors.push(`${label} fora da faixa plausível (${min}–${max}): ${v}.`);
  };
  check('Sono (horas)', entry.sleepHours, 0, 24);
  check('Passos', entry.steps, 0, 200_000);
  check('Calorias', entry.calories, 0, 20_000);
  check('Peso (kg)', entry.weightKg, 20, 400);
  check('Duração do treino (min)', entry.workoutMinutes, 0, 600);
  const hasAny = [entry.sleepHours, entry.steps, entry.calories, entry.weightKg, entry.workoutMinutes, entry.workoutLabel].some((v) => v !== undefined);
  if (!hasAny) errors.push('Registro sem nenhum campo preenchido.');
  return errors;
}
