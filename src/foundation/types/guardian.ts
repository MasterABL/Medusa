/**
 * MEDUSA FOUNDATION — Guardian model
 *
 * Guardian não é um cadeado nem uma tela de toggles (seção 7). É
 * AUTONOMIA + CONFIANÇA + RISCO + AUDITORIA + APROVAÇÃO, todas modeladas
 * como dados navegáveis — não como lógica escondida dentro de um componente.
 */

import type { DomainId } from './domain';
import type { Action, ActionStatus } from './action';
import type { AutonomyDecision, AutonomyLevel } from './autonomy';

export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface ApprovalRequest {
  id: string;
  actionId: string;
  domain: DomainId;
  /** Por que isto está pedindo aprovação — nunca só "L3", sempre a explicação. */
  reason: string;
  impact: string;
  status: ApprovalRequestStatus;
  createdAt: string;
  resolvedAt?: string;
  expiresAt?: string;
}

/**
 * Registro append-only. Toda avaliação de ação passa por aqui — mesmo quando
 * o resultado é "executada automaticamente" (seção 41: nenhum domínio tem
 * bypass do caminho Action → Guardian Policy → Authorization → Execution).
 */
export interface ActionAuditLogEntry {
  id: string;
  actionId: string;
  domain: DomainId;
  actionType: string;
  autonomyLevel: AutonomyLevel;
  statusAtLog: ActionStatus;
  decision: AutonomyDecision;
  createdAt: string;
}

/**
 * O que o Guardian devolve ao avaliar uma Action — a peça central que liga
 * autonomy.ts + trust.ts + approval + audit num resultado só, sem que o
 * domínio chamador precise conhecer a lógica interna de nenhum dos quatro.
 */
export interface GuardianEvaluation {
  action: Action;
  decision: AutonomyDecision;
  approvalRequest?: ApprovalRequest;
  auditLogEntry: ActionAuditLogEntry;
}
