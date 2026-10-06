'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CORPO_DATA,
  FUNDAMENTAL_MOVEMENTS,
  WEEKLY_TONNAGE,
  ExerciseItem,
  FundamentalMovement,
} from './bodyFixtures';
import { useShell } from '@/context/ShellContext';
import { playFeedback } from '@/lib/audioFeedback';

type BodyViewMode = 'home' | 'treino';

export function BodyContainer() {
  const [viewMode, setViewMode] = useState<BodyViewMode>('home');
  const [data] = useState(CORPO_DATA);

  // Estados da Home (Evolução e Força)
  const [selectedMovementId, setSelectedMovementId] = useState<string>('agachamento');

  // Estados do Modo Treino (Bancada Cinética)
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number>(1); // Barra Fixa
  const [exercises, setExercises] = useState<ExerciseItem[]>(() =>
    JSON.parse(JSON.stringify(CORPO_DATA.activeWorkout.exercises))
  );
  const [restSecondsLeft, setRestSecondsLeft] = useState<number>(90);
  const [restTimerRunning, setRestTimerRunning] = useState<boolean>(false);
  const [workoutFinished, setWorkoutFinished] = useState<boolean>(false);

  const { triggerIslandNotification } = useShell();

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
      title: 'Série Registrada',
      tag: 'BANCADA CINÉTICA',
      description: `${activeExercise.name}: ${activeExercise.reps} reps com ${activeExercise.weightKg} kg.`,
      badge: 'DESCANSO ATIVO',
      state: 'active',
      durationMs: 3000,
    });
  }, [activeExerciseIndex, activeExercise, triggerIslandNotification]);

  // Ajustes de carga no exercício ativo (+ / - 2kg)
  const handleAdjustWeight = useCallback(
    (delta: number) => {
      setExercises((prev) => {
        const next = [...prev];
        const cur = { ...next[activeExerciseIndex] };
        cur.weightKg = Math.max(0, cur.weightKg + delta);
        next[activeExerciseIndex] = cur;
        return next;
      });
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
      description: 'Sessão B completada com sucesso. Recuperação iniciada.',
      badge: 'ESTÍMULO OK',
      state: 'active',
      durationMs: 4500,
    });
  }, [triggerIslandNotification]);

  return (
    <main
      className="w-full pb-20 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col gap-8 pt-6 flex-1 study-stage-enter"
      aria-label="Corpo · Evolução & Sessão Cinética"
    >
      {/* 1. CABEÇALHO COM TOGGLE DE EXPERIÊNCIA: HOME vs MODO TREINO */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ADE4B5] animate-pulse" aria-hidden="true" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-text-muted">
              Corpo &amp; Movimento
            </span>
            <span className="text-text-muted/40">•</span>
            <span className="text-[11px] font-mono text-text-secondary">
              {viewMode === 'home' ? 'Evolução e Força' : 'Bancada Cinética Ativa'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            {viewMode === 'home' ? 'Evolução & Capacidade Física' : data.activeWorkout.title}
          </h1>
        </div>

        {/* Botão de Alternância de Experiência */}
        <div className="flex items-center gap-2">
          {viewMode === 'home' ? (
            <button
              type="button"
              onClick={() => {
                setViewMode('treino');
                playFeedback('action');
              }}
              className="px-4 py-2 rounded-xl bg-[#71DBD2] hover:bg-[#71DBD2]/90 text-[#1C2420] text-[13px] font-bold transition-transform active:scale-95 flex items-center gap-2 shadow-subtle"
            >
              <span className="material-symbols-outlined text-[18px]">play_circle</span>
              <span>Iniciar Modo Treino</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setViewMode('home');
                playFeedback('press');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-surface border border-border/70 hover:border-text-primary text-text-secondary hover:text-text-primary text-[12px] font-mono transition-colors flex items-center gap-1.5 shadow-subtle"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Visão de Evolução</span>
            </button>
          )}
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. EXPERIÊNCIA HOME: EVOLUÇÃO E FORÇA (MODELO C)              */}
      {/* ============================================================== */}
      {viewMode === 'home' && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-300">
          {/* A. COMO ESTOU HOJE? */}
          <section aria-label="Como estou hoje" className="flex flex-col gap-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
              1. Como estou hoje?
            </span>

            <div className="p-6 rounded-2xl bg-surface border border-border/70 shadow-calm grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Prontidão */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#ADE4B5]/40 flex items-center justify-center flex-shrink-0 text-text-primary">
                  <span className="material-symbols-outlined text-[20px]">ecg_heart</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-text-muted">Prontidão</span>
                  <div className="text-xl font-bold font-mono text-text-primary">
                    {data.readiness.score}/100
                  </div>
                  <p className="text-[11px] text-emerald-800 font-mono mt-0.5">
                    {data.readiness.recoveryStatus}
                  </p>
                </div>
              </div>

              {/* Sono Restaurador */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#FFF18C]/40 flex items-center justify-center flex-shrink-0 text-text-primary">
                  <span className="material-symbols-outlined text-[20px]">bedtime</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-text-muted">Sono Restaurador</span>
                  <div className="text-xl font-bold font-mono text-text-primary">
                    {data.sleep.duration}
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {data.sleep.qualityLabel}
                  </p>
                </div>
              </div>

              {/* Movimento Diário */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#71DBD2]/30 flex items-center justify-center flex-shrink-0 text-text-primary">
                  <span className="material-symbols-outlined text-[20px]">directions_walk</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-text-muted">Passos Ativos</span>
                  <div className="text-xl font-bold font-mono text-text-primary">
                    {data.dailyMovement.totalSteps.toLocaleString('pt-BR')}
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Meta de 10.000 em andamento
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* B. COMO ESTOU EVOLUINDO? (TRAJETÓRIA DE SOBRECARGA E TONELAGEM) */}
          <section aria-label="Como estou evoluindo" className="flex flex-col gap-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
              2. Como estou evoluindo? · Sobrecarga Progressiva
            </span>

            <div className="p-6 sm:p-7 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col gap-6">
              {/* Seletor dos 4 Fundamentais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {FUNDAMENTAL_MOVEMENTS.map((m) => {
                  const isSelected = selectedMovementId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMovementId(m.id);
                        playFeedback('press');
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#FAFDF5] border-[#71DBD2] ring-1 ring-[#71DBD2]/40 shadow-sm'
                          : 'bg-surface-secondary/40 border-border/60 hover:border-border'
                      }`}
                    >
                      <span className="text-[9px] font-mono uppercase text-text-muted block truncate">
                        {m.pattern}
                      </span>
                      <h4 className="text-[13px] font-bold text-text-primary truncate mt-0.5">
                        {m.name}
                      </h4>
                      <div className="text-[16px] font-mono font-bold text-text-primary mt-1">
                        {m.currentMax} <span className="text-[11px] font-normal text-text-muted">{m.unit}</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-800 font-semibold block mt-0.5">
                        {m.historyLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Trajetória Visual do Movimento Selecionado (SVG Dinâmico) */}
              <div className="p-5 rounded-xl bg-surface-secondary/30 border border-border/60 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[14px] font-bold text-text-primary">
                      Trajetória de Força: {selectedMovement.name}
                    </h4>
                    <span className="text-[11px] font-mono text-text-muted">
                      Evolução de carga ao longo das últimas 7 semanas
                    </span>
                  </div>
                  <span className="text-[12px] font-mono font-bold text-[#71DBD2] bg-[#71DBD2]/10 px-2.5 py-1 rounded-lg">
                    {selectedMovement.currentMax} {selectedMovement.unit} Atual
                  </span>
                </div>

                {/* Gráfico Linear SVG da Trajetória */}
                <div className="h-28 w-full flex items-end justify-between gap-2 pt-4 px-2">
                  {selectedMovement.weeklyPoints.map((val, idx) => {
                    const min = Math.min(...selectedMovement.weeklyPoints) * 0.9;
                    const max = Math.max(...selectedMovement.weeklyPoints) * 1.05;
                    const heightPercent = Math.max(15, Math.round(((val - min) / (max - min)) * 100));

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        <span className="text-[10px] font-mono text-text-muted group-hover:text-text-primary font-bold">
                          {val}
                        </span>
                        <div
                          className="w-full max-w-[36px] bg-gradient-to-t from-[#ADE4B5] to-[#71DBD2] rounded-t-lg transition-all duration-300 group-hover:brightness-105"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-[9px] font-mono text-text-muted">
                          S{idx + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resumo de Tonelagem Semanal */}
              <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]">
                <div className="flex items-center gap-2 text-text-secondary">
                  <span className="material-symbols-outlined text-[17px] text-[#71DBD2]">fitness_center</span>
                  <span>Volume Total da Semana Atual:</span>
                  <strong className="font-mono text-text-primary">17.5 toneladas</strong>
                </div>
                <span className="font-mono text-[11px] text-text-muted">
                  Progressão sustentável sem picos lesivos
                </span>
              </div>
            </div>
          </section>

          {/* C. QUAL É MEU PRÓXIMO ESTÍMULO? */}
          <section aria-label="Qual é meu próximo estímulo" className="flex flex-col gap-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
              3. Próximo Estímulo Programado
            </span>

            <div className="p-6 rounded-2xl bg-gradient-to-r from-[#ADE4B5]/20 via-[#FAFDF5] to-[#71DBD2]/15 border border-[#71DBD2]/40 shadow-calm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase bg-[#71DBD2]/20 text-text-primary px-2 py-0.5 rounded font-bold">
                    {data.nextSession.split}
                  </span>
                  <span className="text-[11px] font-mono text-text-muted">
                    {data.nextSession.timeEst} estimados • {data.nextSession.exercisesCount} exercícios
                  </span>
                </div>
                <h3 className="text-xl font-bold text-text-primary">
                  {data.nextSession.title}
                </h3>
                <p className="text-[12px] text-text-secondary">
                  Foco na sobrecarga da Barra Fixa e estabilidade escapular no Face Pull.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setViewMode('treino');
                  playFeedback('action');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#71DBD2] hover:bg-[#71DBD2]/90 text-[#1C2420] text-[13px] font-bold transition-transform active:scale-95 flex items-center gap-2 shadow-subtle self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-[18px]">play_circle</span>
                <span>Iniciar Treino Agora</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. EXPERIÊNCIA MODO TREINO: BANCADA CINÉTICA (MODELO A)       */}
      {/* ============================================================== */}
      {viewMode === 'treino' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          {/* Barra de Progresso Global da Sessão */}
          <div className="p-4 rounded-xl bg-surface border border-border/70 flex items-center justify-between gap-4 shadow-subtle">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono uppercase text-text-muted">Sessão em Curso</span>
              <span className="text-[13px] font-mono font-bold text-text-primary">
                {totalCompletedSets} de {totalWorkoutSets} séries concluídas
              </span>
            </div>

            <div className="w-32 bg-surface-secondary h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#71DBD2] h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.round((totalCompletedSets / totalWorkoutSets) * 100)}%` }}
              />
            </div>
          </div>

          {/* A BANCADA CINÉTICA: EXERCÍCIO PROTAGONISTA */}
          <section
            aria-label="Bancada Cinética"
            className="p-6 sm:p-8 rounded-3xl bg-surface border-2 border-[#71DBD2]/60 shadow-lg flex flex-col gap-6"
          >
            {/* Topo do Exercício */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/60 pb-5">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#71DBD2] font-bold">
                  Exercício em Execução · {activeExercise.muscleGroup}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary">
                  {activeExercise.name}
                </h2>
                <p className="text-[12px] font-mono text-text-muted">
                  {activeExercise.progressionNote}
                </p>
              </div>

              {/* Seletor de Carga com Ajustes Rápidos */}
              <div className="flex items-center gap-2 bg-surface-secondary/50 p-2 rounded-2xl border border-border/60 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleAdjustWeight(-2)}
                  className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-secondary text-text-primary font-mono font-bold flex items-center justify-center shadow-subtle"
                  title="Diminuir 2 kg"
                >
                  -2
                </button>
                <div className="px-3 text-center">
                  <div className="text-2xl font-black font-mono text-text-primary tabular-nums">
                    {activeExercise.weightKg} <span className="text-xs font-normal text-text-muted">kg</span>
                  </div>
                  <span className="text-[9px] font-mono text-text-muted block">
                    Anterior: {activeExercise.previousWeightKg} kg
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdjustWeight(2)}
                  className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-secondary text-text-primary font-mono font-bold flex items-center justify-center shadow-subtle"
                  title="Aumentar 2 kg"
                >
                  +2
                </button>
              </div>
            </div>

            {/* As Séries Táteis */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: activeExercise.totalSets }).map((_, sIdx) => {
                const setNum = sIdx + 1;
                const isDone = setNum < activeExercise.currentSet;
                const isCurrent = setNum === activeExercise.currentSet;

                return (
                  <div
                    key={sIdx}
                    className={`p-3.5 rounded-xl border text-center transition-all ${
                      isDone
                        ? 'bg-[#ADE4B5]/30 border-[#ADE4B5] text-text-primary'
                        : isCurrent
                        ? 'bg-[#FAFDF5] border-[#71DBD2] ring-2 ring-[#71DBD2]/40 shadow-sm'
                        : 'bg-surface-secondary/30 border-border/60 text-text-muted opacity-60'
                    }`}
                  >
                    <span className="text-[10px] font-mono uppercase text-text-muted block">
                      Série {setNum}
                    </span>
                    <span className="text-lg font-bold font-mono text-text-primary">
                      {activeExercise.reps} reps
                    </span>
                    <span className="text-[10px] font-mono block mt-0.5">
                      {isDone ? (
                        <span className="text-green-700 font-bold">Feito ✓</span>
                      ) : isCurrent ? (
                        <span className="text-[#71DBD2] font-bold">Em Execução</span>
                      ) : (
                        'Aguardando'
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* BOTÃO PROTAGONISTA: REGISTRAR SÉRIE */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={handleCompleteSet}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#71DBD2] hover:bg-[#71DBD2]/90 text-[#1C2420] text-[15px] font-extrabold transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-calm"
              >
                <span className="material-symbols-outlined text-[20px]">check</span>
                <span>Registrar Série {activeExercise.currentSet}</span>
              </button>

              {/* TIMER FÍSICO DE DESCANSO */}
              <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3 bg-surface-secondary/50 p-2.5 rounded-2xl border border-border/60">
                <div className="flex items-center gap-2 px-2">
                  <span className="material-symbols-outlined text-[20px] text-[#71DBD2]">timer</span>
                  <div>
                    <span className="text-[9px] font-mono uppercase text-text-muted block">Descanso</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-text-primary">
                      {restSecondsLeft}s
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAdjustRestTimer(-15)}
                    className="px-2 py-1 rounded-lg bg-surface text-[11px] font-mono font-bold text-text-secondary hover:text-text-primary shadow-subtle"
                    title="-15 segundos"
                  >
                    -15s
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustRestTimer(15)}
                    className="px-2 py-1 rounded-lg bg-surface text-[11px] font-mono font-bold text-text-secondary hover:text-text-primary shadow-subtle"
                    title="+15 segundos"
                  >
                    +15s
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestTimerRunning(!restTimerRunning)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors ${
                      restTimerRunning
                        ? 'bg-[#C45B5B]/20 text-[#C45B5B]'
                        : 'bg-[#ADE4B5] text-[#1C2420]'
                    }`}
                  >
                    {restTimerRunning ? 'Pausar' : 'Iniciar'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ROTEIRO DA SESSÃO: EXERCÍCIOS RESTANTES */}
          <section aria-label="Roteiro dos Exercícios" className="flex flex-col gap-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
              Fila de Exercícios da Sessão
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {exercises.map((ex, idx) => {
                const isActive = activeExerciseIndex === idx;
                const isFinished = ex.status === 'concluido';

                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      setActiveExerciseIndex(idx);
                      playFeedback('press');
                    }}
                    className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isActive
                        ? 'bg-[#FAFDF5] border-[#71DBD2] ring-1 ring-[#71DBD2]/40 shadow-sm'
                        : isFinished
                        ? 'bg-[#ADE4B5]/15 border-[#ADE4B5]/40 opacity-75'
                        : 'bg-surface border-border/70 hover:border-border'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-mono uppercase text-text-muted">
                        {ex.muscleGroup}
                      </span>
                      <h4 className="text-[14px] font-bold text-text-primary">
                        {ex.name}
                      </h4>
                      <span className="text-[11px] font-mono text-text-secondary">
                        {ex.totalSets} séries • {ex.weightKg} kg
                      </span>
                    </div>

                    <div className="text-right">
                      {isFinished ? (
                        <span className="text-green-700 text-[12px] font-mono font-bold">Concluído ✓</span>
                      ) : isActive ? (
                        <span className="text-[#71DBD2] text-[12px] font-mono font-bold">Ativo</span>
                      ) : (
                        <span className="text-text-muted text-[11px] font-mono">Na fila</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* BOTÃO DE ENCERRAMENTO DA SESSÃO */}
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={handleFinishWorkout}
              className="px-5 py-2.5 rounded-xl bg-surface border border-border/70 hover:border-text-primary text-text-primary text-[13px] font-bold transition-all flex items-center gap-2 shadow-subtle"
            >
              <span className="material-symbols-outlined text-[18px]">flag</span>
              <span>Encerrar Treino</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
