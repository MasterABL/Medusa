/**
 * MEDUSA — Finance — Obrigações (vencimentos) numa janela de datas
 *
 * "Contas fixas" do MINHA-VIDA = `RecurringCommitment` do Medusa (já existia):
 * aqui só se calcula, por ocorrência, o que vence na janela e o que já foi pago.
 */

import type { RecurringCommitment, Transaction } from '../model/types';
import type { ObligationItem } from '../model/statements';
import { computeNextOccurrence } from './recurringCommitmentEngine';

const DAY = 86_400_000;

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY);
}

/** Datas de vencimento de um compromisso em [from, to] (inclusive). */
export function occurrencesInWindow(commitment: RecurringCommitment, from: string, to: string): string[] {
  const out: string[] = [];
  let cursor = from;
  for (let i = 0; i < 400; i += 1) {
    const next = computeNextOccurrence(commitment, cursor);
    if (!next || next > to) break;
    out.push(next);
    cursor = addDays(next, 1);
  }
  return out;
}

/**
 * Uma ocorrência está "acertada" se existe lançamento vinculado ao compromisso
 * (posted OU pending — pendente vinculado já conta como a despesa dela, e é
 * contado à parte, evitando somar duas vezes) perto da data de vencimento.
 * Tolerância: 3 dias p/ semanal, 10 p/ mensal/anual (pagar adiantado/atrasado).
 */
export function isOccurrenceSettled(commitment: RecurringCommitment, dueDate: string, transactions: Transaction[]): boolean {
  const tolerance = commitment.frequency === 'weekly' ? 3 : 10;
  return transactions.some(
    (t) =>
      t.recurringCommitmentId === commitment.id &&
      t.type === commitment.type &&
      t.status !== 'cancelled' &&
      Math.abs(diffDays(t.occurredAt.slice(0, 10), dueDate)) <= tolerance
  );
}

export function upcomingFixedBills(
  commitments: RecurringCommitment[],
  transactions: Transaction[],
  from: string,
  to: string
): ObligationItem[] {
  const items: ObligationItem[] = [];
  for (const c of commitments) {
    if (!c.active || c.type !== 'expense') continue;
    for (const due of occurrencesInWindow(c, from, to)) {
      if (isOccurrenceSettled(c, due, transactions)) continue;
      items.push({ kind: 'conta_fixa', label: c.label, amount: c.expectedAmount, dueDate: due, sourceId: c.id, projected: false });
    }
  }
  return items.sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
}
