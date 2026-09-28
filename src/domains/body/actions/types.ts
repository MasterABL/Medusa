/**
 * MEDUSA — Body Domain — Action types (seção 18)
 *
 * Ações de planejamento são reversíveis por natureza — nada aqui é clínico,
 * nada executa algo irreversível no mundo real.
 */

import type { BodyPlan } from '../model/types';

export const BODY_ACTION_TYPES = {
  CREATE_BODY_PLAN: 'CREATE_BODY_PLAN',
  SCHEDULE_WORKOUT: 'SCHEDULE_WORKOUT',
  SCHEDULE_LIGHT_ACTIVITY: 'SCHEDULE_LIGHT_ACTIVITY',
  MOVE_BODY_SESSION: 'MOVE_BODY_SESSION',
  PAUSE_BODY_PLAN: 'PAUSE_BODY_PLAN',
  RESUME_BODY_PLAN: 'RESUME_BODY_PLAN',
} as const;

export interface CreateBodyPlanPayload {
  plan: BodyPlan;
}

export interface ScheduleWorkoutPayload {
  planId: string;
  sessionId: string;
  proposedDate: string;
  proposedWindowLabel?: string;
}

export interface ScheduleLightActivityPayload {
  activityId: string;
  proposedDate: string;
  durationMinutes: number;
  reason: string;
}

export interface MoveBodySessionPayload {
  planId: string;
  sessionId: string;
  newDate: string;
}

export interface PauseBodyPlanPayload {
  planId: string;
  reason?: string;
}

export interface ResumeBodyPlanPayload {
  planId: string;
}
