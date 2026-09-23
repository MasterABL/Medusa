'use client';

import React from 'react';
import { TRACK_DEFINITIONS } from './educationFixtures';
import { ContextPanelSection } from '@/components/shell/ContextPanelSection';
import { useEducationPanel } from '@/context/EducationPanelContext';
import { MasteryBars } from './MasteryBars';

/**
 * Painel contextual do ENEM — segue a composição-base (Contexto → Próxima Ação → Domínio →
 * Revisões → Cronograma, ver DESIGN.md), com o Cronograma expresso como um "mapa de preparação"
 * compacto (onde estou → próximo → quanto falta), não uma cópia da UI do Hub.
 */
export function EnemContextPanel() {
  const trackDef = TRACK_DEFINITIONS.vestibular;
  const { setEnemView, openReviewModal } = useEducationPanel();
  const cronograma = trackDef.cronograma ?? [];

  const completedModules = trackDef.modules.filter((m) => m.status === 'completed').length;
  const totalModules = trackDef.modules.length;
  const percent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  const currentModule = trackDef.modules.find((m) => m.status === 'in_progress');
  const nextModule = trackDef.modules[trackDef.modules.findIndex((m) => m.status === 'in_progress') + 1];

  const todayBlock = cronograma.find((b) => b.isToday);
  const nextSimulado = cronograma.find((b) => b.activityType === 'simulado' && b.status === 'planejado');
  const lateCount = cronograma.filter((b) => b.status === 'atrasado').length;
  const reviewCandidates = trackDef.modules.filter((m) => m.status === 'completed').slice(-2).reverse();

  return (
    <div id="context-panel-track-vestibular" className="flex flex-col gap-6">
      {/* 1. CONTEXTO DA TRILHA — compacto */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[16px] text-medusa-primary flex-shrink-0">assignment</span>
          <span className="text-[11px] font-semibold text-text-primary truncate">
            ENEM · Preparação {percent}%
          </span>
        </div>
        <span className="text-[10px] font-mono text-text-muted tabular-nums flex-shrink-0">
          {completedModules}/{totalModules} habilidades
        </span>
      </div>

      {/* 2. PRÓXIMA AÇÃO — protagonista do painel */}
      {(todayBlock || currentModule) && (
        <ContextPanelSection label="Próxima Ação">
          <div id="panel-next-action-enem" className="p-3.5 rounded-xl bg-medusa-primary/10 border border-medusa-primary/30 flex flex-col gap-1">
            <h4 className="text-[13px] font-semibold text-text-primary leading-snug">
              {todayBlock ? `${todayBlock.discipline} · ${todayBlock.topic}` : currentModule?.title}
            </h4>
            <p className="text-[11px] text-text-secondary">
              {todayBlock ? todayBlock.nextAction : `${currentModule?.duration ?? ''}`}
            </p>
          </div>
        </ContextPanelSection>
      )}

      {/* 3. DOMÍNIO / MASTERY por área */}
      {trackDef.masteryDomains && (
        <ContextPanelSection label="Domínio por Área">
          <MasteryBars domains={trackDef.masteryDomains} />
        </ContextPanelSection>
      )}

      {/* 4. PRÓXIMAS REVISÕES — destino real: mesmo modal usado por "Aulas Concluídas" no Hub */}
      {reviewCandidates.length > 0 && (
        <ContextPanelSection label="Próximas Revisões">
          <div id="panel-reviews-enem" className="flex flex-col gap-2">
            {reviewCandidates.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-xl bg-surface/70 border border-border/50 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <h5 className="text-[12px] font-semibold text-text-primary truncate">{m.title}</h5>
                  <p className="text-[11px] text-text-muted truncate">{m.code} · Próxima revisão: {trackDef.nextReviewSuggestion}</p>
                </div>
                <button
                  type="button"
                  id={`btn-panel-review-${m.id}`}
                  onClick={() =>
                    openReviewModal({
                      id: m.id,
                      title: m.title,
                      subtitle: m.code,
                      completedAt: m.date,
                      durationMinutes: undefined,
                    })
                  }
                  className="flex-shrink-0 text-[11px] font-mono text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 px-2.5 py-1 rounded-full border border-[#71DBD2]/30 hover:opacity-80 transition-opacity focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                >
                  Revisão
                </button>
              </div>
            ))}
          </div>
        </ContextPanelSection>
      )}

      {/* 5. CRONOGRAMA = mapa de preparação (onde estou → próximo → quanto falta) */}
      <ContextPanelSection label="Mapa de Preparação" noBorder>
        <div id="panel-enem-preparation-map" className="flex flex-col gap-2 text-[12px]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[15px] text-medusa-support flex-shrink-0">flag</span>
            <span className="text-text-secondary">Onde estou: <strong className="text-text-primary">{currentModule?.title ?? 'Trilha concluída'}</strong></span>
          </div>
          {nextModule && (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[15px] text-medusa-primary flex-shrink-0">arrow_forward</span>
              <span className="text-text-secondary">Próximo: <strong className="text-text-primary">{nextModule.title}</strong></span>
            </div>
          )}
          {nextSimulado && (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[15px] text-medusa-tertiary flex-shrink-0">quiz</span>
              <span className="text-text-secondary">Próximo simulado: <strong className="text-text-primary">{nextSimulado.date} · {nextSimulado.weekday}</strong></span>
            </div>
          )}
          {lateCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[15px] text-medusa-alert flex-shrink-0">warning</span>
              <span className="text-text-secondary">{lateCount} bloco{lateCount !== 1 ? 's' : ''} atrasado{lateCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          id="btn-panel-open-cronograma"
          onClick={() => setEnemView('cronograma')}
          className="btn-interactive mt-3 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 border border-[#71DBD2]/30 rounded-full px-3.5 py-2 hover:opacity-85 transition-opacity w-full focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
        >
          <span className="material-symbols-outlined text-[15px]">calendar_month</span>
          Ver Cronograma completo
        </button>
      </ContextPanelSection>
    </div>
  );
}
