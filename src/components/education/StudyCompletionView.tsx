'use client';

import React from 'react';
import { SessionResult } from './types';
import { LESSON_FIXTURE } from './educationFixtures';

interface StudyCompletionViewProps {
  result: SessionResult;
  onReturnToEducation: () => void;
}

export function StudyCompletionView({
  result,
  onReturnToEducation,
}: StudyCompletionViewProps) {
  return (
    <div
      id="study-completion-container"
      className="study-stage-enter w-full max-w-3xl mx-auto my-8 flex flex-col gap-6 py-6 pb-16"
    >
      {/* Topo / Confirmação Auditável */}
      <div className="bg-surface rounded-2xl p-6 sm:p-8 border border-border/70 shadow-calm flex flex-col items-center text-center gap-6">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-medusa-support/20 border border-medusa-support/50 island-success-settle">
          <span className="material-symbols-outlined text-[#1B502C] dark:text-medusa-support text-[28px]">
            verified
          </span>
        </div>

        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#1B502C] dark:text-medusa-support bg-medusa-support/15 px-3 py-1 rounded-full border border-medusa-support/30">
            Sessão Concluída com Sucesso
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            {LESSON_FIXTURE.discipline} · {LESSON_FIXTURE.topic}
          </h1>
          <p className="text-[13px] text-text-secondary max-w-md mx-auto">
            Aula e prática finalizadas. Os dados desta sessão foram auditados e computados para a progressão da sua trilha.
          </p>
        </div>

        {/* Métricas Reais Auditáveis (Regra Anti-Ficção estrita) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full pt-2">
          {/* Métrica 1: Duração Real */}
          <div className="p-4 rounded-xl bg-surface-secondary/70 border border-border/60 flex flex-col items-center text-center gap-1">
            <span className="text-[10px] font-mono uppercase text-text-muted">
              Duração da Sessão
            </span>
            <span className="text-xl font-bold text-text-primary font-mono tabular-nums">
              {result.durationFormatted}
            </span>
            <span className="text-[11px] text-text-muted">Aula teórica + prática</span>
          </div>

          {/* Métrica 2: Aproveitamento Real em Questões */}
          <div className="p-4 rounded-xl bg-surface-secondary/70 border border-border/60 flex flex-col items-center text-center gap-1">
            <span className="text-[10px] font-mono uppercase text-text-muted">
              Aproveitamento Real
            </span>
            <span className="text-xl font-bold text-text-primary font-mono tabular-nums">
              {result.correctAnswers}/{result.totalQuestions} ({result.scorePercentage}%)
            </span>
            <span className="text-[11px] text-text-muted">5 questões conceituais</span>
          </div>

          {/* Métrica 3: Próxima Revisão Programada */}
          <div className="p-4 rounded-xl bg-surface-secondary/70 border border-border/60 flex flex-col items-center text-center gap-1">
            <span className="text-[10px] font-mono uppercase text-text-muted">
              Próxima Revisão
            </span>
            <span className="text-xl font-bold text-text-primary font-mono tabular-nums">
              {result.nextReviewDate}
            </span>
            <span className="text-[11px] text-[#1B502C] dark:text-medusa-support font-medium">
              Ciclo de retenção ativa
            </span>
          </div>
        </div>

        {/* Ponto a Reforçar (Consequência Pedagógica Real) */}
        <div className="w-full text-left p-4 rounded-xl bg-surface-secondary/50 border border-border/60 space-y-1">
          <div className="flex items-center gap-2 text-text-primary font-semibold text-[13px]">
            <span className="material-symbols-outlined text-[16px] text-medusa-primary">
              psychology_alt
            </span>
            <span>Ponto Conceitual a Reforçar</span>
          </div>
          <p className="text-[12px] text-text-secondary leading-relaxed">
            {result.pointToReinforce}
          </p>
        </div>

        {/* Próximo Passo na Trilha */}
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border/60 text-left">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Próximo Tópico Desbloqueado na Trilha
            </span>
            <h4 className="text-[14px] font-semibold text-text-primary">
              {LESSON_FIXTURE.nextTopic}
            </h4>
            <p className="text-[11px] text-text-muted">
              Ressonância acústica, tubos sonoros e velocidade do som.
            </p>
          </div>

          <button
            type="button"
            id="btn-return-education"
            onClick={onReturnToEducation}
            className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] px-6 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-subtle flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex-shrink-0"
          >
            <span>Retornar para Educação</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
