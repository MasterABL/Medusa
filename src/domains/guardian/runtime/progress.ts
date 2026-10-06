/**
 * Avança propostas cujo destino foi decidido FORA do ciclo (aprovação humana,
 * recusa, expiração) ou que ficaram autorizadas esperando vaga de execução.
 * É aqui que rejeição e expiração impedem a execução.
 */

import { getAction } from '../../../foundation/actionBus';
import type { Finding, Proposal } from '../model/types';
import { transitionProposal } from '../model/validators';
import { emit, saveFinding, saveProposal } from './context';
import type { CycleRuntime } from './context';
import { executeAndVerify } from './executeAndVerify';

export async function progressPendingProposals(rt: CycleRuntime): Promise<void> {
  const pending = rt.repo.listProposals().filter((p) => p.status === 'PENDING_APPROVAL' || p.status === 'PROPOSED');

  for (const proposal of pending) {
    if (!proposal.actionId) continue;
    const action = getAction(proposal.actionId);
    const finding = rt.repo.getFinding(proposal.findingId);
    if (!action || !finding) continue;
    const at = rt.now.toISOString();

    if (action.status === 'AUTHORIZED') {
      const handler = rt.remediations.get(proposal.actionKey);
      if (!handler) continue;
      const deferredAuto = proposal.status === 'PROPOSED';
      if (deferredAuto && rt.report.autoFixed >= rt.config.maxAutoFixesPerCycle) continue;
      const approved = saveProposal(rt, transitionProposal(proposal, 'APPROVED', at, deferredAuto ? 'autorizada pela política (execução adiada)' : 'aprovada por uma pessoa'));
      emit(rt, 'PROPOSAL_STATUS_CHANGED', `${proposal.status} → APPROVED`, { findingId: finding.id, proposalId: proposal.id });
      if (deferredAuto) rt.report.autoFixed += 1;
      else rt.report.approvedAndExecuted += 1;
      await executeAndVerify(rt, finding, approved, handler, deferredAuto);
    } else if (action.status === 'REJECTED') {
      rejected(rt, finding, proposal, at);
    } else if (action.status === 'CANCELLED') {
      const expired = saveProposal(rt, transitionProposal(proposal, 'EXPIRED', at, 'aprovação expirou sem decisão'));
      saveFinding(rt, finding, { status: 'detected', proposalId: undefined, outcome: undefined });
      rt.report.expiredApprovals += 1;
      emit(rt, 'PROPOSAL_STATUS_CHANGED', 'PENDING_APPROVAL → EXPIRED (nada foi executado; o achado volta a ser reavaliado)', { findingId: finding.id, proposalId: expired.id });
    }
  }
}

function rejected(rt: CycleRuntime, finding: Finding, proposal: Proposal, at: string): void {
  saveProposal(rt, transitionProposal(proposal, 'REJECTED', at, 'recusada por uma pessoa'));
  const until = new Date(rt.now.getTime() + rt.config.rejectionCooldownMs).toISOString();
  rt.repo.setCooldown({ key: `finding:${finding.dedupeKey}`, until, reason: 'a correção proposta foi recusada' });
  saveFinding(rt, finding, {
    status: 'blocked',
    retryAfter: until,
    outcome: { status: 'blocked', reason: 'A correção foi recusada por uma pessoa — não será reproposta durante o cooldown.', decidedAt: at },
  });
  rt.report.rejectedByUser += 1;
  rt.report.blocked += 1;
  emit(rt, 'PROPOSAL_STATUS_CHANGED', 'PENDING_APPROVAL → REJECTED (nada foi executado)', { findingId: finding.id, proposalId: proposal.id });
  emit(rt, 'COOLDOWN_STARTED', `Recusa registrada: sem nova proposta até ${until}.`, { findingId: finding.id });
}
