/**
 * MEDUSA — Guardian — serialização (persistência de findings e propostas)
 */

import { deserialize, serialize } from '../shared/serialization';
import type { Finding, Proposal } from './model/types';
import { GuardianValidationError, validateEvidence } from './model/validators';

const PROPOSAL_STATUSES = ['PROPOSED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED', 'EXECUTING', 'SUCCEEDED', 'FAILED'];

function validateFinding(f: Finding): void {
  if (!f.id || !f.dedupeKey || !f.correlationId) throw new GuardianValidationError('finding precisa de id, dedupeKey e correlationId.');
  if (!Array.isArray(f.evidence) || f.evidence.length === 0) throw new GuardianValidationError('finding restaurado sem evidência é rejeitado.');
  f.evidence.forEach((e, i) => validateEvidence(e, i));
}

function validateProposal(p: Proposal): void {
  if (!PROPOSAL_STATUSES.includes(p.status)) throw new GuardianValidationError(`proposal.status inválido: "${String(p.status)}".`);
  if (!p.findingId || !p.actionKey) throw new GuardianValidationError('proposal precisa de findingId e actionKey.');
  if (!Array.isArray(p.history) || p.history.length === 0) throw new GuardianValidationError('proposal precisa de histórico de status.');
}

export const serializeFinding = (f: Finding): string => serialize('guardian.finding', f);
export const deserializeFinding = (payload: string): Finding => deserialize<Finding>('guardian.finding', payload, validateFinding);
export const serializeProposal = (p: Proposal): string => serialize('guardian.proposal', p);
export const deserializeProposal = (payload: string): Proposal => deserialize<Proposal>('guardian.proposal', payload, validateProposal);
