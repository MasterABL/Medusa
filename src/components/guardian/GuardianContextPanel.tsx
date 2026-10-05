'use client';

import React from 'react';
import { GUARDIAN_DATA } from './guardianFixtures';

export function GuardianContextPanel() {
  const data = GUARDIAN_DATA;

  return (
    <div className="space-y-6">
      {/* 1. Estado da Sentinela */}
      <div className="space-y-2.5 pb-5 border-b border-border/60">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Sentinela &amp; Postura
          </span>
          <span className="text-[11px] font-mono text-[#18534B] dark:text-[#71DBD2] font-semibold tabular-nums">
            94.2% Nominal
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold tracking-tight text-text-primary tabular-nums">
            0<span className="text-xs font-normal text-text-muted ml-1">ameaças ativas</span>
          </span>
          <span className="text-[11px] text-text-secondary font-mono">7 Nodos OK</span>
        </div>
        <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
          <div className="bg-[#18534B] dark:bg-medusa-primary h-full w-[94%]" />
        </div>
        <div className="text-[10px] text-text-muted font-mono pt-0.5 flex justify-between">
          <span>Inspeção: {data.telemetry.packetInspectionRate}</span>
          <span className="font-semibold text-text-secondary">{data.telemetry.averageLatencyMs} ms latência</span>
        </div>
      </div>

      {/* 2. Dossiê do Incidente Ativo */}
      <div className="space-y-2 pb-5 border-b border-border/60">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Incidente em Investigação
          </span>
          <span className="text-[10px] font-mono text-alert font-bold tabular-nums">
            #{data.incidentInvestigation.id}
          </span>
        </div>
        <h4 className="text-[13px] font-bold tracking-tight text-text-primary">
          {data.incidentInvestigation.title}
        </h4>
        <p className="text-[11px] text-text-secondary leading-snug">
          Socket local tentou negociação TLS 1.2 depreciada. Pacote isolado em quarentena sem vazamento.
        </p>
        <div className="pt-2 flex items-center justify-between">
          <span className="text-[10px] font-mono text-text-muted">Origem: Workstation</span>
          <button
            type="button"
            className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-surface border border-border/80 hover:border-medusa-primary text-text-primary transition-all"
          >
            Quarentena Ativa ✓
          </button>
        </div>
      </div>

      {/* 3. Chaves de Confiança & Hardware */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Chaves de Confiança
          </span>
          <span className="text-[10px] font-mono text-[#18534B] dark:text-[#71DBD2] font-semibold">
            FIDO2 Ativo
          </span>
        </div>

        <div className="bg-surface-secondary border border-border/70 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-text-primary">YubiKey Hardware Slot 1</span>
            <span className="font-mono text-[10px] text-text-muted">0.1 ms</span>
          </div>
          <p className="text-[11px] text-text-secondary leading-snug">
            Assinaturas de commit, SSH e credenciais restritas ao hardware físico.
          </p>
        </div>
      </div>
    </div>
  );
}
