/**
 * MEDUSA — Finance Domain — Use Case: ajustar orçamento (seção 6)
 *
 * Diferente de criar: ajustar um limite já em uso tem mais impacto (o
 * usuário pode estar tentando "abrir" um limite estourado) — por isso a
 * política registra ADJUST_BUDGET como L2, nunca L1 (ver domains/index.ts).
 */

import { createAction, dispatch } from '../../../foundation/actionBus';
import type { GuardianEvaluation } from '../../../foundation/types/guardian';
import { FINANCE_ACTION_TYPES } from '../actions/types';
import type { FinanceRepository } from '../repository/types';
import { FinanceValidationError, validateAmount } from '../validators';
import { executeFinanceAction } from './executor';

export function adjustBudget(repository: FinanceRepository, budgetId: string, newLimitAmount: number): GuardianEvaluation {
  const budget = repository.getBudget(budgetId);
  if (!budget) {
    throw new FinanceValidationError(`Budget "${budgetId}" não encontrado.`);
  }
  validateAmount(newLimitAmount, 'newLimitAmount');

  const action = createAction({
    domain: 'finance',
    type: FINANCE_ACTION_TYPES.ADJUST_BUDGET,
    intent: `Alterar limite do orçamento de ${budget.limitAmount.toFixed(2)} para ${newLimitAmount.toFixed(2)}`,
    payload: { budgetId, previousLimit: budget.limitAmount, newLimitAmount },
    riskLevel: 'moderado',
    reversible: true,
    undoDescription: 'Restaurar o limite anterior do orçamento.',
  });

  const evaluation = dispatch(action);

  if (!evaluation.decision.requiresApproval) {
    executeFinanceAction(repository, evaluation.action);
  }

  return evaluation;
}
