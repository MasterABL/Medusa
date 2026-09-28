/**
 * MEDUSA — Spiritual Domain — Event types (seção 28)
 *
 * Nunca carrega `content` de reflexão — só metadado (seção 26).
 */

export const SPIRITUAL_EVENT_TYPES = {
  PRACTICE_COMPLETED: 'PRACTICE_COMPLETED',
  REFLECTION_CREATED: 'REFLECTION_CREATED',
  GOAL_PROGRESS_CHANGED: 'GOAL_PROGRESS_CHANGED',
  PRACTICE_SCHEDULED: 'PRACTICE_SCHEDULED',
} as const;

export interface PracticeCompletedPayload {
  practiceId: string;
  practiceType: string;
  relatedGoalId?: string;
}

export interface ReflectionCreatedPayload {
  reflectionId: string;
  /** Nunca o texto — só o tamanho, como o resto do sistema de privacidade exige. */
  contentLength: number;
}

export interface GoalProgressChangedPayload {
  goalId: string;
  previousCount: number;
  newCount: number;
}

export interface PracticeScheduledPayload {
  practiceType: string;
  proposedDate: string;
}
