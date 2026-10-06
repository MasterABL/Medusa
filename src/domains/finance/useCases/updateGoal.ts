/**
 * MEDUSA — Finance Domain — Use Case: contribuir para meta financeira
 */

import { createAction, dispatch } from '../../../foundation/actionBus';
import { publish as publishEvent } from '../../../foundation/eventBus';
import type { GuardianEvaluation } from '../../../foundation/types/guardian';
import { FINANCE_ACTION_TYPES } from '../actions/types';
import { FINANCE_EVENT_TYPES } from '../events/types';
import { addContribution, computeGoalProgress } from '../services/goalEngine';
import type { GoalContribution } from '../model/types';
import type { FinanceRepository } from '../repository/types';
import { FinanceValidationError, validateAmount } from '../validators';

export function contributeToGoal(
  repository: FinanceRepository,
  goalId: string,
  contribution: GoalContribution
): GuardianEvaluation {
  const goal = repository.getGoal(goalId);
  if (!goal) throw new FinanceValidationError(`FinancialGoal "${goalId}" não encontrado.`);
  validateAmount(contribution.amount, 'contribution.amount');

  const action = createAction({
    domain: 'finance',
    type: FINANCE_ACTION_TYPES.UPDATE_GOAL,
    intent: `Registrar contribuição de ${contribution.amount.toFixed(2)} para a meta "${goal.label}"`,
    payload: { goalId, contribution },
    riskLevel: 'baixo',
    reversible: true,
    undoDescription: 'Remover a contribuição registrada.',
  });

  const evaluation = dispatch(action);

  if (!evaluation.decision.requiresApproval) {
    const updated = addContribution(goal, contribution);
    repository.saveGoal(updated);
    publishEvent({
      domain: 'finance',
      type: FINANCE_EVENT_TYPES.GOAL_PROGRESS_CHANGED,
      payload: { goalId, progress: computeGoalProgress(updated) },
    });
  }

  return evaluation;
}
