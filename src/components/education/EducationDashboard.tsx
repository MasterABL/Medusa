'use client';

import React, { useState } from 'react';
import { EDUCATION_TRACK_FIXTURE, LESSON_FIXTURE } from './educationFixtures';

interface EducationDashboardProps {
  onStartStudy: (simulateError?: boolean) => void;
  isSessionCompleted: boolean;
  completedScore?: number;
}

export function EducationDashboard({
  onStartStudy,
  isSessionCompleted,
  completedScore = 80,
}: EducationDashboardProps) {
  const [qaSimulateFailure, setQaSimulateFailure] = useState(false);
  const [qaPanelOpen, setQaPanelOpen] = useState(false);

  // Trilha dinâmica: se a sessão foi concluída, FIS-201 passa para 'completed' e FIS-202 fica disponível
  const trackItems = EDUCATION_TRACK_FIXTURE.map((item) => {
    if (item.code === 'FIS-201' && isSessionCompleted) {
      return {
        ...item,
        status: 'completed' as const,
        score: `${completedScore}%`,
        date: 'Concluído hoje',
      };
    }
    if (item.code === 'FIS-202' && isSessionCompleted) {
      return {
        ...item,
        status: 'in_progress' as const,
        score: 'Próxima',
        date: 'Disponível para estudo',
      };
    }
    return item;
  });

  const completedCount = trackItems.filter((i) => i.status === 'completed').length;
  const progressPercent = Math.round((completedCount / trackItems.length) * 100);

  return (
    <div
      id="education-dashboard"
      className="study-stage-enter w-full flex flex-col gap-8 max-w-5xl mx-auto pb-16"
    >
      {/* ================= 1. CABEÇALHO DA EDUCAÇÃO ================= */}
      <section aria-label="Visão Geral de Educação" className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-border/70 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-medium tracking-widest uppercase text-text-muted">
                Life OS · Módulo Educação
              </span>
              <span className="text-text-muted/40">•</span>
              <span className="text-[11px] text-text-secondary">
                Física Geral · Ciclo Ativo
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Trilha de Aprendizado &amp; Prática
            </h1>
            <p className="text-[13px] text-text-secondary leading-relaxed max-w-2xl">
              Sistema de estudo integrado: aulas teóricas com resumo estruturado, anotações ativas e prática deliberada com diagnóstico pedagógico.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-semibold tracking-wider text-text-muted bg-surface border border-border/60 px-3 py-1 rounded-full shadow-subtle">
              TRILHA: {completedCount}/{trackItems.length} ({progressPercent}%)
            </span>
          </div>
        </div>

        {/* ================= 2. CARTÃO DE PRÓXIMA AÇÃO OPERACIONAL (HERO) ================= */}
        <div
          id="education-next-action-card"
          className="bg-surface rounded-2xl p-6 sm:p-7 border border-border/70 shadow-calm flex flex-col gap-6 transition-all hover:border-medusa-primary/50"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary living-pulse" />
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                {isSessionCompleted ? 'Próxima Ação Desbloqueada' : 'Próxima Ação Recomendada'}
              </h3>
            </div>
            <span className="text-[10px] font-mono text-text-muted uppercase tabular-nums">
              {isSessionCompleted ? 'Etapa 05 de 05' : 'Etapa 04 de 05'}
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-medusa-primary/20 border border-medusa-primary/40 flex items-center justify-center text-medusa-primary flex-shrink-0 mt-0.5 shadow-subtle">
                <span className="material-symbols-outlined text-[22px] text-[#18534B] dark:text-[#71DBD2]">
                  {isSessionCompleted ? 'graphic_eq' : 'waves'}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 px-2 py-0.5 rounded border border-[#71DBD2]/30">
                    {isSessionCompleted ? 'Próximo Bloco' : 'Sessão Pronta'}
                  </span>
                  <span className="text-[11px] font-mono text-text-muted">
                    {isSessionCompleted ? '50 min estimados' : LESSON_FIXTURE.estimatedDuration}
                  </span>
                </div>
                <h4 className="text-[16px] sm:text-[17px] font-semibold text-text-primary tracking-tight">
                  {isSessionCompleted
                    ? LESSON_FIXTURE.nextTopic
                    : `${LESSON_FIXTURE.discipline} · ${LESSON_FIXTURE.topic}`}
                </h4>
                <p className="text-[12px] text-text-secondary leading-relaxed max-w-xl">
                  {isSessionCompleted
                    ? 'Fenômenos acústicos, equação da ressonância, tubos abertos e fechados e fisiologia auditiva.'
                    : 'Perturbações mecânicas, equação fundamental v = λ · f, ondas estacionárias e difração.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                type="button"
                id="btn-start-study-session"
                onClick={() => onStartStudy(qaSimulateFailure)}
                className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-subtle flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
              >
                <span className="material-symbols-outlined text-[18px]">play_circle</span>
                <span>
                  {isSessionCompleted ? 'Revisar Sessão de Ondulatória' : 'Iniciar Sessão de Estudo'}
                </span>
              </button>
            </div>
          </div>

          {/* Inline Metrics (Dados reais auditáveis da trilha) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/60">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-text-muted">
                Tempo Acumulado
              </span>
              <div className="text-base font-bold text-text-primary tabular-nums">
                {isSessionCompleted ? '26h 45m' : '26h 00m'}
              </div>
              <p className="text-[11px] text-text-muted">Tempo auditado no ciclo</p>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-text-muted">
                Progresso da Trilha
              </span>
              <div className="text-base font-bold text-text-primary tabular-nums">
                {completedCount}/5 módulos
              </div>
              <p className="text-[11px] text-[#1B502C] dark:text-medusa-support font-medium">
                {progressPercent}% completado
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-text-muted">
                Status do Sistema
              </span>
              <div className="text-base font-bold text-text-primary">
                {isSessionCompleted ? 'Revisão Agendada' : 'Pronto para Estudo'}
              </div>
              <p className="text-[11px] text-text-muted">
                {isSessionCompleted ? 'Amanhã às 09:00' : 'Sessão imediata'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3. TRILHA ESTRUTURADA DE CONHECIMENTO ================= */}
      <section aria-label="Módulos da Trilha" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-text-muted">
              Módulos Curados · Física Geral
            </span>
            <div className="h-px bg-border/60 w-16" />
          </div>
          <span className="text-[11px] font-mono text-text-muted">
            Currículo Estruturado V2
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {trackItems.map((item, idx) => {
            const isItemCompleted = item.status === 'completed';
            const isItemActive = item.status === 'in_progress';

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isItemActive
                    ? 'bg-surface border-medusa-primary/50 shadow-calm'
                    : isItemCompleted
                    ? 'bg-surface/70 border-border/60 hover:bg-surface'
                    : 'bg-surface-secondary/40 border-border/40 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold flex-shrink-0 ${
                      isItemCompleted
                        ? 'bg-medusa-support/20 text-[#1B502C] dark:text-medusa-support border border-medusa-support/40'
                        : isItemActive
                        ? 'bg-medusa-primary/20 text-[#18534B] dark:text-[#71DBD2] border border-medusa-primary/40'
                        : 'bg-surface-secondary text-text-muted border border-border/60'
                    }`}
                  >
                    {isItemCompleted ? (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    ) : (
                      `0${idx + 1}`
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-text-muted">{item.code}</span>
                      <span className="text-text-muted/40">•</span>
                      <span className="text-[11px] font-mono text-text-secondary">{item.date}</span>
                    </div>
                    <h4 className="text-[14px] font-semibold text-text-primary tracking-tight">
                      {item.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:justify-end text-[11px] font-mono text-text-muted">
                  <span>{item.duration}</span>
                  {isItemCompleted && (
                    <span className="font-semibold text-[#1B502C] dark:text-medusa-support bg-medusa-support/15 px-2.5 py-0.5 rounded-full border border-medusa-support/30">
                      Score: {item.score}
                    </span>
                  )}
                  {isItemActive && (
                    <span className="font-semibold text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 px-2.5 py-0.5 rounded-full border border-[#71DBD2]/30">
                      Em Foco
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 4. CONTROLE DE QA/DESENVOLVEDOR (ESTRITAMENTE ISOLADO) ================= */}
      {/* Conforme Seção 3: Não contaminar a UX de produção. Identificado claramente como controle de teste. */}
      <section
        id="qa-dev-controls"
        aria-label="Controles de Desenvolvimento e QA"
        className="mt-6 border-t border-dashed border-border/70 pt-4 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            id="btn-toggle-qa-panel"
            onClick={() => setQaPanelOpen(!qaPanelOpen)}
            className="text-[11px] font-mono text-text-muted hover:text-text-primary flex items-center gap-1.5 focus:outline-none"
          >
            <span className="material-symbols-outlined text-[14px]">terminal</span>
            <span>QA / Test Tools ({qaPanelOpen ? 'Ocultar' : 'Exibir'})</span>
          </button>
          <span className="text-[10px] font-mono text-text-muted">
            Apenas para validação de erros recuperáveis
          </span>
        </div>

        {qaPanelOpen && (
          <div className="p-4 rounded-xl bg-surface-secondary/80 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]">
            <div className="space-y-0.5">
              <strong className="text-text-primary block font-mono text-[11px]">
                Simulação de Falha de Rede / Preparação
              </strong>
              <p className="text-text-muted text-[11px]">
                Quando ativado, o fluxo de carregamento simulará uma falha recuperável aos 60% para testar a recuperação e o estado de erro.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="checkbox-simulate-failure"
                  checked={qaSimulateFailure}
                  onChange={(e) => setQaSimulateFailure(e.target.checked)}
                  className="rounded border-border accent-medusa-primary cursor-pointer"
                />
                <span className="font-mono text-[11px] text-text-primary">
                  Simular Falha no Loading
                </span>
              </label>

              <button
                type="button"
                id="btn-qa-force-error-session"
                onClick={() => onStartStudy(true)}
                className="px-3 py-1 rounded bg-medusa-tertiary/20 text-[#3D4C1D] dark:text-[#D0EAA3] border border-medusa-tertiary/40 font-mono text-[11px] hover:opacity-80 transition-opacity"
              >
                Iniciar com Erro
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
