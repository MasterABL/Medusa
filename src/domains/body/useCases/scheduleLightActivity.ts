/**
 * MEDUSA — Body Domain — Use Case: propor atividade leve (seção 16/17/29)
 *
 * Orquestração real da missão (seção 29):
 *   ROUTINE_LOAD_HIGH → SCHEDULE_LIGHT_ACTIVITY → Guardian
 */

import { createAction, dispatch } from '../../../foundation/actionBus';
import type { GuardianEvaluation } from '../../../foundation/types/guardian';
import { BODY_ACTION_TYPES } from '../actions/types';
import type { ScheduleLightActivityPayload } from '../actions/types';
import { buildLightActivitySchedulingRequest } from '../adapters/agendaAdapter';
import type { AgendaSchedulingRequest } from '../adapters/agendaAdapter';

export interface ScheduleLightActivityResult {
  evaluation: GuardianEvaluation;
  schedulingRequest?: AgendaSchedulingRequest;
}

export function scheduleLightActivity(
  activityId: string,
  proposedDate: string,
  durationMinutes: number,
  reason: string
): ScheduleLightActivityResult {
  const payload: ScheduleLightActivityPayload = { activityId, proposedDate, durationMinutes, reason };

  const action = createAction({
    domain: 'body',
    type: BODY_ACTION_TYPES.SCHEDULE_LIGHT_ACTIVITY,
    intent: `Sugerir atividade leve em ${proposedDate} — ${reason}`,
    payload,
    riskLevel: 'baixo',
    reversible: true,
    undoDescription: 'Cancelar a sugestão de atividade leve.',
  });

  const evaluation = dispatch(action);
  if (evaluation.decision.requiresApproval) {
    return { evaluation };
  }

  return { evaluation, schedulingRequest: buildLightActivitySchedulingRequest(activityId, proposedDate, durationMinutes, reason) };
}
