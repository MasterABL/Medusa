'use client';

import React from 'react';
import { ApprovalDetails, ChainList, EvidenceBlock } from './FindingParts';
import { getGuardianSession, useGuardianState } from './guardianSession';
import { CATEGORY_LABEL, findingTitle } from './guardianView';
import { decideAndRun } from './FindingCard';

/** Context Panel do Guardian: o finding selecionado — cadeia, evidência, aprovação e confiança. */
export function GuardianContextPanel() {
  const { selectedId, running } = useGuardianState();
  const { repo } = getGuardianSession();
  const finding = selectedId ? repo.getFinding(selectedId) : undefined;
  const proposal = finding?.proposalId ? repo.getProposal(finding.proposalId) : undefined;
  const [error, setError] = React.useState<string | null>(null);

  if (!finding) {
    const findings = repo.listFindings();
    return (
      <>
        <div className="dm-ctx-block">
          <p className="dm-ctx-label">Telemetria operacional</p>
          <div className="flex items-center gap-2 mb-2">
            <span className="gd-beacon-dot" aria-hidden="true" />
            <strong className="text-[14px]">Sentinela Ativo</strong>
          </div>
          <p className="dm-muted text-[13px] leading-snug">
            Observando o Medusa continuamente sem ruído. {findings.length} sinal(is) sob vigilância.
          </p>
        </div>
        <div className="dm-ctx-block">
          <p className="dm-ctx-label">Facilidades em monitoramento</p>
          <ul className="text-[12px] space-y-1.5 dm-muted">
            <li className="flex justify-between"><span>Código & Integridade</span><span className="dm-num font-mono">OK</span></li>
            <li className="flex justify-between"><span>Dados & Esquema</span><span className="dm-num font-mono">OK</span></li>
            <li className="flex justify-between"><span>Segurança & Segredos</span><span className="dm-num font-mono">L3</span></li>
            <li className="flex justify-between"><span>Privacidade Local</span><span className="dm-num font-mono">Protegido</span></li>
            <li className="flex justify-between"><span>Políticas & Limites</span><span className="dm-num font-mono">Ativo</span></li>
          </ul>
          <p className="dm-faint text-[11px] mt-2">Clique em um achado na tela central para investigar evidências e propostas.</p>
        </div>
      </>
    );
  }
  const pending = proposal?.status === 'PENDING_APPROVAL';
  const act = async (d: 'approve' | 'reject') => {
    setError(null);
    try {
      await decideAndRun(finding.id, d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao registrar a decisão.');
    }
  };

  return (
    <>
      <div className="dm-ctx-block">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="gd-beacon-dot" aria-hidden="true" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">Telemetria Ativa</span>
        </div>
        <p className="dm-ctx-label">Investigando · {CATEGORY_LABEL[finding.category]}</p>
        <strong className="text-[15px] leading-snug">{findingTitle(finding)}</strong>
        <span className="dm-faint text-[12px] dm-num">Confiança {Math.round(finding.confidence * 100)}%</span>
      </div>
      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Cadeia de verificação</p>
        <ChainList finding={finding} proposal={proposal} />
      </div>
      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Evidência</p>
        <EvidenceBlock finding={finding} />
      </div>
      {proposal && pending && (
        <div className="dm-ctx-block">
          <p className="dm-ctx-label">Aprovação</p>
          <ApprovalDetails finding={finding} proposal={proposal} />
          <div className="gd-decide">
            <button type="button" className="dm-btn" data-size="sm" onClick={() => act('reject')} disabled={running}>Recusar</button>
            <button type="button" className="dm-btn" data-size="sm" data-variant="primary" onClick={() => act('approve')} disabled={running}>Aprovar e executar</button>
          </div>
          {error && <p className="dm-alert-text text-[12px]" role="alert">{error}</p>}
        </div>
      )}
    </>
  );
}
