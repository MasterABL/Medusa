/**
 * MEDUSA FOUNDATION — Approval Request lifecycle (seção 7/32)
 *
 * Toda ação L2/L3 que precisa de decisão humana passa por aqui. Append-first:
 * uma ApprovalRequest nasce `pending` e só muda de estado por uma chamada
 * explícita (approve/reject) ou pela expiração — nunca é reescrita em silêncio.
 */

import type { ApprovalRequest } from '../types/guardian';
import type { DomainId } from '../types/domain';

let requests: ApprovalRequest[] = [];
let counter = 0;

export interface CreateApprovalInput {
  actionId: string;
  domain: DomainId;
  reason: string;
  impact: string;
  expiresAt?: string;
}

export function createApprovalRequest(input: CreateApprovalInput): ApprovalRequest {
  counter += 1;
  const request: ApprovalRequest = {
    id: `approval_${Date.now()}_${counter}`,
    actionId: input.actionId,
    domain: input.domain,
    reason: input.reason,
    impact: input.impact,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
  };
  requests.push(request);
  return request;
}

function mutate(id: string, status: ApprovalRequest['status']): ApprovalRequest {
  const request = requests.find((r) => r.id === id);
  if (!request) {
    throw new Error(`ApprovalRequest "${id}" não encontrada.`);
  }
  if (request.status !== 'pending') {
    throw new Error(
      `ApprovalRequest "${id}" já foi resolvida como "${request.status}" — não pode mudar de estado de novo.`
    );
  }
  request.status = status;
  request.resolvedAt = new Date().toISOString();
  return request;
}

export function approve(id: string): ApprovalRequest {
  return mutate(id, 'approved');
}

export function reject(id: string): ApprovalRequest {
  return mutate(id, 'rejected');
}

/** Varre pendentes vencidas e marca como expiradas — chamado periodicamente por quem integrar isto. */
export function expireOverdue(now: Date = new Date()): ApprovalRequest[] {
  const expired: ApprovalRequest[] = [];
  for (const request of requests) {
    if (request.status === 'pending' && request.expiresAt && new Date(request.expiresAt) <= now) {
      request.status = 'expired';
      request.resolvedAt = now.toISOString();
      expired.push(request);
    }
  }
  return expired;
}

export function getApprovalRequest(id: string): ApprovalRequest | undefined {
  return requests.find((r) => r.id === id);
}

export function listApprovalRequests(filter?: { status?: ApprovalRequest['status']; domain?: DomainId }): ApprovalRequest[] {
  return requests.filter(
    (r) => (!filter?.status || r.status === filter.status) && (!filter?.domain || r.domain === filter.domain)
  );
}

/** Só para testes de contrato. */
export function __resetApprovalsForTests(): void {
  requests = [];
  counter = 0;
}
