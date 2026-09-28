/**
 * MEDUSA — Finance Domain — Recurring Commitment Engine (seção 3/4)
 *
 * Calcula a PRÓXIMA ocorrência de um compromisso recorrente — determinístico,
 * puro, sem depender de nenhuma integração externa.
 */

import type { RecurringCommitment } from '../model/types';

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Próxima ocorrência estritamente >= `fromDate` (inclusive), respeitando `endDate` se houver. */
export function computeNextOccurrence(commitment: RecurringCommitment, fromDate: string): string | null {
  const from = new Date(`${fromDate}T00:00:00.000Z`);
  if (commitment.endDate && fromDate > commitment.endDate) return null;

  if (commitment.frequency === 'monthly' && commitment.dueDayOfMonth) {
    const candidate = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), commitment.dueDayOfMonth));
    if (candidate < from) {
      candidate.setUTCMonth(candidate.getUTCMonth() + 1);
    }
    const iso = toISODate(candidate);
    return !commitment.endDate || iso <= commitment.endDate ? iso : null;
  }

  if (commitment.frequency === 'weekly' && commitment.dueDayOfWeek !== undefined) {
    const candidate = new Date(from);
    const currentDay = candidate.getUTCDay();
    let diff = commitment.dueDayOfWeek - currentDay;
    if (diff < 0) diff += 7;
    candidate.setUTCDate(candidate.getUTCDate() + diff);
    const iso = toISODate(candidate);
    return !commitment.endDate || iso <= commitment.endDate ? iso : null;
  }

  if (commitment.frequency === 'yearly') {
    const start = new Date(`${commitment.startDate}T00:00:00.000Z`);
    const candidate = new Date(Date.UTC(from.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    if (candidate < from) candidate.setUTCFullYear(candidate.getUTCFullYear() + 1);
    const iso = toISODate(candidate);
    return !commitment.endDate || iso <= commitment.endDate ? iso : null;
  }

  return null; // frequência sem informação suficiente (ex.: monthly sem dueDayOfMonth) — nunca inventa uma data
}

export function daysUntil(dateISO: string, fromDateISO: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(dateISO).getTime() - new Date(fromDateISO).getTime()) / msPerDay);
}
