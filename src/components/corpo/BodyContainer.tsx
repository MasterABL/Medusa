'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CORPO_DATA,
  FUNDAMENTAL_MOVEMENTS,
  WEEKLY_TONNAGE,
  WORKOUT_ROUTINES,
  MUSCLE_RECOVERIES,
  BODY_COMPOSITION,
  PAST_SESSIONS,
  ExerciseItem,
  FundamentalMovement,
  WorkoutSplitRoutine,
} from './bodyFixtures';
import { useShell } from '@/context/ShellContext';
import { playFeedback } from '@/lib/audioFeedback';

type BodySubView = 'evolucao' | 'treino' | 'prontidao' | 'rotinas' | 'medidas';

export function BodyContainer() {
  const [subView, setSubView] = useState<BodySubView>('evolucao');

  // Estados da Home (Evolução e Força)
  const [selectedMovementId, setSelectedMovementId] = useState<string>('agachamento');

  // Estados da Ficha Ativa e do Modo Treino (Bancada Cinética)
  const [activeRoutineId, setActiveRoutineId] = useState<string>('routine-b');
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number>(1); // Barra Fixa
  const [exercises, setExercises] = useState<ExerciseItem[]>(() =>
    JSON.parse(JSON.stringify(WORKOUT_ROUTINES[1].exercises))
  );
  const [restSecondsLeft, setRestSecondsLeft] = useState<number>(90);
  const [restTimerRunning, setRestTimerRunning] = useState<boolean>(false);
  const [workoutFinished, setWorkoutFinished] = useState<boolean>(false);
  const [lastWeightDelta, setLastWeightDelta] = useState<number | null>(null);

  const { triggerIslandNotification, setActiveRoute } = useShell();

  // Movimento fundamental selecionado na Home
  const selectedMovement: FundamentalMovement = useMemo(() => {
    return (
      FUNDAMENTAL_MOVEMENTS.find((m) => m.id === selectedMovementId) ||
      FUNDAMENTAL_MOVEMENTS[0]
    );
  }, [selectedMovementId]);

  // Exercício ativo na bancada cinética
  const activeExercise: ExerciseItem = exercises[activeExerciseIndex] || exercises[0];

  // Cálculo de séries concluídas no treino
  const totalCompletedSets = useMemo(() => {
    return exercises.reduce((acc, ex) => {
      return acc + (ex.status === 'concluido' ? ex.totalSets : ex.currentSet - 1);
    }, 0);
  }, [exercises]);

  const totalWorkoutSets = useMemo(() => {
    return exercises.reduce((acc, ex) => acc + ex.totalSets, 0);
  }, [exercises]);

  // Timer físico de descanso
  useEffect(() => {
    if (!restTimerRunning) return;
    const interval = setInterval(() => {
      setRestSecondsLeft((prev) => {
        if (prev <= 1) {
          setRestTimerRunning(false);
          playFeedback('ready');
          return 90;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [restTimerRunning]);

  // Registrar série concluída na bancada cinética
  const handleCompleteSet = useCallback(() => {
    setExercises((prev) => {
      const next = [...prev];
      const cur = { ...next[activeExerciseIndex] };

      if (cur.currentSet < cur.totalSets) {
        cur.currentSet += 1;
      } else {
        cur.status = 'concluido';
        // Se concluiu o exercício atual, avança para o próximo se houver
        if (activeExerciseIndex + 1 < next.length) {
          next[activeExerciseIndex + 1].status = 'ativo';
          setActiveExerciseIndex((i) => i + 1);
        }
      }
      next[activeExerciseIndex] = cur;
      return next;
    });

    playFeedback('action');
    setRestSecondsLeft(activeExercise.restSeconds || 90);
    setRestTimerRunning(true);

    triggerIslandNotification({
      title: 'Série Registrada!',
      tag: 'BANCADA CINÉTICA',
      description: `${activeExercise.name}: ${activeExercise.reps} reps com ${activeExercise.weightKg} kg. Descanso iniciado.`,
      badge: 'DESCANSO ATIVO',
      state: 'active',
      durationMs: 3500,
    });
  }, [activeExerciseIndex, activeExercise, triggerIslandNotification]);

  // Ajustes de carga no exercício ativo (+ / - 2kg ou 5kg)
  const handleAdjustWeight = useCallback(
    (delta: number) => {
      setExercises((prev) => {
        const next = [...prev];
        const cur = { ...next[activeExerciseIndex] };
        cur.weightKg = Math.max(0, cur.weightKg + delta);
        next[activeExerciseIndex] = cur;
        return next;
      });
      setLastWeightDelta(delta);
      setTimeout(() => setLastWeightDelta(null), 1500);
      playFeedback('press');
    },
    [activeExerciseIndex]
  );

  // Ajuste do timer físico de descanso (+ / - 15s)
  const handleAdjustRestTimer = useCallback((delta: number) => {
    setRestSecondsLeft((prev) => Math.max(0, prev + delta));
    playFeedback('press');
  }, []);

  const handleFinishWorkout = useCallback(() => {
    setWorkoutFinished(true);
    setRestTimerRunning(false);
    playFeedback('celebration');
    triggerIslandNotification({
      title: 'Treino Concluído!',
      tag: 'CORPO & FORÇA',
      description: 'Sessão B finalizada com sucesso. Estímulo neural e muscular registrado.',
      badge: 'RECUPERAÇÃO OK',
      state: 'active',
      durationMs: 4500,
    });
  }, [triggerIslandNotification]);

  // Iniciar uma rotina específica na Bancada Cinética
  const handleStartRoutine = useCallback((routine: WorkoutSplitRoutine) => {
    setActiveRoutineId(routine.id);
    setExercises(JSON.parse(JSON.stringify(routine.exercises)));
    setActiveExerciseIndex(0);
    setWorkoutFinished(false);
    setSubView('treino');
    playFeedback('action');
  }, []);

  return (
    <main
      className="w-full pb-20 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col gap-8 pt-6 flex-1 study-stage-enter"
      aria-label="Corpo · Evolução & Sessão Cinética"
    >
      {/* 1. CABEÇALHO CONTEXTUAL + NAVEGAÇÃO INTERNA DO DOMÍNIO */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ADE4B5] animate-pulse" aria-hidden="true" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-text-muted">
              Corpo &amp; Movimento · Sistema de Saúde
            </span>
            <span className="text-text-muted/40">•</span>
            <span className="text-[11px] font-mono text-text-secondary">
              Prontidão: {CORPO_DATA.readiness.score}/100
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            {subView === 'evolucao'
              ? 'Evolução, Força & Carga'
              : subView === 'treino'
              ? 'Bancada Cinética de Treino'
              : subView === 'prontidao'
              ? 'Prontidão Fisiológica & Sono'
              : subView === 'rotinas'
              ? 'Fichas & Histórico de Sessões'
              : 'Composição Corporal & Medidas'}
          </h1>
        </div>

        {/* Subnav interna de Corpo */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface border border-border/70 shadow-subtle overflow-x-auto self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setSubView('evolucao');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'evolucao'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            <span>Evolução</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('treino');
              playFeedback('press');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'treino'
                ? 'bg-[#ADE4B5] text-[#1C2420] shadow-subtle'
                : 'bg-surface text-text-primary hover:bg-surface-secondary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">fitness_center</span>
            <span>Modo Treino</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('prontidao');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'prontidao'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">vital_signs</span>
            <span>Prontidão</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('rotinas');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'rotinas'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
            <span>Fichas</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('medidas');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'medidas'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">straighten</span>
            <span>Medidas</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* SUBVIEW 1: EVOLUÇÃO E FORÇA (HOME OFICIAL DE CORPO)       */}
      {/* ========================================================= */}
      {subView === 'evolucao' && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-200">
          {/* A. Movimentos Fundamentais & 1RM */}
          <section aria-label="Padrões Motores Fundamentais" className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block">
                  Sobrecarga Progressiva
                </span>
                <p className="text-[13px] text-text-secondary">
                  Acompanhamento contínuo dos 4 padrões mecânicos primários.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSubView('treino');
                  playFeedback('action');
                }}
                className="px-4 py-2 rounded-xl bg-[#ADE4B5] hover:bg-[#ADE4B5]/90 text-[#1C2420] text-[12px] font-bold transition-transform active:scale-95 shadow-subtle flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                <span>Abrir Bancada de Treino</span>
              </button>
            </div>

            {/* Grid dos 4 Movimentos Fundamentais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {FUNDAMENTAL_MOVEMENTS.map((mov) => {
                const isSelected = mov.id === selectedMovementId;
                const gain = mov.currentMax - mov.startMax;

                return (
                  <button
                    key={mov.id}
                    type="button"
                    onClick={() => {
                      setSelectedMovementId(mov.id);
                      playFeedback('press');
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#FAFDF5] border-[#ADE4B5] ring-2 ring-[#ADE4B5]/40 shadow-calm scale-[1.02]'
                        : 'bg-surface border-border/70 hover:border-border shadow-subtle'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono uppercase text-text-muted">
                        {mov.pattern}
                      </span>
                      <h3 className="text-[14px] font-bold text-text-primary truncate">
                        {mov.name}
                      </h3>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="text-2xl font-extrabold font-mono text-text-primary tabular-nums">
                          {mov.currentMax}
                        </span>
                        <span className="text-[11px] font-mono text-text-muted ml-1">
                          {mov.unit}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-[#18534B] dark:text-[#ADE4B5]">
                        +{gain} {mov.unit}
                      </span>
                    </div>

                    {/* Mini Sparkline dos Pontos Semanais */}
                    <div className="flex items-end gap-1 h-6 w-full pt-1">
                      {mov.weeklyPoints.map((val, idx) => {
                        const min = Math.min(...mov.weeklyPoints);
                        const max = Math.max(...mov.weeklyPoints);
                        const pct = max === min ? 50 : Math.round(((val - min) / (max - min)) * 80) + 20;
                        return (
                          <div
                            key={idx}
                            className={`flex-1 rounded-sm transition-all ${
                              idx === mov.weeklyPoints.length - 1
                                ? 'bg-[#1C2420] dark:bg-[#ADE4B5]'
                                : 'bg-surface-secondary'
                            }`}
                            style={{ height: `${pct}%` }}
                            title={`Semana ${idx + 1}: ${val} ${mov.unit}`}
                          />
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* B. Detalhe do Movimento Selecionado e Tonelagem Semanal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Movimento em Foco */}
            <div className="p-6 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                    Progressão do Movimento
                  </span>
                  <span className="text-text-muted/40">•</span>
                  <span className="text-[11px] font-mono text-[#ADE4B5] font-semibold">
                    {selectedMovement.historyLabel}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-text-primary">
                  {selectedMovement.name}
                </h3>
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  Padrão biomecânico: <strong>{selectedMovement.pattern}</strong>. Estimativa de 1RM baseada na carga de trabalho com repetições máximas limpas.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-secondary/40 border border-border/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-text-muted uppercase">1RM Estimado</span>
                  <div className="text-2xl font-bold font-mono text-text-primary">
                    {Math.round(selectedMovement.currentMax * 1.15)} {selectedMovement.unit}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-text-muted uppercase">Carga de Treino</span>
                  <div className="text-2xl font-bold font-mono text-[#18534B] dark:text-[#ADE4B5]">
                    {selectedMovement.currentMax} {selectedMovement.unit}
                  </div>
                </div>
              </div>
            </div>

            {/* Tonelagem Semanal Acumulada */}
            <div className="p-6 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  Volume &amp; Tonelagem Total
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-text-primary tabular-nums">
                    17.5 toneladas
                  </span>
                  <span className="text-[11px] font-mono text-text-muted">nesta semana</span>
                </div>
                <p className="text-[12px] text-text-secondary">
                  Soma total de (Carga × Reps × Séries) erguida nos treinos da semana atual.
                </p>
              </div>

              {/* Gráfico de Barras de Tonelagem */}
              <div className="flex items-end gap-2 h-20 pt-2">
                {WEEKLY_TONNAGE.map((item, idx) => {
                  const maxTon = 18;
                  const hPct = Math.round((item.tonnage / maxTon) * 100);
                  const isLast = idx === WEEKLY_TONNAGE.length - 1;

                  return (
                    <div key={item.week} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div
                        className={`w-full rounded-md transition-all ${
                          isLast
                            ? 'bg-[#ADE4B5]'
                            : 'bg-surface-secondary hover:bg-surface-secondary/80'
                        }`}
                        style={{ height: `${hPct}%` }}
                        title={`${item.week}: ${item.tonnage} toneladas`}
                      />
                      <span className="text-[9px] font-mono text-text-muted truncate">
                        {item.week}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 2: MODO TREINO (BANCADA CINÉTICA)                 */}
      {/* ========================================================= */}
      {subView === 'treino' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Barra de Status da Sessão Ativa */}
          <div className="p-5 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#ADE4B5]/30 text-[#1C2420] font-bold">
                  Sessão em Andamento
                </span>
                <span className="text-[11px] font-mono text-text-muted">
                  {CORPO_DATA.activeWorkout.split}
                </span>
              </div>
              <h2 className="text-xl font-bold text-text-primary">
                {CORPO_DATA.activeWorkout.title}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right font-mono text-xs text-text-secondary">
                <div className="font-bold text-text-primary text-sm">
                  {totalCompletedSets} / {totalWorkoutSets} séries
                </div>
                <span>{Math.round((totalCompletedSets / totalWorkoutSets) * 100)}% concluído</span>
              </div>

              {!workoutFinished ? (
                <button
                  type="button"
                  onClick={handleFinishWorkout}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-secondary border border-border/70 text-[12px] font-mono font-bold text-text-primary transition-all shadow-subtle"
                >
                  Finalizar Treino
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-[#ADE4B5] text-[#1C2420] font-mono text-xs font-bold">
                  Treino Salvo!
                </span>
              )}
            </div>
          </div>

          {/* CENTRO DA BANCADA CINÉTICA: EXERCÍCIO PROTAGONISTA */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#FAFDF5] border border-[#ADE4B5]/60 shadow-calm flex flex-col gap-6 ring-1 ring-[#ADE4B5]/20">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/50 pb-5">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted font-bold">
                  Exercício Ativo ({activeExerciseIndex + 1} de {exercises.length})
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                  {activeExercise.name}
                </h3>
                <p className="text-[12px] text-text-secondary">
                  Grupo muscular: <strong>{activeExercise.muscleGroup}</strong> · {activeExercise.progressionNote}
                </p>
              </div>

              {/* Seletor Rápido de Exercício */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {exercises.map((ex, idx) => {
                  const isCurrent = idx === activeExerciseIndex;
                  const isDone = ex.status === 'concluido';
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => {
                        setActiveExerciseIndex(idx);
                        playFeedback('press');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-mono transition-all border ${
                        isCurrent
                          ? 'bg-[#1C2420] text-[#FAFDF5] font-bold shadow-subtle'
                          : isDone
                          ? 'bg-[#ADE4B5]/40 text-[#1C2420] border-[#ADE4B5]'
                          : 'bg-surface border-border/60 text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <span>{idx + 1}. {ex.name.split(' ')[0]}</span>
                      {isDone && <span className="ml-1">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Painel Central com Séries e Cargas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* 1. Séries e Repetições */}
              <div className="p-5 rounded-2xl bg-surface border border-border/60 shadow-subtle flex flex-col gap-2">
                <span className="text-[10px] font-mono uppercase text-text-muted">Série Atual</span>
                <div className="text-3xl font-extrabold font-mono text-text-primary tabular-nums">
                  {activeExercise.currentSet} <span className="text-base text-text-muted font-normal">/ {activeExercise.totalSets}</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  {Array.from({ length: activeExercise.totalSets }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full transition-all ${
                        i < activeExercise.currentSet - 1
                          ? 'bg-[#ADE4B5]'
                          : i === activeExercise.currentSet - 1
                          ? 'bg-[#1C2420] dark:bg-[#ADE4B5]'
                          : 'bg-surface-secondary'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-mono text-text-muted pt-1">
                  Meta: {activeExercise.reps} repetições
                </span>
              </div>

              {/* 2. Carga com Ajuste Interativo */}
              <div className="p-5 rounded-2xl bg-surface border border-border/60 shadow-subtle flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-text-muted">Carga</span>
                  {lastWeightDelta !== null && (
                    <span className="text-[10px] font-mono font-bold text-[#18534B] dark:text-[#ADE4B5] animate-pulse">
                      {lastWeightDelta > 0 ? `+${lastWeightDelta}kg` : `${lastWeightDelta}kg`}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold font-mono text-text-primary tabular-nums">
                    {activeExercise.weightKg}
                  </span>
                  <span className="text-sm font-mono text-text-muted">kg</span>
                </div>

                {/* Botões de Carga +/- */}
                <div className="flex items-center gap-1.5 pt-2">
                  <button
                    type="button"
                    onClick={() => handleAdjustWeight(-2)}
                    className="flex-1 py-1 rounded-lg bg-surface-secondary hover:bg-surface-secondary/80 font-mono text-xs font-bold text-text-secondary"
                  >
                    -2kg
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustWeight(2)}
                    className="flex-1 py-1 rounded-lg bg-surface-secondary hover:bg-surface-secondary/80 font-mono text-xs font-bold text-text-secondary"
                  >
                    +2kg
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustWeight(5)}
                    className="flex-1 py-1 rounded-lg bg-[#ADE4B5]/40 hover:bg-[#ADE4B5]/60 font-mono text-xs font-bold text-[#1C2420]"
                  >
                    +5kg
                  </button>
                </div>
              </div>

              {/* 3. Timer de Descanso Vivo */}
              <div className="p-5 rounded-2xl bg-surface border border-border/60 shadow-subtle flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-text-muted">Descanso</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      restTimerRunning ? 'bg-[#ADE4B5] animate-ping' : 'bg-surface-secondary'
                    }`}
                  />
                </div>

                <div className="text-3xl font-extrabold font-mono text-text-primary tabular-nums">
                  {Math.floor(restSecondsLeft / 60)}:
                  {String(restSecondsLeft % 60).padStart(2, '0')}
                </div>

                <div className="flex items-center gap-1.5 pt-2">
                  <button
                    type="button"
                    onClick={() => handleAdjustRestTimer(-15)}
                    className="flex-1 py-1 rounded-lg bg-surface-secondary font-mono text-xs text-text-muted"
                  >
                    -15s
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestTimerRunning((r) => !r)}
                    className="flex-1 py-1 rounded-lg bg-surface border border-border/70 font-mono text-xs font-bold text-text-primary"
                  >
                    {restTimerRunning ? 'Pausar' : 'Iniciar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustRestTimer(15)}
                    className="flex-1 py-1 rounded-lg bg-surface-secondary font-mono text-xs text-text-muted"
                  >
                    +15s
                  </button>
                </div>
              </div>
            </div>

            {/* BOTÃO PRINCIPAL DE AÇÃO: CONCLUIR SÉRIE */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-border/40">
              <span className="text-[12px] font-mono text-text-secondary">
                Clique ao terminar a série para disparar o timer e atualizar o foco.
              </span>

              <button
                type="button"
                onClick={handleCompleteSet}
                className="px-6 py-3.5 rounded-2xl bg-[#ADE4B5] hover:bg-[#ADE4B5]/90 active:scale-98 text-[#1C2420] text-sm font-extrabold transition-all shadow-subtle flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">done</span>
                <span>Registrar Série {activeExercise.currentSet}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 3: PRONTIDÃO & RECUPERAÇÃO BIOLÓGICA              */}
      {/* ========================================================= */}
      {subView === 'prontidao' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block">
                Monitor Fisiológico de Recuperação
              </span>
              <p className="text-[13px] text-text-secondary">
                Dados integrados de sono, HRV e fadiga muscular para ditar a intensidade da sessão.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Score de Prontidão */}
            <div className="p-6 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col justify-between gap-3">
              <span className="text-[10px] font-mono uppercase text-text-muted">Prontidão para Treino</span>
              <div className="text-4xl font-extrabold font-mono text-text-primary tabular-nums">
                {CORPO_DATA.readiness.score}<span className="text-base font-normal text-text-muted">/100</span>
              </div>
              <p className="text-[12px] text-text-secondary">
                {CORPO_DATA.readiness.recoveryStatus}
              </p>
              <div className="text-[11px] font-mono text-[#ADE4B5] font-semibold pt-1 border-t border-border/40">
                Janela ótima: {CORPO_DATA.readiness.nextOptimumWindow}
              </div>
            </div>

            {/* 2. Sono da Noite Anterior */}
            <div className="p-6 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col justify-between gap-3">
              <span className="text-[10px] font-mono uppercase text-text-muted">Sono &amp; Eficiência</span>
              <div className="text-4xl font-extrabold font-mono text-text-primary tabular-nums">
                {CORPO_DATA.sleep.duration}
              </div>
              <p className="text-[12px] text-text-secondary">
                {CORPO_DATA.sleep.qualityLabel} · {CORPO_DATA.sleep.efficiency}% de eficiência
              </p>
              <div className="text-[11px] font-mono text-text-muted pt-1 border-t border-border/40">
                Profundo: {CORPO_DATA.sleep.deepHours}h · REM: {CORPO_DATA.sleep.remHours}h
              </div>
            </div>

            {/* 3. Passos & Movimento */}
            <div className="p-6 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col justify-between gap-3">
              <span className="text-[10px] font-mono uppercase text-text-muted">Movimento Diário</span>
              <div className="text-4xl font-extrabold font-mono text-text-primary tabular-nums">
                {CORPO_DATA.dailyMovement.totalSteps.toLocaleString('pt-BR')}
              </div>
              <p className="text-[12px] text-text-secondary">
                Meta: {CORPO_DATA.dailyMovement.targetSteps.toLocaleString('pt-BR')} passos
              </p>
              <div className="w-full bg-surface-secondary h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#ADE4B5] h-full rounded-full"
                  style={{
                    width: `${Math.round(
                      (CORPO_DATA.dailyMovement.totalSteps / CORPO_DATA.dailyMovement.targetSteps) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Recuperação por Grupamento Muscular */}
          <div className="p-6 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col gap-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
              Estado de Fadiga &amp; Recuperação por Grupo
            </span>

            <div className="space-y-3">
              {MUSCLE_RECOVERIES.map((grp) => (
                <div
                  key={grp.muscle}
                  className="p-3.5 rounded-xl bg-surface-secondary/40 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-[200px]">
                    <h4 className="text-[13px] font-bold text-text-primary">
                      {grp.muscle}
                    </h4>
                    <span className="text-[10px] font-mono text-text-muted">
                      Descanso de {grp.hoursRested} horas
                    </span>
                  </div>

                  <div className="flex-1 flex items-center gap-3">
                    <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          grp.recoveryPercent >= 90
                            ? 'bg-[#ADE4B5]'
                            : grp.recoveryPercent >= 75
                            ? 'bg-[#FFF18C]'
                            : 'bg-[#C45B5B]'
                        }`}
                        style={{ width: `${grp.recoveryPercent}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-text-primary tabular-nums w-12 text-right">
                      {grp.recoveryPercent}%
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      grp.recoveryPercent >= 90
                        ? 'bg-[#ADE4B5]/40 text-[#1C2420]'
                        : 'bg-[#FFF18C]/40 text-amber-900'
                    }`}
                  >
                    {grp.statusLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 4: FICHAS & HISTÓRICO DE SESSÕES                  */}
      {/* ========================================================= */}
      {subView === 'rotinas' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block">
                Fichas de Treino &amp; Histórico
              </span>
              <p className="text-[13px] text-text-secondary">
                Divisão ABC estruturada para frequência de 3 a 4 sessões semanais.
              </p>
            </div>
          </div>

          {/* Cards das Fichas A, B, C */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {WORKOUT_ROUTINES.map((routine) => {
              const isCurrent = routine.id === activeRoutineId;
              return (
                <div
                  key={routine.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                    isCurrent
                      ? 'bg-[#FAFDF5] border-[#ADE4B5] ring-2 ring-[#ADE4B5]/40 shadow-calm'
                      : 'bg-surface border-border/70 shadow-calm'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-secondary text-text-secondary font-bold">
                        Divisão {routine.splitCode}
                      </span>
                      <span className="text-[11px] font-mono text-text-muted">
                        ~{routine.estimatedMinutes} min
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-text-primary">
                      {routine.title}
                    </h3>
                    <p className="text-[12px] text-text-secondary">
                      Foco: {routine.focusMuscles}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-border/40 text-[11px] font-mono">
                    {routine.exercises.slice(0, 3).map((ex) => (
                      <div key={ex.id} className="flex justify-between text-text-muted">
                        <span className="truncate pr-1">{ex.name}</span>
                        <span className="tabular-nums flex-shrink-0">{ex.totalSets}x{ex.reps}</span>
                      </div>
                    ))}
                    {routine.exercises.length > 3 && (
                      <span className="text-[10px] text-text-muted block">
                        +{routine.exercises.length - 3} exercício(s)
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartRoutine(routine)}
                    className="w-full py-2.5 rounded-xl bg-[#ADE4B5] hover:bg-[#ADE4B5]/90 text-[#1C2420] text-xs font-bold transition-transform active:scale-98 shadow-subtle flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                    <span>Iniciar na Bancada</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Histórico de Sessões Concluídas */}
          <div className="p-6 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col gap-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
              Sessões Realizadas Recentemente
            </span>

            <div className="space-y-3">
              {PAST_SESSIONS.map((sess) => (
                <div
                  key={sess.id}
                  className="p-3.5 rounded-xl bg-surface-secondary/40 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-text-muted">{sess.date}</span>
                      <span className="text-text-muted/40">•</span>
                      <span className="font-mono text-[10px] font-bold text-[#18534B] dark:text-[#ADE4B5]">
                        {sess.split}
                      </span>
                    </div>
                    <h4 className="font-bold text-text-primary text-[14px]">
                      {sess.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-4 text-text-secondary font-mono text-[11px]">
                    <span>{sess.durationMinutes} min</span>
                    <span>{sess.tonnageKg.toLocaleString('pt-BR')} kg</span>
                    <span>{sess.setsCompleted} séries</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 5: COMPOSIÇÃO CORPORAL & MEDIDAS                  */}
      {/* ========================================================= */}
      {subView === 'medidas' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block">
                Composição Corporal &amp; Medidas
              </span>
              <p className="text-[13px] text-text-secondary">
                Monitoramento de peso corporal e circunferências musculares em hipertrofia sustentável.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Peso e Tendência */}
            <div className="p-6 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-text-muted">Peso Corporal Atual</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold font-mono text-text-primary tabular-nums">
                    {BODY_COMPOSITION.currentWeightKg}
                  </span>
                  <span className="text-base font-mono text-text-muted">kg</span>
                  <span className="text-[11px] font-mono font-bold text-[#18534B] dark:text-[#ADE4B5] ml-2">
                    +{(BODY_COMPOSITION.currentWeightKg - BODY_COMPOSITION.startWeightKg).toFixed(1)} kg no ciclo
                  </span>
                </div>
                <p className="text-[12px] text-text-secondary">
                  Ganho controlado de massa magra (~200g a 300g por semana).
                </p>
              </div>

              {/* Sparkline de Peso */}
              <div className="flex items-end gap-1.5 h-16 pt-2">
                {BODY_COMPOSITION.weeklyWeightPoints.map((w, i) => {
                  const min = 75;
                  const max = 79;
                  const pct = Math.round(((w - min) / (max - min)) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div
                        className="w-full rounded-md bg-[#ADE4B5]"
                        style={{ height: `${pct}%` }}
                        title={`Semana ${i + 1}: ${w} kg`}
                      />
                      <span className="text-[9px] font-mono text-text-muted">S{i + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Medidas de Circunferência */}
            <div className="p-6 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col gap-4">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
                Circunferências Corporais
              </span>

              <div className="space-y-2.5">
                {BODY_COMPOSITION.measurements.map((m) => (
                  <div
                    key={m.part}
                    className="p-3 rounded-xl bg-surface-secondary/40 border border-border/50 flex items-center justify-between text-[12px]"
                  >
                    <span className="font-semibold text-text-primary">{m.part}</span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="font-bold text-text-primary">{m.cm} cm</span>
                      <span className="text-[11px] text-[#18534B] dark:text-[#ADE4B5] font-semibold">
                        {m.changeCm}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
