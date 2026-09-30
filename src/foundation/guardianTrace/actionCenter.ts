/**
 * MEDUSA FOUNDATION — Action Center (leitura)
 *
 * O que uma tela de "centro de ações" precisa, já resolvido: o que espera
 * aprovação, o que o Guardian fez sozinho (com resultado e desfazer), o que
 * foi decidido recentemente e em que pé está a autonomia de cada tipo de ação.
 * Sem layout: só dados.
 */

import type { ActionCenterView, AutonomousExecutionItem, AutonomyRow, PendingApprovalItem } from '../types/guardianTrace';
import type { DataOrigin, DataState } from '../types/dataState';
import * as DS from '../dataState';
import { getAction, listActions } from '../actionBus';
import { GuardianApproval, GuardianPolicy, GuardianTrust } from '../guardian';
import { latestOutcome } from './outcome';
import { activeGrantFor, isGrantInert } from './grant';

export function buildActionCenter(now: string, opts: { recentLimit?: number } = {}): ActionCenterView {
  const limit = opts.recentLimit ?? 20;
  const nowMs = Date.parse(now);

  const awaitingApproval: PendingApprovalItem[] = GuardianApproval.listApprovalRequests({ status: 'pending' })
    .map((approval) => ({ approval, action: getAction(approval.actionId) }))
    .filter((x): x is { approval: typeof x.approval; action: NonNullable<typeof x.action> } => x.action !== undefined)
    .map(({ approval, action }) => ({ approval, action, expiresInMs: approval.expiresAt ? Date.parse(approval.expiresAt) - nowMs : undefined }))
    .sort((a, b) => (a.expiresInMs ?? Number.MAX_SAFE_INTEGER) - (b.expiresInMs ?? Number.MAX_SAFE_INTEGER));

  const autonomousRecent: AutonomousExecutionItem[] = listActions()
    .filter((a) => !a.requiresApproval && (a.status === 'SUCCESS' || a.status === 'FAILED' || a.status === 'EXECUTING' || a.status === 'UNDONE'))
    .sort((a, b) => (b.executedAt ?? b.createdAt).localeCompare(a.executedAt ?? a.createdAt))
    .slice(0, limit)
    .map((action) => ({ action, level: action.autonomyLevel ?? 'L1', outcome: latestOutcome(action.id), undoAvailable: action.reversible && action.status === 'SUCCESS' }));

  const resolvedRecent = GuardianApproval.listApprovalRequests()
    .filter((r) => r.status !== 'pending')
    .sort((a, b) => (b.resolvedAt ?? b.createdAt).localeCompare(a.resolvedAt ?? a.createdAt))
    .slice(0, limit)
    .map((approval) => ({ approval, action: getAction(approval.actionId) }));

  const keys = new Map<string, { domain: AutonomyRow['domain']; actionType: string }>();
  for (const r of GuardianPolicy.listAutonomyRules()) keys.set(`${r.domain}::${r.actionType}`, { domain: r.domain, actionType: r.actionType });
  for (const t of GuardianTrust.listTrustProfiles()) keys.set(`${t.domain}::${t.actionType}`, { domain: t.domain, actionType: t.actionType });

  const autonomy: AutonomyRow[] = Array.from(keys.values())
    .map(({ domain, actionType }) => {
      const rule = GuardianPolicy.getAutonomyRule(domain, actionType);
      const trust = GuardianTrust.getTrust(domain, actionType);
      return {
        domain,
        actionType,
        ceiling: rule?.ceilingLevel ?? ('desconhecido' as const),
        trust: trust ? { state: trust.state, sampleSize: trust.sampleSize, recentAcceptanceRate: trust.recentAcceptanceRate } : undefined,
        activeGrant: activeGrantFor(domain, actionType, now),
        grantInert: isGrantInert(domain, actionType),
      };
    })
    .sort((a, b) => a.domain.localeCompare(b.domain) || a.actionType.localeCompare(b.actionType));

  return {
    generatedAt: now,
    awaitingApproval,
    autonomousRecent,
    resolvedRecent,
    autonomy,
    counts: {
      awaiting: awaitingApproval.length,
      autonomousRecent: autonomousRecent.length,
      failedRecent: autonomousRecent.filter((i) => i.action.status === 'FAILED' || i.outcome?.result === 'falhou' || i.outcome?.result === 'sem_efeito').length,
    },
  };
}

/**
 * Estado de dado do Action Center. Aprovações pendentes são CONTEÚDO dele (a tela
 * destaca `awaitingApproval`), não um bloqueio: o estado continua `ready`.
 */
export function selectActionCenter(now: string, origin: DataOrigin = 'real'): DataState<ActionCenterView> {
  const view = buildActionCenter(now);
  const nothing = view.awaitingApproval.length === 0 && view.autonomousRecent.length === 0 && view.resolvedRecent.length === 0;
  return nothing ? DS.empty('O Guardian ainda não avaliou nenhuma ação.') : DS.ready(view, origin, now);
}
