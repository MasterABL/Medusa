'use client';

import React from 'react';
import { TRACK_DEFINITIONS } from './educationFixtures';
import { ContextPanelSection } from '@/components/shell/ContextPanelSection';
import { useEducationPanel } from '@/context/EducationPanelContext';

const MATERIAL_ICON: Record<string, string> = {
  pdf: 'picture_as_pdf',
  slides: 'slideshow',
  planilha: 'table_chart',
  imagem: 'image',
};

/**
 * Painel contextual da Faculdade — extensão da disciplina selecionada: avisos, materiais e
 * prazos. Reage à mesma seleção de disciplina do Hub (`faculdadeDisciplineCode` compartilhado),
 * então trocar de disciplina no Hub atualiza o painel junto, sem duplicar a lógica de seleção.
 * Materiais são fixture de leitura (arquivos já existentes da disciplina) — nenhum upload,
 * ingestão por IA ou geração de resumo é oferecido aqui, porque esse fluxo não existe de verdade.
 */
export function FaculdadeContextPanel() {
  const trackDef = TRACK_DEFINITIONS.faculdade;
  const { faculdadeDisciplineCode } = useEducationPanel();
  const disciplines = trackDef.disciplines ?? [];
  const selected = disciplines.find((d) => d.code === faculdadeDisciplineCode) ?? disciplines[0];

  if (!selected) return null;

  return (
    <div id="context-panel-track-faculdade" key={selected.code} className="flex flex-col gap-6 study-summary-enter">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px] text-medusa-primary">school</span>
        <span className="text-[11px] font-semibold text-text-primary">{selected.title}</span>
      </div>

      <ContextPanelSection label="Disciplina Ativa">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-text-primary">{selected.code}</span>
          <span className="text-[11px] font-mono text-text-muted">{selected.credits} créditos</span>
        </div>
        <p className="text-[11px] text-text-secondary">{selected.dateRange}</p>
      </ContextPanelSection>

      {selected.notices.length > 0 && (
        <ContextPanelSection label="Avisos">
          <div id="context-panel-faculdade-notices" className="flex flex-col gap-1.5">
            {selected.notices.map((notice, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[12px] text-text-secondary">
                <span className="material-symbols-outlined text-[14px] text-medusa-primary mt-0.5">campaign</span>
                <span>{notice}</span>
              </div>
            ))}
          </div>
        </ContextPanelSection>
      )}

      {selected.materials.length > 0 && (
        <ContextPanelSection label="Materiais">
          <div className="flex flex-col gap-1.5">
            {selected.materials.map((mat) => (
              <div key={mat.id} className="flex items-center justify-between gap-2 text-[12px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="material-symbols-outlined text-[15px] text-text-muted flex-shrink-0">
                    {MATERIAL_ICON[mat.kind]}
                  </span>
                  <span className="text-text-secondary truncate">{mat.name}</span>
                </div>
                <span className="text-[10px] font-mono text-text-muted flex-shrink-0">{mat.sizeLabel}</span>
              </div>
            ))}
          </div>
        </ContextPanelSection>
      )}

      {selected.deadlines.length > 0 && (
        <ContextPanelSection label="Prazos" noBorder>
          <div className="flex flex-col gap-1.5">
            {selected.deadlines.map((dl) => (
              <div key={dl.id} className="flex items-center justify-between text-[12px]">
                <span className="text-text-secondary">{dl.label}</span>
                <span className="font-mono text-[11px] text-text-muted">{dl.date}</span>
              </div>
            ))}
          </div>
        </ContextPanelSection>
      )}
    </div>
  );
}
