'use client';

import React from 'react';
import { TRACK_DEFINITIONS } from './educationFixtures';
import { ContextPanelSection } from '@/components/shell/ContextPanelSection';
import { useEducationPanel } from '@/context/EducationPanelContext';
import { MasteryBars } from './MasteryBars';
import { getTrackAccent } from './trackAccent';

const accent = getTrackAccent('vestibular');

/**
 * Painel contextual do ENEM — segue a composição-base (Contexto → Próxima Ação → Domínio →
 * Revisões → Cronograma, ver DESIGN.md), com o Cronograma expresso como um "mapa de preparação"
 * compacto (onde estou → próximo → quanto falta), não uma cópia da UI do Hub.
 */
export function EnemContextPanel() {
  const trackDef = TRACK_DEFINITIONS.vestibular;
  const { openReviewModal, isSessionCompleted, sessionResultMirror, openCronogramaOverlay } = useEducationPanel();
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

  // Tiles do painel — resumo "de relance", cada um com função clara e dado real derivado do
  // cronograma (nenhum número inventado): quantos simulados já foram feitos, quantas revisões
  // do cronograma ainda estão pendentes, quantos blocos atrasados existem, e a data do próximo
  // simulado agendado (Refinamento Visual §9.2).
  const simuladosRealizados = cronograma.filter((b) => b.activityType === 'simulado' && b.status === 'concluido').length;
  const revisoesPendentes = cronograma.filter((b) => b.activityType === 'revisao' && b.status !== 'concluido').length;
  const tiles = [
    { id: 'simulados', icon: 'quiz', value: simuladosRealizados, label: 'Simulados feitos', color: 'tertiary' as const },
    { id: 'revisoes', icon: 'refresh', value: revisoesPendentes, label: 'Revisões pendentes', color: 'accent' as const },
    { id: 'atrasos', icon: 'warning', value: lateCount, label: lateCount === 1 ? 'Bloco atrasado' : 'Blocos atrasados', color: 'alert' as const },
    { id: 'proximo-simulado', icon: 'event', value: nextSimulado?.date ?? '—', label: 'Próximo simulado', color: 'support' as const },
  ];
  const TILE_COLOR: Record<string, string> = {
    tertiary: 'bg-medusa-tertiary/15 border-medusa-tertiary/30 text-[#3D4C1D] dark:text-[#D0EAA3]',
    accent: 'bg-medusa-accent/15 border-medusa-accent/30 text-[#8A6D00] dark:text-medusa-accent',
    alert: 'bg-medusa-alert/10 border-medusa-alert/30 text-medusa-alert',
    support: 'bg-medusa-support/15 border-medusa-support/30 text-[#1B502C] dark:text-medusa-support',
  };

  // Revisão gerada pela sessão recém-concluída (ver Refinamento Visual §8) — mesmo `SessionResult`
  // real exibido em StudyCompletionView, espelhado via EducationPanelContext.
  const justCompletedReview =
    isSessionCompleted && sessionResultMirror?.track === 'vestibular'
      ? {
          id: 'just-completed-enem',
          title: trackDef.lesson.topic,
          subtitle: trackDef.lesson.discipline,
          nextReviewDate: sessionResultMirror.nextReviewDate,
        }
      : null;

  return (
    <div id="context-panel-track-vestibular" className="flex flex-col gap-6">
      {/* 1. CONTEXTO DA TRILHA — compacto */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-6 h-6 rounded-lg ${accent.softBg} border ${accent.softBorder} flex items-center justify-center flex-shrink-0`}>
            <span className={`material-symbols-outlined text-[14px] ${accent.text}`}>assignment</span>
          </span>
          <span className="text-[11px] font-semibold text-text-primary truncate">
            ENEM · Preparação {percent}%
          </span>
        </div>
        <span className="text-[10px] font-mono text-text-muted tabular-nums flex-shrink-0">
          {completedModules}/{totalModules} habilidades
        </span>
      </div>

      {/* Tiles — resumo de relance, dado real derivado do cronograma (ver comentário acima) */}
      <div id="panel-enem-tiles" className="grid grid-cols-2 gap-2">
        {tiles.map((tile) => (
          <div
            key={tile.id}
            className={`p-2.5 rounded-xl border flex items-center gap-2 ${TILE_COLOR[tile.color]}`}
          >
            <span className="material-symbols-outlined text-[16px] flex-shrink-0">{tile.icon}</span>
            <div className="min-w-0">
              <div className="text-[13px] font-bold tabular-nums leading-tight truncate">{tile.value}</div>
              <div className="text-[9px] font-mono uppercase tracking-wide opacity-80 truncate">{tile.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. PRÓXIMA AÇÃO — protagonista do painel */}
      {(todayBlock || currentModule) && (
        <ContextPanelSection label="Próxima Ação">
          <div
            id="panel-next-action-enem"
            className={`p-3.5 rounded-xl ${accent.softBg} backdrop-blur-sm border ${accent.softBorder} flex flex-col gap-1 transition-all duration-220 hover:-translate-y-0.5 hover:shadow-glass ${accent.hoverBorder}`}
          >
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
      {(justCompletedReview || reviewCandidates.length > 0) && (
        <ContextPanelSection label="Próximas Revisões">
          <div id="panel-reviews-enem" className="flex flex-col gap-2">
            {justCompletedReview && (
              <div
                id="panel-review-just-completed"
                className="p-3 rounded-xl bg-medusa-support/10 border border-medusa-support/40 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[#1B502C] dark:text-medusa-support">Recém-concluída</span>
                  <h5 className="text-[12px] font-semibold text-text-primary truncate">{justCompletedReview.title}</h5>
                  <p className="text-[11px] text-text-muted truncate">
                    Revisão agendada: {justCompletedReview.nextReviewDate} · pode revisar antes
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-panel-review-just-completed"
                  onClick={() =>
                    openReviewModal({
                      id: justCompletedReview.id,
                      title: justCompletedReview.title,
                      subtitle: justCompletedReview.subtitle,
                      completedAt: 'Agora',
                      durationMinutes: undefined,
                    })
                  }
                  className="flex-shrink-0 text-[11px] font-mono text-[#1B502C] dark:text-medusa-support bg-medusa-support/20 px-2.5 py-1 rounded-full border border-medusa-support/40 hover:opacity-80 transition-opacity focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                >
                  Revisar agora
                </button>
              </div>
            )}
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
          onClick={openCronogramaOverlay}
          className={`btn-interactive mt-3 flex items-center justify-center gap-1.5 text-[12px] font-semibold ${accent.text} ${accent.softBg} border ${accent.softBorder} rounded-full px-3.5 py-2 hover:opacity-85 transition-opacity w-full focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none`}
        >
          <span className="material-symbols-outlined text-[15px]">calendar_month</span>
          Ver Cronograma completo
        </button>
      </ContextPanelSection>
    </div>
  );
}
