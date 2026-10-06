/**
 * MEDUSA — Spiritual Domain — Use Case: registrar prática (seção 25/29)
 *
 * Entrada de dado direta — não passa pelo Guardian (registrar não é uma
 * decisão de autonomia). Se a prática está vinculada a uma meta, dispara a
 * orquestração real da missão (seção 29):
 *   PRACTICE_COMPLETED → UPDATE_GOAL_PROGRESS → Guardian → (L1) → progresso recalculado
 */

import { createAction, dispatch } from '../../../foundation/actionBus';
import { publish as publishEvent } from '../../../foundation/eventBus';
import type { GuardianEvaluation } from '../../../foundation/types/guardian';
import { SPIRITUAL_ACTION_TYPES } from '../actions/types';
import type { UpdateGoalProgressPayload } from '../actions/types';
import { SPIRITUAL_EVENT_TYPES } from '../events/types';
import { validatePractice } from '../validators';
import type { SpiritualPractice } from '../model/types';
import type { SpiritualRepository } from '../repository/types';
import { executeSpiritualAction } from './executor';

export interface RecordPracticeResult {
  practice: SpiritualPractice;
  goalUpdateEvaluation?: GuardianEvaluation;
}

export function recordPractice(repository: SpiritualRepository, practice: SpiritualPractice, nowISO: string): RecordPracticeResult {
  validatePractice(practice);
  repository.savePractice(practice);

  publishEvent({
    domain: 'spiritual',
    type: SPIRITUAL_EVENT_TYPES.PRACTICE_COMPLETED,
    payload: { practiceId: practice.id, practiceType: practice.type, relatedGoalId: practice.relatedGoalId },
    dedupeKey: `practice-completed-${practice.id}`,
  });

  if (!practice.relatedGoalId) {
    return { practice };
  }

  const goal = repository.getGoal(practice.relatedGoalId);
  if (!goal) {
    return { practice };
  }

  const payload: UpdateGoalProgressPayload = { goalId: goal.id, triggeredByPracticeId: practice.id };
  const action = createAction({
    domain: 'spiritual',
    type: SPIRITUAL_ACTION_TYPES.UPDATE_GOAL_PROGRESS,
    intent: `Atualizar progresso da meta "${goal.label}" após prática concluída`,
    payload,
    riskLevel: 'baixo',
    reversible: true,
    undoDescription: 'Reverter o recálculo de progresso.',
  });

  const evaluation = dispatch(action);
  if (!evaluation.decision.requiresApproval) {
    executeSpiritualAction(repository, evaluation.action, nowISO);
  }

  return { practice, goalUpdateEvaluation: evaluation };
}
