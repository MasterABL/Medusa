/**
 * MEDUSA — Body Domain — Use Case: criar plano candidato (seção 14/18)
 *
 * profile + janelas disponíveis → plano candidato → Guardian → (se L1)
 * persistido como draft. Nunca ativa o plano sozinho — ativação é decisão
 * separada (fora de escopo desta rodada: hoje o plano nasce e fica "draft";
 * ativá-lo seria uma ação nova, não implementada aqui).
 */

import { createAction, dispatch } from '../../../foundation/actionBus';
import { publish as publishEvent } from '../../../foundation/eventBus';
import type { GuardianEvaluation } from '../../../foundation/types/guardian';
import { BODY_ACTION_TYPES } from '../actions/types';
import { BODY_EVENT_TYPES } from '../events/types';
import type { CreateBodyPlanPayload } from '../actions/types';
import { generateCandidatePlan } from '../services/planningEngine';
import type { PlanningContext } from '../services/planningEngine';
import type { BodyRepository } from '../repository/types';
import type { BodyPlan } from '../model/types';
import { validatePlanIntegrity } from '../validators';
import { executeBodyAction } from './executor';

export interface CreateBodyPlanResult {
  evaluation: GuardianEvaluation;
  plan: BodyPlan;
}

export function createBodyPlan(repository: BodyRepository, planId: string, ctx: PlanningContext, nowISO: string): CreateBodyPlanResult {
  const plan = generateCandidatePlan(planId, ctx, nowISO);
  validatePlanIntegrity(plan);

  const payload: CreateBodyPlanPayload = { plan };
  const action = createAction({
    domain: 'body',
    type: BODY_ACTION_TYPES.CREATE_BODY_PLAN,
    intent: `Criar plano candidato de atividade (${plan.frequencyPerWeek}x/semana)`,
    payload,
    riskLevel: 'baixo',
    reversible: true,
    undoDescription: 'Remover o plano criado.',
  });

  const evaluation = dispatch(action);

  if (!evaluation.decision.requiresApproval) {
    executeBodyAction(repository, evaluation.action);
    publishEvent({
      domain: 'body',
      type: BODY_EVENT_TYPES.BODY_PLAN_CREATED,
      payload: { plan },
      dedupeKey: `body-plan-created-${plan.id}`,
    });
  }

  return { evaluation, plan };
}
