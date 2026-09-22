'use client';

import React from 'react';
import { TrackDefinition, TrackModuleItem } from './types';
import { TrackModuleList } from './TrackModuleList';
import { EnemCronogramaView } from './EnemCronogramaView';
import { CompletedActivityList } from './CompletedActivityList';
import { useEducationPanel } from '@/context/EducationPanelContext';

interface EnemHubProps {
  trackDef: TrackDefinition;
  trackItems: TrackModuleItem[];
  onStartStudy?: (simulateError?: boolean) => void;
}

const SIMULADO_STATUS_STYLE: Record<string, string> = {
  planejado: 'bg-surface-secondary text-text-muted border-border/60',
  concluido: 'bg-medusa-support/15 text-[#1B502C] dark:text-medusa-support border-medusa-support/30',
  atrasado: 'bg-[#FFF18C]/20 text-[#6B4E00] dark:text-[#FFF18C] border-[#FFF18C]/40',
};
const SIMULADO_STATUS_LABEL: Record<string, string> = {
  planejado: 'Programado',
  concluido: 'Realizado',
  atrasado: 'Atrasado',
};

/**
 * Hub do ENEM — trilha orientada a PLANEJAMENTO. "Visão Geral" mostra os conteúdos por
 * habilidade, os simulados (como atividade real e visível, não escondida dentro do Cronograma)
 * e o que já foi concluído; "Cronograma" é a subexperiência própria de planejamento temporal.
 */
export function EnemHub({ trackDef, trackItems, onStartStudy }: EnemHubProps) {
  const { enemView: view, setEnemView: setView } = useEducationPanel();
  const cronograma = trackDef.cronograma ?? [];
  const simulados = cronograma.filter((b) => b.activityType === 'simulado');
  const completedModules = trackItems.filter((m) => m.status === 'completed');

  return (
    <div className="flex flex-col gap-6">
      <div
        id="enem-subnav"
        role="tablist"
        aria-label="Navegação do ENEM"
        className="flex items-center gap-1 p-1 bg-surface-secondary/70 border border-border/60 rounded-xl w-fit"
      >
        <button
          type="button"
          id="enem-tab-visao-geral"
          role="tab"
          aria-selected={view === 'visao-geral'}
          onClick={() => setView('visao-geral')}
          className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all flex items-center gap-1.5 ${
            view === 'visao-geral'
              ? 'bg-surface text-text-primary shadow-subtle font-semibold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">dashboard</span>
          Visão Geral
        </button>
        <button
          type="button"
          id="enem-tab-cronograma"
          role="tab"
          aria-selected={view === 'cronograma'}
          onClick={() => setView('cronograma')}
          className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all flex items-center gap-1.5 ${
            view === 'cronograma'
              ? 'bg-surface text-text-primary shadow-subtle font-semibold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">calendar_month</span>
          Cronograma
        </button>
      </div>

      <div key={view} className="study-stage-enter flex flex-col gap-6">
        {view === 'visao-geral' && (
          <>
            {simulados.length > 0 && (
              <section id="enem-simulados" aria-label="Simulados" className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-text-muted">
                      Simulados
                    </span>
                    <div className="h-px bg-border/60 w-16" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setView('cronograma')}
                    className="text-[11px] font-mono text-[#18534B] dark:text-[#71DBD2] hover:opacity-80 flex items-center gap-1"
                  >
                    Ver no Cronograma
                    <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {simulados.map((s) => (
                    <div
                      key={s.id}
                      className="p-3.5 rounded-xl border border-border/60 bg-surface/70 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="material-symbols-outlined text-[18px] text-medusa-primary flex-shrink-0">
                          quiz
                        </span>
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono text-text-muted">{s.date} · {s.weekday}</div>
                          <div className="text-[13px] font-semibold text-text-primary truncate">{s.topic}</div>
                        </div>
                      </div>
                      <span
                        className={`flex-shrink-0 text-[9px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${SIMULADO_STATUS_STYLE[s.status]}`}
                      >
                        {SIMULADO_STATUS_LABEL[s.status]}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <TrackModuleList
              title={`Conteúdos por Habilidade · ${trackDef.name}`}
              domainLabel={trackDef.domainLabel}
              items={trackItems}
            />

            <CompletedActivityList
              sectionId="enem-completed-activities"
              title={`Aulas Concluídas · ${trackDef.name}`}
              items={completedModules.map((m) => ({
                id: m.id,
                title: m.title,
                subtitle: m.code,
                completedAt: m.date,
                durationMinutes: undefined,
              }))}
            />
          </>
        )}
        {view === 'cronograma' && (
          <EnemCronogramaView blocks={cronograma} onStartStudy={onStartStudy} />
        )}
      </div>
    </div>
  );
}
