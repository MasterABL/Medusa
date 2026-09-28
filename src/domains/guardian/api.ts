/**
 * MEDUSA — Guardian — contratos para a futura UI e para outros domínios.
 * Somente leitura + operações explícitas; nenhuma regra de decisão vive aqui.
 */

import { GuardianPolicy } from '../../foundation/guardian';
import { publish as publishMessage } from '../../foundation/messaging/proactiveMessage';
import type { AutonomyPolicyRule } from '../../foundation/types/autonomy';
import type { DomainId } from '../../foundation/types/domain';
import type { ExecutionRecord, Finding, GuardianEvent, Proposal } from './model/types';
import type { GuardianRepository } from './repository/types';
import { assessAutonomy } from './pipeline/assess';
import type { AutonomyAssessment } from './pipeline/assess';
import type { RemediationRegistry } from './remediation/registry';

const OPEN: Finding['status'][] = ['detected', 'awaiting_approval', 'in_progress', 'unverified', 'failed', 'blocked'];

export function getOpenFindings(repo: GuardianRepository): Finding[] {
  return repo.listFindings().filter((f) => OPEN.includes(f.status));
}

export interface FindingDetail {
  finding: Finding;
  proposal?: Proposal;
  executions: ExecutionRecord[];
  timeline: GuardianEvent[];
}

export function getFindingDetail(repo: GuardianRepository, findingId: string): FindingDetail | undefined {
  const finding = repo.getFinding(findingId);
  if (!finding) return undefined;
  return {
    finding,
    proposal: finding.proposalId ? repo.getProposal(finding.proposalId) : undefined,
    executions: repo.listExecutions({ findingId }),
    timeline: repo.listEvents({ findingId }),
  };
}

export function getCycleTimeline(repo: GuardianRepository, cycleId: string): GuardianEvent[] {
  return repo.listEvents({ cycleId });
}

export function getAutonomyAssessments(repo: GuardianRepository, remediations: RemediationRegistry, now: Date): AutonomyAssessment[] {
  return GuardianPolicy.listAutonomyRules()
    .filter((r) => r.domain === 'guardian')
    .map((r) => assessAutonomy({ actionKey: r.actionType, reversible: r.reversible, repository: repo, remediations, now }));
}

export interface PolicyExplanation {
  domain: DomainId;
  actionType: string;
  ceiling: AutonomyPolicyRule['ceilingLevel'];
  reversible: boolean;
  text: string;
}

/** Explica as políticas registradas para um domínio, em linguagem simples. */
export function explainPolicies(domain: DomainId): PolicyExplanation[] {
  return GuardianPolicy.listAutonomyRules()
    .filter((r) => r.domain === domain)
    .map((r) => ({
      domain,
      actionType: r.actionType,
      ceiling: r.ceilingLevel,
      reversible: r.reversible,
      text:
        r.ceilingLevel === 'L1'
          ? `${r.actionType}: pode rodar sozinha só depois de acumular confiança; antes disso vira proposta. ${r.reversible ? 'É reversível.' : 'É irreversível, então sempre exige supervisão.'}`
          : r.ceilingLevel === 'L2'
            ? `${r.actionType}: sempre proposta — o Guardian prepara e uma pessoa decide.`
            : `${r.actionType}: alto impacto — sempre exige aprovação humana, com qualquer nível de confiança.`,
    }));
}

/** Depois de registrar um remediador novo, um finding bloqueado por falta dele pode ser reavaliado. */
export function reconsiderFinding(repo: GuardianRepository, findingId: string, now: Date): Finding {
  const finding = repo.getFinding(findingId);
  if (!finding) throw new Error(`Finding "${findingId}" não encontrado.`);
  if (finding.status !== 'blocked' && finding.status !== 'failed') throw new Error(`Só findings "blocked"/"failed" podem ser reavaliados (atual: ${finding.status}).`);
  const updated: Finding = { ...finding, status: 'detected', retryAfter: undefined, outcome: undefined, updatedAt: now.toISOString() };
  repo.saveFinding(updated);
  return updated;
}

/**
 * Publica no canal "guardian" as pendências que exigem uma pessoa (aprovação ou
 * decisão). Mensagens usam só categoria/severidade/origem — nunca a evidência.
 * Cooldown por finding evita repetir o mesmo aviso.
 */
export function publishFindingMessages(repo: GuardianRepository): number {
  let published = 0;
  for (const f of repo.listFindings().filter((x) => x.status === 'awaiting_approval' || x.status === 'blocked')) {
    const message = publishMessage({
      domain: 'guardian',
      message: f.status === 'awaiting_approval' ? `Correção aguardando sua aprovação (${f.category}, severidade ${f.severity}).` : `Achado que precisa de decisão humana (${f.category}, severidade ${f.severity}).`,
      evidence: { reason: f.outcome?.reason ?? 'Proposta aguardando aprovação.', evidence: [`origem: ${f.origin}`, `id: ${f.id}`] },
      priority: f.severity === 'critica' ? 3 : f.severity === 'alta' ? 2 : 1,
      urgency: f.severity === 'critica' ? 'alta' : 'normal',
      surfaceTargets: ['guardian'],
      cooldownKey: `guardian-finding-${f.id}-${f.status}`,
      cooldownMs: 24 * 60 * 60 * 1000,
    });
    if (message) published += 1;
  }
  return published;
}
