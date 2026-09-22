'use client';

import React from 'react';
import { TrackDefinition, TrackModuleItem } from './types';
import { TrackModuleList } from './TrackModuleList';

interface FaculdadeHubProps {
  trackDef: TrackDefinition;
  trackItems: TrackModuleItem[];
}

/**
 * Hub de Faculdade — organização acadêmica: disciplinas do período como uma faixa de chips
 * (não cartões empilhados, para reduzir a sensação de "card sobre card"), seguida do conteúdo
 * da disciplina ativa (aulas/conteúdos), reaproveitando a mesma lista curada do ENEM.
 */
export function FaculdadeHub({ trackDef, trackItems }: FaculdadeHubProps) {
  const disciplines = trackDef.disciplines ?? [];

  return (
    <div className="flex flex-col gap-8">
      {disciplines.length > 0 && (
        <section aria-label="Disciplinas Ativas" className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-text-muted">
              Disciplinas Ativas
            </span>
            <div className="h-px bg-border/60 w-16" />
          </div>

          <div className="flex flex-wrap gap-2">
            {disciplines.map((d) => (
              <div
                key={d.code}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-full border text-[12px] transition-all ${
                  d.isActive
                    ? 'bg-[#71DBD2]/15 border-[#71DBD2]/40 text-[#18534B] dark:text-[#71DBD2] font-semibold shadow-subtle'
                    : 'bg-surface-secondary/50 border-border/50 text-text-secondary'
                }`}
              >
                <span className="font-mono text-[10px] uppercase tracking-wide">{d.code}</span>
                <span className="text-text-muted/40">•</span>
                <span>{d.title}</span>
                <span className="text-text-muted/40">•</span>
                <span className="font-mono text-[10px] text-text-muted">{d.credits} créd.</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <TrackModuleList
        title={`Aulas & Conteúdos · Disciplina Ativa`}
        domainLabel={trackDef.domainLabel}
        items={trackItems}
      />
    </div>
  );
}
