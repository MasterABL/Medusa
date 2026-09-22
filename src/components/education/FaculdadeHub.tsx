'use client';

import React, { useState } from 'react';
import { TrackDefinition, TrackModuleItem } from './types';
import { TrackModuleList } from './TrackModuleList';

interface FaculdadeHubProps {
  trackDef: TrackDefinition;
  trackItems: TrackModuleItem[];
}

/**
 * Hub de Faculdade — organização acadêmica. A disciplina selecionada é estado real (não só
 * apresentação): escolher outra disciplina troca a sessão em foco, o conteúdo e os avisos, tudo
 * dentro do mesmo Hub — nunca uma navegação para outra tela. A troca usa a mesma animação de
 * entrada já usada no painel companheiro do Study Mode (`study-summary-enter`, crossfade +
 * deslocamento sutil), reaproveitada aqui em vez de um sistema de motion novo.
 */
export function FaculdadeHub({ trackDef, trackItems }: FaculdadeHubProps) {
  const disciplines = trackDef.disciplines ?? [];
  const [selectedCode, setSelectedCode] = useState<string>(
    () => disciplines.find((d) => d.isActive)?.code ?? disciplines[0]?.code ?? ''
  );

  const selected = disciplines.find((d) => d.code === selectedCode) ?? disciplines[0];
  // FIS-204 é a disciplina com sessão de estudo real (a que o hero "Continuar Sessão" do Hub
  // inicia) — usa o `trackItems` dinâmico (que reflete conclusão de sessão). As demais
  // disciplinas mostram seu próprio conteúdo fixture, sem sessão iniciável ainda.
  const isPrimaryDiscipline = selected?.code === trackDef.disciplines?.find((d) => d.isActive)?.code;
  const contentToShow = isPrimaryDiscipline ? trackItems : selected?.content ?? [];

  if (!selected) return null;

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Disciplinas Ativas" className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-text-muted">
            Disciplinas Ativas
          </span>
          <div className="h-px bg-border/60 w-16" />
        </div>

        <div id="faculdade-discipline-selector" className="flex flex-wrap gap-2" role="tablist" aria-label="Selecionar disciplina">
          {disciplines.map((d) => {
            const isSelected = d.code === selectedCode;
            return (
              <button
                key={d.code}
                type="button"
                id={`discipline-chip-${d.code}`}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedCode(d.code)}
                className={`btn-interactive flex items-center gap-2.5 px-3.5 py-2 rounded-full border text-[12px] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none ${
                  isSelected
                    ? 'bg-[#71DBD2]/15 border-[#71DBD2]/40 text-[#18534B] dark:text-[#71DBD2] font-semibold shadow-subtle scale-[1.02]'
                    : 'bg-surface-secondary/50 border-border/50 text-text-secondary hover:text-text-primary hover:border-border/70'
                }`}
              >
                <span className="font-mono text-[10px] uppercase tracking-wide">{d.code}</span>
                <span className="text-text-muted/40">•</span>
                <span>{d.title}</span>
                <span className="text-text-muted/40">•</span>
                <span className="font-mono text-[10px] text-text-muted">{d.credits} créd.</span>
              </button>
            );
          })}
        </div>
      </section>

      {/*
        A troca de disciplina remonta esta região com `study-summary-enter` (crossfade +
        deslocamento horizontal sutil, já usado no painel companheiro do Study Mode) — a
        sensação é "mudei a disciplina que acompanho", não "fui para outra página".
      */}
      <div key={selectedCode} id="faculdade-discipline-content" className="study-summary-enter flex flex-col gap-6">
        {/* Sessão em Foco da disciplina selecionada */}
        <section
          id="faculdade-focus-session"
          aria-label="Sessão em Foco"
          className="bg-surface rounded-2xl p-5 border border-border/70 shadow-subtle flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary living-pulse" />
              Sessão em Foco · {selected.title}
            </span>
            <span className="text-[10px] font-mono text-text-muted bg-surface-secondary px-2 py-0.5 rounded border border-border/60">
              {selected.focusDuration}
            </span>
          </div>
          <h4 className="text-[15px] font-semibold text-text-primary">{selected.focusTopic}</h4>
          <p className="text-[12.5px] text-text-secondary leading-relaxed">{selected.focusObjective}</p>
          {!isPrimaryDiscipline && (
            <p className="text-[11px] font-mono text-text-muted italic">
              Sessão de estudo completa ainda não disponível para esta disciplina — conteúdo em preparação.
            </p>
          )}
        </section>

        {/* Avisos da disciplina selecionada */}
        {selected.notices.length > 0 && (
          <section id="faculdade-notices" aria-label="Avisos" className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Avisos</span>
            {selected.notices.map((notice, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[12px] text-text-secondary">
                <span className="material-symbols-outlined text-[14px] text-medusa-primary mt-0.5">campaign</span>
                <span>{notice}</span>
              </div>
            ))}
          </section>
        )}

        <TrackModuleList
          title={`Aulas & Conteúdos · ${selected.title}`}
          domainLabel={trackDef.domainLabel}
          items={contentToShow}
        />
      </div>
    </div>
  );
}
