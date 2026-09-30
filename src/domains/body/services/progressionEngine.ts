/**
 * MEDUSA — Body — Progressão de carga
 *
 * Regra herdada do produto (MINHA-VIDA): a carga ATUAL de um exercício é a
 * entrada de data mais recente — não existe campo "atual" separado que possa
 * divergir do histórico. A ANTERIOR é a entrada imediatamente anterior em data.
 * Duas entradas na mesma data colapsam na última registrada (correção, não novo ponto).
 */

import type { LoadEntry, LoadProgression, LoadTrend } from '../model/training';

/** Histórico do exercício ordenado por data crescente, com uma entrada por dia (a mais recente do dia vence). */
export function historyFor(exerciseId: string, loads: LoadEntry[], asOf?: string): LoadEntry[] {
  const perDay = new Map<string, LoadEntry>();
  for (const l of loads) {
    if (l.exerciseId !== exerciseId) continue;
    if (asOf && l.date > asOf) continue;
    const existing = perDay.get(l.date);
    if (!existing || l.recordedAt >= existing.recordedAt) perDay.set(l.date, l);
  }
  return Array.from(perDay.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function progressionFor(exerciseId: string, loads: LoadEntry[], asOf?: string): LoadProgression {
  const history = historyFor(exerciseId, loads, asOf);
  const current = history[history.length - 1];
  const previous = history.length >= 2 ? history[history.length - 2] : undefined;

  if (!current || !previous) return { exerciseId, current, previous, trend: 'sem_base' };

  const deltaKg = round2(current.loadKg - previous.loadKg);
  const trend: LoadTrend = deltaKg > 0 ? 'subiu' : deltaKg < 0 ? 'reduziu' : 'manteve';
  return { exerciseId, current, previous, trend, deltaKg };
}

/** Upsert por (exercício, dia): devolve a nova lista — nunca muta a recebida. */
export function upsertLoad(loads: LoadEntry[], entry: LoadEntry): LoadEntry[] {
  if (!Number.isFinite(entry.loadKg) || entry.loadKg < 0) {
    throw new Error(`Carga inválida: ${entry.loadKg}.`);
  }
  const rest = loads.filter((l) => !(l.exerciseId === entry.exerciseId && l.date === entry.date));
  return [...rest, entry];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
