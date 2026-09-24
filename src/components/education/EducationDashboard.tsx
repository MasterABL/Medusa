'use client';

import React, { useState, useRef } from 'react';
import { StudyTrack, LessonViewMode } from './types';
import { TRACK_DEFINITIONS } from './educationFixtures';
import { EnglishHub } from './EnglishHub';
import { EnemHub } from './EnemHub';
import { FaculdadeHub } from './FaculdadeHub';
import { useEducationPanel } from '@/context/EducationPanelContext';
import { getTrackAccent } from './trackAccent';

// Ordem espacial fixa das trilhas (DESIGN.md §5.1): ENEM(0) → Faculdade(1) → Inglês(2).
// Controla a DIREÇÃO do carrossel — não é o mesmo índice usado como StudyTrack.
const TRACK_SPATIAL_ORDER: Record<StudyTrack, number> = {
  vestibular: 0,
  faculdade: 1,
  ingles: 2,
};

const TRACK_EXIT_MS = 100;
const TRACK_ENTER_MS = 260;

interface EducationDashboardProps {
  currentTrack: StudyTrack;
  onSelectTrack: (track: StudyTrack) => void;
  onStartStudy: (simulateError?: boolean) => void;
  isSessionCompleted: boolean;
  completedScore?: number;
  /** Aula interrompida (ver "Interromper aula" no Study Mode) — usada para oferecer "Continuar aula" no hero. */
  interruptedSession?: { track: StudyTrack; currentTimeSeconds: number; viewMode: LessonViewMode } | null;
  onResumeInterruptedSession?: () => void;
}

