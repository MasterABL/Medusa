/**
 * MEDUSA — Spiritual Domain — Validators (seção 35)
 */

import type { SpiritualGoal, SpiritualPractice, SpiritualReflection } from '../model/types';

export class SpiritualValidationError extends Error {}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/;

export function validateDate(value: string, field = 'date'): void {
  if (!ISO_DATE_RE.test(value)) {
    throw new SpiritualValidationError(`${field} precisa ser uma data ISO 8601 válida, recebeu: "${value}"`);
  }
}

export function validatePractice(practice: SpiritualPractice): void {
  validateDate(practice.completedAt, 'practice.completedAt');
  if (!practice.label.trim()) {
    throw new SpiritualValidationError('practice.label não pode ser vazio.');
  }
  if (practice.durationMinutes !== undefined && practice.durationMinutes < 0) {
    throw new SpiritualValidationError(`practice.durationMinutes não pode ser negativo: ${practice.durationMinutes}`);
  }
}

export function validateReflection(reflection: SpiritualReflection): void {
  validateDate(reflection.createdAt, 'reflection.createdAt');
  if (!reflection.content.trim()) {
    throw new SpiritualValidationError('reflection.content não pode ser vazio.');
  }
  if (reflection.visibility !== 'private') {
    throw new SpiritualValidationError(`reflection.visibility só suporta "private" nesta rodada, recebeu: "${reflection.visibility}"`);
  }
}

export function validateGoalConsistency(goal: SpiritualGoal, practicesLinkedToGoal: SpiritualPractice[]): void {
  if (goal.currentPracticeCount !== practicesLinkedToGoal.length) {
    throw new SpiritualValidationError(
      `goal.currentPracticeCount (${goal.currentPracticeCount}) não bate com o número de práticas vinculadas encontradas (${practicesLinkedToGoal.length}) — progresso precisa ser derivado, nunca setado manualmente de forma incoerente.`
    );
  }
  if (goal.targetPracticeCount !== undefined && goal.targetPracticeCount <= 0) {
    throw new SpiritualValidationError(`goal.targetPracticeCount precisa ser positivo: ${goal.targetPracticeCount}`);
  }
}
