/**
 * MEDUSA FOUNDATION — Trust Engine (seções 5/6)
 *
 * Observa ações sugeridas → aprovadas/rejeitadas/corrigidas e deriva um
 * ActionTrustProfile interpretável. Isto é EVIDÊNCIA para a Guardian Policy
 * (policy.ts) decidir — o próprio motor de confiança nunca eleva autonomia
 * sozinho, só descreve o que já aconteceu.
 */

import type { ActionTrustProfile, TrustEvidenceEntry, TrustOutcome, TrustState } from '../types/trust';
import type { DomainId } from '../types/domain';

const RECENT_WINDOW = 10;
const MIN_SAMPLE_FOR_STABLE_STATE = 5;
const CONFIDENT_THRESHOLD = 0.85;
const ATTENTION_THRESHOLD = 0.5;

const profiles = new Map<string, ActionTrustProfile>();

function key(domain: DomainId, actionType: string): string {
  return `${domain}::${actionType}`;
}

function recentAcceptanceRate(evidence: TrustEvidenceEntry[]): number | null {
  if (evidence.length === 0) return null;
  const recent = evidence.slice(-RECENT_WINDOW);
  const accepted = recent.filter((e) => e.outcome === 'accepted').length;
  return accepted / recent.length;
}

function deriveState(sampleSize: number, rate: number | null): TrustState {
  if (sampleSize === 0 || rate === null) return 'sem_evidencia';
  if (sampleSize < MIN_SAMPLE_FOR_STABLE_STATE) return 'aprendendo';
  if (rate < ATTENTION_THRESHOLD) return 'requer_atencao';
  if (rate >= CONFIDENT_THRESHOLD) return 'confiavel';
  return 'aprendendo';
}

export interface RecordOutcomeInput {
  domain: DomainId;
  actionType: string;
  outcome: TrustOutcome;
  actionId: string;
  note?: string;
  occurredAt?: string;
}

export function recordOutcome(input: RecordOutcomeInput): ActionTrustProfile {
  const k = key(input.domain, input.actionType);
  const existing = profiles.get(k);
  const evidence: TrustEvidenceEntry[] = [
    ...(existing?.evidence ?? []),
    {
      outcome: input.outcome,
      actionId: input.actionId,
      note: input.note,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    },
  ];

  const sampleSize = evidence.length;
  const rate = recentAcceptanceRate(evidence);

  const profile: ActionTrustProfile = {
    domain: input.domain,
    actionType: input.actionType,
    state: deriveState(sampleSize, rate),
    sampleSize,
    acceptedCount: evidence.filter((e) => e.outcome === 'accepted').length,
    rejectedCount: evidence.filter((e) => e.outcome === 'rejected').length,
    correctedCount: evidence.filter((e) => e.outcome === 'corrected').length,
    recentAcceptanceRate: rate,
    evidence,
    updatedAt: new Date().toISOString(),
  };

  profiles.set(k, profile);
  return profile;
}

export function getTrust(domain: DomainId, actionType: string): ActionTrustProfile | undefined {
  return profiles.get(key(domain, actionType));
}

export function listTrustProfiles(): ActionTrustProfile[] {
  return Array.from(profiles.values());
}

/** Só para testes de contrato. */
export function __resetTrustForTests(): void {
  profiles.clear();
}
