'use client';

import React from 'react';
import type { Finding } from '@/domains/guardian/model/types';

export interface GuardianPipelineTrackerProps {
  findings: Finding[];
  resolvedCount: number;
}

const STAGES = [
  { id: 'observar', label: '1. Observar', icon: 'visibility', desc: 'Sinais e telemetria' },
  { id: 'detectar', label: '2. Detectar', icon: 'find_in_page', desc: 'Identificação de desvios' },
  { id: 'investigar', label: '3. Investigar', icon: 'manage_search', desc: 'Extração de evidência' },
  { id: 'propor', label: '4. Propor', icon: 'lightbulb', desc: 'Causa e plano de ação' },
  { id: 'autorizar', label: '5. Autorizar', icon: 'rule', desc: 'Decisão humana' },
  { id: 'corrigir', label: '6. Corrigir', icon: 'build_circle', desc: 'Execução controlada' },
  { id: 'verificar', label: '7. Verificar', icon: 'verified', desc: 'Auditoria pós-execução' },
] as const;

/**
 * Rastreador do Ciclo de Investigação em 7 Etapas — Assinatura do Guardian.
 * Torna explícito o ciclo de vida da inteligência operacional:
 * observar → detectar → investigar → propor → autorizar → corrigir → verificar.
 */
export function GuardianPipelineTracker({
  findings,
  resolvedCount,
}: GuardianPipelineTrackerProps) {
  const awaitingApproval = findings.filter((f) => f.status === 'awaiting_approval').length;
  const inProgress = findings.filter((f) => f.status !== 'awaiting_approval' && f.status !== 'resolved' && f.status !== 'blocked').length;

  return (
    <div className="gd-pipeline-container" role="region" aria-label="Pipeline de investigação em 7 estágios">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div>
          <h3 className="dm-h2">Cadeia de Investigação & Resolução</h3>
          <p className="dm-muted text-[13px] mt-0.5">O percurso rigoroso de cada observação desde a detecção até a prova verificada.</p>
        </div>
        <div className="flex items-center gap-2">
          {awaitingApproval > 0 && (
            <span className="dm-chip" data-tone="accent">
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 13 }}>rule</span>
              {awaitingApproval} aguardando decisão
            </span>
          )}
          {resolvedCount > 0 && (
            <span className="dm-chip" data-tone="support">
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 13 }}>verified</span>
              {resolvedCount} verificados
            </span>
          )}
        </div>
      </div>

      <ol className="gd-pipeline-track" role="list">
        {STAGES.map((s, idx) => {
          let count = 0;
          let state: 'active' | 'pending' | 'settled' = 'pending';

          if (s.id === 'observar') {
            count = 5; // 5 fontes ativas de auditoria
            state = 'settled';
          } else if (s.id === 'detectar') {
            count = findings.length;
            state = findings.length > 0 ? 'settled' : 'pending';
          } else if (s.id === 'investigar') {
            count = findings.length;
            state = findings.length > 0 ? 'settled' : 'pending';
          } else if (s.id === 'propor') {
            count = findings.filter((f) => f.proposalId).length;
            state = count > 0 ? 'settled' : 'pending';
          } else if (s.id === 'autorizar') {
            count = awaitingApproval;
            state = awaitingApproval > 0 ? 'active' : 'settled';
          } else if (s.id === 'corrigir') {
            count = inProgress;
            state = inProgress > 0 ? 'active' : 'pending';
          } else if (s.id === 'verificar') {
            count = resolvedCount;
            state = resolvedCount > 0 ? 'settled' : 'pending';
          }

          return (
            <li
              key={s.id}
              role="listitem"
              className="gd-pipeline-step"
              data-state={state}
              aria-label={`${s.label}: ${s.desc}`}
            >
              <div className="gd-step-bubble">
                <span className="material-symbols-outlined gd-step-icon" aria-hidden="true">
                  {s.icon}
                </span>
                <span className="gd-step-badge dm-num">{count}</span>
              </div>
              <div className="gd-step-meta">
                <strong className="gd-step-title">{s.label}</strong>
                <span className="gd-step-desc">{s.desc}</span>
              </div>
              {idx < STAGES.length - 1 && <span className="gd-pipeline-arrow" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
