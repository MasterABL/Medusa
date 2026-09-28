/**
 * MEDUSA — Finance Domain — Use Case: criar orçamento (seção 6)
 */

import { createAction, dispatch } from '../../../foundation/actionBus';
import type { GuardianEvaluation } from '../../../foundation/types/guardian';
import { FINANCE_ACTION_TYPES } from '../actions/types';
import type { Budget } from '../model/types';
import type { FinanceRepository } from '../repository/types';
import { validateBudget } from '../validators';
import { executeFinanceAction } from './executor';

export function createBudget(repository: FinanceRepository, budget: Budget): GuardianEvaluation {
  validateBudget(budget);

  const category = repository.getCategory(budget.categoryId);
  const action = createAction({
    domain: 'finance',
    type: FINANCE_ACTION_TYPES.CREATE_BUDGET,
    intent: `Criar orçamento de ${budget.limitAmount.toFixed(2)} para "${category?.name ?? budget.categoryId}"`,
    payload: budget,
    riskLevel: 'baixo',
    reversible: true,
    undoDescription: 'Remover o orçamento criado.',
  });

  const evaluation = dispatch(action);

  if (!evaluation.decision.requiresApproval) {
    executeFinanceAction(repository, evaluation.action);
  }

  return evaluation;
}
