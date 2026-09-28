/**
 * MEDUSA — Finance Domain — Use Case: associar transação a compromisso recorrente
 */

import { createAction, dispatch } from '../../../foundation/actionBus';
import type { GuardianEvaluation } from '../../../foundation/types/guardian';
import { FINANCE_ACTION_TYPES } from '../actions/types';
import type { FinanceRepository } from '../repository/types';
import { FinanceValidationError } from '../validators';

export function linkRecurringCommitment(
  repository: FinanceRepository,
  transactionId: string,
  commitmentId: string
): GuardianEvaluation {
  const transaction = repository.getTransaction(transactionId);
  const commitment = repository.getRecurringCommitment(commitmentId);
  if (!transaction) throw new FinanceValidationError(`Transaction "${transactionId}" não encontrada.`);
  if (!commitment) throw new FinanceValidationError(`RecurringCommitment "${commitmentId}" não encontrado.`);

  const action = createAction({
    domain: 'finance',
    type: FINANCE_ACTION_TYPES.LINK_RECURRING_COMMITMENT,
    intent: `Associar transação "${transaction.description}" ao compromisso "${commitment.label}"`,
    payload: { transactionId, commitmentId },
    riskLevel: 'baixo',
    reversible: true,
    undoDescription: 'Desfazer a associação.',
  });

  const evaluation = dispatch(action);

  if (!evaluation.decision.requiresApproval) {
    repository.saveTransaction({ ...transaction, recurringCommitmentId: commitmentId });
  }

  return evaluation;
}
