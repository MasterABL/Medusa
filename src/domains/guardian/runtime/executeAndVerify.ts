/**
 * Etapas EXECUTE → VERIFY → RECORD.
 *
 * Execução só começa por `GuardianLifecycle.beginExecution` (exige Action
 * AUTHORIZED) — rejeitada ou expirada nunca chega aqui. Verificação nunca é
 * inferida do "não deu erro".
 */

import { GuardianTrust } from '../../../foundation/guardian';
import * as Lifecycle from '../../../foundation/guardianLifecycle';
import type { Finding, Proposal, VerificationResult } from '../model/types';
import { transitionProposal } from '../model/validators';
import { verifyActionOutcome } from '../pipeline/verify';
import type { RemediationHandler } from '../remediation/registry';
import { emit, publishFindingEvent, saveFinding, saveProposal } from './context';
import type { CycleRuntime } from './context';
import type { FindingDraft } from '../model/types';

function startCooldown(rt: CycleRuntime, key: string, ms: number, reason: string, findingId: string): string {
  const until = new Date(rt.now.getTime() + ms).toISOString();
  rt.repo.setCooldown({ key, until, reason });
  emit(rt, 'COOLDOWN_STARTED', `${key} em cooldown até ${until}: ${reason}`, { findingId });
  return until;
}

async function verify(rt: CycleRuntime, finding: Finding, proposal: Proposal, handler: RemediationHandler): Promise<VerificationResult> {
  const expected = handler.expectation(finding);
  const ctx = { finding, proposal, now: rt.now };

  if (handler.verify) {
    return verifyActionOutcome({ expected, method: 'handler', now: rt.now, observe: () => handler.verify!(ctx) });
  }

  const source = rt.sources.find((s) => s.auditor.id === finding.origin);
  if (!source) return verifyActionOutcome({ expected, method: 'redetection', now: rt.now });

  return verifyActionOutcome({
    expected: `${expected} (problema não reaparece na re-detecção)`,
    method: 'redetection',
    now: rt.now,
    observe: async () => {
      const input = await source.collect();
      const drafts = (source.auditor.detect as (input: unknown, now: Date) => FindingDraft[])(input, rt.now);
      const still = drafts.some((d) => d.dedupeKey === finding.dedupeKey);
      return { matches: !still, observed: still ? 'o problema continua sendo detectado' : 'o problema não é mais detectado' };
    },
  });
}

export async function executeAndVerify(rt: CycleRuntime, finding: Finding, proposal: Proposal, handler: RemediationHandler, automatic: boolean): Promise<void> {
  const at = () => rt.now.toISOString();
  const actionId = proposal.actionId;
  if (!actionId) throw new Error(`Proposta ${proposal.id} sem Action — não pode executar.`);

  // EXECUTE
  Lifecycle.beginExecution(actionId);
  proposal = saveProposal(rt, transitionProposal(proposal, 'EXECUTING', at()));
  finding = saveFinding(rt, finding, { status: 'in_progress' });
  const executionId = rt.repo.nextId('exec');
  rt.repo.saveExecution({ id: executionId, proposalId: proposal.id, findingId: finding.id, actionKey: proposal.actionKey, startedAt: at(), automatic });
  emit(rt, 'EXECUTION_STARTED', `Executando ${proposal.actionKey} (${automatic ? 'automático' : 'após aprovação'}).`, { findingId: finding.id, proposalId: proposal.id });

  try {
    await handler.execute({ finding, proposal, now: rt.now });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    Lifecycle.completeExecution(actionId, false);
    proposal = saveProposal(rt, transitionProposal(proposal, 'FAILED', at(), error));
    rt.repo.saveExecution({ id: executionId, proposalId: proposal.id, findingId: finding.id, actionKey: proposal.actionKey, startedAt: at(), finishedAt: at(), ok: false, error, automatic });
    const until = startCooldown(rt, `action:${proposal.actionKey}`, rt.config.failureCooldownMs, `execução falhou: ${error}`, finding.id);
    GuardianTrust.recordOutcome({ domain: 'guardian', actionType: proposal.actionKey, outcome: 'corrected', actionId, note: `falha na execução: ${error}` });
    emit(rt, 'TRUST_ADJUSTED', `Confiança em ${proposal.actionKey} reduzida por falha de execução.`, { findingId: finding.id, proposalId: proposal.id });
    emit(rt, 'EXECUTION_FINISHED', `Execução falhou: ${error}`, { findingId: finding.id, proposalId: proposal.id });
    saveFinding(rt, finding, { status: 'failed', retryAfter: until, outcome: { status: 'failed', reason: `Execução falhou: ${error}`, decidedAt: at() } });
    rt.report.failed += 1;
    return;
  }

  Lifecycle.completeExecution(actionId, true);
  proposal = saveProposal(rt, transitionProposal(proposal, 'SUCCEEDED', at()));
  rt.repo.saveExecution({ id: executionId, proposalId: proposal.id, findingId: finding.id, actionKey: proposal.actionKey, startedAt: at(), finishedAt: at(), ok: true, automatic });
  emit(rt, 'EXECUTION_FINISHED', 'Execução concluída sem erro (ainda não verificada).', { findingId: finding.id, proposalId: proposal.id });

  // VERIFY
  const verification = await verify(rt, finding, proposal, handler);
  emit(rt, 'VERIFICATION_RECORDED', `Verificação: ${verification.status} (${verification.method}). Esperado: ${verification.expected}. Observado: ${verification.observed}.`, { findingId: finding.id, proposalId: proposal.id });

  // RECORD OUTCOME
  if (verification.status === 'verified') {
    const resolved = saveFinding(rt, finding, {
      status: 'resolved',
      outcome: { status: 'resolved', reason: 'Correção executada e verificada.', decidedAt: at(), verification },
    });
    rt.report.verifiedResolved += 1;
    publishFindingEvent('GUARDIAN_FINDING_RESOLVED', resolved);
  } else if (verification.status === 'failed') {
    const until = startCooldown(rt, `action:${proposal.actionKey}`, rt.config.failureCooldownMs, 'a verificação mostrou que a correção não surtiu efeito', finding.id);
    GuardianTrust.recordOutcome({ domain: 'guardian', actionType: proposal.actionKey, outcome: 'corrected', actionId, note: 'verificação falhou' });
    emit(rt, 'TRUST_ADJUSTED', `Confiança em ${proposal.actionKey} reduzida: a verificação falhou.`, { findingId: finding.id, proposalId: proposal.id });
    saveFinding(rt, finding, {
      status: 'failed',
      retryAfter: until,
      outcome: { status: 'failed', reason: 'Executou, mas a verificação mostrou que o problema persiste.', decidedAt: at(), verification },
    });
    rt.report.failed += 1;
  } else {
    saveFinding(rt, finding, {
      status: 'unverified',
      outcome: { status: 'unverified', reason: 'Executou, mas não foi possível verificar o resultado.', decidedAt: at(), verification },
    });
    rt.report.unverified += 1;
  }
}
