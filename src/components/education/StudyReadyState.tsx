'use client';

import React, { useEffect } from 'react';
import { TrackDefinition } from './types';

interface StudyReadyStateProps {
  onEnterStudy: () => void;
  trackDef?: TrackDefinition;
}

export function StudyReadyState({ onEnterStudy, trackDef }: StudyReadyStateProps) {
  useEffect(() => {
    // Transição orgânica suave e finita após confirmação
    const timer = setTimeout(() => {
      onEnterStudy();
    }, 1800);

    return () => clearTimeout(timer);
  }, [onEnterStudy]);

  const discipline = trackDef?.lesson.discipline || 'Física';
  const topic = trackDef?.lesson.topic || 'Mecânica Ondulatória';
  const duration = trackDef?.lesson.estimatedDuration || '45 min';

  return (
    <div
      id="study-ready-state"
      className="study-stage-enter w-full max-w-xl mx-auto my-14 bg-surface p-8 sm:p-10 rounded-2xl border border-medusa-support/40 shadow-calm flex flex-col items-center text-center gap-6"
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-medusa-support/20 border border-medusa-support/50 island-success-settle">
        <span className="material-symbols-outlined text-[#1B502C] dark:text-medusa-support text-[28px]">
          check_circle
        </span>
      </div>

      <div className="space-y-2">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#1B502C] dark:text-medusa-support bg-medusa-support/15 px-3 py-1 rounded-full border border-medusa-support/30">
          Aula pronta · {trackDef?.name || 'Sessão'}
        </span>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
          {discipline} · {topic}
        </h2>
        <p className="text-[13px] text-text-secondary max-w-md">
          O palco de estudo está calibrado com conteúdo contextualizado, resumo estruturado e prática deliberada.
        </p>
      </div>

      <div className="flex items-center gap-4 text-[12px] font-mono text-text-muted bg-surface-secondary/70 px-4 py-2 rounded-xl border border-border/60">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">schedule</span>
          <span>{duration}</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">menu_book</span>
          <span>5 conceitos-chave</span>
        </div>
      </div>

      <button
        type="button"
        id="btn-enter-study-mode"
        onClick={onEnterStudy}
        className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] px-6 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-subtle flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
      >
        <span>Entrar no Modo Estudo</span>
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </button>
    </div>
  );
}
