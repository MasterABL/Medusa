'use client';

import React, { useEffect, useState } from 'react';

interface StudyLoadingStateProps {
  onCancel: () => void;
  onComplete: () => void;
  simulateFailure?: boolean;
  onSimulatedError?: () => void;
}

const HUMANIZED_STEPS = [
  'Selecionando conteúdo essencial...',
  'Organizando conceitos-chave de Mecânica Ondulatória...',
  'Preparando material interativo e notas da sessão...',
  'Quase pronto: calibrando o palco de estudo...',
];

export function StudyLoadingState({
  onCancel,
  onComplete,
  simulateFailure = false,
  onSimulatedError,
}: StudyLoadingStateProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Rotação suave de mensagens humanizadas
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < HUMANIZED_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 900);

    // Incremento orgânico de progresso
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (simulateFailure && prev >= 60) {
          clearInterval(progressInterval);
          if (onSimulatedError) {
            setTimeout(onSimulatedError, 400);
          }
          return 60;
        }
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 18;
      });
    }, 450);

    // Conclusão automática após ~3.2s se não for falha
    let completeTimeout: NodeJS.Timeout;
    if (!simulateFailure) {
      completeTimeout = setTimeout(() => {
        onComplete();
      }, 3400);
    }

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      if (completeTimeout) clearTimeout(completeTimeout);
    };
  }, [simulateFailure, onComplete, onSimulatedError]);

  return (
    <div
      id="study-loading-state"
      className="study-stage-enter w-full max-w-2xl mx-auto my-12 bg-surface p-8 sm:p-10 rounded-2xl border border-border/70 shadow-calm flex flex-col items-center text-center gap-6"
    >
      <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-medusa-primary/15 border border-medusa-primary/30">
        <span className="material-symbols-outlined text-medusa-primary text-[28px] animate-spin">
          progress_activity
        </span>
        <span className="absolute inset-0 rounded-full border-2 border-medusa-primary/40 animate-ping opacity-25" />
      </div>

      <div className="space-y-2">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 px-3 py-1 rounded-full border border-[#71DBD2]/30">
          Preparando sua aula
        </span>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
          Física · Mecânica Ondulatória
        </h2>
        <p className="text-[13px] text-text-secondary min-h-[22px] transition-opacity duration-300 font-medium">
          {HUMANIZED_STEPS[currentStepIndex]}
        </p>
      </div>

      {/* Barra de progresso com transição contínua */}
      <div className="w-full max-w-md bg-surface-secondary rounded-full h-2 overflow-hidden border border-border/60">
        <div
          className="h-full bg-medusa-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between w-full max-w-md text-[11px] text-text-muted font-mono pt-1">
        <span>Sessão: 45 min estimada</span>
        <span className="tabular-nums">{Math.min(progress, 100)}%</span>
      </div>

      <div className="pt-2">
        <button
          type="button"
          id="btn-cancel-loading"
          onClick={onCancel}
          className="btn-interactive text-[12px] text-text-muted hover:text-text-primary px-4 py-2 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
        >
          Cancelar e voltar para Educação
        </button>
      </div>
    </div>
  );
}
