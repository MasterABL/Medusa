/**
 * MEDUSA — Finance Domain — Cashflow Engine (seção 4)
 *
 * Cálculo puro e determinístico — nada de IA, nada de heurística aqui (isso
 * fica em recurrenceHeuristic.ts, nomeado explicitamente como heurística).
 */

import type { Transaction } from '../model/types';

export interface CashflowResult {
  periodFrom: string;
  periodTo: string;
  income: number;
  expense: number;
  netFlow: number;
  transactionCount: number;
}

export function computeCashflow(transactions: Transaction[], periodFrom: string, periodTo: string): CashflowResult {
  const inPeriod = transactions.filter((t) => t.occurredAt >= periodFrom && t.occurredAt <= periodTo && t.status !== 'cancelled');

  const income = inPeriod.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = inPeriod.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  return {
    periodFrom,
    periodTo,
    income,
    expense,
    netFlow: income - expense,
    transactionCount: inPeriod.length,
  };
}

export interface CashflowByAccount extends CashflowResult {
  accountId: string;
}

export function computeCashflowByAccount(
  transactions: Transaction[],
  periodFrom: string,
  periodTo: string
): CashflowByAccount[] {
  const accountIds = Array.from(new Set(transactions.map((t) => t.accountId)));
  return accountIds.map((accountId) => ({
    accountId,
    ...computeCashflow(
      transactions.filter((t) => t.accountId === accountId),
      periodFrom,
      periodTo
    ),
  }));
}
