'use client';

import React from 'react';
import { GUARDIAN_CASES } from './guardianFixtures';

export function GuardianContextPanel() {
  return (
    <div className="space-y-6">
      {/* 1. Estado de Vigilância Silenciosa */}
      <div className="space-y-2.5 pb-5 border-b border-border/60">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Vigilância Contextual
          </span>
          <span className="text-[11px] font-mono text-[#71DBD2] font-semibold">
            Silenciosa · Ativa
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-text-primary">
            3 fluxos<span className="text-xs font-normal text-text-muted ml-1">monitorados</span>
          </span>
          <span className="text-[11px] text-text-secondary font-mono">Zero invasão</span>
        </div>
        <div className="w-full bg-surface-secondary/70 h-1.5 rounded-full overflow-hidden">
          <div className="bg-[#71DBD2] h-full w-[100%]" />
        </div>
        <div className="text-[10px] text-text-muted font-mono pt-0.5 flex justify-between">
          <span>Integridade Causal</span>
          <span className="font-semibold text-text-secondary">D+0 em tempo real</span>
        </div>
      </div>

      {/* 2. Casos no Radar do Guardian */}
      <div className="space-y-3 pb-5 border-b border-border/60">
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
          Decisões Recentes
        </span>

        <div className="space-y-2">
          {GUARDIAN_CASES.map((c) => (
            <div
              key={c.id}
              className="p-3 rounded-xl bg-surface border border-border/60 flex flex-col gap-1 shadow-subtle"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-primary truncate">
                  {c.domainLabel}
                </span>
                <span className="text-[10px] font-mono text-[#71DBD2] font-semibold">
                  {c.autonomyLevel}
                </span>
              </div>
              <p className="text-[11px] text-text-muted line-clamp-1">
                {c.title}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Princípio de Governança */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
          Princípio do Medusa
        </span>
        <div className="p-3.5 rounded-xl bg-surface-secondary/50 border border-border/60 text-[11px] text-text-secondary leading-relaxed">
          <strong className="text-text-primary block font-mono text-[10px] uppercase mb-1">
            Mostrar Causalidade
          </strong>
          Toda intervenção do sistema tem origem em um evento concreto, passa por contexto real e obedece a políticas explícitas.
        </div>
      </div>
    </div>
  );
}
