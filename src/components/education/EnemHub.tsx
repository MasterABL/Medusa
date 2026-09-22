'use client';

import React, { useState } from 'react';
import { TrackDefinition, TrackModuleItem } from './types';
import { TrackModuleList } from './TrackModuleList';
import { EnemCronogramaView } from './EnemCronogramaView';

interface EnemHubProps {
  trackDef: TrackDefinition;
  trackItems: TrackModuleItem[];
  onStartStudy?: (simulateError?: boolean) => void;
}

/**
 * Hub do ENEM — trilha orientada a PLANEJAMENTO. "Visão Geral" mantém a lista curada de
 * conteúdos por habilidade; "Cronograma" é uma subexperiência própria (não uma seção pequena
 * dentro do Hub) — o mapa operacional de preparação, com dimensão temporal, disciplinas,
 * conteúdos, tipos de atividade e status.
 */
export function EnemHub({ trackDef, trackItems, onStartStudy }: EnemHubProps) {
  const [view, setView] = useState<'visao-geral' | 'cronograma'>('visao-geral');
  const cronograma = trackDef.cronograma ?? [];

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

      <div key={view} className="study-stage-enter">
        {view === 'visao-geral' && (
          <TrackModuleList
            title={`Conteúdos por Habilidade · ${trackDef.name}`}
            domainLabel={trackDef.domainLabel}
            items={trackItems}
          />
        )}
        {view === 'cronograma' && (
          <EnemCronogramaView blocks={cronograma} onStartStudy={onStartStudy} />
        )}
      </div>
    </div>
  );
}
