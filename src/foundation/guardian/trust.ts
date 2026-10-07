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

function buildProfile(domain: DomainId, actionType: string, evidence: TrustEvidenceEntry[]): ActionTrustProfile {
  const sampleSize = evidence.length;
  const rate = recentAcceptanceRate(evidence);
  return {
    domain,
    actionType,
    state: deriveState(sampleSize, rate),
    sampleSize,
    acceptedCount: evidence.filter((e) => e.outcome === 'accepted').length,
    rejectedCount: evidence.filter((e) => e.outcome === 'rejected').length,
    correctedCount: evidence.filter((e) => e.outcome === 'corrected').length,
    recentAcceptanceRate: rate,
    evidence,
    updatedAt: new Date().toISOString(),
  };
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

  const profile = buildProfile(input.domain, input.actionType, evidence);
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

/**
 * Expiração de confiança: evidência mais velha que `ttlMs` deixa de contar. Sem
 * isto, uma aprovação de meses atrás sustentaria autonomia para sempre. Devolve
 * quantas entradas foram descartadas (0 = nada mudou).
 */
export function expireStaleEvidence(now: Date, ttlMs: number): number {
  let dropped = 0;
  for (const [k, profile] of Array.from(profiles.entries())) {
    const kept = profile.evidence.filter((e) => now.getTime() - new Date(e.occurredAt).getTime() <= ttlMs);
    const removed = profile.evidence.length - kept.length;
    if (removed === 0) continue;
    dropped += removed;
    if (kept.length === 0) profiles.delete(k);
    else profiles.set(k, buildProfile(profile.domain, profile.actionType, kept));
  }
  return dropped;
}

/**
 * Repõe perfis de confiança de um snapshot. A evidência é a fonte da verdade:
 * o perfil é RECALCULADO a partir dela (nunca se confia num `state` gravado),
 * e um perfil já vivo nesta sessão não é sobrescrito.
 */
export function restoreTrustProfiles(list: ActionTrustProfile[]): number {
  let added = 0;
  for (const p of list) {
    if (!p || !Array.isArray(p.evidence)) continue;
    const k = key(p.domain, p.actionType);
    if (profiles.has(k)) continue;
    profiles.set(k, buildProfile(p.domain, p.actionType, p.evidence));
    added += 1;
  }
  return added;
}
