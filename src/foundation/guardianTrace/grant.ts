/**
 * MEDUSA FOUNDATION — Grants de autonomia (permissão explícita do usuário)
 *
 * Modelo e leitura, NÃO regra de execução: `policy.classify()` ainda decide
 * só por teto + confiança. Ligar grant ao classify mudaria o comportamento de
 * autonomia do produto, e isso é decisão do dono (registrada no relatório).
 *
 * Mesmo assim o contrato já diz a verdade sobre o alcance de um grant:
 * só regras com teto L1 podem ser liberadas — L2/L3 nunca sobem, e um grant
 * nelas é marcado "inerte" em vez de fingir que vale.
 */

import type { AutonomyGrant } from '../types/guardianTrace';
import type { DomainId } from '../types/domain';
import { getAutonomyRule } from '../guardian/policy';

let grants: AutonomyGrant[] = [];
let counter = 0;

export class GrantError extends Error {}

export interface CreateGrantInput {
  domain: DomainId;
  actionType: string;
  expiresAt?: string;
  note?: string;
  now?: string;
}

export function createGrant(input: CreateGrantInput): AutonomyGrant {
  if (!input.actionType.trim()) throw new GrantError('Grant exige um tipo de ação.');
  const now = input.now ?? new Date().toISOString();
  if (input.expiresAt && input.expiresAt <= now) throw new GrantError('Grant já nasce vencido: expiresAt precisa ser futuro.');
  counter += 1;
  const grant: AutonomyGrant = { id: `grant_${Date.now()}_${counter}`, domain: input.domain, actionType: input.actionType, level: 'L1', grantedBy: 'user', grantedAt: now, expiresAt: input.expiresAt, note: input.note };
  grants.push(grant);
  return grant;
}

export function revokeGrant(id: string, now: string = new Date().toISOString()): AutonomyGrant {
  const grant = grants.find((g) => g.id === id);
  if (!grant) throw new GrantError(`Grant "${id}" não encontrado.`);
  if (grant.revokedAt) return grant;
  grant.revokedAt = now;
  return grant;
}

export function isGrantActive(grant: AutonomyGrant, now: string): boolean {
  if (grant.revokedAt && grant.revokedAt <= now) return false;
  if (grant.expiresAt && grant.expiresAt <= now) return false;
  return grant.grantedAt <= now;
}

export function activeGrantFor(domain: DomainId, actionType: string, now: string): AutonomyGrant | undefined {
  return grants.filter((g) => g.domain === domain && g.actionType === actionType && isGrantActive(g, now)).slice(-1)[0];
}

/** Um grant só muda algo se a regra existe e tem teto L1. */
export function isGrantInert(domain: DomainId, actionType: string): boolean {
  const rule = getAutonomyRule(domain, actionType);
  return !rule || rule.ceilingLevel !== 'L1';
}

export function listGrants(filter?: { domain?: DomainId; activeAt?: string }): AutonomyGrant[] {
  return grants.filter((g) => (!filter?.domain || g.domain === filter.domain) && (!filter?.activeAt || isGrantActive(g, filter.activeAt)));
}

export function __resetGrantsForTests(): void {
  grants = [];
  counter = 0;
}
