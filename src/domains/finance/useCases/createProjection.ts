/**
 * MEDUSA — Finance Domain — Use Case: gerar projeção de fluxo de caixa
 */

import { createAction, dispatch } from '../../../foundation/actionBus';
import { publish as publishEvent } from '../../../foundation/eventBus';
import type { GuardianEvaluation } from '../../../foundation/types/guardian';
import { FINANCE_ACTION_TYPES } from '../actions/types';
import { FINANCE_EVENT_TYPES } from '../events/types';
import { projectCashflow } from '../services/projectionEngine';
import type { Projection } from '../model/types';
import type { FinanceRepository } from '../repository/types';
import { validateProjectionPeriod } from '../validators';

export interface CreateProjectionResult {
  evaluation: GuardianEvaluation;
  projections?: Projection[];
}

export function createProjection(
  repository: FinanceRepository,
  observedBalance: number,
  fromDateISO: string,
  monthsAhead: number
): CreateProjectionResult {
  const action = createAction({
    domain: 'finance',
    type: FINANCE_ACTION_TYPES.CREATE_PROJECTION,
    intent: `Projetar saldo para os próximos ${monthsAhead} mês(es)`,
    payload: { observedBalance, fromDateISO, monthsAhead },
    riskLevel: 'baixo',
    reversible: true,
    undoDescription: 'Descartar a projeção gerada.',
  });

  const evaluation = dispatch(action);
  if (evaluation.decision.requiresApproval) {
    return { evaluation };
  }

  const commitments = repository.listRecurringCommitments({ active: true });
  const projections = projectCashflow(observedBalance, commitments, fromDateISO, monthsAhead);

  for (const projection of projections) {
    validateProjectionPeriod(projection.periodLabel);
    repository.saveProjection(projection);
  }

  publishEvent({
    domain: 'finance',
    type: FINANCE_EVENT_TYPES.PROJECTION_UPDATED,
    payload: { count: projections.length },
  });

  return { evaluation, projections };
}
