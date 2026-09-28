/**
 * MEDUSA — Body Domain — Use Cases: pausar/retomar plano (seção 18)
 */

import { createAction, dispatch } from '../../../foundation/actionBus';
import type { GuardianEvaluation } from '../../../foundation/types/guardian';
import { BODY_ACTION_TYPES } from '../actions/types';
import type { PauseBodyPlanPayload, ResumeBodyPlanPayload } from '../actions/types';
import type { BodyRepository } from '../repository/types';
import { executeBodyAction, BodyExecutionError } from './executor';

export function pauseBodyPlan(repository: BodyRepository, planId: string, reason?: string): GuardianEvaluation {
  const plan = repository.getPlan(planId);
  if (!plan) throw new BodyExecutionError(`BodyPlan "${planId}" não encontrado.`);

  const payload: PauseBodyPlanPayload = { planId, reason };
  const action = createAction({
    domain: 'body',
    type: BODY_ACTION_TYPES.PAUSE_BODY_PLAN,
    intent: `Pausar plano de atividade${reason ? ` — ${reason}` : ''}`,
    payload,
    riskLevel: 'baixo',
    reversible: true,
    undoDescription: 'Retomar o plano.',
  });

  const evaluation = dispatch(action);
  if (!evaluation.decision.requiresApproval) {
    executeBodyAction(repository, evaluation.action);
  }
  return evaluation;
}

export function resumeBodyPlan(repository: BodyRepository, planId: string): GuardianEvaluation {
  const plan = repository.getPlan(planId);
  if (!plan) throw new BodyExecutionError(`BodyPlan "${planId}" não encontrado.`);

  const payload: ResumeBodyPlanPayload = { planId };
  const action = createAction({
    domain: 'body',
    type: BODY_ACTION_TYPES.RESUME_BODY_PLAN,
    intent: 'Retomar plano de atividade',
    payload,
    riskLevel: 'baixo',
    reversible: true,
    undoDescription: 'Pausar o plano novamente.',
  });

  const evaluation = dispatch(action);
  if (!evaluation.decision.requiresApproval) {
    executeBodyAction(repository, evaluation.action);
  }
  return evaluation;
}
