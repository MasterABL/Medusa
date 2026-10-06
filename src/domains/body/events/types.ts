/**
 * MEDUSA — Body Domain — Event types (seção 28)
 */

import type { BodyPlan, RoutineLoadLevel } from '../model/types';

export const BODY_EVENT_TYPES = {
  BODY_PLAN_CREATED: 'BODY_PLAN_CREATED',
  BODY_SESSION_COMPLETED: 'BODY_SESSION_COMPLETED',
  ROUTINE_LOAD_CHANGED: 'ROUTINE_LOAD_CHANGED',
  RECOVERY_SUGGESTED: 'RECOVERY_SUGGESTED',
  BODY_SESSION_SCHEDULED: 'BODY_SESSION_SCHEDULED',
} as const;

export interface BodyPlanCreatedPayload {
  plan: BodyPlan;
}

export interface BodySessionCompletedPayload {
  planId: string;
  sessionId: string;
  completedAt: string;
}

export interface RoutineLoadChangedPayload {
  previousLevel: RoutineLoadLevel | null;
  newLevel: RoutineLoadLevel;
  score: number;
  evidence: string[];
}

export interface RecoverySuggestedPayload {
  planId: string;
  reason: string;
}

export interface BodySessionScheduledPayload {
  planId: string;
  sessionId: string;
  agendaItemId: string;
}
