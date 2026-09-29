'use client';

import React from 'react';
import type { Finding, Proposal } from '@/domains/guardian';
import { assessments, getGuardianSession } from './guardianSession';
import { CATEGORY_LABEL, STATUS_LABEL, chainOf } from './guardianView';

export function ChainList({ finding, proposal }: { finding: Finding; proposal: Proposal | undefined }) {
  const steps = chainOf(finding, proposal);
  return (
    <ol className="gd-chain" aria-label="Cadeia de verificação">
      {steps.map((s) => (
        <li key={s.key} data-state={s.state} aria-current={s.state === 'current' ? 'step' : undefined}>
          <span className="gd-chain-mark" aria-hidden="true">
            <span className="material-symbols-outlined">{s.state === 'done' ? 'check' : s.state === 'failed' ? 'close' : s.state === 'current' ? 'more_horiz' : 'radio_button_unchecked'}</span>
          </span>
          <span className="min-w-0">
            <strong>{s.title}</strong>
            <span className="dm-muted">{s.detail}</span>
            <span className="sr-only">
              {s.state === 'done' ? ' (feito)' : s.state === 'failed' ? ' (não seguiu)' : s.state === 'current' ? ' (agora)' : ' (pendente)'}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function EvidenceBlock({ finding }: { finding: Finding }) {
  return (
    <div className="gd-evidence">
      {finding.evidence.map((e, i) => (
        <dl key={i} className="gd-evidence-item">
          <div><dt>Onde</dt><dd className="gd-ref">{e.reference}</dd></div>
          <div><dt>Observado</dt><dd>{e.observation}</dd></div>
          {e.expectation && <div><dt>Esperado</dt><dd>{e.expectation}</dd></div>}
          {e.difference && <div><dt>Diferença</dt><dd>{e.difference}</dd></div>}
          <div><dt>Origem</dt><dd className="gd-ref">{e.source}</dd></div>
        </dl>
      ))}
    </div>
  );
}

/** O que o pedido de aprovação precisa mostrar: o quê, onde, por quê, consequência, reversibilidade e confiança. */
export function ApprovalDetails({ finding, proposal }: { finding: Finding; proposal: Proposal }) {
  const { remediations } = getGuardianSession();
  const handler = remediations.get(proposal.actionKey);
  const assessment = assessments().find((a) => a.actionKey === proposal.actionKey);
  return (
    <dl className="gd-approval">
      <div><dt>O que será feito</dt><dd>{proposal.description}</dd></div>
      <div><dt>Onde</dt><dd className="gd-ref">{finding.evidence[0]?.reference}</dd></div>
      <div><dt>Por que pede você</dt><dd>{proposal.authorizationReason ?? 'Proposta aguardando decisão humana.'}</dd></div>
      <div><dt>Consequência</dt><dd>{handler ? `Depois da execução: ${handler.expectation(finding)}. O Guardian verifica isso antes de dar como resolvido.` : 'Nenhum executor disponível — nada será alterado.'}</dd></div>
      <div><dt>Reversível?</dt><dd>{proposal.reversible ? 'Sim — o que sair vai para uma lixeira recuperável.' : <span className="dm-alert-text font-semibold">Não. Confirme com atenção.</span>}</dd></div>
      <div>
        <dt>Confiança</dt>
        <dd>
          {assessment
            ? assessment.sampleSize === 0
              ? 'Você ainda não decidiu sobre esta ação, então o Guardian não tem histórico para confiar.'
              : `${assessment.sampleSize} decisão registrada${assessment.sampleSize > 1 ? 's' : ''} sua${assessment.sampleSize > 1 ? 's' : ''} para esta ação${assessment.acceptanceRate !== null ? `, ${Math.round(assessment.acceptanceRate * 100)}% aceitas` : ''}.`
            : 'Sem histórico.'}
          {' '}Confiança do achado: {Math.round(finding.confidence * 100)}%.
        </dd>
      </div>
    </dl>
  );
}

export function StatusPill({ finding }: { finding: Finding }) {
  const tone = finding.status === 'awaiting_approval' ? 'accent' : finding.status === 'resolved' ? 'support' : finding.status === 'failed' ? 'alert' : undefined;
  return (
    <span className="dm-chip" data-tone={tone}>
      {STATUS_LABEL[finding.status]}
    </span>
  );
}

export function CategoryTag({ finding }: { finding: Finding }) {
  return <span className="gd-cat">{CATEGORY_LABEL[finding.category]}</span>;
}
