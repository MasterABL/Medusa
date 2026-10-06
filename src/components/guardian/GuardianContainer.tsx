'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { GUARDIAN_CASES, DecisionChainCase, DecisionStepId } from './guardianFixtures';
import { useShell } from '@/context/ShellContext';
import { playFeedback } from '@/lib/audioFeedback';

export function GuardianContainer() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('telemedicina-t5');
  const [activeStepId, setActiveStepId] = useState<DecisionStepId>('evento');
  const [isSimulatingFlow, setIsSimulatingFlow] = useState<boolean>(false);
  const [approvedCases, setApprovedCases] = useState<Set<string>>(new Set());

  const { triggerIslandNotification } = useShell();

  const currentCase: DecisionChainCase = useMemo(() => {
    return GUARDIAN_CASES.find((c) => c.id === selectedCaseId) || GUARDIAN_CASES[0];
  }, [selectedCaseId]);

  const activeStep = useMemo(() => {
    return currentCase.steps.find((s) => s.id === activeStepId) || currentCase.steps[0];
  }, [currentCase, activeStepId]);

  const isCaseApproved = approvedCases.has(currentCase.id) || currentCase.status === 'concluido';

  // Simular animação do evento percorrendo a cadeia
  const handleSimulateFlow = useCallback(() => {
    if (isSimulatingFlow) return;
    setIsSimulatingFlow(true);
    playFeedback('action');

    const steps: DecisionStepId[] = ['evento', 'contexto', 'decisao', 'acao', 'resultado'];
    let index = 0;

    const interval = setInterval(() => {
      index++;
      if (index < steps.length) {
        setActiveStepId(steps[index]);
        playFeedback('press');
      } else {
        clearInterval(interval);
        setIsSimulatingFlow(false);
        playFeedback('success');
      }
    }, 600);
  }, [isSimulatingFlow]);

  const handleApproveAction = useCallback(() => {
    if (!currentCase.actionPrompt) return;
    setApprovedCases((prev) => {
      const next = new Set(prev);
      next.add(currentCase.id);
      return next;
    });
    playFeedback('success');
    triggerIslandNotification({
      title: 'Ação Aprovada',
      tag: 'GUARDIAN DECISION',
      description: currentCase.actionPrompt.successMessage,
      badge: 'L2 CONFIRMADO',
      state: 'active',
      durationMs: 4000,
    });
  }, [currentCase, triggerIslandNotification]);

  return (
    <main
      className="w-full pb-20 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col gap-8 pt-6 flex-1 study-stage-enter"
      aria-label="Guardian · Cadeia de Decisão Causal"
    >
      {/* 1. CABEÇALHO LIMPO E SELETOR DE CASOS */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#71DBD2] animate-pulse" aria-hidden="true" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-text-muted">
              Guardian · Autonomia &amp; Proteção
            </span>
            <span className="text-text-muted/40">•</span>
            <span className="text-[11px] font-mono text-text-secondary">
              Cadeia de Decisão Causal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            {currentCase.title}
          </h1>
        </div>

        {/* Seletor de Casos */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {GUARDIAN_CASES.map((c) => {
            const isSelected = c.id === selectedCaseId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedCaseId(c.id);
                  setActiveStepId('evento');
                  playFeedback('press');
                }}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-mono transition-all flex items-center gap-1.5 whitespace-nowrap border shadow-subtle ${
                  isSelected
                    ? 'bg-[#FAFDF5] border-[#71DBD2] text-text-primary font-bold ring-1 ring-[#71DBD2]/40'
                    : 'bg-surface border-border/70 text-text-muted hover:text-text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{c.domainIcon}</span>
                <span>{c.domainLabel.split(' ')[0]}</span>
                <span className="text-[10px] opacity-70">({c.autonomyLevel})</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* 2. CADEIA VIVA DE DECISÃO (EVENTO -> CONTEXTO -> DECISÃO -> AÇÃO -> RESULTADO) */}
      <section
        aria-label="Cadeia de Decisão Causal"
        className="p-6 sm:p-8 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col gap-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
              Fluxo Causal Interativo
            </span>
            <span className="text-text-muted/40">•</span>
            <span className="text-[11px] font-mono text-[#71DBD2]">
              {currentCase.autonomyLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSimulateFlow}
            disabled={isSimulatingFlow}
            className="px-3.5 py-1.5 rounded-xl bg-surface border border-border/70 hover:border-[#71DBD2] text-[12px] font-mono font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 shadow-subtle disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px] text-[#71DBD2]">
              {isSimulatingFlow ? 'sync' : 'play_arrow'}
            </span>
            <span>{isSimulatingFlow ? 'Percorrendo...' : 'Percorrer Cadeia'}</span>
          </button>
        </div>

        {/* Linha da Cadeia e Nós */}
        <div className="relative py-4">
          {/* Trilha de fundo */}
          <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1 bg-surface-secondary/70 rounded-full" />

          {/* Nós da Cadeia */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            {currentCase.steps.map((step, idx) => {
              const isActive = activeStepId === step.id;
              const stepIndex = currentCase.steps.findIndex((s) => s.id === activeStepId);
              const isPast = idx <= stepIndex;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    setActiveStepId(step.id);
                    playFeedback('press');
                  }}
                  className={`group flex flex-col items-center gap-2.5 transition-all duration-300 focus:outline-none ${
                    isActive ? 'scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-calm ${
                      isActive
                        ? 'bg-[#FAFDF5] border-2 border-[#71DBD2] text-[#1C2420] ring-4 ring-[#71DBD2]/25 shadow-lg'
                        : isPast
                        ? 'bg-[#ADE4B5]/40 border border-[#ADE4B5] text-[#1C2420]'
                        : 'bg-surface border border-border/80 text-text-muted'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px] sm:text-[24px]">
                      {step.icon}
                    </span>
                  </div>

                  <span
                    className={`text-[11px] font-mono uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'text-text-primary font-bold'
                        : 'text-text-muted group-hover:text-text-secondary'
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. PAINEL DE CONTEXTO CAUSAL DO NÓ SELECIONADO (PROTAGONISTA) */}
        <div className="p-6 sm:p-7 rounded-2xl bg-surface-secondary/40 border border-border/70 flex flex-col gap-5 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center flex-shrink-0 text-[#1C2420] shadow-subtle border border-border/60">
                <span className="material-symbols-outlined text-[20px]">{activeStep.icon}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
                  Etapa Selecionada · {activeStep.label}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-text-primary">
                  {activeStep.headline}
                </h3>
              </div>
            </div>

            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-surface border border-border/60 text-text-secondary self-start sm:self-auto shadow-subtle">
              Fase {currentCase.steps.findIndex((s) => s.id === activeStep.id) + 1} de 5
            </span>
          </div>

          <p className="text-[14px] text-text-secondary leading-relaxed max-w-3xl">
            {activeStep.summary}
          </p>

          {/* Evidências Concretas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {activeStep.evidence.map((ev, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-surface border border-border/60 flex flex-col gap-1 shadow-subtle"
              >
                <span className="text-[10px] font-mono uppercase text-text-muted">{ev.label}</span>
                <span className="text-[13px] font-mono font-semibold text-text-primary">
                  {ev.value}
                </span>
              </div>
            ))}
          </div>

          {/* Ação Interativa de Aprovação (se for o caso e etapa de decisão/ação) */}
          {currentCase.actionPrompt && !isCaseApproved && (activeStep.id === 'decisao' || activeStep.id === 'acao') && (
            <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[12px] text-text-secondary">
                {currentCase.actionPrompt.confirmMessage}
              </span>
              <button
                type="button"
                onClick={handleApproveAction}
                className="px-4 py-2 rounded-xl bg-[#71DBD2] hover:bg-[#71DBD2]/90 text-[#1C2420] text-[13px] font-semibold transition-transform active:scale-95 flex items-center gap-2 shadow-subtle self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                <span>{currentCase.actionPrompt.label}</span>
              </button>
            </div>
          )}

          {currentCase.actionPrompt && isCaseApproved && (
            <div className="pt-3 border-t border-border/60 flex items-center gap-2 text-emerald-800 text-[12px] font-mono font-medium">
              <span className="material-symbols-outlined text-[17px]">check_circle</span>
              <span>{currentCase.actionPrompt.successMessage}</span>
            </div>
          )}
        </div>
      </section>

      {/* 4. VISÃO GERAL DE AUTONOMIA E POLÍTICAS */}
      <footer className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border/60 shadow-subtle flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#ADE4B5]/40 flex items-center justify-center flex-shrink-0 text-text-primary">
            <span className="material-symbols-outlined text-[18px]">bolt</span>
          </div>
          <div>
            <h4 className="text-[12px] font-bold font-mono text-text-primary">L1 · Autonomia Rotineira</h4>
            <p className="text-[11px] text-text-muted mt-0.5">
              Lembretes, buffers e pré-cargas executam sem burocracia.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border/60 shadow-subtle flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FFF18C]/50 flex items-center justify-center flex-shrink-0 text-text-primary">
            <span className="material-symbols-outlined text-[18px]">touch_app</span>
          </div>
          <div>
            <h4 className="text-[12px] font-bold font-mono text-text-primary">L2 · Aval Humano</h4>
            <p className="text-[11px] text-text-muted mt-0.5">
              Estornos, cancelamentos e compras requerem seu clique prévio.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border/60 shadow-subtle flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#C45B5B]/30 flex items-center justify-center flex-shrink-0 text-text-primary">
            <span className="material-symbols-outlined text-[18px]">lock</span>
          </div>
          <div>
            <h4 className="text-[12px] font-bold font-mono text-text-primary">L3 · Alto Impacto</h4>
            <p className="text-[11px] text-text-muted mt-0.5">
              Operações críticas bloqueadas até confirmação explícita.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