export function EducationDashboard({
  currentTrack,
  onSelectTrack,
  onStartStudy,
  isSessionCompleted,
  completedScore = 80,
  interruptedSession,
  onResumeInterruptedSession,
}: EducationDashboardProps) {
  const [qaSimulateFailure, setQaSimulateFailure] = useState(false);
  const [qaPanelOpen, setQaPanelOpen] = useState(false);

  // Motion de travessia entre trilhas (carrossel direcional, ver DESIGN.md §5.1). Fica local a
  // este componente — não duplica nem substitui a máquina de estados de EducationContainer
  // (Island processing/currentTrack continuam no dono real do estado). O clique só é repassado
  // ao pai (`onSelectTrack`) depois da fase de saída, então o conteúdo visível nunca fica "preso"
  // mostrando a trilha nova com o conteúdo antigo.
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTrackClick = (track: StudyTrack) => {
    if (track === currentTrack) return;
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    const direction: 'forward' | 'backward' =
      TRACK_SPATIAL_ORDER[track] > TRACK_SPATIAL_ORDER[currentTrack] ? 'forward' : 'backward';
    setTransitionDirection(direction);
    setTransitionPhase('exiting');
    transitionTimeoutRef.current = setTimeout(() => {
      onSelectTrack(track);
      setTransitionPhase('entering');
      transitionTimeoutRef.current = setTimeout(() => {
        setTransitionPhase('idle');
      }, TRACK_ENTER_MS);
    }, TRACK_EXIT_MS);
  };

  const trackContentMotionClass =
    transitionPhase === 'exiting'
      ? transitionDirection === 'forward'
        ? 'track-exit-left'
        : 'track-exit-right'
      : transitionPhase === 'entering'
        ? transitionDirection === 'forward'
          ? 'track-enter-from-right'
          : 'track-enter-from-left'
        : '';
  // O painel de QA/Dev nunca é renderizado para usuários finais — só existe quando a própria URL
  // carrega `?qa=1` (usado exclusivamente pelos scripts de QA para alcançar o Error State
  // mandatório sem expor um controle de teste na experiência real do produto).
  const [isQaModeEnabled] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('qa') === '1'
  );

  const trackDef = TRACK_DEFINITIONS[currentTrack];
  const { lesson, modules } = trackDef;
  const accent = getTrackAccent(currentTrack);

  // BUG REAL CORRIGIDO: o hero "Próxima Ação" mostrava sempre Física II (trackDef.lesson fixo),
  // mesmo quando o usuário tinha selecionado outra disciplina no seletor da Faculdade logo
  // abaixo — a mesma seleção que já controlava o Hub e o Context Panel. Visualmente isso parecia
  // uma dessincronização (área principal "presa" na disciplina anterior). Agora o hero também lê
  // a disciplina selecionada como fonte única, igual ao resto da tela.
  const { faculdadeDisciplineCode } = useEducationPanel();
  const faculdadeDisciplines = trackDef.disciplines ?? [];
  const selectedFaculdadeDiscipline =
    currentTrack === 'faculdade'
      ? faculdadeDisciplines.find((d) => d.code === faculdadeDisciplineCode) ?? faculdadeDisciplines.find((d) => d.isActive)
      : undefined;
  const isPrimaryFaculdadeDiscipline =
    !selectedFaculdadeDiscipline || selectedFaculdadeDiscipline.code === faculdadeDisciplines.find((d) => d.isActive)?.code;

  const heroDiscipline = selectedFaculdadeDiscipline?.title ?? lesson.discipline;
  const heroTopic = selectedFaculdadeDiscipline?.focusTopic ?? lesson.topic;
  const heroObjective = selectedFaculdadeDiscipline?.focusObjective ?? lesson.sessionObjective;
  const heroDuration = selectedFaculdadeDiscipline?.focusDuration ?? lesson.estimatedDuration;

  // Trilha dinâmica: se a sessão foi concluída na trilha ativa, o módulo em progresso passa para 'completed'
  const trackItems = modules.map((item) => {
    if (item.status === 'in_progress' && isSessionCompleted) {
      return {
        ...item,
        status: 'completed' as const,
        score: `${completedScore}%`,
        date: 'Concluído hoje',
      };
    }
    if (item.status === 'locked' && isSessionCompleted && item.id === modules[modules.findIndex(m => m.status === 'in_progress') + 1]?.id) {
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

  // Rótulo "ENEM" por instrução explícita de produto (ENEM/Inglês/Faculdade). O id interno
  // permanece `vestibular` (StudyTrack) para não exigir uma migração de tipo mais ampla nesta
  // rodada — é só o texto exibido que muda, não a chave de dados.
  const tracks: { id: StudyTrack; label: string; icon: string }[] = [
    { id: 'faculdade', label: 'Faculdade', icon: 'school' },
    { id: 'ingles', label: 'Inglês', icon: 'translate' },
    { id: 'vestibular', label: 'ENEM', icon: 'assignment' },
  ];

  return (
    <div
      id="education-dashboard"
      className="study-stage-enter w-full flex flex-col gap-8 max-w-5xl mx-auto pb-16"
    >
      {/* ================= 1. CABEÇALHO DA EDUCAÇÃO & SELETOR DE TRILHA ================= */}
      <section aria-label="Visão Geral de Educação" className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-border/70 pb-5">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-medium tracking-widest uppercase text-text-muted">
              {trackDef.domainLabel}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              {trackDef.name}
            </h1>
            <p className="text-[13px] text-text-secondary leading-relaxed max-w-2xl">
              {trackDef.tagline}
            </p>
          </div>

          {/* Seletor Discreto e Elegante de Trilhas (Sem transformar em abas da sidebar) */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-secondary/70 border border-border/70 rounded-2xl shadow-subtle flex-shrink-0">
            {tracks.map((t) => {
              const isSelected = currentTrack === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  id={`track-selector-${t.id}`}
                  onClick={() => handleTrackClick(t.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-[12px] font-medium transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none ${
                    isSelected
                      ? 'bg-surface text-text-primary font-semibold shadow-subtle border border-border/60'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  aria-pressed={isSelected}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {t.icon}
                  </span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/*
          Conteúdo dependente da trilha usa o carrossel direcional de travessia entre trilhas
          (ver DESIGN.md §5.1) — a troca de `key` só acontece depois da fase de saída
          (`handleTrackClick`), então o remount já nasce na fase "entering".
        */}
        <div key={currentTrack} className={`${trackContentMotionClass} flex flex-col gap-8`}>
        {/* ================= 2. CARTÃO DE PRÓXIMA AÇÃO OPERACIONAL (HERO DA TRILHA) ================= */}
        <div
          id="education-next-action-card"
          className={`bg-surface/80 backdrop-blur-xl rounded-2xl p-6 sm:p-7 border border-border/70 shadow-glass dark:shadow-glass-dark flex flex-col gap-6 transition-all duration-220 hover:-translate-y-0.5 hover:shadow-glass-hover dark:hover:shadow-glass-hover-dark ${accent.hoverBorder}`}
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${accent.solidBg} living-pulse`} />
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                {isSessionCompleted ? 'Próxima Ação Desbloqueada' : 'Próxima Ação Recomendada'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-surface-secondary border border-border/60 text-text-muted">
                {trackDef.name}
              </span>
              <span className="text-[10px] font-mono text-text-muted uppercase tabular-nums">
                {isSessionCompleted ? 'Etapa Concluída' : 'Etapa Ativa'}
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl ${accent.softBg} border ${accent.softBorder} flex items-center justify-center ${accent.text} flex-shrink-0 mt-0.5 shadow-subtle`}>
                <span className={`material-symbols-outlined text-[22px] ${accent.text}`}>
                  {currentTrack === 'ingles' ? 'record_voice_over' : currentTrack === 'faculdade' ? 'functions' : 'waves'}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${accent.text} ${accent.softBg} px-2 py-0.5 rounded border ${accent.softBorder}`}>
                    {isSessionCompleted ? 'Próximo Bloco' : 'Sessão Pronta'}
                  </span>
                  <span className="text-[11px] font-mono text-text-muted">
                    {isSessionCompleted ? '50 min estimados' : heroDuration}
                  </span>
                  <span className="text-text-muted/40">•</span>
                  <span className="text-[11px] font-mono text-text-secondary">
                    {heroDiscipline}
                  </span>
                </div>
                <h4 className="text-[16px] sm:text-[17px] font-semibold text-text-primary tracking-tight">
                  {isSessionCompleted ? lesson.nextTopic : `${heroDiscipline} · ${heroTopic}`}
                </h4>
                <p className="text-[12px] text-text-secondary leading-relaxed max-w-xl">
                  {isSessionCompleted
                    ? lesson.nextTopicDescription
                    : heroObjective}
                </p>

                {/* Roteiro da Sessão — só existe fixture por tópico para a disciplina primária
                    (Física II); mostrar os pontos de Física II ao ver outra disciplina seria
                    informação errada, não só genérica — por isso fica oculto nesse caso. */}
                {isPrimaryFaculdadeDiscipline && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {trackDef.summaryPoints.slice(0, 4).map((point) => (
                      <span
                        key={point.id}
                        className="text-[11px] text-text-secondary bg-surface-secondary/60 border border-border/50 rounded-full px-2.5 py-0.5"
                      >
                        {point.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {interruptedSession?.track === currentTrack ? (
                <button
                  type="button"
                  id="btn-resume-interrupted-session"
                  onClick={onResumeInterruptedSession}
                  className="btn-interactive bg-medusa-accent hover:opacity-95 text-[#4A3B00] px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-subtle flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                >
                  <span className="material-symbols-outlined text-[18px]">play_circle</span>
                  <span>
                    Continuar aula ·{' '}
                    {Math.max(0, Math.round((lesson.actualDurationSeconds - interruptedSession.currentTimeSeconds) / 60))} min restantes
                  </span>
                </button>
              ) : isPrimaryFaculdadeDiscipline ? (
                <button
                  type="button"
                  id="btn-start-study-session"
                  onClick={() => onStartStudy(qaSimulateFailure)}
                  className={`btn-interactive ${accent.solidBg} hover:opacity-95 ${accent.solidText} px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-subtle flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none`}
                >
                  <span className="material-symbols-outlined text-[18px]">play_circle</span>
                  <span>
                    {isSessionCompleted ? `Iniciar Nova Sessão de ${trackDef.name}` : `Continuar Sessão de ${trackDef.name}`}
                  </span>
                </button>
              ) : (
                <span
                  id="btn-start-study-session-unavailable"
                  title="Sessão de estudo completa ainda não disponível para esta disciplina"
                  className="text-[12px] font-mono text-text-muted bg-surface-secondary/60 border border-border/50 px-4 py-2.5 rounded-full flex items-center gap-2 cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[16px]">hourglass_empty</span>
                  Sessão ainda não disponível
                </span>
              )}
            </div>
          </div>

          {/* Métricas da Trilha — Progresso Real (Local State). "Tempo Nominal do Ciclo" foi
              removido (Refinamento Visual §6.1): era "28h 00m" fixo, idêntico nas 3 trilhas,
              não ajudava nenhuma decisão — puro ruído decorativo. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/60">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-text-muted">
                Progresso Curricular
              </span>
              <div className="text-base font-bold text-text-primary tabular-nums">
                {completedCount}/{trackItems.length} módulos
              </div>
              <p className="text-[11px] text-[#1B502C] dark:text-medusa-support font-medium">
                {progressPercent}% completado
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-text-muted">
                Status da Sessão
              </span>
              <div className="text-base font-bold text-text-primary">
                {isSessionCompleted ? 'Revisão Recomendada' : 'Pronto para Estudo'}
              </div>
              <p className="text-[11px] text-text-muted">
                {isSessionCompleted ? 'Veja a próxima revisão ao lado' : 'Sessão imediata'}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-text-muted">
                Próxima Revisão
              </span>
              <div className="text-base font-bold text-text-primary">
                {trackDef.nextReviewSuggestion}
              </div>
              <p className="text-[11px] text-text-muted">Sugestão de ciclo de revisão</p>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/*
        ================= 3. CORPO ESPECÍFICO DA TRILHA =================
        Cada trilha tem sua própria arquitetura de informação — Inglês é um curso modular
        (módulo→aulas), ENEM é planejamento temporal (cronograma) e Faculdade é organização
        acadêmica (disciplinas→conteúdo). Nenhuma trilha reaproveita a IA das outras.
      */}
      <div key={`${currentTrack}-body`} className={trackContentMotionClass}>
        {currentTrack === 'ingles' && <EnglishHub trackDef={trackDef} trackItems={trackItems} />}
        {currentTrack === 'vestibular' && (
          <EnemHub
            trackDef={trackDef}
            trackItems={trackItems}
            onStartStudy={() => onStartStudy(qaSimulateFailure)}
          />
        )}
        {currentTrack === 'faculdade' && <FaculdadeHub trackDef={trackDef} trackItems={trackItems} />}
      </div>

      {/* ================= 4. CONTROLE DE QA/DESENVOLVEDOR (NUNCA RENDERIZADO SEM ?qa=1) ================= */}
      {isQaModeEnabled && (
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
            Validação de erros recuperáveis e alternância de trilhas
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
      )}
    </div>
  );
}
