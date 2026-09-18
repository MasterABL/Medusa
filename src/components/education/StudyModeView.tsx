'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LiveSummaryPoint, StudyNote } from './types';
import { INITIAL_SUMMARY_POINTS, LESSON_FIXTURE } from './educationFixtures';

interface StudyModeViewProps {
  onCompleteLesson: () => void;
  onOpenTutor: (timestamp: number) => void;
  notes: StudyNote[];
  onSaveNote: (note: StudyNote) => void;
}

export function StudyModeView({
  onCompleteLesson,
  onOpenTutor,
  notes,
  onSaveNote,
}: StudyModeViewProps) {
  // Player state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(320); // 05:20
  const [duration] = useState(2700); // 45 min
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.25 | 1.5>(1);
  const [activeTab, setActiveTab] = useState<'summary' | 'notes'>('summary');
  const [newNoteText, setNewNoteText] = useState('');
  const [noteSavedFeedback, setNoteSavedFeedback] = useState<string | null>(null);
  const [summaryPoints, setSummaryPoints] = useState<LiveSummaryPoint[]>(
    INITIAL_SUMMARY_POINTS.slice(0, 3)
  );

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
    if (currentTime > 360 && summaryPoints.length < INITIAL_SUMMARY_POINTS.length) {
      setSummaryPoints(INITIAL_SUMMARY_POINTS);
    }
  }, [currentTime, summaryPoints.length]);

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
      text: `Ponto de atenção marcado em ${formatTime(currentTime)}: revisão de conceitos de superposição.`,
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

  return (
    <div
      id="study-mode-container"
      className="study-stage-enter w-full flex flex-col gap-5 max-w-7xl mx-auto pb-14"
    >
      {/* Topo da Sessão de Estudo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 px-2.5 py-0.5 rounded-full border border-[#71DBD2]/30">
              Modo Estudo Ativo
            </span>
            <span className="text-text-muted/40">•</span>
            <span className="text-[11px] font-mono text-text-muted">
              {LESSON_FIXTURE.module}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            {LESSON_FIXTURE.discipline} · {LESSON_FIXTURE.topic}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="btn-trigger-tutor"
            onClick={() => onOpenTutor(currentTime)}
            className="btn-interactive bg-surface hover:bg-surface-secondary border border-border/70 text-text-secondary hover:text-text-primary px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all shadow-subtle flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
          >
            <span className="material-symbols-outlined text-[16px] text-medusa-primary">
              neurology
            </span>
            <span>Tutor &amp; Voz</span>
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

      {/* Palco Central: ~68% Vídeo Player Interativo + ~32% Resumo Vivo / Notas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================= COLUNA PRINCIPAL: VÍDEO PLAYER INTERATIVO (68%) ================= */}
        <section
          aria-label="Vídeo da Aula"
          className="lg:col-span-8 flex flex-col bg-surface rounded-2xl border border-border/70 shadow-calm overflow-hidden"
        >
          {/* Canvas / Visualizador da Aula (Fixture interativo calibrado) */}
          <div className="relative aspect-video w-full bg-[#0E1311] flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none">
            {/* Visualizador de Onda Harmônica Senoidal */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
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
            </div>

            {/* Badge Superior do Vídeo */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white text-[11px] font-mono">
                <span className="w-2 h-2 rounded-full bg-medusa-primary living-pulse" />
                <span>Mecânica Ondulatória · Aula 03</span>
              </div>
              <span className="text-[11px] font-mono text-white/80 bg-black/50 px-2.5 py-0.5 rounded border border-white/10">
                HD 1080p
              </span>
            </div>

            {/* Centro do Palco: Título conceitual + Botão Play/Pause gigante */}
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
              <span className="text-white text-[13px] font-medium tracking-wide drop-shadow">
                {currentTime < 480
                  ? 'Conceito: Perturbação Mecânica e Transporte de Energia'
                  : 'Dedução da Equação v = λ · f em Meios Homogêneos'}
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
                Aula Teórica: Dinâmica de Ondas em Cordas e Fluidos
              </h3>
              <p className="text-[12px] text-text-secondary leading-relaxed">
                Fundamentação analítica da propagação mecânica, equação fundamental e interferência.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] font-mono text-text-muted bg-surface-secondary px-2.5 py-1 rounded border border-border/60">
                Fixture Interativo Verificado
              </span>
            </div>
          </div>
        </section>

        {/* ================= COLUNA LATERAL: RESUMO VIVO & NOTAS (32%) ================= */}
        <aside
          aria-label="Resumo Vivo e Anotações"
          className="study-summary-enter lg:col-span-4 flex flex-col bg-surface rounded-2xl border border-border/70 shadow-calm overflow-hidden min-h-[460px]"
        >
          {/* Alternador de Abas (Resumo Vivo vs Notas) */}
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
              <span>Resumo Vivo ({summaryPoints.length})</span>
            </button>

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

          {/* Conteúdo da Aba: Resumo Vivo */}
          {activeTab === 'summary' && (
            <div className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto max-h-[500px]">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-text-muted pb-1 border-b border-border/50">
                <span>Conceitos Chave Gerados</span>
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
            <div className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto max-h-[500px]">
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
  );
}
