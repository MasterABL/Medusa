'use client';

import React, { useState, useEffect } from 'react';
import { CORPO_DATA, ExerciseItem } from './bodyFixtures';

export function BodyContainer() {
  const [data] = useState(CORPO_DATA);

  // Estados do Treino Ativo & Descanso
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number>(1); // Barra Fixa em foco
  const [restSecondsLeft, setRestSecondsLeft] = useState<number>(90);
  const [restTimerRunning, setRestTimerRunning] = useState<boolean>(false);

  // Estados do Metrônomo
  const [metronomeBpm, setMetronomeBpm] = useState<number>(74);
  const [metronomeActive, setMetronomeActive] = useState<boolean>(true);

  // Estados do Guia Respiratório (Box Breathing 4s)
  const [breathPhase, setBreathPhase] = useState<'Inalar' | 'Sustentar' | 'Exalar' | 'Pausa'>('Inalar');
  const [breathCountdown, setBreathCountdown] = useState<number>(4);

  // Timer de Descanso entre Séries
  useEffect(() => {
    if (!restTimerRunning) return;
    const interval = setInterval(() => {
      setRestSecondsLeft((prev) => {
        if (prev <= 1) {
          setRestTimerRunning(false);
          return 90;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [restTimerRunning]);

  // Ciclo da Respiração
  useEffect(() => {
    const timer = setInterval(() => {
      setBreathCountdown((prev) => {
        if (prev <= 1) {
          setBreathPhase((current) => {
            switch (current) {
              case 'Inalar':
                return 'Sustentar';
              case 'Sustentar':
                return 'Exalar';
              case 'Exalar':
                return 'Pausa';
              case 'Pausa':
              default:
                return 'Inalar';
            }
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeExercise = data.activeWorkout.exercises[activeExerciseIndex] || data.activeWorkout.exercises[0];

  return (
    <main className="w-full pb-20 px-4 sm:px-8 max-w-6xl mx-auto flex flex-col gap-8 pt-6 flex-1">
      {/* ================= 1. CABEÇALHO FISIOLÓGICO: ESTADO REAL ================= */}
      <section aria-label="Estado Fisiológico e Prontidão" className="flex flex-col gap-4 border-b border-border/60 pb-5">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#18534B] dark:bg-[#ADE4B5] living-pulse" />
              <span className="text-[10px] font-mono font-medium tracking-widest uppercase text-text-muted">
                Corpo · Prontidão, Treino &amp; Recuperação
              </span>
              <span className="text-text-muted/40">•</span>
              <span className="text-[11px] font-mono text-[#18534B] dark:text-[#ADE4B5]">
                {data.readiness.recoveryStatus}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Vida Física: Movimento, Treino &amp; Sono
            </h1>
          </div>

          {/* Placar de Telemetria Integrada */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-surface border border-border/70 rounded-xl px-3 py-1.5 flex flex-col">
              <span className="text-[9px] font-mono uppercase text-text-muted">Prontidão</span>
              <span className="text-[15px] font-bold font-mono tabular-nums text-[#18534B] dark:text-[#ADE4B5]">
                {data.readiness.score}/100
              </span>
            </div>
            <div className="bg-surface border border-border/70 rounded-xl px-3 py-1.5 flex flex-col">
              <span className="text-[9px] font-mono uppercase text-text-muted">HRV Repouso</span>
              <span className="text-[15px] font-bold font-mono tabular-nums text-text-primary">
                {data.readiness.hrvMs} ms
              </span>
            </div>
            <div className="bg-surface border border-border/70 rounded-xl px-3 py-1.5 flex flex-col">
              <span className="text-[9px] font-mono uppercase text-text-muted">Sono Real</span>
              <span className="text-[15px] font-bold font-mono tabular-nums text-text-primary">
                {data.sleep.duration}
              </span>
            </div>
            <div className="bg-surface border border-border/70 rounded-xl px-3 py-1.5 flex flex-col">
              <span className="text-[9px] font-mono uppercase text-text-muted">Passos Hoje</span>
              <span className="text-[15px] font-bold font-mono tabular-nums text-text-primary">
                {data.dailyMovement.totalSteps.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 2. TREINO DO DIA & ACOMPANHAMENTO DE SÉRIES ================= */}
      <section aria-label="Acompanhamento do Treino Ativo" className="bg-surface rounded-2xl p-6 sm:p-7 border border-border/70 shadow-calm flex flex-col gap-6">
        {/* Topo da Sessão com Barra de Progresso Real */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#18534B] dark:text-[#ADE4B5]">
                fitness_center
              </span>
              <h2 className="text-[15px] font-bold text-text-primary">
                {data.activeWorkout.title}
              </h2>
            </div>
            <span className="text-[12px] text-text-secondary block">
              {data.activeWorkout.split} · Alvo: {data.activeWorkout.targetTss} TSS
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[12px] font-mono font-bold text-text-primary tabular-nums">
                {data.activeWorkout.completedSets}/{data.activeWorkout.totalSets} séries
              </span>
              <span className="text-[10px] font-mono text-text-muted block">57% Concluído</span>
            </div>
            <div className="w-24 bg-surface-subtle h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#18534B] dark:bg-[#ADE4B5] h-full rounded-full"
                style={{ width: `${(data.activeWorkout.completedSets / data.activeWorkout.totalSets) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Grade: Exercício em Foco (Esquerda) + Lista de Exercícios da Sessão (Direita) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
          {/* Card do Exercício em Foco com Séries, Cargas e Timer */}
          <div className="bg-surface-elevated border border-medusa-primary/50 rounded-xl p-5 flex flex-col gap-5 shadow-subtle ring-1 ring-medusa-primary/20">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#18534B] dark:text-[#ADE4B5] font-bold">
                  Exercício em Execução · {activeExercise.muscleGroup}
                </span>
                <h3 className="text-xl font-bold text-text-primary mt-0.5">
                  {activeExercise.name}
                </h3>
                <span className="text-[11px] font-mono text-text-secondary block mt-0.5">
                  {activeExercise.progressionNote}
                </span>
              </div>
              <span className="text-2xl font-extrabold font-mono text-text-primary tabular-nums">
                {activeExercise.weightKg} <span className="text-sm font-normal text-text-muted">kg</span>
              </span>
            </div>

            {/* Séries Interativas com Status */}
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: activeExercise.totalSets }).map((_, sIdx) => {
                const isDone = sIdx < activeExercise.currentSet - 1;
                const isCurrent = sIdx === activeExercise.currentSet - 1;
                return (
                  <div
                    key={sIdx}
                    className={`rounded-lg p-2.5 border text-center transition-all ${
                      isDone
                        ? 'bg-[#ADE4B5]/20 border-[#ADE4B5]/60 text-text-primary'
                        : isCurrent
                        ? 'bg-medusa-primary/25 border-medusa-primary shadow-subtle'
                        : 'bg-surface border-border/70 text-text-muted'
                    }`}
                  >
                    <span className="text-[9px] font-mono uppercase block text-text-muted">
                      Série {sIdx + 1}
                    </span>
                    <span className="text-[14px] font-bold font-mono tabular-nums text-text-primary">
                      {activeExercise.reps} reps
                    </span>
                    <span className="text-[10px] font-mono text-text-secondary block">
                      {isDone ? 'Concluída ✓' : isCurrent ? 'Em Curso' : 'Espera'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Timer de Descanso Interativo */}
            <div className="bg-surface rounded-xl p-3.5 border border-border/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-text-muted">
                  timer
                </span>
                <div>
                  <span className="text-[10px] font-mono uppercase text-text-muted block">Descanso entre Séries</span>
                  <span className="text-lg font-bold font-mono tabular-nums text-text-primary">
                    {restSecondsLeft}s
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRestTimerRunning(!restTimerRunning)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold transition-all ${
                    restTimerRunning
                      ? 'bg-alert/20 text-alert border border-alert/40'
                      : 'bg-[#18534B] dark:bg-medusa-primary text-white dark:text-[#1C2420] shadow-subtle'
                  }`}
                >
                  {restTimerRunning ? 'Pausar' : 'Iniciar 90s'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRestTimerRunning(false);
                    setRestSecondsLeft(90);
                  }}
                  className="px-2 py-1 rounded-lg text-[11px] font-mono text-text-muted hover:text-text-primary bg-surface-secondary border border-border/70"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Lista de Exercícios da Sessão */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Roteiro Completo da Sessão (4 Exercícios)
            </span>
            {data.activeWorkout.exercises.map((ex, idx) => {
              const isSelected = activeExerciseIndex === idx;
              return (
                <div
                  key={ex.id}
                  onClick={() => setActiveExerciseIndex(idx)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-surface-elevated border-medusa-primary shadow-subtle'
                      : 'bg-surface border-border/70 hover:border-border-strong'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-text-primary">{ex.name}</span>
                      {ex.status === 'concluido' && (
                        <span className="text-[9px] font-mono bg-[#ADE4B5]/25 text-[#18534B] dark:text-[#ADE4B5] px-1.5 py-0.2 rounded font-bold">
                          Feito
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-text-secondary font-mono">
                      {ex.totalSets} séries × {ex.reps} reps · {ex.weightKg} kg
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    {ex.restSeconds}s descanso
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= 3. ARQUITETURA DO SONO & RECUPERAÇÃO ================= */}
      <section aria-label="Sono e Recuperação" className="bg-surface rounded-2xl p-6 sm:p-7 border border-border/70 shadow-calm flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#71DBD2]">
              bedtime
            </span>
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-text-muted">
              Arquitetura Noturna &amp; Hipnograma (22:42 — 06:26)
            </h2>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-text-muted">Eficiência: <strong className="text-text-primary">94%</strong></span>
            <span className="text-text-muted">Dívida de Sono: <strong className="text-[#18534B] dark:text-[#ADE4B5]">Zero</strong></span>
          </div>
        </div>

        {/* Barra Proporcional das Fases do Sono */}
        <div className="space-y-2">
          <div className="w-full h-5 rounded-lg overflow-hidden flex bg-surface-subtle">
            {data.sleep.phases.map((phase) => (
              <div
                key={phase.name}
                style={{ width: `${phase.percentage}%`, backgroundColor: phase.color }}
                className="h-full relative group cursor-pointer"
                title={`${phase.name}: ${phase.hours}h (${phase.percentage}%)`}
              />
            ))}
          </div>

          {/* Legenda das 4 Fases com Valores Reais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
            {data.sleep.phases.map((phase) => (
              <div key={phase.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: phase.color }} />
                <span className="text-text-primary font-medium">{phase.name}:</span>
                <span className="text-text-secondary">{phase.hours}h ({phase.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 4. LOCOMOÇÃO DIÁRIA & CADÊNCIA / METRÔNOMO ================= */}
      <section aria-label="Locomoção e Cadência" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição Horária de Passos */}
        <div className="bg-surface rounded-2xl p-6 sm:p-7 border border-border/70 shadow-calm flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-text-muted">
                directions_walk
              </span>
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-text-muted">
                Distribuição de Locomoção Diária
              </h2>
            </div>
            <span className="text-[11px] font-mono text-text-primary font-bold">
              {data.dailyMovement.totalSteps.toLocaleString('pt-BR')} / 10.000 passos
            </span>
          </div>

          {/* Barras Horárias de Movimento */}
          <div className="flex items-end justify-between gap-2 h-32 pt-2 px-1">
            {data.dailyMovement.hourlyDistribution.map((h) => {
              const maxSteps = 3500;
              const heightPct = Math.round((h.steps / maxSteps) * 100);
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[9px] font-mono text-text-muted tabular-nums">
                    {(h.steps / 1000).toFixed(1)}k
                  </span>
                  <div className="w-full max-w-[28px] bg-surface-subtle rounded-t-md h-full flex items-end">
                    <div
                      className="w-full bg-[#18534B] dark:bg-[#71DBD2] rounded-t-md transition-all duration-500"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-text-secondary">{h.hour}</span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[11px] font-mono text-text-muted pt-2 border-t border-border/50">
            <span>Distância: {data.dailyMovement.distanceKm} km</span>
            <span>Tempo Ativo: {data.dailyMovement.activeMinutes} min</span>
          </div>
        </div>

        {/* Metrônomo de Cadência & Ciclo Respiratório */}
        <div className="bg-surface rounded-2xl p-6 sm:p-7 border border-border/70 shadow-calm flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#71DBD2]">
                motion_mode
              </span>
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-text-muted">
                Cadência Biológica &amp; Respiração Vagal
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setMetronomeActive(!metronomeActive)}
              className="text-[10px] font-mono px-2 py-0.5 rounded border border-border/80 text-text-primary"
            >
              {metronomeActive ? 'Pulsando' : 'Pausado'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            {/* Metrônomo */}
            <div className="flex flex-col items-center justify-center p-3 bg-surface-elevated rounded-xl border border-border/60">
              <div className="w-24 h-20 relative flex justify-center border-b border-border/70">
                <div
                  className={`w-1 h-20 bg-gradient-to-t from-text-primary via-[#71DBD2] to-[#18534B] absolute bottom-0 rounded-full ${
                    metronomeActive ? 'animate-needle' : ''
                  }`}
                  style={{ animationDuration: `${(60 / metronomeBpm) * 2}s` }}
                />
              </div>
              <div className="text-xl font-bold font-mono text-text-primary mt-2 tabular-nums">
                {metronomeBpm} <span className="text-xs font-normal text-text-muted">BPM</span>
              </div>
              <div className="flex gap-1 mt-2">
                {[56, 74, 120].map((bpm) => (
                  <button
                    key={bpm}
                    type="button"
                    onClick={() => setMetronomeBpm(bpm)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      metronomeBpm === bpm ? 'bg-medusa-primary text-[#1C2420] font-bold' : 'text-text-secondary'
                    }`}
                  >
                    {bpm}
                  </button>
                ))}
              </div>
            </div>

            {/* Box Breathing */}
            <div className="flex flex-col items-center justify-center p-3 bg-surface-elevated rounded-xl border border-border/60">
              <div className="w-16 h-16 rounded-full bg-[#ADE4B5]/20 border border-[#ADE4B5]/50 flex items-center justify-center animate-lung">
                <span className="text-lg font-bold font-mono text-text-primary tabular-nums">
                  {breathCountdown}s
                </span>
              </div>
              <span className="text-[11px] font-mono uppercase text-text-primary font-bold mt-2">
                {breathPhase}
              </span>
              <span className="text-[9px] font-mono text-text-muted">Box 4-4-4-4</span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-text-muted text-center pt-2 border-t border-border/50">
            Regulação parassimpática ativa durante as pausas de recuperação
          </div>
        </div>
      </section>

      {/* ================= 5. EVOLUÇÃO SEMANAL (TREINO → ESFORÇO → RECUPERAÇÃO) ================= */}
      <section aria-label="Evolução Semanal" className="bg-surface rounded-2xl p-6 sm:p-7 border border-border/70 shadow-calm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-text-muted">
              trending_up
            </span>
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-text-muted">
              Relação Esforço (TSS) × Recuperação Semanal
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#18534B] dark:text-[#ADE4B5] font-semibold">
            {data.strainRecoveryCycle.adaptationWindow}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {data.weeklyEvolution.map((day) => {
            const isToday = day.label === 'Hoje';
            return (
              <div
                key={day.day}
                className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 ${
                  isToday
                    ? 'bg-[#ADE4B5]/15 border-[#ADE4B5] ring-1 ring-[#ADE4B5]/30'
                    : 'bg-surface-elevated border-border/70'
                }`}
              >
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className="font-bold text-text-primary">{day.day}</span>
                  <span className="text-text-muted">{day.label}</span>
                </div>

                <div>
                  <div className="text-[14px] font-bold font-mono text-text-primary tabular-nums">
                    {day.tss} <span className="text-[10px] font-normal text-text-muted">TSS</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#18534B] dark:text-[#ADE4B5]">
                    Recup. {day.recovery}%
                  </div>
                </div>

                <div className="w-full bg-surface-subtle h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-[#18534B] dark:bg-[#ADE4B5] h-full rounded-full"
                    style={{ width: `${day.recovery}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
