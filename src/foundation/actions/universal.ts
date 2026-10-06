/**
 * MEDUSA FOUNDATION — Action Center universal (leitura)
 *
 * A mesma Action do ActionBus, vista de forma transversal — de qualquer
 * domínio ou motor (lembrete, planner, recomendação, finanças):
 *
 *   Action ├ sourceDomain ├ risk ├ autonomy ├ reason ├ status
 *          ├ approval ├ execution └ outcome
 *
 * Não cria armazenamento: lê ActionBus, AuditLog, Approval e Outcome.
 */

import { listActions } from '../actionBus';
import { GuardianApproval, GuardianAuditLog } from '../guardian';
import { latestOutcome } from '../guardianTrace/outcome';
import type { Action } from '../types/action';
import type { AutonomyLevel, RiskLevel } from '../types/autonomy';
import type { DomainId } from '../types/domain';
import type { ApprovalRequest } from '../types/guardian';
import type { ActionOutcome } from '../types/guardianTrace';
import type { DataOrigin, DataState } from '../types/dataState';
import * as DS from '../dataState';

export interface UniversalAction {
  id: string;
  sourceDomain: DomainId;
  type: string;
  intent: string;
  risk: RiskLevel;
  autonomy?: AutonomyLevel;
  /** Por que a política decidiu esse nível (texto da decisão auditada). */
  reason?: string;
  status: Action['status'];
  approval?: Pick<ApprovalRequest, 'id' | 'status' | 'reason' | 'impact' | 'expiresAt'>;
  execution: { executedAt?: string; reversible: boolean; undoAvailable: boolean };
  outcome?: Pick<ActionOutcome, 'result' | 'evidence' | 'observedAt'>;
  correlationId?: string;
  createdAt: string;
}

export function toUniversalAction(action: Action): UniversalAction {
  const audit = GuardianAuditLog.listForAction(action.id)[0];
  const approval = GuardianApproval.listApprovalRequests().find((r) => r.actionId === action.id);
  const outcome = latestOutcome(action.id);
  return {
    id: action.id,
    sourceDomain: action.domain,
    type: action.type,
    intent: action.intent,
    risk: action.riskLevel,
    autonomy: action.autonomyLevel,
    reason: audit?.decision.reason,
    status: action.status,
    approval: approval ? { id: approval.id, status: approval.status, reason: approval.reason, impact: approval.impact, expiresAt: approval.expiresAt } : undefined,
    execution: { executedAt: action.executedAt, reversible: action.reversible, undoAvailable: action.reversible && action.status === 'SUCCESS' },
    outcome: outcome ? { result: outcome.result, evidence: outcome.evidence, observedAt: outcome.observedAt } : undefined,
    correlationId: action.correlationId,
    createdAt: action.createdAt,
  };
}

export interface UniversalActionCenter {
  awaitingApproval: UniversalAction[];
  autonomous: UniversalAction[];
  recent: UniversalAction[];
  byDomain: Partial<Record<DomainId, number>>;
}

export function buildUniversalActionCenter(filter?: { domain?: DomainId }, limit = 30): UniversalActionCenter {
  const all = listActions(filter).map(toUniversalAction).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const byDomain: Partial<Record<DomainId, number>> = {};
  for (const a of all) byDomain[a.sourceDomain] = (byDomain[a.sourceDomain] ?? 0) + 1;
  return {
    awaitingApproval: all.filter((a) => a.status === 'AWAITING_APPROVAL'),
    autonomous: all.filter((a) => a.autonomy === 'L1' && a.approval === undefined).slice(0, limit),
    recent: all.slice(0, limit),
    byDomain,
  };
}

export function selectUniversalActionCenter(now: string, origin: DataOrigin = 'real', filter?: { domain?: DomainId }): DataState<UniversalActionCenter> {
  const center = buildUniversalActionCenter(filter);
  return center.recent.length === 0 ? DS.empty('Nenhuma ação proposta ainda.') : DS.ready(center, origin, now);
}
