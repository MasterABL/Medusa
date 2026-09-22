'use client';

import React, { useState, useEffect } from 'react';
import { StudyTrack, TrackDefinition, LiveSummaryPoint, StudyNote } from './types';

interface StudyModeViewProps {
  trackDef: TrackDefinition;
  onCompleteLesson: () => void;
  onOpenTutor: (timestamp: number) => void;
  notes: StudyNote[];
  onSaveNote: (note: StudyNote) => void;
  onSelectTrack?: (track: StudyTrack) => void;
}

export function StudyModeView({
  trackDef,
  onCompleteLesson,
  onOpenTutor,
  notes,
  onSaveNote,
  onSelectTrack,
}: StudyModeViewProps) {
  const { lesson, summaryPoints: initialSummaryPoints, voiceEmphasis } = trackDef;
  const isIngles = trackDef.id === 'ingles';
  const isFaculdade = trackDef.id === 'faculdade';

  // Player state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(240); // 04:00
  const duration = lesson.actualDurationSeconds;
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.25 | 1.5>(1);
  const [activeTab, setActiveTab] = useState<'summary' | 'notes' | 'vocabulary'>('summary');
  // Somente Inglês: alterna a área principal entre Vídeo / Aula IA / Dividido (seção 4 do produto).
  const [contentMode, setContentMode] = useState<'video' | 'ai-lesson' | 'split'>('video');
  const [newNoteText, setNewNoteText] = useState('');
  const [noteSavedFeedback, setNoteSavedFeedback] = useState<string | null>(null);
  const [summaryPoints, setSummaryPoints] = useState<LiveSummaryPoint[]>(
    initialSummaryPoints.slice(0, 3)
  );

  // Sincronizar summary points quando a trilha mudar
  useEffect(() => {
    setSummaryPoints(initialSummaryPoints);
    setCurrentTime(240);
  }, [trackDef.id, initialSummaryPoints]);

  // Player timer loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, duration]);

  // Simulação de entrada orgânica de novo tópico no resumo vivo às 06:00
  useEffect(() => {
    if (currentTime > 360 && summaryPoints.length < initialSummaryPoints.length) {
      setSummaryPoints(initialSummaryPoints);
    }
  }, [currentTime, summaryPoints.length, initialSummaryPoints]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(Number(e.target.value));
  };

  const handleSkip = (offset: number) => {
    setCurrentTime((prev) => Math.max(0, Math.min(duration, prev + offset)));
  };

  const handleCycleSpeed = () => {
    if (playbackSpeed === 1) setPlaybackSpeed(1.25);
    else if (playbackSpeed === 1.25) setPlaybackSpeed(1.5);
    else setPlaybackSpeed(1);
  };

  const handleBookmarkCurrentPoint = () => {
    const note: StudyNote = {
      id: `note-${Date.now()}`,
      timestamp: currentTime,
      formattedTime: formatTime(currentTime),
      text: `Marcador em ${formatTime(currentTime)} · ${lesson.topic}: revisão do conceito ativo.`,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    onSaveNote(note);
    setNoteSavedFeedback(`Marcador salvo em ${formatTime(currentTime)}`);
    setTimeout(() => setNoteSavedFeedback(null), 2400);
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const note: StudyNote = {
      id: `note-${Date.now()}`,
      timestamp: currentTime,
      formattedTime: formatTime(currentTime),
      text: newNoteText.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    onSaveNote(note);
    setNewNoteText('');
    setNoteSavedFeedback(`Nota salva com timestamp ${formatTime(currentTime)}`);
    setTimeout(() => setNoteSavedFeedback(null), 2500);
  };

  // Rótulo "ENEM" por instrução explícita de produto — ver mesma nota em EducationDashboard.tsx.
  const tracks: { id: StudyTrack; label: string }[] = [
    { id: 'faculdade', label: 'Faculdade' },
    { id: 'ingles', label: 'Inglês' },
    { id: 'vestibular', label: 'ENEM' },
  ];

  return (
    <div
      id="study-mode-container"
      className="study-stage-enter w-full flex flex-col gap-4 max-w-7xl mx-auto pb-14"
    >
      {/* Topo da Sessão de Estudo & Contexto da Trilha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 px-2.5 py-0.5 rounded-full border border-[#71DBD2]/30">
              Modo Estudo Ativo · Foco Zen
            </span>
            <span className="text-text-muted/40">•</span>
            <span className="text-[11px] font-mono text-text-muted">
              {lesson.module}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            {lesson.discipline} · {lesson.topic}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Seletor Discreto de Trilha no Study Mode (Alternância Sem Reload) */}
          {onSelectTrack && (
            <div className="flex items-center gap-1 p-0.5 bg-surface-secondary/70 border border-border/60 rounded-xl text-[11px] font-mono">
              {tracks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  id={`study-track-${t.id}`}
                  onClick={() => onSelectTrack(t.id)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    trackDef.id === t.id
                      ? 'bg-surface font-semibold text-text-primary shadow-subtle'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  title={`Alternar para trilha ${t.label}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            id="btn-trigger-tutor"
            onClick={() => onOpenTutor(currentTime)}
            className="btn-interactive bg-surface hover:bg-surface-secondary border border-border/70 text-text-secondary hover:text-text-primary px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all shadow-subtle flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
          >
            <span className="material-symbols-outlined text-[16px] text-medusa-primary">
              {trackDef.id === 'ingles' ? 'record_voice_over' : 'neurology'}
            </span>
            <span>{trackDef.id === 'ingles' ? 'Tutor & Prática Oral' : 'Tutor & Dúvidas'}</span>
          </button>

          <button
            type="button"
            id="btn-complete-lesson-trigger"
            onClick={onCompleteLesson}
            className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all shadow-subtle flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
          >
            <span>Concluir Aula</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/*
        Conteúdo dependente da trilha (objetivo + palco) é remontado quando `trackDef.id` muda,
        reutilizando a própria animação de entrada (`study-stage-enter`, já existente) como a
        transição de troca de trilha — sem inventar um segundo sistema de motion. O cabeçalho
        acima (título + seletor de trilha + ações) permanece estável, então a sensação é de
        "o mesmo Study Mode reorganiza o conteúdo", não de duas telas diferentes.
      */}
      <div key={trackDef.id} id="track-content-region" className="study-stage-enter flex flex-col gap-4">
      {/* Faixa Contextual: Objetivo da Sessão */}
      <div
        id="session-objective-banner"
        className="bg-surface rounded-xl p-3 sm:p-4 border border-border/70 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[12px]"
      >
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-medusa-primary/20 text-[#18534B] dark:text-[#71DBD2] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
            <span className="material-symbols-outlined text-[15px]">flag</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-text-muted tracking-wider block">
              Objetivo da Sessão ({trackDef.name})
            </span>
            <p className="text-text-secondary font-medium leading-relaxed">
              {lesson.sessionObjective}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
          <span className="text-[10px] font-mono text-text-muted bg-surface-secondary px-2.5 py-1 rounded border border-border/60">
            {lesson.estimatedDuration} · Aula Teórica + Prática
          </span>
        </div>
      </div>

      {/* Palco Central: ~50% Conteúdo da Aula + ~50% Companheiro da Sessão (Resumo/Vocabulário/
          Notas/Tutor) — equilíbrio explícito entre as duas colunas, igual nas 3 trilhas. A coluna
          estica para usar a altura disponível (evita o vazio abaixo do player). */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* ================= COLUNA PRINCIPAL: PLAYER DE CONTEÚDO (~50%) ================= */}
        <section
          id="lesson-stage"
          aria-label="Conteúdo da Aula"
          className="flex flex-col bg-surface rounded-2xl border border-border/70 shadow-calm overflow-hidden"
        >
          {/* Somente Inglês: alternador Vídeo / Aula IA / Dividido — controla o QUE aparece no
              palco, sem alterar a proporção 50/50 do Study Mode (igual nas 3 trilhas). */}
          {isIngles && (
            <div className="flex items-center gap-1 p-2 border-b border-border/60 bg-surface-secondary/40">
              {([
                { id: 'video', label: 'Vídeo', icon: 'smart_display' },
                { id: 'ai-lesson', label: 'Aula IA', icon: 'auto_awesome' },
                { id: 'split', label: 'Dividido', icon: 'vertical_split' },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  id={`btn-content-mode-${m.id}`}
                  onClick={() => setContentMode(m.id)}
                  className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none ${
                    contentMode === m.id
                      ? 'bg-surface text-text-primary shadow-subtle font-semibold'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  aria-pressed={contentMode === m.id}
                >
                  <span className="material-symbols-outlined text-[15px]">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          )}
          {/* Canvas / Visualizador Adaptado à Trilha — flex-1 preenche a altura do palco.
              Achado de auditoria: a escada de min-h fixos parava em 640px no desktop, então em
              telas mais altas (1440×1200 testado) sobravam ~240px de espaço vazio abaixo do
              player em vez de a aula continuar sendo a protagonista. O termo `calc(100vh-...)`
              cresce além de 640px quando o viewport é mais alto que ~960px, sem reduzir o piso
              já testado em telas mais baixas (max() nunca fica abaixo dos valores existentes). */}
          <div
            className={`relative w-full flex-1 min-h-[380px] sm:min-h-[460px] lg:min-h-[560px] xl:min-h-[max(640px,calc(100vh-320px))] flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none ${
              isFaculdade ? 'bg-[#0B1120]' : 'bg-[#0E1311]'
            }`}
          >
            {/* Visualização de Fundo Dinâmica por Trilha/Modo — Dividido mostra os dois lados
                lado a lado (vídeo à esquerda, Aula IA à direita), como uma única estação de
                estudo, não dois cartões independentes. */}
            {isIngles && contentMode === 'split' ? (
              <div className="absolute inset-0 grid grid-cols-2 divide-x divide-white/10">
                <div className="flex items-center justify-center opacity-35 pointer-events-none">
                  <div className="w-full max-w-[180px] flex items-center justify-center gap-1 h-16">
                    {[24, 48, 72, 36, 84, 60, 40, 80].map((h, i) => (
                      <div
                        key={i}
                        style={{ height: isPlaying ? `${h}%` : '20%' }}
                        className="w-1 bg-[#71DBD2] rounded-full transition-all duration-300 ease-out"
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-center opacity-35 pointer-events-none">
                  <span className="material-symbols-outlined text-[64px] text-[#D0EAA3] living-pulse">auto_awesome</span>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-35 pointer-events-none">
                {isIngles && contentMode === 'ai-lesson' ? (
                  // Aula IA — visual distinto do modo Vídeo, honestamente rotulado (fixture curada, não geração real)
                  <span className="material-symbols-outlined text-[96px] text-[#D0EAA3] living-pulse">auto_awesome</span>
                ) : isIngles ? (
                  // Visualizador de Espectro de Voz e Diálogo para Inglês (Modo Vídeo)
                  <div className="w-full max-w-lg flex items-center justify-center gap-1.5 h-24">
                    {[24, 48, 72, 36, 84, 96, 60, 40, 80, 52, 90, 68, 44, 30, 65, 85, 40, 60].map((h, i) => (
                      <div
                        key={i}
                        style={{ height: isPlaying ? `${h}%` : '20%' }}
                        className="w-1.5 bg-[#71DBD2] rounded-full transition-all duration-300 ease-out"
                      />
                    ))}
                  </div>
                ) : isFaculdade ? (
                  // Lousa: Oscilação Harmônica (MHS) para Faculdade / Física II
                  <svg className="w-full h-32 stroke-[#71DBD2]" fill="none" viewBox="0 0 800 120">
                    <path
                      d="M0,60 Q100,10 200,60 T400,60 T600,60 T800,60"
                      strokeWidth="3"
                      className={isPlaying ? 'living-pulse' : ''}
                    />
                    <path
                      d="M0,60 Q100,110 200,60 T400,60 T600,60 T800,60"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                  </svg>
                ) : (
                  // Propagação de Ondas & Aplicações do ENEM para Vestibular
                  <svg className="w-full h-32 stroke-[#71DBD2]" fill="none" viewBox="0 0 800 120">
                    <path
                      d="M0,60 C150,0 250,120 400,60 C550,0 650,120 800,60"
                      strokeWidth="2.5"
                      className={isPlaying ? 'living-pulse' : ''}
                    />
                    <line x1="0" y1="60" x2="800" y2="60" stroke="#71DBD2" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                  </svg>
                )}
              </div>
            )}

            {/* Badge Superior do Palco */}
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white text-[11px] font-mono">
                <span className="w-2 h-2 rounded-full bg-medusa-primary living-pulse" />
                <span>{lesson.discipline} · {trackDef.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {voiceEmphasis && (
                  <span className="text-[10px] font-mono text-[#D0EAA3] bg-black/60 px-2.5 py-0.5 rounded border border-[#D0EAA3]/30 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">mic</span>
                    <span>Prática Oral</span>
                  </span>
                )}
              </div>
            </div>

            {/* Centro do Palco: Título conceitual + Botão Play/Pause */}
            <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center gap-3">
              <button
                type="button"
                id="btn-video-center-toggle"
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? 'Pausar Vídeo' : 'Iniciar Vídeo'}
                className="btn-interactive w-14 h-14 rounded-full bg-medusa-primary/90 hover:bg-medusa-primary text-[#1C2420] flex items-center justify-center shadow-lg transition-transform active:scale-95"
              >
                <span className="material-symbols-outlined text-[32px]">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <span className="text-white text-[13px] font-medium tracking-wide drop-shadow max-w-md">
                {isIngles
                  ? (currentTime < 480
                    ? 'Turno de Conversação: Perguntas Naturais e de Acompanhamento'
                    : 'Foco em Fluência: Phrasal Verbs, Reduções e Suavização Educada')
                  : isFaculdade
                  ? (currentTime < 480
                    ? 'Dedução: Equação Diferencial e Força Restauradora F = -kx'
                    : 'Espaço de Fase: Trajetória Elíptica e Conservação de Energia')
                  : (currentTime < 480
                    ? 'Matriz ENEM: Relação v = λ · f e Invariância da Frequência da Fonte'
                    : 'Distratores Recorrentes: Refração e Fenômenos Ondulatórios no Cotidiano')}
              </span>
            </div>

            {/* Feedback temporário de Nota Salva */}
            {noteSavedFeedback && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-surface/95 text-text-primary px-4 py-1.5 rounded-full border border-medusa-primary/50 shadow-calm text-[11px] font-mono flex items-center gap-1.5 animate-fadeRise">
                <span className="material-symbols-outlined text-medusa-primary text-[14px]">
                  bookmark_added
                </span>
                <span>{noteSavedFeedback}</span>
              </div>
            )}

            {/* Barra de Controles Inferior */}
            <div className="relative z-10 flex flex-col gap-2 bg-black/70 backdrop-blur-md p-3 rounded-xl border border-white/10">
              {/* Timeline scrubber */}
              <input
                type="range"
                id="video-scrubber"
                min={0}
                max={duration}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#71DBD2]"
                aria-label="Controle de Linha do Tempo do Vídeo"
              />

              <div className="flex items-center justify-between text-white text-[12px]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-video-play-pause"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-1 hover:text-medusa-primary transition-colors focus:outline-none"
                    title={isPlaying ? 'Pausar' : 'Reproduzir'}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isPlaying ? 'pause' : 'play_arrow'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSkip(-10)}
                    className="p-1 hover:text-medusa-primary transition-colors focus:outline-none"
                    title="Voltar 10 segundos"
                  >
                    <span className="material-symbols-outlined text-[18px]">replay_10</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSkip(10)}
                    className="p-1 hover:text-medusa-primary transition-colors focus:outline-none"
                    title="Avançar 10 segundos"
                  >
                    <span className="material-symbols-outlined text-[18px]">forward_10</span>
                  </button>

                  <div className="text-[11px] font-mono text-white/90 tabular-nums ml-2">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-bookmark-point"
                    onClick={handleBookmarkCurrentPoint}
                    className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-mono flex items-center gap-1 transition-colors"
                    title="Marcar ponto atual na sessão"
                  >
                    <span className="material-symbols-outlined text-[14px]">bookmark</span>
                    <span>Marcar ponto</span>
                  </button>

                  <button
                    type="button"
                    id="btn-cycle-speed"
                    onClick={handleCycleSpeed}
                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[11px] font-mono font-semibold transition-colors"
                    title="Velocidade de reprodução"
                  >
                    {playbackSpeed}x
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé descritivo do vídeo */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border-t border-border/60">
            <div className="space-y-0.5">
              <h3 className="text-[14px] font-semibold text-text-primary">
                {lesson.discipline} · {lesson.topic}
              </h3>
              <p className="text-[12px] text-text-secondary leading-relaxed">
                {lesson.sessionObjective}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] font-mono text-text-muted bg-surface-secondary px-2.5 py-1 rounded border border-border/60">
                Aula selecionada para você · {trackDef.name}
              </span>
            </div>
          </div>
        </section>

        {/* ================= COLUNA COMPANHEIRA: ROTEIRO, RESUMO, VOCABULÁRIO & NOTAS (~50%) ================= */}
        <aside
          aria-label="Companheiro da Sessão de Estudo"
          className="study-summary-enter flex flex-col bg-surface rounded-2xl border border-border/70 shadow-calm overflow-hidden min-h-[480px]"
        >
          {/* Roteiro da Sessão — visão rápida do que será coberto, igual nas 3 trilhas */}
          <div id="session-roteiro" className="px-4 pt-3.5 pb-2.5 border-b border-border/60">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Roteiro da sessão</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {initialSummaryPoints.slice(0, 4).map((point) => (
                <span
                  key={point.id}
                  className="text-[11px] text-text-secondary bg-surface-secondary/60 border border-border/50 rounded-full px-2.5 py-0.5"
                >
                  {point.title}
                </span>
              ))}
            </div>
          </div>

          {/* Avisos — somente Faculdade, simples e pontuais (não uma parede de cards) */}
          {isFaculdade && trackDef.notices && trackDef.notices.length > 0 && (
            <div id="session-notices" className="px-4 pt-3 pb-2.5 border-b border-border/60 flex flex-col gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Avisos</span>
              {trackDef.notices.map((notice, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[12px] text-text-secondary">
                  <span className="material-symbols-outlined text-[14px] text-medusa-primary mt-0.5">campaign</span>
                  <span>{notice}</span>
                </div>
              ))}
            </div>
          )}

          {/* Alternador de Abas (Resumo Vivo / Vocabulário / Notas) */}
          <div className="flex items-center border-b border-border/70 bg-surface-secondary/40 p-1.5">
            <button
              type="button"
              id="tab-summary"
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                activeTab === 'summary'
                  ? 'bg-surface text-text-primary shadow-subtle'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">notes</span>
              <span>Resumo ({summaryPoints.length})</span>
            </button>

            {isIngles && trackDef.vocabulary && (
              <button
                type="button"
                id="tab-vocabulary"
                onClick={() => setActiveTab('vocabulary')}
                className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                  activeTab === 'vocabulary'
                    ? 'bg-surface text-text-primary shadow-subtle'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">translate</span>
                <span>Vocabulário ({trackDef.vocabulary.length})</span>
              </button>
            )}

            <button
              type="button"
              id="tab-notes"
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                activeTab === 'notes'
                  ? 'bg-surface text-text-primary shadow-subtle'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              <span>Notas ({notes.length})</span>
            </button>
          </div>

          {/* Conteúdo da Aba: Vocabulário (somente Inglês) */}
          {activeTab === 'vocabulary' && trackDef.vocabulary && (
            <div className="p-4 flex-1 flex flex-col gap-2.5 overflow-y-auto">
              {trackDef.vocabulary.map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-xl bg-surface-secondary/60 border border-border/60 flex flex-col gap-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-text-primary">{v.term}</span>
                  </div>
                  <span className="text-[12px] text-text-secondary">{v.translation}</span>
                  <span className="text-[11px] text-text-muted italic">&ldquo;{v.example}&rdquo;</span>
                </div>
              ))}
            </div>
          )}

          {/* Conteúdo da Aba: Resumo Vivo */}
          {activeTab === 'summary' && (
            <div className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-text-muted pb-1 border-b border-border/50">
                <span>Pontos Chave · {trackDef.name}</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary living-pulse" />
                  <span>Sincronizado</span>
                </span>
              </div>

              {summaryPoints.map((point) => (
                <div
                  key={point.id}
                  className="summary-item-rise p-3 rounded-xl bg-surface-secondary/60 border border-border/60 flex flex-col gap-1 hover:border-medusa-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-text-primary font-semibold text-[13px]">
                      <span className="material-symbols-outlined text-[16px] text-medusa-primary">
                        {point.icon}
                      </span>
                      <span>{point.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border/50 tabular-nums">
                      {point.formattedTime}
                    </span>
                  </div>
                  <p className="text-[12px] text-text-secondary leading-relaxed pl-5">
                    {point.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Conteúdo da Aba: Notas Pessoais Contextuais */}
          {activeTab === 'notes' && (
            <div className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto">
              <form onSubmit={handleCreateNote} className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                  <span>Nota no timestamp atual:</span>
                  <span className="font-semibold text-text-primary bg-surface-secondary px-2 py-0.5 rounded border border-border/60">
                    {formatTime(currentTime)}
                  </span>
                </div>
                <textarea
                  id="note-input-textarea"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Escreva sua reflexão ou anotação conceitual..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-surface-secondary/70 border border-border/70 text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-medusa-primary/80 focus:ring-1 focus:ring-medusa-primary/50 transition-all resize-none"
                />
                <button
                  type="submit"
                  id="btn-save-note"
                  disabled={!newNoteText.trim()}
                  className="btn-interactive self-end bg-medusa-primary hover:opacity-95 text-[#1C2420] disabled:opacity-40 disabled:pointer-events-none px-3.5 py-1 rounded-lg text-[11px] font-semibold transition-all shadow-subtle flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">save</span>
                  <span>Salvar Nota</span>
                </button>
              </form>

              <div className="h-px bg-border/60 my-1" />

              <div className="flex flex-col gap-2 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-[12px] text-text-muted italic text-center py-6">
                    Nenhuma nota registrada nesta sessão ainda.
                  </p>
                ) : (
                  notes.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-xl bg-surface-secondary/50 border border-border/50 flex flex-col gap-1 text-[12px]"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] text-text-muted">
                        <span className="font-semibold text-text-primary">
                          Momento: {n.formattedTime}
                        </span>
                        <span>{n.createdAt}</span>
                      </div>
                      <p className="text-text-secondary">{n.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
      </div>
    </div>
  );
}
