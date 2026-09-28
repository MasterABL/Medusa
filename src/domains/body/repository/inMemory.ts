/**
 * MEDUSA — Body Domain — In-memory repository
 *
 * Mesma filosofia do Finance: instância isolada por chamada, nunca um
 * singleton global — quem quiser compartilhar estado entre chamadas decide
 * isso explicitamente guardando a referência devolvida.
 */

import type { BodyActivity, BodyPlan, BodyProfile, DiagnosticSession } from '../model/types';
import type { BodyRepository } from './types';

export function createInMemoryBodyRepository(): BodyRepository {
  const sessions = new Map<string, DiagnosticSession>();
  const profiles = new Map<string, BodyProfile>();
  const plans = new Map<string, BodyPlan>();
  const activities = new Map<string, BodyActivity>();

  return {
    getDiagnosticSession: (id) => sessions.get(id),
    saveDiagnosticSession: (session) => void sessions.set(session.id, session),
    listDiagnosticSessions: () => Array.from(sessions.values()),

    getProfile: (id) => profiles.get(id),
    saveProfile: (profile) => void profiles.set(profile.id, profile),

    getPlan: (id) => plans.get(id),
    listPlans: (filter) =>
      Array.from(plans.values()).filter((p) => !filter?.status || p.status === filter.status),
    savePlan: (plan) => void plans.set(plan.id, plan),

    getActivity: (id) => activities.get(id),
    listActivities: (filter) =>
      Array.from(activities.values()).filter((a) => !filter?.category || a.category === filter.category),
    saveActivity: (activity) => void activities.set(activity.id, activity),
  };
}
