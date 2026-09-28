/**
 * MEDUSA — Spiritual Domain — Use Case: criar meta (seção 25)
 */

import type { SpiritualGoal } from '../model/types';
import type { SpiritualRepository } from '../repository/types';
import { SpiritualValidationError } from '../validators';

export function createGoal(repository: SpiritualRepository, goal: SpiritualGoal): SpiritualGoal {
  if (!goal.label.trim()) {
    throw new SpiritualValidationError('goal.label não pode ser vazio.');
  }
  if (goal.currentPracticeCount !== 0) {
    throw new SpiritualValidationError('Uma meta nova precisa nascer com currentPracticeCount=0 — progresso é sempre derivado depois, nunca definido na criação.');
  }
  repository.saveGoal(goal);
  return goal;
}
