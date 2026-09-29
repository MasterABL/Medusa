/**
 * Ponte única entre a UI dos domínios e a fundação (Guardian / registros).
 *
 * A UI nunca reimplementa política: só (1) garante que os domínios foram registrados uma vez e
 * (2) executa o passo "aprovado por uma pessoa → executor do domínio" usando a máquina de
 * estados real de `guardianLifecycle` (AWAITING_APPROVAL → AUTHORIZED → EXECUTING → SUCCESS|FAILED).
 */

import { bootstrapDomains } from '@/foundation/domains';
import { GuardianApproval } from '@/foundation/guardian';
import { beginExecution, completeExecution, resolveApproval } from '@/foundation/guardianLifecycle';
import type { GuardianEvaluation } from '@/foundation/types/guardian';

let ready = false;

/** Idempotente (StrictMode/HMR reavaliam módulos). */
export function ensureDomains(): void {
  if (ready) return;
  ready = true;
  bootstrapDomains();
}

export type DecisionRoute = 'automatica' | 'aguardando_aprovacao';

export function routeOf(evaluation: GuardianEvaluation): DecisionRoute {
  return evaluation.decision.requiresApproval ? 'aguardando_aprovacao' : 'automatica';
}

/**
 * A pessoa clicou em "aprovar" numa ação que o Guardian deixou pendente: resolve a aprovação,
 * abre a execução, roda o executor do domínio e fecha com sucesso/falha reais.
 * Se o executor lançar, a Action termina em FAILED e o erro sobe — nunca "concluído" antes da hora.
 */
export function approveAndRun(actionId: string, execute: () => void): void {
  const request = GuardianApproval.listApprovalRequests({ status: 'pending' }).find((r) => r.actionId === actionId);
  if (!request) throw new Error(`Não há aprovação pendente para a ação "${actionId}".`);
  resolveApproval(request.id, 'approve');
  beginExecution(actionId);
  try {
    execute();
    completeExecution(actionId, true);
  } catch (error) {
    completeExecution(actionId, false);
    throw error;
  }
}

export function rejectPending(actionId: string): void {
  const request = GuardianApproval.listApprovalRequests({ status: 'pending' }).find((r) => r.actionId === actionId);
  if (!request) throw new Error(`Não há aprovação pendente para a ação "${actionId}".`);
  resolveApproval(request.id, 'reject');
}
