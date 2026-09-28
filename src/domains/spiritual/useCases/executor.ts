/**
 * MEDUSA — Spiritual Domain — Action Executor
 */

import type { Action } from '../../../foundation/types/action';
import { SPIRITUAL_ACTION_TYPES } from '../actions/types';
import type { UpdateGoalProgressPayload } from '../actions/types';
import { recalculateGoalProgress } from '../services/goalEngine';
import type { SpiritualRepository } from '../repository/types';

export class SpiritualExecutionError extends Error {}

export function executeSpiritualAction(repository: SpiritualRepository, action: Action, nowISO: string): void {
  switch (action.type) {
    case SPIRITUAL_ACTION_TYPES.UPDATE_GOAL_PROGRESS: {
      const payload = action.payload as UpdateGoalProgressPayload;
      const goal = repository.getGoal(payload.goalId);
      if (!goal) throw new SpiritualExecutionError(`SpiritualGoal "${payload.goalId}" não encontrada.`);
      const allPractices = repository.listPractices();
      repository.saveGoal(recalculateGoalProgress(goal, allPractices, nowISO));
      return;
    }

    default:
      // SCHEDULE_PRACTICE: agendamento real é responsabilidade da Agenda.
      return;
  }
}
