'use client';

import React from 'react';
import { CORPO_DATA } from './bodyFixtures';

export function BodyContextPanel() {
  const data = CORPO_DATA;
  const currentEx = data.activeWorkout.exercises[1]; // Barra fixa

  return (
    <div className="space-y-6">
      {/* 1. Prontidão & Janela de Estímulo */}
      <div className="space-y-2.5 pb-5 border-b border-border/60">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Prontidão Biológica
          </span>
          <span className="text-[11px] font-mono text-[#18534B] dark:text-[#ADE4B5] font-semibold tabular-nums">
            {data.readiness.score}/100 Ótimo
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold tracking-tight text-text-primary tabular-nums">
            {data.readiness.hrvMs}
            <span className="text-xs font-normal text-text-muted ml-1">ms HRV</span>
          </span>
          <span className="text-[11px] text-text-secondary font-mono">
            {data.readiness.restingBpm} BPM Repouso
          </span>
        </div>
        <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
          <div className="bg-[#18534B] dark:bg-[#ADE4B5] h-full w-[89%]" />
        </div>
        <div className="text-[10px] text-text-muted font-mono pt-0.5 flex justify-between">
          <span>{data.readiness.autonomicTone}</span>
          <span className="font-semibold text-text-secondary">Adaptado</span>
        </div>
      </div>

      {/* 2. Treino em Andamento (Acesso Rápido) */}
      <div className="space-y-2.5 pb-5 border-b border-border/60">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Sessão Ativa · 57%
          </span>
          <span className="text-[10px] font-mono text-[#18534B] dark:text-[#ADE4B5] font-bold">
            Série {currentEx.currentSet}/{currentEx.totalSets}
          </span>
        </div>
        <h4 className="text-[13px] font-bold tracking-tight text-text-primary">
          {currentEx.name}
        </h4>
        <div className="bg-surface-secondary border border-border/70 rounded-xl p-2.5 flex items-center justify-between text-[11px] font-mono">
          <div>
            <span className="text-text-muted block text-[9px]">Carga Atual</span>
            <span className="font-bold text-text-primary">{currentEx.weightKg} kg</span>
          </div>
          <div>
            <span className="text-text-muted block text-[9px]">Repetições</span>
            <span className="font-bold text-text-primary">{currentEx.reps} reps</span>
          </div>
          <div>
            <span className="text-text-muted block text-[9px]">Descanso</span>
            <span className="font-bold text-text-primary">{currentEx.restSeconds}s</span>
          </div>
        </div>
      </div>

      {/* 3. Arquitetura do Sono */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Recuperação Noturna
          </span>
          <span className="text-[10px] font-mono text-[#18534B] dark:text-[#ADE4B5] font-semibold">
            Dívida Zero
          </span>
        </div>

        <div className="bg-surface-secondary border border-border/70 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-semibold text-text-primary">Duração Total</span>
            <span className="font-mono font-bold text-text-primary">{data.sleep.duration}</span>
          </div>
          <div className="flex justify-between text-[10px] font-mono text-text-muted">
            <span>Profundo: 1.8h (23%)</span>
            <span>REM: 1.9h (25%)</span>
          </div>
        </div>

        <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-text-muted">
          <span>Próxima Janela de Sono</span>
          <span className="tabular-nums">Meta 22:45</span>
        </div>
      </div>
    </div>
  );
}
