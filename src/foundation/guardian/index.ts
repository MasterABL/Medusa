/**
 * MEDUSA FOUNDATION — Guardian facade (seção 41)
 *
 * O único caminho válido para qualquer ação de qualquer domínio:
 *
 *   Domain → Action → Guardian Policy → Authorization → Execution
 *
 * `evaluate()` é essa porta única. Nenhum domínio deve chamar policy.ts,
 * trust.ts, approval.ts ou auditLog.ts diretamente para decidir se pode agir
 * — isso seria reabrir exatamente o bypass que esta seção proíbe.
 */

import type { Action } from '../types/action';
import type { GuardianEvaluation } from '../types/guardian';
import { classify } from './policy';
import { getTrust } from './trust';
import { createApprovalRequest } from './approval';
import { record } from './auditLog';

/**
 * Avalia uma Action contra a política + o trust profile atual, gera o
 * ActionAuditLogEntry (sempre — mesmo quando a decisão é "executa sozinho") e,
 * quando necessário, cria a ApprovalRequest correspondente.
 *
 * Devolve a Action com `autonomyLevel`/`requiresApproval`/`status` já
 * atualizados — quem chamou nunca decide esses campos por fora.
 */
export function evaluate(action: Action): GuardianEvaluation {
  const trust = getTrust(action.domain, action.type);
  const decision = classify(action, trust);

  const evaluatedAction: Action = {
    ...action,
    autonomyLevel: decision.level,
    requiresApproval: decision.requiresApproval,
    status: decision.requiresApproval ? 'AWAITING_APPROVAL' : 'AUTHORIZED',
  };

  const approvalRequest = decision.requiresApproval
    ? createApprovalRequest({
        actionId: evaluatedAction.id,
        domain: evaluatedAction.domain,
        reason: decision.reason,
        impact: evaluatedAction.intent,
      })
    : undefined;

  const auditLogEntry = record({
    actionId: evaluatedAction.id,
    domain: evaluatedAction.domain,
    actionType: evaluatedAction.type,
    statusAtLog: evaluatedAction.status,
    decision,
  });

  evaluatedAction.auditReference = auditLogEntry.id;

  return {
    action: evaluatedAction,
    decision,
    approvalRequest,
    auditLogEntry,
  };
}

export * as GuardianPolicy from './policy';
export * as GuardianTrust from './trust';
export * as GuardianApproval from './approval';
export * as GuardianAuditLog from './auditLog';
