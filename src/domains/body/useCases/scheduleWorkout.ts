/**
 * MEDUSA — Body Domain — Use Case: propor agendamento de treino (seção 15/18)
 *
 * BodyPlan → candidate session → Agenda scheduling request → Action → Guardian.
 * Quem decide o horário final e cria o item de verdade é a Agenda — este use
 * case só produz a requisição e passa pelo Guardian.
 */

import { createAction, dispatch } from '../../../foundation/actionBus';
import type { GuardianEvaluation } from '../../../foundation/types/guardian';
import { BODY_ACTION_TYPES } from '../actions/types';
import type { ScheduleWorkoutPayload } from '../actions/types';
import { buildSessionSchedulingRequest } from '../adapters/agendaAdapter';
import type { AgendaSchedulingRequest } from '../adapters/agendaAdapter';
import type { BodyRepository } from '../repository/types';
import { BodyExecutionError } from './executor';

export interface ScheduleWorkoutResult {
  evaluation: GuardianEvaluation;
  schedulingRequest?: AgendaSchedulingRequest;
}

export function scheduleWorkout(repository: BodyRepository, planId: string, sessionId: string, proposedDate: string): ScheduleWorkoutResult {
  const plan = repository.getPlan(planId);
  if (!plan) throw new BodyExecutionError(`BodyPlan "${planId}" não encontrado.`);
  const session = plan.sessions.find((s) => s.id === sessionId);
  if (!session) throw new BodyExecutionError(`Sessão "${sessionId}" não encontrada no plano "${planId}".`);

  const payload: ScheduleWorkoutPayload = {
    planId,
    sessionId,
    proposedDate,
    proposedWindowLabel: session.preferredWindowLabel,
  };

  const action = createAction({
    domain: 'body',
    type: BODY_ACTION_TYPES.SCHEDULE_WORKOUT,
    intent: `Agendar sessão de treino para ${proposedDate}`,
    payload,
    riskLevel: 'baixo',
    reversible: true,
    undoDescription: 'Cancelar o agendamento proposto.',
  });

  const evaluation = dispatch(action);
  if (evaluation.decision.requiresApproval) {
    return { evaluation };
  }

  return { evaluation, schedulingRequest: buildSessionSchedulingRequest(planId, session, proposedDate) };
}
