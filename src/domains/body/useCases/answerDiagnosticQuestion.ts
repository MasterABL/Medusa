/**
 * MEDUSA — Body Domain — Use Case: responder pergunta do diagnóstico (seção 10)
 */

import { answerQuestion, DiagnosticSessionError } from '../services/diagnosticEngine';
import type { BodyRepository } from '../repository/types';
import type { BodyAnswer, DiagnosticSession } from '../model/types';

export function answerDiagnosticQuestion(repository: BodyRepository, sessionId: string, answer: BodyAnswer): DiagnosticSession {
  const session = repository.getDiagnosticSession(sessionId);
  if (!session) {
    throw new DiagnosticSessionError(`Sessão de diagnóstico "${sessionId}" não encontrada.`);
  }

  const updated = answerQuestion(session, answer);
  repository.saveDiagnosticSession(updated);
  return updated;
}
