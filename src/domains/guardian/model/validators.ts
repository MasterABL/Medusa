/**
 * MEDUSA — Guardian — Validadores (evidence first)
 */

import type { Evidence, FindingDraft, Proposal, ProposalStatus } from './types';

export class GuardianValidationError extends Error {}

export function validateEvidence(evidence: Evidence, index = 0): void {
  const at = `evidence[${index}]`;
  if (!evidence.source?.trim()) throw new GuardianValidationError(`${at}.source é obrigatório (quem observou?).`);
  if (!evidence.reference?.trim()) throw new GuardianValidationError(`${at}.reference é obrigatório (onde?).`);
  if (!evidence.observation?.trim()) throw new GuardianValidationError(`${at}.observation é obrigatório (o que foi observado?).`);
  if (Number.isNaN(Date.parse(evidence.observedAt))) throw new GuardianValidationError(`${at}.observedAt precisa ser uma data ISO válida.`);
}

/** Guardian nunca diz "há um problema" sem responder onde, o quê, por que importa e com que evidência. */
export function validateDraft(draft: FindingDraft): void {
  if (!draft.evidence || draft.evidence.length === 0) {
    throw new GuardianValidationError('Finding sem evidência é rejeitado — Guardian não afirma problema sem responder "onde" e "o que observou".');
  }
  draft.evidence.forEach((e, i) => validateEvidence(e, i));
  if (!draft.impact?.trim()) throw new GuardianValidationError('finding.impact é obrigatório (por que isso importa?).');
  if (!draft.hypothesis?.trim()) throw new GuardianValidationError('finding.hypothesis é obrigatório.');
  if (!draft.dedupeKey?.trim()) throw new GuardianValidationError('finding.dedupeKey é obrigatório.');
  if (!(draft.confidence >= 0 && draft.confidence <= 1)) throw new GuardianValidationError(`finding.confidence precisa estar entre 0 e 1: ${draft.confidence}`);
}

const TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  PROPOSED: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'EXPIRED'],
  APPROVED: ['EXECUTING'],
  REJECTED: [],
  EXPIRED: [],
  EXECUTING: ['SUCCEEDED', 'FAILED'],
  SUCCEEDED: [],
  FAILED: [],
};

/** Máquina de estados estrita: rejeitada/expirada nunca executa; terminal nunca muda. */
export function transitionProposal(proposal: Proposal, next: ProposalStatus, at: string, note?: string): Proposal {
  if (!TRANSITIONS[proposal.status].includes(next)) {
    throw new GuardianValidationError(`Transição inválida de proposta: ${proposal.status} → ${next}.`);
  }
  return { ...proposal, status: next, updatedAt: at, history: [...proposal.history, { status: next, at, note }] };
}

export function isTerminalProposal(status: ProposalStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
