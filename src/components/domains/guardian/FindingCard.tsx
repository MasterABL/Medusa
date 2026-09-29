'use client';

import React, { useState } from 'react';
import type { Finding } from '@/domains/guardian';
import { Disclosure } from '../shared/Disclosure';
import { ApprovalDetails, CategoryTag, ChainList, EvidenceBlock, StatusPill } from './FindingParts';
import { decideProposal, getGuardianSession, guardianUi, runCycle, selectFinding, useGuardianState } from './guardianSession';
import { SEVERITY_LABEL, findingTitle } from './guardianView';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Aprovar/recusar: a decisão é gravada na hora; a execução roda no ciclo seguinte (contrato do runtime). */
export async function decideAndRun(findingId: string, decision: 'approve' | 'reject'): Promise<void> {
  decideProposal(findingId, decision);
  if (decision === 'approve') {
    await sleep(500); // deixa o estado real "aprovada" aparecer antes de o ciclo executar
    await runCycle();
  }
}

export function FindingCard({ finding, defaultOpen = false }: { finding: Finding; defaultOpen?: boolean }) {
  const { selectedId, running } = useGuardianState();
  const { repo } = getGuardianSession();
  const proposal = finding.proposalId ? repo.getProposal(finding.proposalId) : undefined;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = proposal?.status === 'PENDING_APPROVAL';

  const decide = async (d: 'approve' | 'reject') => {
    setError(null);
    setBusy(true);
    try {
      await decideAndRun(finding.id, d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível registrar a decisão.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="gd-card" data-severity={finding.severity} data-selected={selectedId === finding.id} onClickCapture={() => selectFinding(finding.id)}>
      <Disclosure
        defaultOpen={defaultOpen}
        buttonClassName="gd-card-btn"
        summary={
          <span className="gd-card-head">
            <span className="flex items-center gap-2 flex-wrap">
              <CategoryTag finding={finding} />
              <StatusPill finding={finding} />
              <span className="dm-faint text-[12px]">Severidade {SEVERITY_LABEL[finding.severity].toLowerCase()}</span>
              {finding.occurrences > 1 && <span className="dm-faint text-[12px]">· visto {finding.occurrences}×</span>}
            </span>
            <strong className="gd-card-title">{findingTitle(finding)}</strong>
            <span className="dm-muted text-[13px] leading-snug">{finding.impact}</span>
          </span>
        }
      >
        <div className="gd-card-body">
          <p className="dm-eyebrow">Evidência</p>
          <EvidenceBlock finding={finding} />
          <p className="dm-eyebrow">Hipótese</p>
          <p className="text-[14px] leading-snug">{finding.hypothesis}</p>
          {proposal && (
            <>
              <p className="dm-eyebrow">Proposta · {proposal.status === 'PENDING_APPROVAL' ? 'aguardando você' : proposal.status.toLowerCase()}</p>
              <ApprovalDetails finding={finding} proposal={proposal} />
            </>
          )}
          {!proposal && finding.status === 'blocked' && <p className="dm-muted text-[13px]">{finding.outcome?.reason ?? 'Sem correção automática disponível: só uma pessoa resolve.'}</p>}
          {finding.outcome?.verification && (
            <p className="fin-outcome" role="status">
              <span className="material-symbols-outlined" aria-hidden="true">{finding.outcome.verification.status === 'verified' ? 'verified' : 'info'}</span>
              <span>Verificação: esperado “{finding.outcome.verification.expected}”; observado “{finding.outcome.verification.observed}”.</span>
            </p>
          )}
          {pending && (
            <div className="gd-decide">
              <button type="button" className="dm-btn" onClick={() => decide('reject')} disabled={busy || running}>Recusar</button>
              <button type="button" className="dm-btn" data-variant="primary" onClick={() => decide('approve')} disabled={busy || running}>
                {busy || running ? 'Executando…' : proposal.reversible ? 'Aprovar e executar (reversível)' : 'Aprovar e executar'}
              </button>
            </div>
          )}
          {error && <p className="dm-alert-text text-[13px]" role="alert">{error}</p>}
        </div>
      </Disclosure>
    </article>
  );
}

export { guardianUi };
