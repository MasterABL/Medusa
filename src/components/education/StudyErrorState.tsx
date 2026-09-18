'use client';

import React from 'react';

interface StudyErrorStateProps {
  onRetry: () => void;
  onReturnToDashboard: () => void;
}

export function StudyErrorState({ onRetry, onReturnToDashboard }: StudyErrorStateProps) {
  return (
    <div
      id="study-error-state"
      className="study-stage-enter w-full max-w-xl mx-auto my-14 bg-surface p-8 sm:p-10 rounded-2xl border border-medusa-tertiary/40 shadow-calm flex flex-col items-center text-center gap-6"
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-medusa-tertiary/20 border border-medusa-tertiary/50 island-error-shake">
        <span className="material-symbols-outlined text-[#3D4C1D] dark:text-[#D0EAA3] text-[28px]">
          error_outline
        </span>
      </div>

      <div className="space-y-2">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#3D4C1D] dark:text-[#D0EAA3] bg-[#D0EAA3]/20 px-3 py-1 rounded-full border border-[#D0EAA3]/35">
          Erro de sincronização
        </span>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
          Não foi possível preparar a aula agora
        </h2>
        <p className="text-[13px] text-text-secondary max-w-md">
          Houve uma interrupção na preparação do ambiente de estudo. Seus dados e seu progresso continuam preservados com segurança.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto pt-2">
        <button
          type="button"
          id="btn-retry-study"
          onClick={onRetry}
          className="btn-interactive w-full sm:w-auto bg-medusa-primary hover:opacity-95 text-[#1C2420] px-6 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-subtle flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          <span>Tentar novamente</span>
        </button>

        <button
          type="button"
          id="btn-return-dashboard-from-error"
          onClick={onReturnToDashboard}
          className="btn-interactive w-full sm:w-auto bg-surface hover:bg-surface-secondary border border-border/70 text-text-secondary hover:text-text-primary px-5 py-2.5 rounded-full text-[13px] font-medium transition-all shadow-subtle flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
        >
          <span>Voltar para Educação</span>
        </button>
      </div>
    </div>
  );
}
