/**
 * MEDUSA — Guardian — runGuardianCycle
 *
 * Um ciclo completo: expira o que venceu → avança o que foi decidido fora →
 * observa → detecta → deduplica → classifica → explica → avalia → propõe →
 * autoriza → executa → verifica → registra.
 *
 * Isto é "runtime preparado para execução contínua": nenhum agendador existe
 * aqui. Um cron/worker futuro só precisa chamar `runGuardianCycle` de tempos em
 * tempos com o mesmo repositório.
 */

import { GuardianTrust } from '../../../foundation/guardian';
import * as Lifecycle from '../../../foundation/guardianLifecycle';
import { DEFAULT_CYCLE_CONFIG } from './context';
import type { CycleRuntime, GuardianCycleContext, GuardianCycleReport } from './context';
import { emit } from './context';
import { handleFinding } from './handleFinding';
import { ingestDrafts, observeAndDetect, resolveNoLongerObserved } from './ingest';
import { progressPendingProposals } from './progress';
import type { Finding, FindingSeverity } from '../model/types';

const SEVERITY_RANK: Record<FindingSeverity, number> = { critica: 3, alta: 2, moderada: 1, baixa: 0 };

function isEligible(finding: Finding, now: Date): boolean {
  if (finding.status === 'detected') return true;
  if ((finding.status === 'failed' || finding.status === 'blocked') && finding.retryAfter) {
    return new Date(finding.retryAfter).getTime() <= now.getTime();
  }
  return false;
}

export async function runGuardianCycle(context: GuardianCycleContext): Promise<GuardianCycleReport> {
  const now = (context.now ?? (() => new Date()))();
  const repo = context.repository;
  const config = { ...DEFAULT_CYCLE_CONFIG, ...context.config };
  const cycleId = repo.nextId('cycle');
  const report: GuardianCycleReport = {
    cycleId,
    startedAt: now.toISOString(),
    finishedAt: now.toISOString(),
    auditorsRun: [],
    auditorFailures: [],
    observed: 0,
    newFindings: 0,
    deduped: 0,
    reopened: 0,
    noLongerObserved: 0,
    autoFixed: 0,
    awaitingApproval: 0,
    approvedAndExecuted: 0,
    blocked: 0,
    failed: 0,
    verifiedResolved: 0,
    unverified: 0,
    rejectedByUser: 0,
    expiredApprovals: 0,
    trustEvidenceExpired: 0,
  };
  const rt: CycleRuntime = { cycleId, repo, sources: context.sources, remediations: context.remediations, now, config, report };

  emit(rt, 'CYCLE_STARTED', `Ciclo ${cycleId} iniciado com ${context.sources.length} fonte(s).`);

  // Expiração: aprovações vencidas e confiança antiga.
  Lifecycle.expireOverdueApprovals(now);
  report.trustEvidenceExpired = GuardianTrust.expireStaleEvidence(now, config.trustTtlMs);

  await progressPendingProposals(rt);

  const { observedByAuditor, drafts } = await observeAndDetect(rt);
  ingestDrafts(rt, drafts);
  resolveNoLongerObserved(rt, observedByAuditor);

  const queue = repo
    .listFindings()
    .filter((f) => isEligible(f, now))
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.createdAt.localeCompare(b.createdAt));
  for (const finding of queue) {
    await handleFinding(rt, finding);
  }

  report.finishedAt = now.toISOString();
  emit(rt, 'CYCLE_FINISHED', `Ciclo ${cycleId} concluído: ${report.newFindings} novo(s), ${report.autoFixed} auto-corrigido(s), ${report.awaitingApproval} aguardando aprovação, ${report.blocked} bloqueado(s).`);
  return report;
}
