/**
 * MEDUSA — Body Domain — Repository boundary (seção 33)
 */

import type { BodyActivity, BodyPlan, BodyProfile, DiagnosticSession } from '../model/types';

export interface BodyRepository {
  getDiagnosticSession(id: string): DiagnosticSession | undefined;
  saveDiagnosticSession(session: DiagnosticSession): void;
  listDiagnosticSessions(): DiagnosticSession[];

  getProfile(id: string): BodyProfile | undefined;
  saveProfile(profile: BodyProfile): void;

  getPlan(id: string): BodyPlan | undefined;
  listPlans(filter?: { status?: BodyPlan['status'] }): BodyPlan[];
  savePlan(plan: BodyPlan): void;

  getActivity(id: string): BodyActivity | undefined;
  listActivities(filter?: { category?: BodyActivity['category'] }): BodyActivity[];
  saveActivity(activity: BodyActivity): void;
}
