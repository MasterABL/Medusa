/**
 * MEDUSA — Body Domain — Use Case: iniciar sessão de diagnóstico (seção 10)
 *
 * Entrada de dados pura — não é uma decisão de autonomia, então não passa
 * pelo Guardian (mesmo raciocínio de "registrar" vs. "agir" usado em
 * Espiritual: só ações derivadas do sistema, como CREATE_BODY_PLAN, vão a
 * ele).
 */

import { startDiagnosticSession } from '../services/diagnosticEngine';
import type { BodyRepository } from '../repository/types';
import type { DiagnosticSession } from '../model/types';

export function createDiagnosticSession(repository: BodyRepository, id: string, nowISO: string): DiagnosticSession {
  const session = startDiagnosticSession(id, nowISO);
  repository.saveDiagnosticSession(session);
  return session;
}
