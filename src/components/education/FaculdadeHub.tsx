'use client';

import React, { useState } from 'react';
import { TrackDefinition, TrackModuleItem } from './types';
import { TrackModuleList } from './TrackModuleList';
import { CompletedActivityList } from './CompletedActivityList';
import { useEducationPanel } from '@/context/EducationPanelContext';
import { getTrackAccent } from './trackAccent';
import { playFeedback } from '@/lib/audioFeedback';

interface FaculdadeHubProps {
  trackDef: TrackDefinition;
  trackItems: TrackModuleItem[];
}

/**
 * Hub de Faculdade — organização acadêmica. A disciplina selecionada é estado real (não só
 * apresentação): escolher outra disciplina troca a sessão em foco e o conteúdo, tudo dentro do
 * mesmo Hub — nunca uma navegação para outra tela. A troca usa a mesma animação de entrada já
 * usada no painel companheiro do Study Mode (`study-summary-enter`, crossfade + deslocamento
 * sutil), reaproveitada aqui em vez de um sistema de motion novo. Avisos, materiais e prazos da
 * disciplina ativa aparecem no Context Panel (ver FaculdadeContextPanel.tsx) — não duplicados
 * aqui na área principal.
 */
export function FaculdadeHub({ trackDef, trackItems }: FaculdadeHubProps) {
  const accent = getTrackAccent(trackDef.id);
  const {
    faculdadeDisciplineCode: selectedCode,
    setFaculdadeDisciplineCode: setSelectedCode,
    facultyExtraDisciplines,
    addFaculdadeDiscipline,
  } = useEducationPanel();
  // Fixture + disciplinas adicionadas nesta sessão (ver EducationPanelContext.tsx) — a mesma
  // lista combinada que o Context Panel usa, para as duas superfícies nunca divergirem.
  const disciplines = [...(trackDef.disciplines ?? []), ...facultyExtraDisciplines];

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newCredits, setNewCredits] = useState('4');

  const selected = disciplines.find((d) => d.code === selectedCode) ?? disciplines[0];
  // FIS-204 é a disciplina com sessão de estudo real (a que o hero "Continuar Sessão" do Hub
  // inicia) — usa o `trackItems` dinâmico (que reflete conclusão de sessão). As demais
  // disciplinas mostram seu próprio conteúdo fixture, sem sessão iniciável ainda.
  const isPrimaryDiscipline = selected?.code === trackDef.disciplines?.find((d) => d.isActive)?.code;
  const contentToShow = isPrimaryDiscipline ? trackItems : selected?.content ?? [];
  const completedContent = contentToShow.filter((m) => m.status === 'completed');

  function resetForm() {
    setNewTitle('');
    setNewCode('');
    setNewCredits('4');
    setIsAdding(false);
  }

  function handleAddDiscipline(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    const code = newCode.trim().toUpperCase() || title.slice(0, 3).toUpperCase();
    if (!title || disciplines.some((d) => d.code === code)) return;

    addFaculdadeDiscipline({
      code,
      title,
      dateRange: 'Período letivo atual',
      credits: Number(newCredits) || 4,
      isActive: false,
      focusTopic: 'Ainda sem tópico definido',
      focusObjective: 'Adicione conteúdo e prazos assim que o plano da disciplina estiver definido.',
      focusDuration: '—',
      content: [],
      notices: [],
      materials: [],
      deadlines: [],
    });
    setSelectedCode(code);
    resetForm();
    // Confirmação discreta de ação do usuário (Round 6 §33/§9) — categoria `action`, não
    // `completion`: adicionar uma disciplina é um passo pequeno, não o fim de uma jornada.
    playFeedback('action');
  }

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

        <div id="faculdade-discipline-selector" className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Selecionar disciplina">
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
                    ? `${accent.softBg} ${accent.softBorder} ${accent.text} font-semibold shadow-subtle scale-[1.02]`
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

          <button
            type="button"
            id="btn-add-discipline"
            onClick={() => setIsAdding((v) => !v)}
            aria-expanded={isAdding}
            aria-controls="add-discipline-form"
            className={`btn-interactive flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-dashed text-[12px] font-medium transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none ${
              isAdding
                ? `${accent.softBg} ${accent.softBorder} ${accent.text}`
                : 'border-border/60 text-text-muted hover:text-text-primary hover:border-border/90'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Adicionar disciplina
          </button>
        </div>

        {isAdding && (
          <form
            id="add-discipline-form"
            onSubmit={handleAddDiscipline}
            className="summary-item-rise flex flex-col sm:flex-row sm:items-end gap-3 p-4 rounded-xl bg-surface border border-border/70 shadow-subtle"
          >
            <label className="flex flex-col gap-1 flex-1 min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-wide text-text-muted">Nome da disciplina</span>
              <input
                autoFocus
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex.: Cálculo III"
                className="px-3 py-2 rounded-lg bg-surface-secondary/60 border border-border/60 text-[13px] text-text-primary placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 w-full sm:w-28">
              <span className="text-[10px] font-mono uppercase tracking-wide text-text-muted">Código</span>
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="CAL-303"
                className="px-3 py-2 rounded-lg bg-surface-secondary/60 border border-border/60 text-[13px] text-text-primary placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 w-full sm:w-24">
              <span className="text-[10px] font-mono uppercase tracking-wide text-text-muted">Créditos</span>
              <input
                type="number"
                min={1}
                max={12}
                value={newCredits}
                onChange={(e) => setNewCredits(e.target.value)}
                className="px-3 py-2 rounded-lg bg-surface-secondary/60 border border-border/60 text-[13px] text-text-primary focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
              />
            </label>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed ${accent.solidBg} ${accent.solidText}`}
              >
                Adicionar
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-2 rounded-lg text-[12px] text-text-muted hover:text-text-primary transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
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
              <span className={`w-1.5 h-1.5 rounded-full ${accent.solidBg} living-pulse`} />
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

        <TrackModuleList
          title={`Aulas & Conteúdos · ${selected.title}`}
          domainLabel={trackDef.domainLabel}
          items={contentToShow}
          accent={accent}
        />

        <CompletedActivityList
          sectionId="faculdade-completed-activities"
          title={`Aulas Concluídas · ${selected.title}`}
          accent={accent}
          items={completedContent.map((m) => ({
            id: m.id,
            title: m.title,
            subtitle: m.code,
            completedAt: m.date,
          }))}
        />
      </div>
    </div>
  );
}
