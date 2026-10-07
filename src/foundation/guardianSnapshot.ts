/**
 * MEDUSA FOUNDATION — Snapshot do Guardian (persistência das ações)
 *
 * Exporta/importa, num único objeto versionado, tudo o que o Guardian sabe:
 * ações, pedidos de aprovação, audit log, resultados, contexto da decisão,
 * feedback e perfis de confiança. Antes disto o Action Center vivia só na
 * memória da aba: recarregar a página apagava propostas pendentes e a trilha
 * de auditoria inteira.
 *
 * DECISÃO DE SEGURANÇA (o motivo de `persistence/stores.ts` ter deixado isto
 * como "somente exportação"): re-hidratar não pode virar re-execução.
 *
 *   AWAITING_APPROVAL → volta aguardando (o pedido mantém o prazo original;
 *                        vencido, expira normalmente e a ação vira CANCELLED)
 *   AUTHORIZED        → volta como histórico com `restoredAt`: `executeAuthorized`
 *                        recusa executá-la. Para agir, propõe-se de novo.
 *   EXECUTING         → a sessão morreu no meio: vira FAILED com resultado
 *                        "falhou" e o motivo — nunca SUCCESS presumido.
 *   terminais         → voltam como estavam (histórico imutável).
 *
 * Vive fora de `guardian/` pelo mesmo motivo do lifecycle: importa o ActionBus.
 */

import { listActions, restoreActions, updateStatus, getAction } from './actionBus';
import { GuardianApproval, GuardianAuditLog, GuardianTrust } from './guardian';
import { listOutcomes, recordOutcomeResult, restoreOutcomes } from './guardianTrace/outcome';
import { listDecisionContext, restoreDecisionContexts } from './guardianTrace/decisionContext';
import { listFeedback, restoreFeedback } from './guardianTrace/feedback';
import type { Action } from './types/action';
import type { ActionAuditLogEntry, ApprovalRequest } from './types/guardian';
import type { ActionFeedback, ActionOutcome, DecisionContextRecord } from './types/guardianTrace';
import type { ActionTrustProfile } from './types/trust';

export const GUARDIAN_SNAPSHOT_VERSION = 1;

export interface GuardianSnapshot {
  version: number;
  actions: Action[];
  approvals: ApprovalRequest[];
  audit: ActionAuditLogEntry[];
  outcomes: ActionOutcome[];
  contexts: DecisionContextRecord[];
  feedback: ActionFeedback[];
  trust: ActionTrustProfile[];
}

export interface GuardianRestoreReport {
  actions: number;
  awaitingApproval: number;
  /** AUTHORIZED de outra sessão: mantidas como histórico, nunca reexecutadas. */
  authorizedKeptAsHistory: number;
  /** EXECUTING interrompidas pelo recarregamento → FAILED. */
  interruptedMarkedFailed: number;
}

export function exportGuardianState(): GuardianSnapshot {
  return {
    version: GUARDIAN_SNAPSHOT_VERSION,
    actions: listActions(),
    approvals: GuardianApproval.listApprovalRequests(),
    audit: GuardianAuditLog.listRecent(Number.MAX_SAFE_INTEGER).reverse(),
    outcomes: listOutcomes(),
    contexts: listDecisionContext(),
    feedback: listFeedback(),
    trust: GuardianTrust.listTrustProfiles(),
  };
}

export function isGuardianSnapshot(data: unknown): data is GuardianSnapshot {
  const d = data as GuardianSnapshot;
  return !!d && typeof d.version === 'number' && Array.isArray(d.actions) && Array.isArray(d.approvals) && Array.isArray(d.audit);
}

export function importGuardianState(snapshot: GuardianSnapshot, restoredAt: string = new Date().toISOString()): GuardianRestoreReport {
  if (snapshot.version !== GUARDIAN_SNAPSHOT_VERSION) throw new Error(`Versão de snapshot do Guardian desconhecida: ${snapshot.version}.`);

  const report: GuardianRestoreReport = { actions: 0, awaitingApproval: 0, authorizedKeptAsHistory: 0, interruptedMarkedFailed: 0 };
  const interrupted: string[] = [];

  const prepared = snapshot.actions.map((a) => {
    if (a.status === 'AWAITING_APPROVAL') report.awaitingApproval += 1;
    if (a.status === 'AUTHORIZED') report.authorizedKeptAsHistory += 1;
    if (a.status === 'EXECUTING') interrupted.push(a.id);
    // Pendente de aprovação continua decidível nesta sessão (aprovar agora autoriza agora).
    // Todo o resto é histórico de outra sessão e leva `restoredAt` — nunca reexecuta.
    return a.status === 'AWAITING_APPROVAL' ? { ...a } : { ...a, restoredAt };
  });

  report.actions = restoreActions(prepared);
  GuardianApproval.restoreApprovalRequests(snapshot.approvals);
  GuardianAuditLog.restoreAuditEntries(snapshot.audit);
  restoreOutcomes(snapshot.outcomes ?? []);
  restoreDecisionContexts(snapshot.contexts ?? []);
  restoreFeedback(snapshot.feedback ?? []);
  GuardianTrust.restoreTrustProfiles(snapshot.trust ?? []);

  for (const id of interrupted) {
    const action = getAction(id);
    if (!action || action.status !== 'EXECUTING') continue;
    const original = GuardianAuditLog.listForAction(id)[0];
    const failed = updateStatus(id, 'FAILED');
    if (original) {
      GuardianAuditLog.record({ actionId: id, domain: failed.domain, actionType: failed.type, statusAtLog: 'FAILED', decision: original.decision });
    }
    recordOutcomeResult({ actionId: id, result: 'falhou', evidence: 'Execução interrompida: a página foi recarregada antes de terminar. Nada foi presumido como concluído.' });
    report.interruptedMarkedFailed += 1;
  }

  return report;
}
