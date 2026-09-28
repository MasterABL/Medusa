/**
 * MEDUSA FOUNDATION — Guardian lifecycle (seções 20-23)
 *
 * Liga o ciclo da ApprovalRequest ao estado da Action, que antes andavam
 * separados: aprovar/rejeitar uma request não mudava a Action, então nada
 * impedia "executar depois de rejeitada". Máquina de estados coberta aqui:
 *
 *   AWAITING_APPROVAL → (approve) → AUTHORIZED → (beginExecution) → EXECUTING → SUCCESS | FAILED
 *   AWAITING_APPROVAL → (reject)  → REJECTED   (terminal: nunca executa)
 *   AWAITING_APPROVAL → (expiry)  → CANCELLED  (terminal: aprovar depois de expirar lança)
 *
 * Vive fora de `guardian/` de propósito: importa o ActionBus, que já importa
 * o Guardian — dentro da pasta criaria um ciclo de módulos.
 *
 * Toda transição acrescenta uma entrada ao audit log (append-only) e, quando
 * é uma decisão humana, alimenta o Trust Engine. A confiança NUNCA concede
 * autoridade sozinha — quem decide continua sendo `policy.classify()`.
 */

import { getAction, updateStatus } from './actionBus';
import { GuardianApproval, GuardianAuditLog, GuardianTrust } from './guardian';
import type { Action, ActionStatus } from './types/action';
import type { ApprovalRequest } from './types/guardian';

export class GuardianLifecycleError extends Error {}

function requireAction(actionId: string): Action {
  const action = getAction(actionId);
  if (!action) throw new GuardianLifecycleError(`Action "${actionId}" não encontrada.`);
  return action;
}

/** Reaproveita a decisão original da avaliação — cada transição registra o MESMO veredito com o novo status. */
function logTransition(action: Action, status: ActionStatus): void {
  const previous = GuardianAuditLog.listForAction(action.id);
  const original = previous[0];
  if (!original) {
    throw new GuardianLifecycleError(`Action "${action.id}" nunca foi avaliada pelo Guardian — sem histórico de auditoria.`);
  }
  GuardianAuditLog.record({
    actionId: action.id,
    domain: action.domain,
    actionType: action.type,
    statusAtLog: status,
    decision: original.decision,
  });
}

export interface ApprovalResolution {
  approval: ApprovalRequest;
  action: Action;
}

/** Aprovar/rejeitar uma request pendente. Resolver duas vezes ou depois de expirar lança (nunca sobrescreve em silêncio). */
export function resolveApproval(approvalId: string, decision: 'approve' | 'reject'): ApprovalResolution {
  const request = GuardianApproval.getApprovalRequest(approvalId);
  if (!request) throw new GuardianLifecycleError(`ApprovalRequest "${approvalId}" não encontrada.`);

  const action = requireAction(request.actionId);
  if (action.status !== 'AWAITING_APPROVAL') {
    throw new GuardianLifecycleError(
      `Action "${action.id}" não está aguardando aprovação (status atual: "${action.status}").`
    );
  }

  const approval = decision === 'approve' ? GuardianApproval.approve(approvalId) : GuardianApproval.reject(approvalId);
  const updated = updateStatus(action.id, decision === 'approve' ? 'AUTHORIZED' : 'REJECTED');
  logTransition(updated, updated.status);

  GuardianTrust.recordOutcome({
    domain: action.domain,
    actionType: action.type,
    outcome: decision === 'approve' ? 'accepted' : 'rejected',
    actionId: action.id,
  });

  return { approval, action: updated };
}

/** Único caminho para começar a executar: só uma Action AUTHORIZED pode entrar em EXECUTING. */
export function beginExecution(actionId: string): Action {
  const action = requireAction(actionId);
  if (action.status !== 'AUTHORIZED') {
    throw new GuardianLifecycleError(
      `Action "${actionId}" não pode executar — status atual "${action.status}" (só "AUTHORIZED" executa).`
    );
  }
  const updated = updateStatus(actionId, 'EXECUTING');
  logTransition(updated, 'EXECUTING');
  return updated;
}

export function completeExecution(actionId: string, ok: boolean): Action {
  const action = requireAction(actionId);
  if (action.status !== 'EXECUTING') {
    throw new GuardianLifecycleError(`Action "${actionId}" não está executando (status "${action.status}").`);
  }
  const updated = updateStatus(actionId, ok ? 'SUCCESS' : 'FAILED');
  logTransition(updated, updated.status);
  return updated;
}

/** Expira requests vencidas e cancela as Actions correspondentes — depois disso, aprovar lança. */
export function expireOverdueApprovals(now: Date = new Date()): ApprovalRequest[] {
  const expired = GuardianApproval.expireOverdue(now);
  for (const request of expired) {
    const action = getAction(request.actionId);
    if (action && action.status === 'AWAITING_APPROVAL') {
      const updated = updateStatus(action.id, 'CANCELLED');
      logTransition(updated, 'CANCELLED');
    }
  }
  return expired;
}
