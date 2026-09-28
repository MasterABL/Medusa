/**
 * MEDUSA — Body Domain — Use Case: concluir sessão de diagnóstico e construir o perfil (seção 10-11)
 */

import { completeDiagnosticSession as completeSession, DiagnosticSessionError } from '../services/diagnosticEngine';
import { buildProfileFromAnswers } from '../services/profileEngine';
import type { BodyRepository } from '../repository/types';
import type { BodyProfile, DiagnosticSession } from '../model/types';

export interface CompleteDiagnosticResult {
  session: DiagnosticSession;
  profile: BodyProfile;
}

export function completeDiagnosticSession(
  repository: BodyRepository,
  sessionId: string,
  profileId: string,
  nowISO: string
): CompleteDiagnosticResult {
  const session = repository.getDiagnosticSession(sessionId);
  if (!session) {
    throw new DiagnosticSessionError(`Sessão de diagnóstico "${sessionId}" não encontrada.`);
  }

  const completed = completeSession(session, nowISO);
  repository.saveDiagnosticSession(completed);

  const profile = buildProfileFromAnswers(completed, profileId, nowISO);
  repository.saveProfile(profile);

  return { session: completed, profile };
}
