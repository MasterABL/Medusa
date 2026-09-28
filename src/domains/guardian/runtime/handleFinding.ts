/**
 * Etapas CLASSIFY → EXPLAIN → ASSESS → PROPOSE → AUTHORIZE para UM finding,
 * delegando EXECUTE/VERIFY. Cada estágio é uma função pequena de pipeline/.
 */

import { GuardianPolicy } from '../../../foundation/guardian';
import { createAction, dispatch } from '../../../foundation/actionBus';
import type { Finding, Proposal } from '../model/types';
import { transitionProposal } from '../model/validators';
import { assessAutonomy } from '../pipeline/assess';
import { classifySeverity, requiredAutonomyFor } from '../pipeline/classify';
import { explainFinding } from '../pipeline/explain';
import { emit, saveFinding, saveProposal } from './context';
import type { CycleRuntime } from './context';
import { executeAndVerify } from './executeAndVerify';

function block(rt: CycleRuntime, finding: Finding, reason: string, retryAfter?: string): void {
  saveFinding(rt, finding, { status: 'blocked', retryAfter, outcome: { status: 'blocked', reason, decidedAt: rt.now.toISOString() } });
  rt.report.blocked += 1;
  emit(rt, 'FINDING_BLOCKED', reason, { findingId: finding.id });
}

export async function handleFinding(rt: CycleRuntime, initial: Finding): Promise<void> {
  // CLASSIFY + EXPLAIN
  let finding = saveFinding(rt, initial, {
    severity: classifySeverity(initial),
    requiredAutonomy: requiredAutonomyFor(initial.suggestedActionKey),
    explanation: explainFinding(initial),
    retryAfter: undefined,
  });

  const key = finding.suggestedActionKey;
  if (!key) return block(rt, finding, 'Nenhuma correção sugerida: o achado precisa de decisão humana.');

  // ASSESS
  const handler = rt.remediations.get(key);
  const reversible = GuardianPolicy.getAutonomyRule('guardian', key)?.reversible ?? false;
  const assessment = assessAutonomy({ actionKey: key, reversible, repository: rt.repo, remediations: rt.remediations, now: rt.now, dedupeKey: finding.dedupeKey });
  if (!handler) return block(rt, finding, assessment.explanation);
  if (assessment.cooldown) return block(rt, finding, assessment.explanation, assessment.cooldown.until);

  // PROPOSE
  const at = rt.now.toISOString();
  let proposal: Proposal = {
    id: rt.repo.nextId('proposal'),
    findingId: finding.id,
    actionKey: key,
    description: handler.describe(finding),
    payload: finding.remediationInput ?? {},
    reversible,
    status: 'PROPOSED',
    authorizationReason: assessment.explanation,
    createdAt: at,
    updatedAt: at,
    history: [{ status: 'PROPOSED', at }],
  };

  // AUTHORIZE — a decisão é da fundação (policy + trust + approval + audit).
  const action = createAction({
    domain: 'guardian',
    type: key,
    intent: proposal.description,
    payload: { findingId: finding.id, proposalId: proposal.id },
    riskLevel: finding.severity === 'critica' || finding.severity === 'alta' ? 'alto' : 'baixo',
    reversible,
    undoDescription: reversible ? 'Restaurar a partir da cópia recuperável.' : undefined,
  });
  const evaluation = dispatch(action);
  proposal = { ...proposal, actionId: action.id, approvalRequestId: evaluation.approvalRequest?.id, authorizationReason: assessment.explanation };
  saveProposal(rt, proposal);
  finding = saveFinding(rt, finding, { proposalId: proposal.id });
  emit(rt, 'PROPOSAL_CREATED', proposal.description, { findingId: finding.id, proposalId: proposal.id });
  emit(rt, 'AUTHORIZATION_DECIDED', `${evaluation.decision.level} — ${assessment.explanation}`, { findingId: finding.id, proposalId: proposal.id });

  if (evaluation.decision.requiresApproval) {
    proposal = saveProposal(rt, transitionProposal(proposal, 'PENDING_APPROVAL', at, 'aguardando decisão humana'));
    saveFinding(rt, finding, { status: 'awaiting_approval' });
    rt.report.awaitingApproval += 1;
    emit(rt, 'PROPOSAL_STATUS_CHANGED', 'PROPOSED → PENDING_APPROVAL', { findingId: finding.id, proposalId: proposal.id });
    return;
  }

  // AUTO-FIX: autorizado pela política + confiança. Respeita o teto por ciclo.
  const autoSoFar = rt.report.autoFixed;
  if (autoSoFar >= rt.config.maxAutoFixesPerCycle) {
    saveFinding(rt, finding, { status: 'in_progress' });
    emit(rt, 'PROPOSAL_STATUS_CHANGED', 'Autorizada, adiada para o próximo ciclo (teto de correções automáticas por ciclo).', { findingId: finding.id, proposalId: proposal.id });
    return;
  }
  proposal = saveProposal(rt, transitionProposal(proposal, 'APPROVED', at, 'autorizada pela política e pela confiança acumulada'));
  rt.report.autoFixed += 1;
  await executeAndVerify(rt, finding, proposal, handler, true);
}
