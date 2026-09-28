/**
 * MEDUSA — Body Domain — Use Case: mover sessão de treino (seção 18)
 */

import { createAction, dispatch } from '../../../foundation/actionBus';
import type { GuardianEvaluation } from '../../../foundation/types/guardian';
import { BODY_ACTION_TYPES } from '../actions/types';
import type { MoveBodySessionPayload } from '../actions/types';
import type { BodyRepository } from '../repository/types';
import { BodyExecutionError } from './executor';

export function moveBodySession(repository: BodyRepository, planId: string, sessionId: string, newDate: string): GuardianEvaluation {
  const plan = repository.getPlan(planId);
  if (!plan) throw new BodyExecutionError(`BodyPlan "${planId}" não encontrado.`);
  if (!plan.sessions.some((s) => s.id === sessionId)) {
    throw new BodyExecutionError(`Sessão "${sessionId}" não encontrada no plano "${planId}".`);
  }

  const payload: MoveBodySessionPayload = { planId, sessionId, newDate };

  const action = createAction({
    domain: 'body',
    type: BODY_ACTION_TYPES.MOVE_BODY_SESSION,
    intent: `Mover sessão para ${newDate}`,
    payload,
    riskLevel: 'baixo',
    reversible: true,
    undoDescription: 'Restaurar a data anterior da sessão.',
  });

  return dispatch(action);
}
