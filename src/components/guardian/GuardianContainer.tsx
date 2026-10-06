'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  GUARDIAN_CASES,
  GUARDIAN_RADAR_ITEMS,
  GUARDIAN_ACTION_ITEMS,
  GUARDIAN_TRUST_POLICIES,
  GUARDIAN_AUDIT_LOGS,
  DecisionChainCase,
  DecisionStepId,
  GuardianRadarItem,
  GuardianActionItem,
  GuardianTrustPolicy,
  GuardianAuditLogEntry,
} from './guardianFixtures';
import { useShell } from '@/context/ShellContext';
import { playFeedback } from '@/lib/audioFeedback';

type GuardianSubView = 'cadeia' | 'radar' | 'actions' | 'autonomia' | 'historico';

export function GuardianContainer() {
  const [subView, setSubView] = useState<GuardianSubView>('cadeia');

  // Estados da Cadeia de Decisão Causal
  const [selectedCaseId, setSelectedCaseId] = useState<string>('telemedicina-t5');
  const [activeStepId, setActiveStepId] = useState<DecisionStepId>('evento');
  const [isSimulatingFlow, setIsSimulatingFlow] = useState<boolean>(false);
  const [approvedCases, setApprovedCases] = useState<Set<string>>(new Set());

  // Estados do Action Center
  const [actionsList, setActionsList] = useState<GuardianActionItem[]>(GUARDIAN_ACTION_ITEMS);

  // Estados da Matriz de Autonomia e Trust
  const [trustPolicies, setTrustPolicies] = useState<GuardianTrustPolicy[]>(GUARDIAN_TRUST_POLICIES);

  // Estados do Radar
  const [radarItems, setRadarItems] = useState<GuardianRadarItem[]>(GUARDIAN_RADAR_ITEMS);

  const { triggerIslandNotification, setActiveRoute } = useShell();

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

  const handleApproveCaseAction = useCallback(() => {
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

  // Ações do Action Center
  const handleApproveAction = useCallback(
    (actionId: string) => {
      setActionsList((prev) =>
        prev.map((a) =>
          a.id === actionId
            ? { ...a, status: 'approved' as const, executedAt: 'Agora' }
            : a
        )
      );
      playFeedback('success');
      triggerIslandNotification({
        title: 'Ação Aprovada com Sucesso',
        tag: 'ACTION CENTER',
        description: 'Decisão autorizada e registrada na trilha de auditoria.',
        badge: 'EXECUTADO',
        state: 'active',
        durationMs: 3500,
      });
    },
    [triggerIslandNotification]
  );

  const handleRejectAction = useCallback(
    (actionId: string) => {
      setActionsList((prev) =>
        prev.map((a) => (a.id === actionId ? { ...a, status: 'rejected' as const } : a))
      );
      playFeedback('press');
      triggerIslandNotification({
        title: 'Ação Recusada',
        tag: 'ACTION CENTER',
        description: 'Ação descartada. Nenhuma alteração foi efetuada nos dados.',
        badge: 'CANCELADO',
        state: 'active',
        durationMs: 3000,
      });
    },
    [triggerIslandNotification]
  );

  const handleUndoAction = useCallback(
    (actionId: string) => {
      setActionsList((prev) =>
        prev.map((a) => (a.id === actionId ? { ...a, status: 'undone' as const } : a))
      );
      playFeedback('action');
      triggerIslandNotification({
        title: 'Ação Revertida',
        tag: 'GUARDIAN UNDO',
        description: 'Efeito desfeito com sucesso. Estado anterior restaurado.',
        badge: 'REVERTIDO',
        state: 'active',
        durationMs: 3500,
      });
    },
    [triggerIslandNotification]
  );

  // Alterar nível de autonomia na Matriz de Confiança
  const handleCycleAutonomyLevel = useCallback(
    (policyId: string) => {
      setTrustPolicies((prev) =>
        prev.map((p) => {
          if (p.id !== policyId || !p.humanOverrideAllowed) return p;
          const nextLevel: 'L1' | 'L2' | 'L3' =
            p.currentLevel === 'L1' ? 'L2' : p.currentLevel === 'L2' ? 'L3' : 'L1';
          playFeedback('press');
          return { ...p, currentLevel: nextLevel };
        })
      );
    },
    []
  );

  // Contadores
  const pendingActionsCount = useMemo(
    () => actionsList.filter((a) => a.status === 'pending').length,
    [actionsList]
  );
  const criticalRadarCount = useMemo(
    () => radarItems.filter((r) => r.severity === 'critico').length,
    [radarItems]
  );

  return (
    <main
      className="w-full pb-20 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col gap-8 pt-6 flex-1 study-stage-enter"
      aria-label="Guardian · Autonomia & Proteção Pessoal"
    >
      {/* 1. CABEÇALHO CONTEXTUAL + NAVEGAÇÃO INTERNA DO DOMÍNIO */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#71DBD2] animate-pulse" aria-hidden="true" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-text-muted">
              Guardian · Autonomia &amp; Proteção
            </span>
            <span className="text-text-muted/40">•</span>
            <span className="text-[11px] font-mono text-text-secondary">
              Sistema de Decisões Causal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            {subView === 'cadeia'
              ? currentCase.title
              : subView === 'radar'
              ? 'Radar de Riscos & Intervenções'
              : subView === 'actions'
              ? 'Centro de Ações & Aprovações'
              : subView === 'autonomia'
              ? 'Matriz de Confiança & Autonomia'
              : 'Trilha de Auditoria & Evidências'}
          </h1>
        </div>

        {/* Subnav interna de Guardian */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface border border-border/70 shadow-subtle overflow-x-auto self-start md:self-auto">
          <button
            type="button"
            onClick={() => {
              setSubView('cadeia');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'cadeia'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">account_tree</span>
            <span>Cadeia Causal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('radar');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'radar'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">radar</span>
            <span>Radar</span>
            {criticalRadarCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#C45B5B]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('actions');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'actions'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">bolt</span>
            <span>Ações</span>
            {pendingActionsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#FFF18C] text-[#1C2420] text-[10px] font-bold">
                {pendingActionsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('autonomia');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'autonomia'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            <span>Autonomia</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('historico');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'historico'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            <span>Auditoria</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* SUBVIEW 1: CADEIA CAUSAL VIVA (HOME OFICIAL DO GUARDIAN)  */}
      {/* ========================================================= */}
      {subView === 'cadeia' && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-200">
          {/* Seletor de Casos */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
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

          {/* Seção Central: Cadeia dos 5 Nós com Motion Causal */}
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
              <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1 bg-surface-secondary/70 rounded-full" />

              <div className="relative flex items-center justify-between z-10">
                {currentCase.steps.map((step, idx) => {
                  const isActive = step.id === activeStepId;
                  const stepOrder = ['evento', 'contexto', 'decisao', 'acao', 'resultado'];
                  const isPassed = stepOrder.indexOf(step.id) <= stepOrder.indexOf(activeStepId);

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => {
                        setActiveStepId(step.id);
                        playFeedback('press');
                      }}
                      className="group flex flex-col items-center gap-2 focus:outline-none"
                    >
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-subtle border ${
                          isActive
                            ? 'scale-115 ring-4 ring-[#71DBD2]/30 shadow-calm z-20'
                            : isPassed
                            ? 'scale-100 opacity-90'
                            : 'scale-90 opacity-40 bg-surface border-border/60'
                        }`}
                        style={{
                          backgroundColor: isActive ? step.highlightColor : isPassed ? step.highlightColor : undefined,
                          borderColor: isActive ? '#1C2420' : '#DDD8C9',
                          color: '#1C2420',
                        }}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {step.icon}
                        </span>
                      </div>

                      <div className="text-center">
                        <span
                          className={`text-[11px] font-mono transition-colors block ${
                            isActive
                              ? 'font-bold text-text-primary'
                              : 'text-text-muted group-hover:text-text-secondary'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Painel do Nó Ativo Selecionado */}
            <div className="p-6 rounded-2xl bg-surface-secondary/40 border border-border/60 flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-[#1C2420] shadow-subtle"
                    style={{ backgroundColor: activeStep.highlightColor }}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {activeStep.icon}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-text-muted block">
                      Etapa: {activeStep.label}
                    </span>
                    <h3 className="text-base font-bold text-text-primary tracking-tight">
                      {activeStep.headline}
                    </h3>
                  </div>
                </div>

                <span className="text-[11px] font-mono text-text-muted bg-surface px-2.5 py-1 rounded-lg border border-border/50 self-start sm:self-auto">
                  Evidências Verificadas
                </span>
              </div>

              <p className="text-[13px] text-text-secondary leading-relaxed">
                {activeStep.summary}
              </p>

              {/* Tabela de Evidências */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {activeStep.evidence.map((ev, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-surface border border-border/50 shadow-subtle flex flex-col gap-0.5"
                  >
                    <span className="text-[10px] font-mono text-text-muted uppercase">
                      {ev.label}
                    </span>
                    <span className="text-[12px] font-semibold text-text-primary truncate">
                      {ev.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Ação Pendente L2 quando o caso exige aprovação */}
              {currentCase.actionPrompt && !isCaseApproved && (
                <div className="mt-2 p-4 rounded-xl bg-[#FFF18C]/20 border border-[#FFF18C]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase font-bold text-amber-800">
                      Confirmação Humana L2 Requerida
                    </span>
                    <p className="text-[12px] text-text-primary">
                      {currentCase.actionPrompt.confirmMessage}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleApproveCaseAction}
                    className="px-4 py-2 rounded-xl bg-[#71DBD2] hover:bg-[#71DBD2]/90 text-[#1C2420] text-[12px] font-bold transition-transform active:scale-95 shadow-subtle flex items-center gap-1.5 self-end sm:self-auto"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>{currentCase.actionPrompt.label}</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 2: RADAR DE RISCOS & INTERVENÇÕES                 */}
      {/* ========================================================= */}
      {subView === 'radar' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block">
                Monitoramento Ativo Transversal
              </span>
              <p className="text-[13px] text-text-secondary">
                O Guardian monitora anomalias financeiras, conflitos temporais e integridade biológica.
              </p>
            </div>
            <span className="text-[12px] font-mono text-text-muted">
              {radarItems.length} alertas monitorados
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {radarItems.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col justify-between gap-4 transition-all hover:border-[#71DBD2]/60"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-subtle ${
                      item.severity === 'critico'
                        ? 'bg-[#C45B5B]/15 text-[#C45B5B]'
                        : item.severity === 'atencao'
                        ? 'bg-[#FFF18C]/40 text-amber-900'
                        : 'bg-[#71DBD2]/20 text-[#1C2420]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {item.domainIcon}
                    </span>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-secondary text-text-secondary">
                        {item.domainLabel}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">
                        {item.detectedAt}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-[#71DBD2]">
                        {item.autonomyLevel}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-text-primary">
                      {item.headline}
                    </h3>
                    <p className="text-[12px] text-text-secondary leading-snug">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-secondary/40 border border-border/50 flex items-center justify-between gap-3 text-[11px]">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono uppercase text-text-muted block">
                      Intervenção Proposta
                    </span>
                    <span className="font-semibold text-text-primary">
                      {item.interventionProposal}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSubView('actions');
                      playFeedback('press');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-border/60 hover:border-[#71DBD2] text-text-primary font-mono text-[10px] transition-colors flex-shrink-0"
                  >
                    Ver no Centro
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 3: CENTRO DE AÇÕES (ACTION CENTER)                */}
      {/* ========================================================= */}
      {subView === 'actions' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block">
                Controle Operacional de Ações
              </span>
              <p className="text-[13px] text-text-secondary">
                Aprovações pendentes de confirmação humana (L2) e histórico recente de execuções.
              </p>
            </div>
            <span className="text-[12px] font-mono text-text-muted">
              {actionsList.filter((a) => a.status === 'pending').length} aguardando decisão
            </span>
          </div>

          <div className="flex flex-col gap-3.5">
            {actionsList.map((action) => {
              const isPending = action.status === 'pending';
              const isApproved = action.status === 'approved' || action.status === 'executed';
              const isRejected = action.status === 'rejected';
              const isUndone = action.status === 'undone';

              return (
                <div
                  key={action.id}
                  className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isPending
                      ? 'bg-[#FAFDF5] border-[#FFF18C] ring-1 ring-[#FFF18C]/40 shadow-calm'
                      : 'bg-surface border-border/70 shadow-calm'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-surface-secondary/70 flex items-center justify-center text-text-primary flex-shrink-0 shadow-subtle">
                      <span className="material-symbols-outlined text-[20px]">
                        {action.domainIcon}
                      </span>
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-secondary text-text-secondary">
                          {action.domainLabel}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#71DBD2]">
                          {action.autonomyLevel}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted">
                          {action.requestedAt}
                        </span>
                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                            isPending
                              ? 'bg-[#FFF18C] text-amber-900'
                              : isApproved
                              ? 'bg-[#ADE4B5] text-[#1C2420]'
                              : isRejected
                              ? 'bg-[#C45B5B]/20 text-[#C45B5B]'
                              : 'bg-surface-secondary text-text-muted'
                          }`}
                        >
                          {isPending
                            ? 'Pendente L2'
                            : isApproved
                            ? 'Executado'
                            : isRejected
                            ? 'Recusado'
                            : 'Desfeito'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-text-primary">
                        {action.title}
                      </h3>
                      <p className="text-[12px] text-text-secondary leading-snug">
                        {action.intent}
                      </p>
                      <p className="text-[11px] text-text-muted font-mono pt-1">
                        {action.reason}
                      </p>
                    </div>
                  </div>

                  {/* Ações interativas */}
                  <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRejectAction(action.id)}
                          className="px-3 py-1.5 rounded-xl border border-border/70 hover:border-[#C45B5B] text-[12px] font-mono text-text-secondary hover:text-[#C45B5B] transition-colors"
                        >
                          Recusar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveAction(action.id)}
                          className="px-4 py-1.5 rounded-xl bg-[#71DBD2] hover:bg-[#71DBD2]/90 text-[#1C2420] text-[12px] font-bold transition-transform active:scale-95 shadow-subtle flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          <span>Aprovar</span>
                        </button>
                      </>
                    ) : action.reversible && !isUndone ? (
                      <button
                        type="button"
                        onClick={() => handleUndoAction(action.id)}
                        className="px-3 py-1.5 rounded-xl bg-surface border border-border/70 hover:border-border text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 shadow-subtle"
                      >
                        <span className="material-symbols-outlined text-[14px]">undo</span>
                        <span>Desfazer</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-mono text-text-muted">
                        Auditado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 4: MATRIZ DE AUTONOMIA & CONFIANÇA HUMANA         */}
      {/* ========================================================= */}
      {subView === 'autonomia' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block">
                Níveis de Autonomia &amp; Governança
              </span>
              <p className="text-[13px] text-text-secondary">
                O Medusa nunca eleva a autonomia de uma ação sem você. Você define os limites de cada domínio.
              </p>
            </div>
          </div>

          {/* Cards Explicativos dos Níveis */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#ADE4B5]/25 border border-[#ADE4B5]/60 flex flex-col gap-1.5">
              <span className="text-[11px] font-mono font-bold text-[#1C2420] uppercase">
                L1 · Autonomia Fluida
              </span>
              <h4 className="text-[14px] font-bold text-text-primary">Faz Sozinho</h4>
              <p className="text-[12px] text-text-secondary leading-relaxed">
                Ações de baixo risco e impacto imediato: criar lembretes, registrar histórico e sugerir planejamentos.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF18C]/25 border border-[#FFF18C]/60 flex flex-col gap-1.5">
              <span className="text-[11px] font-mono font-bold text-amber-900 uppercase">
                L2 · Confirmação Humana
              </span>
              <h4 className="text-[14px] font-bold text-text-primary">Pede Confirmação</h4>
              <p className="text-[12px] text-text-secondary leading-relaxed">
                Ações de médio impacto: contestar duplicidades financeiras, reagendar consultas e enviar comunicações.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#C45B5B]/15 border border-[#C45B5B]/40 flex flex-col gap-1.5">
              <span className="text-[11px] font-mono font-bold text-[#C45B5B] uppercase">
                L3 · Bloqueio de Soberania
              </span>
              <h4 className="text-[14px] font-bold text-text-primary">Bloqueia por Padrão</h4>
              <p className="text-[12px] text-text-secondary leading-relaxed">
                Ações irreversíveis ou dados íntimos: diários espirituais, exclusão de histórico e transferências financeiras.
              </p>
            </div>
          </div>

          {/* Tabela Interativa de Políticas por Domínio */}
          <div className="p-5 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col gap-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
              Políticas de Confiança por Domínio (Clique no Nível para Alternar)
            </span>

            <div className="space-y-3">
              {trustPolicies.map((policy) => (
                <div
                  key={policy.id}
                  className="p-3.5 rounded-xl bg-surface-secondary/40 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0 text-text-primary shadow-subtle">
                      <span className="material-symbols-outlined text-[17px]">
                        {policy.domainIcon}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-text-muted">
                          {policy.domainLabel}
                        </span>
                        <span className="text-text-muted/40">•</span>
                        <span className="text-[10px] font-mono text-[#71DBD2]">
                          Score de Confiança: {policy.trustScorePercent}%
                        </span>
                      </div>
                      <h4 className="text-[13px] font-bold text-text-primary">
                        {policy.actionCategory}
                      </h4>
                      <p className="text-[11px] text-text-secondary">
                        {policy.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {policy.humanOverrideAllowed ? (
                      <button
                        type="button"
                        onClick={() => handleCycleAutonomyLevel(policy.id)}
                        className="px-3 py-1 rounded-lg bg-surface border border-border/70 hover:border-[#71DBD2] text-[12px] font-mono font-bold text-text-primary shadow-subtle transition-all flex items-center gap-1.5"
                        title="Alternar nível de autonomia"
                      >
                        <span className="text-[#71DBD2]">●</span>
                        <span>{policy.currentLevel}</span>
                        <span className="material-symbols-outlined text-[14px] text-text-muted">swap_horiz</span>
                      </button>
                    ) : (
                      <span className="px-3 py-1 rounded-lg bg-[#C45B5B]/10 border border-[#C45B5B]/30 text-[#C45B5B] text-[12px] font-mono font-bold">
                        {policy.currentLevel} (Fixo)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 5: AUDITORIA COMPLETA & TRILHA CAUSAL             */}
      {/* ========================================================= */}
      {subView === 'historico' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block">
                Trilha de Auditoria (Audit Log)
              </span>
              <p className="text-[13px] text-text-secondary">
                Histórico imutável de todas as decisões tomadas pelo Guardian com justificativa e correlação.
              </p>
            </div>
            <span className="text-[12px] font-mono text-text-muted">
              {GUARDIAN_AUDIT_LOGS.length} registros auditados
            </span>
          </div>

          <div className="space-y-3">
            {GUARDIAN_AUDIT_LOGS.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col gap-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-secondary text-text-secondary">
                      {log.domain}
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">
                      {log.timestamp}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#71DBD2]">
                      {log.autonomyApplied}
                    </span>
                  </div>

                  <span
                    className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold self-start sm:self-auto ${
                      log.verdict === 'EXECUTADO_AUTONOMO'
                        ? 'bg-[#ADE4B5]/40 text-[#1C2420]'
                        : log.verdict === 'APROVADO_USUARIO'
                        ? 'bg-[#71DBD2]/30 text-[#1C2420]'
                        : 'bg-[#C45B5B]/20 text-[#C45B5B]'
                    }`}
                  >
                    {log.verdict}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-[14px] font-bold text-text-primary">
                    {log.actionTitle}
                  </h4>
                  <p className="text-[12px] text-text-secondary">
                    {log.details}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-text-muted pt-1">
                  <span>Política: {log.policyUsed}</span>
                  <span>ID: {log.correlationId}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
