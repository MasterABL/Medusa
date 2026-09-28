/**
 * MEDUSA — Spiritual Domain — Use Case: propor agendamento de prática (seção 27)
 */

import { createAction, dispatch } from '../../../foundation/actionBus';
import { publish as publishEvent } from '../../../foundation/eventBus';
import type { GuardianEvaluation } from '../../../foundation/types/guardian';
import { SPIRITUAL_ACTION_TYPES } from '../actions/types';
import type { SchedulePracticePayload } from '../actions/types';
import { SPIRITUAL_EVENT_TYPES } from '../events/types';
import { buildPracticeSchedulingRequest } from '../adapters/agendaAdapter';
import type { AgendaSchedulingRequest } from '../adapters/agendaAdapter';

export interface SchedulePracticeResult {
  evaluation: GuardianEvaluation;
  schedulingRequest?: AgendaSchedulingRequest;
}

export function schedulePractice(practiceType: string, label: string, proposedDate: string): SchedulePracticeResult {
  const payload: SchedulePracticePayload = { practiceType, label, proposedDate };

  const action = createAction({
    domain: 'spiritual',
    type: SPIRITUAL_ACTION_TYPES.SCHEDULE_PRACTICE,
    intent: `Agendar prática "${label}" para ${proposedDate}`,
    payload,
    riskLevel: 'baixo',
    reversible: true,
    undoDescription: 'Cancelar o agendamento proposto.',
  });

  const evaluation = dispatch(action);
  if (evaluation.decision.requiresApproval) {
    return { evaluation };
  }

  publishEvent({
    domain: 'spiritual',
    type: SPIRITUAL_EVENT_TYPES.PRACTICE_SCHEDULED,
    payload: { practiceType, proposedDate },
  });

  return { evaluation, schedulingRequest: buildPracticeSchedulingRequest(practiceType, label, proposedDate) };
}
