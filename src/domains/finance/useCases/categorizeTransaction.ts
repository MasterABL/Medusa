/**
 * MEDUSA — Finance Domain — Use Case: categorizar transação (seção 6)
 */

import { createAction, dispatch } from '../../../foundation/actionBus';
import type { GuardianEvaluation } from '../../../foundation/types/guardian';
import { FINANCE_ACTION_TYPES } from '../actions/types';
import type { FinanceRepository } from '../repository/types';
import { executeFinanceAction } from './executor';

export function categorizeTransaction(
  repository: FinanceRepository,
  transactionId: string,
  categoryId: string
): GuardianEvaluation {
  const transaction = repository.getTransaction(transactionId);
  if (!transaction) {
    throw new Error(`Transaction "${transactionId}" não encontrada.`);
  }

  const action = createAction({
    domain: 'finance',
    type: FINANCE_ACTION_TYPES.CATEGORIZE_TRANSACTION,
    intent: `Categorizar "${transaction.description}" como "${categoryId}"`,
    payload: { transactionId, categoryId },
    riskLevel: 'baixo',
    reversible: true,
    undoDescription: 'Restaurar a categoria anterior da transação.',
  });

  const evaluation = dispatch(action);

  if (!evaluation.decision.requiresApproval) {
    executeFinanceAction(repository, evaluation.action);
  }

  return evaluation;
}
