/**
 * MEDUSA — Finance Domain — Projection Engine (seção 3/4)
 *
 * Separação explícita entre OBSERVADO e PROJETADO — uma projeção nunca deve
 * ser confundida com saldo real (seção 3, "Projection").
 */

import type { Projection, RecurringCommitment } from '../model/types';
import { computeNextOccurrence } from './recurringCommitmentEngine';

function addMonths(dateISO: string, months: number): string {
  const date = new Date(`${dateISO}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function monthLabel(dateISO: string): string {
  return dateISO.slice(0, 7); // "YYYY-MM"
}

/**
 * Projeta o saldo mês a mês somando/subtraindo compromissos recorrentes
 * ATIVOS conhecidos. `observedBalance` é sempre o saldo real hoje — a
 * projeção nunca reescreve isso, só soma cenários futuros a partir dele.
 */
export function projectCashflow(
  observedBalance: number,
  recurringCommitments: RecurringCommitment[],
  fromDateISO: string,
  monthsAhead: number
): Projection[] {
  const active = recurringCommitments.filter((c) => c.active);
  const projections: Projection[] = [];
  let runningBalance = observedBalance;

  for (let m = 1; m <= monthsAhead; m += 1) {
    const periodStart = addMonths(fromDateISO, m - 1);
    const periodEnd = addMonths(fromDateISO, m);

    let periodDelta = 0;
    const basisParts: string[] = [];

    for (const commitment of active) {
      const nextDue = computeNextOccurrence(commitment, periodStart);
      if (nextDue && nextDue < periodEnd) {
        const signedAmount = commitment.type === 'income' ? commitment.expectedAmount : -commitment.expectedAmount;
        periodDelta += signedAmount;
        basisParts.push(`${commitment.label} (${commitment.type === 'income' ? '+' : '-'}${commitment.expectedAmount})`);
      }
    }

    runningBalance += periodDelta;

    projections.push({
      id: `projection_${monthLabel(periodStart)}`,
      periodLabel: monthLabel(periodStart),
      observedBalance,
      projectedBalance: runningBalance,
      basis:
        basisParts.length > 0
          ? `Compromissos recorrentes conhecidos: ${basisParts.join(', ')}`
          : 'Nenhum compromisso recorrente ativo conhecido para este período',
      generatedAt: new Date().toISOString(),
    });
  }

  return projections;
}
