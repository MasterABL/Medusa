/**
 * MEDUSA — Finance Domain — Use Case: registrar transação
 *
 * Entrada de dado direta do usuário (manual) — não é decisão de autonomia,
 * então não passa pelo Guardian. Emite TRANSACTION_CREATED e, se a transação
 * fizer algum orçamento ATRAVESSAR o limiar de "perto do limite" (80%) ou de
 * "estourado" (100%), emite BUDGET_THRESHOLD_REACHED — só na travessia, nunca
 * a cada transação seguinte (evita repetir o mesmo alarme).
 */

import { publish as publishEvent } from '../../../foundation/eventBus';
import { FINANCE_EVENT_TYPES } from '../events/types';
import { computeBudgetConsumption } from '../services/budgetEngine';
import type { Transaction } from '../model/types';
import type { FinanceRepository } from '../repository/types';
import { FinanceValidationError, validateTransaction } from '../validators';

const THRESHOLDS = [0.8, 1];

export interface CreateTransactionResult {
  transaction: Transaction;
  thresholdsCrossed: Array<{ budgetId: string; percentUsed: number }>;
}

export function createTransaction(repository: FinanceRepository, transaction: Transaction): CreateTransactionResult {
  validateTransaction(transaction);
  if (repository.getTransaction(transaction.id)) {
    throw new FinanceValidationError(`Transaction "${transaction.id}" já existe — use uma atualização, não uma criação.`);
  }
  if (!repository.getAccount(transaction.accountId)) {
    throw new FinanceValidationError(`Conta "${transaction.accountId}" não existe.`);
  }

  const budgets = repository.listBudgets({ active: true }).filter((b) => b.categoryId === transaction.categoryId);
  const before = budgets.map((b) => computeBudgetConsumption(b, repository.listTransactions({ categoryId: b.categoryId })));

  repository.saveTransaction(transaction);

  publishEvent({
    domain: 'finance',
    type: FINANCE_EVENT_TYPES.TRANSACTION_CREATED,
    payload: { transactionId: transaction.id, accountId: transaction.accountId },
  });

  const thresholdsCrossed: CreateTransactionResult['thresholdsCrossed'] = [];
  budgets.forEach((budget, index) => {
    const after = computeBudgetConsumption(budget, repository.listTransactions({ categoryId: budget.categoryId }));
    const crossed = THRESHOLDS.some((t) => before[index].percentUsed < t && after.percentUsed >= t);
    if (crossed) {
      thresholdsCrossed.push({ budgetId: budget.id, percentUsed: after.percentUsed });
      publishEvent({
        domain: 'finance',
        type: FINANCE_EVENT_TYPES.BUDGET_THRESHOLD_REACHED,
        payload: { budgetId: budget.id, percentUsed: after.percentUsed },
        dedupeKey: `budget-threshold-${budget.id}-${Math.floor(after.percentUsed * 10)}`,
      });
    }
  });

  return { transaction, thresholdsCrossed };
}
