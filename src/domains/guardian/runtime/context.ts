/**
 * MEDUSA — Guardian runtime — contexto compartilhado entre as etapas do ciclo.
 */

import { publish as publishEvent } from '../../../foundation/eventBus';
import type { Finding, GuardianEvent, GuardianEventType, Proposal } from '../model/types';
import type { ObservationSource } from '../auditors/types';
import type { GuardianRepository } from '../repository/types';
import type { RemediationRegistry } from '../remediation/registry';

export interface GuardianCycleConfig {
  /** Depois de uma recusa humana, não repropõe a mesma correção por este tempo. */
  rejectionCooldownMs: number;
  /** Depois de uma execução/verificação que falhou, a ação fica sem autonomia por este tempo. */
  failureCooldownMs: number;
  /** Evidência de confiança mais velha que isto deixa de contar. */
  trustTtlMs: number;
  /** Teto de correções automáticas por ciclo (evita rajada). */
  maxAutoFixesPerCycle: number;
}

export const DEFAULT_CYCLE_CONFIG: GuardianCycleConfig = {
  rejectionCooldownMs: 7 * 24 * 60 * 60 * 1000,
  failureCooldownMs: 24 * 60 * 60 * 1000,
  trustTtlMs: 90 * 24 * 60 * 60 * 1000,
  maxAutoFixesPerCycle: 5,
};

export interface GuardianCycleContext {
  repository: GuardianRepository;
  sources: ObservationSource[];
  remediations: RemediationRegistry;
  now?: () => Date;
  config?: Partial<GuardianCycleConfig>;
}

export interface GuardianCycleReport {
  cycleId: string;
  startedAt: string;
  finishedAt: string;
  auditorsRun: string[];
  auditorFailures: Array<{ auditor: string; error: string }>;
  observed: number;
  newFindings: number;
  deduped: number;
  reopened: number;
  noLongerObserved: number;
  autoFixed: number;
  awaitingApproval: number;
  approvedAndExecuted: number;
  blocked: number;
  failed: number;
  verifiedResolved: number;
  unverified: number;
  rejectedByUser: number;
  expiredApprovals: number;
  trustEvidenceExpired: number;
}

export interface CycleRuntime {
  cycleId: string;
  repo: GuardianRepository;
  sources: ObservationSource[];
  remediations: RemediationRegistry;
  now: Date;
  config: GuardianCycleConfig;
  report: GuardianCycleReport;
}

export function emit(rt: CycleRuntime, type: GuardianEventType, message: string, refs: { findingId?: string; proposalId?: string } = {}): void {
  const event: GuardianEvent = { id: rt.repo.nextId('gev'), cycleId: rt.cycleId, type, message, at: rt.now.toISOString(), ...refs };
  rt.repo.appendEvent(event);
}

export function saveFinding(rt: CycleRuntime, finding: Finding, patch: Partial<Finding>): Finding {
  const updated: Finding = { ...finding, ...patch, updatedAt: rt.now.toISOString() };
  rt.repo.saveFinding(updated);
  return updated;
}

export function saveProposal(rt: CycleRuntime, proposal: Proposal): Proposal {
  rt.repo.saveProposal(proposal);
  return proposal;
}

/** Publica no Event Bus só o que é seguro para outros domínios: ids e classificação, nunca evidência. */
export function publishFindingEvent(type: 'GUARDIAN_FINDING_DETECTED' | 'GUARDIAN_FINDING_RESOLVED', finding: Finding): void {
  publishEvent({
    domain: 'guardian',
    type,
    payload: { findingId: finding.id, category: finding.category, severity: finding.severity, status: finding.status },
    dedupeKey: `${type}-${finding.id}-${finding.status}`,
  });
}
