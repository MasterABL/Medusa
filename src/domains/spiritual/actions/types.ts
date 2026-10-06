/**
 * MEDUSA — Spiritual Domain — Action types (seção 25/28)
 *
 * Só as duas ações que já estavam registradas na política do Guardian
 * (`DEFAULT_AUTONOMY_RULES`, ambas L1): SCHEDULE_PRACTICE e
 * UPDATE_GOAL_PROGRESS. Registrar prática/reflexão em si NÃO é uma decisão
 * de autonomia — é entrada de dado direta do usuário, então não vira Action.
 */

export const SPIRITUAL_ACTION_TYPES = {
  SCHEDULE_PRACTICE: 'SCHEDULE_PRACTICE',
  UPDATE_GOAL_PROGRESS: 'UPDATE_GOAL_PROGRESS',
} as const;

export interface SchedulePracticePayload {
  practiceType: string;
  label: string;
  proposedDate: string;
}

export interface UpdateGoalProgressPayload {
  goalId: string;
  triggeredByPracticeId: string;
}
