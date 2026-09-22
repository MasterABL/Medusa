'use client';

import React from 'react';
import { ContextPanelSection } from '@/components/shell/ContextPanelSection';
import { TRACK_DEFINITIONS } from '@/components/education/educationFixtures';

/**
 * Painel contextual do Hoje — preserva o conteúdo já existente (Guardian/Bio-Estado, Próxima
 * Transição, Marcos da Sessão), só acrescenta Avisos relevantes. Os avisos vêm diretamente das
 * disciplinas da Faculdade (mesma fonte usada em Educação → Faculdade) — não é uma lista
 * duplicada à mão, é a mesma fixture agregada aqui.
 */
export function TodayContextPanel() {
  const avisos = (TRACK_DEFINITIONS.faculdade.disciplines ?? []).flatMap((d) =>
    d.notices.map((notice, i) => ({ id: `${d.code}-${i}`, discipline: d.title, notice }))
  );

  return (
    <>
      {/* Seção 1: Guardian & Saúde do Sistema (Fluxo Contínuo & Tabular) */}
      <ContextPanelSection
        label="Guardian & Bio-Estado"
        rightSlot={
          <span className="text-[11px] font-mono text-[#18534B] dark:text-medusa-primary font-semibold tabular-nums">
            99.8% Estável
          </span>
        }
      >
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold tracking-tight text-text-primary tabular-nums">
            88<span className="text-xs font-normal text-text-muted ml-1">/ 100</span>
          </span>
          <span className="text-[11px] text-text-secondary">Fluxo contínuo</span>
        </div>
        <div className="w-full bg-surface-subtle h-1 rounded-full overflow-hidden">
          <div className="bg-medusa-primary h-full w-[88%] rounded-full" />
        </div>
        <div className="text-[10px] text-text-muted font-mono pt-0.5">
          Sync ativo há 2m · Nuvem Pessoal
        </div>
      </ContextPanelSection>

      {/* Seção 2: Próxima Transição */}
      <ContextPanelSection
        label="Próxima Transição"
        rightSlot={<span className="text-[10px] font-mono text-text-muted tabular-nums">14:30</span>}
      >
        <h4 className="text-[13px] font-semibold tracking-tight text-text-primary">
          Revisão Estratégica do Sistema
        </h4>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-text-secondary">Bloco de 45m</span>
          <span className="text-text-muted font-mono tabular-nums">Em 2h 15m</span>
        </div>
      </ContextPanelSection>

      {/* Seção 3: Marcos da Sessão */}
      <ContextPanelSection
        label="Marcos da Sessão"
        rightSlot={<span className="text-[10px] font-mono text-text-muted">Hoje</span>}
      >
        <div className="space-y-2 text-[12px]">
          <div className="flex items-baseline justify-between text-text-primary">
            <span className="font-medium">Alinhamento Arquitetural</span>
            <span className="text-text-muted font-mono text-[11px] tabular-nums">11:00</span>
          </div>
          <div className="flex items-baseline justify-between text-text-secondary">
            <span>Sessão de Leitura &amp; Síntese</span>
            <span className="text-text-muted font-mono text-[11px] tabular-nums">16:00</span>
          </div>
          <div className="flex items-baseline justify-between text-text-secondary">
            <span>Caminhada Restaurativa</span>
            <span className="text-text-muted font-mono text-[11px] tabular-nums">18:00</span>
          </div>
        </div>
      </ContextPanelSection>

      {/* Seção 4: Avisos — agregados da Faculdade (Educação), não duplicados */}
      {avisos.length > 0 && (
        <ContextPanelSection label="Avisos" noBorder>
          <div id="context-panel-today-avisos" className="flex flex-col gap-2">
            {avisos.map((a) => (
              <div key={a.id} className="flex items-start gap-1.5 text-[12px]">
                <span className="material-symbols-outlined text-[14px] text-medusa-primary mt-0.5">campaign</span>
                <div>
                  <span className="text-text-secondary">{a.notice}</span>
                  <span className="block text-[10px] font-mono text-text-muted">{a.discipline}</span>
                </div>
              </div>
            ))}
          </div>
        </ContextPanelSection>
      )}
    </>
  );
}
