/**
 * MEDUSA — Finance Domain — Budget Engine (seção 4)
 *
 * `BudgetConsumption` é sempre CALCULADO a partir de Budget+Transaction[] —
 * nunca armazenado como fonte primária (seção 3).
 */

import type { Budget, BudgetConsumption, Transaction } from '../model/types';

const NEAR_LIMIT_THRESHOLD = 0.8;

export function computeBudgetConsumption(budget: Budget, transactionsInPeriod: Transaction[]): BudgetConsumption {
  const consumedAmount = transactionsInPeriod
    .filter((t) => t.categoryId === budget.categoryId && t.type === 'expense' && t.status !== 'cancelled')
    .reduce((sum, t) => sum + t.amount, 0);

  const percentUsed = budget.limitAmount > 0 ? consumedAmount / budget.limitAmount : 0;
  const remainingAmount = budget.limitAmount - consumedAmount;

  let state: BudgetConsumption['state'];
  if (percentUsed >= 1) state = 'estourado';
  else if (percentUsed >= NEAR_LIMIT_THRESHOLD) state = 'proximo_do_limite';
  else state = 'dentro_do_limite';

  return {
    budgetId: budget.id,
    consumedAmount,
    remainingAmount,
    percentUsed,
    state,
  };
}

export function computeAllBudgetConsumptions(budgets: Budget[], transactionsInPeriod: Transaction[]): BudgetConsumption[] {
  return budgets.filter((b) => b.active).map((b) => computeBudgetConsumption(b, transactionsInPeriod));
}
