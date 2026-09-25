'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrackDefinition, LiveSummaryPoint, StudyNote, LessonViewMode } from './types';
import { LessonWrittenContent } from './LessonWrittenContent';
import { useEducationPanel } from '@/context/EducationPanelContext';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { getTrackAccent } from './trackAccent';
import { playFeedback } from '@/lib/audioFeedback';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';

interface StudyModeViewProps {
  trackDef: TrackDefinition;
  onCompleteLesson: () => void;
  onOpenTutor: (timestamp: number) => void;
  notes: StudyNote[];
  onSaveNote: (note: StudyNote) => void;
  /**
   * Interromper a aula: salva o instante atual (segundos) e o modo de composição ativo, e devolve
   * o controle para o dashboard de Educação — reaproveita a MESMA máquina de estados de sessão já
   * existente em EducationContainer (dashboard/loading/ready/study/...), sem criar um segundo
   * mecanismo de sessão paralelo.
   *
   * BUG REAL corrigido (Round 7 §14): antes só o instante em segundos era salvo — ao retomar, a
   * aula sempre reabria em "Aula + Resumo" (o valor inicial de `lessonViewMode` abaixo), mesmo que
   * a interrupção tivesse acontecido em "Resumo". `onInterruptLesson` agora also devolve o modo,
   * e `initialViewMode` (abaixo) o restaura — retomar preserva posição E composição.
   */
  onInterruptLesson: (currentTimeSeconds: number, viewMode: LessonViewMode) => void;
  /** Retomar de onde parou (ver "Continuar aula" no hero do dashboard) — 240s (04:00) por padrão. */
  initialTimeSeconds?: number;
  /** Modo de composição a restaurar ao retomar uma aula interrompida (Round 7 §14). */
  initialViewMode?: LessonViewMode;
}

export function StudyModeView({
  trackDef,
  onCompleteLesson,
  onOpenTutor,
  notes,
  onSaveNote,
  onInterruptLesson,
  initialTimeSeconds = 240,
  initialViewMode = 'aula-resumo',
}: StudyModeViewProps) {
  const { lesson, summaryPoints: initialSummaryPoints, voiceEmphasis } = trackDef;
  const isIngles = trackDef.id === 'ingles';
  const isFaculdade = trackDef.id === 'faculdade';
  const accent = getTrackAccent(trackDef.id);
  const { openCronogramaOverlay } = useEducationPanel();

  // Player state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(initialTimeSeconds);
  const [showInterruptConfirm, setShowInterruptConfirm] = useState(false);
  useEscapeKey(showInterruptConfirm, () => setShowInterruptConfirm(false));
  const duration = lesson.actualDurationSeconds;
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.25 | 1.5>(1);
  const [activeTab, setActiveTab] = useState<'summary' | 'notes' | 'vocabulary'>('summary');
  // As 3 trilhas: controla a COMPOSIÇÃO da tela da aula — quanto espaço o palco ocupa e se a
  // região lateral está presente. Não controla "o que" toca no palco (isso não muda entre os
  // modos); controla apenas a proporção e a presença/domínio de cada lado.
  //
  // Round 7 §6/§11/§20: unificado nas 3 trilhas (era só Inglês/Faculdade; ENEM não tinha modos).
  // O antigo modo "Dividido"/"Tutor ao Vivo" (só Inglês) foi REMOVIDO — o Tutor virou uma ação
  // contextual acionada pelo botão "Tutor & Prática Oral"/"Tutor & Dúvidas" do cabeçalho (abre o
  // drawer overlay já existente), nunca um modo de composição que substitui o conteúdo da aula.
  // As 3 trilhas agora compartilham exatamente o mesmo conjunto: Aula / Aula + Resumo / Resumo.
  const [lessonViewMode, setLessonViewMode] = useState<LessonViewMode>(initialViewMode);
  const hasModeSwitcher = true;
  // Modo "Aula" (foco total no vídeo) — usado para recolher chrome redundante ao redor do palco
  // (Refinamento Visual §7.2: o vídeo não pode exigir rolar a página para ver os controles).
  const isAulaFocusMode = lessonViewMode === 'aula';
  // Modo "Resumo" (Round 5 §6, Modo B / Round 7 §6-§9) — o inverso do "Aula": o palco de vídeo
  // recolhe e a AULA ESCRITA (LessonWrittenContent) ocupa a tela inteira. Chamado de "Resumo" (não
  // "aula gerada por IA") porque o conteúdo aqui é fixture estática desta tela, não uma geração de
  // IA em tempo real; nomear como IA seria apresentar como real algo que não é (Round 5 §27).
  const isResumoFocusMode = lessonViewMode === 'resumo';
  const [newNoteText, setNewNoteText] = useState('');
  const [noteSavedFeedback, setNoteSavedFeedback] = useState<string | null>(null);
  const [summaryPoints, setSummaryPoints] = useState<LiveSummaryPoint[]>(
    initialSummaryPoints.slice(0, 3)
  );

  // Round 6 §8: a troca de trilha em pleno Study Mode foi removida (o contexto da sessão agora é
  // fixo — ver header abaixo e EducationContainer.tsx). `trackDef.id` nunca muda enquanto este
  // componente permanece montado, então o efeito de resync que existia aqui (guardado por um
  // `useRef` comparando a identidade da trilha) ficou morto e foi removido — cada trilha nova
  // já monta um `StudyModeView` do zero, com seus próprios valores iniciais.

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

  return (
    <div
      id="study-mode-container"
      className={`study-stage-enter w-full flex flex-col gap-4 pb-8 transition-all duration-300 ${
        isAulaFocusMode ? 'max-w-none px-0 sm:px-2' : 'max-w-7xl mx-auto'
      }`}
    >
      {/* Topo da Sessão de Estudo & Contexto da Trilha — enxuto (Round 6 §10): prioriza
          disciplina/tópico/estado/ação. Removidos o badge "Modo Estudo Ativo · Foco Zen" e o
          rótulo cru de `lesson.module` (ex.: "Caderno de Ouro ENEM · Habilidades 01 a 04") —
          metadata de organização interna da fixture, sem valor de decisão pro usuário. O estado
          agora é um indicador compacto com a cor de identidade da trilha (Round 6 §2.3/§2.1). */}
      {/* Topo da Sessão de Estudo & Contexto da Trilha — STICKY (Human Visual Gate 2 §5/§6):
          permanece acessível em qualquer profundidade de scroll (scroll 0, 500, 1500), sem o
          usuário precisar rolar tudo para cima para interromper a aula. */}
      <div className="sticky-study-header -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle rounded-b-xl">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${accent.solidBg} living-pulse`} />
            <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${accent.text}`}>
              {trackDef.name} · Em estudo
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary">
            {lesson.discipline} · {lesson.topic}
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="btn-interrupt-lesson"
            onClick={() => {
              playFeedback('open');
              setShowInterruptConfirm(true);
            }}
            title="Salvar progresso e sair da aula"
            className="btn-interactive group bg-surface hover:bg-surface-secondary border border-border/70 text-text-secondary hover:text-medusa-alert px-3 py-1.5 rounded-full text-[12px] font-medium transition-all shadow-subtle flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
          >
            <AnimatedIcon name="logout" size={15} />
            <span>Interromper aula</span>
          </button>

          {/* Somente ENEM: abre o cronograma em contexto */}
          {trackDef.id === 'vestibular' && (
            <button
              type="button"
              id="btn-open-cronograma-from-study-mode"
              onClick={openCronogramaOverlay}
              className="btn-interactive group bg-surface hover:bg-surface-secondary border border-border/70 text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-full text-[12px] font-medium transition-all shadow-subtle flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
            >
              <AnimatedIcon name="calendar" size={15} className="text-[#8A6D00] dark:text-medusa-accent" />
              <span>Ver Cronograma</span>
            </button>
          )}

          <button
            type="button"
            id="btn-trigger-tutor"
            onClick={() => onOpenTutor(currentTime)}
            className="btn-interactive group bg-surface hover:bg-surface-secondary border border-border/70 text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-full text-[12px] font-medium transition-all shadow-subtle flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
          >
            <AnimatedIcon
              name={trackDef.id === 'ingles' ? 'record_voice_over' : 'tutor'}
              size={15}
              className="text-medusa-primary"
            />
            <span>{trackDef.id === 'ingles' ? 'Tutor & Prática Oral' : 'Tutor & Dúvidas'}</span>
          </button>

          <button
            type="button"
            id="btn-complete-lesson-trigger"
            onClick={onCompleteLesson}
            className="btn-interactive group bg-medusa-primary hover:opacity-95 text-[#1C2420] px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all shadow-subtle flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
          >
            <span>Concluir Aula</span>
            <AnimatedIcon name="arrow_forward" size={15} />
          </button>
        </div>
      </div>

      {/*
        Round 6 §8: o contexto de trilha agora é FIXO durante a sessão — trocar de trilha só é
        possível a partir do Hub (EducationDashboard), nunca de dentro de uma sessão ativa (ver
        header acima, que não tem mais seletor de trilha nenhum). `trackDef.id` não muda mais
        enquanto este componente está montado; a `key={trackDef.id}` continua aqui só para o caso
        de troca de conteúdo dentro da mesma trilha reaproveitar a entrada `study-stage-enter`.
      */}
      <div key={trackDef.id} id="track-content-region" className="study-stage-enter flex flex-col gap-4">
      {/* Faixa Contextual: Objetivo da Sessão — recolhida no modo "Aula" (Refinamento Visual
          §7.2): o usuário já escolheu foco total no vídeo, então essa faixa (que duplica
          informação do cabeçalho acima) só consome altura vertical que o player precisa. */}
      {!isAulaFocusMode && (
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
      )}

      {/* Seletor de composição — CAMADA ESTÁVEL (Round 6 §6 CRÍTICO). Bug real corrigido nesta
          rodada: este switcher morava DENTRO de `#lesson-stage`, que recolhe pra
          `max-h-0 opacity-0 pointer-events-none` + `aria-hidden` no modo "Resumo" da Faculdade —
          ou seja, o único controle capaz de SAIR do Resumo desaparecia e ficava sem clique
          justamente quando alguém estava nele. Agora vive aqui, um nível acima da coluna que
          recolhe, e nunca é afetado por `isResumoFocusMode`. */}
      {hasModeSwitcher && (
        <div
          id="lesson-composition-switcher"
          className="flex items-center gap-1 p-1 bg-surface-secondary/60 border border-border/60 rounded-xl w-fit"
        >
          {(
            [
              { id: 'aula', label: 'Aula', icon: 'fullscreen', title: 'Vídeo em foco total' },
              { id: 'aula-resumo', label: 'Aula + Resumo', icon: 'view_sidebar', title: 'Vídeo com pontos-chave ao lado (60/40)' },
              { id: 'resumo', label: 'Resumo', icon: 'subject', title: 'Aula escrita, em foco total' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              id={`btn-lesson-mode-${m.id}`}
              onClick={() => {
                setLessonViewMode(m.id);
                playFeedback('mode_switch');
              }}
              title={m.title}
              aria-label={m.label}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none ${
                lessonViewMode === m.id
                  ? `bg-surface text-text-primary shadow-subtle font-semibold border ${accent.softBorder}`
                  : 'text-text-muted hover:text-text-primary'
              }`}
              aria-pressed={lessonViewMode === m.id}
            >
              <span className="material-symbols-outlined text-[15px]">{m.icon}</span>
              {/* Rótulo só aparece a partir de sm: em telas muito estreitas os 3 rótulos
                  completos não cabem lado a lado sem espremer/cortar texto — o ícone +
                  `title`/`aria-label` mantêm a ação clara mesmo só com o ícone. */}
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Palco Central: composição controlada pelo switcher acima, unificada nas 3 trilhas (Round
          7 §6/§11/§20) — Aula (vídeo em foco total), Aula + Resumo (60/40, vídeo dominante) ou
          Resumo (aula escrita em foco total). O painel lateral usa `flex-basis: clamp(mín, alvo,
          máx)` — um sistema fluido que nunca deixa a lateral "microscópica" nem trava exatamente
          em 60/40 em toda largura de tela — e o palco (`flex: 1`) preenche o restante. Nenhum dos
          dois lados é desmontado: a sensação é de "mudar como estudo esta aula", não de navegar
          para outra tela. */}
      <div
        className="flex flex-col lg:flex-row gap-5 items-stretch"
        style={
          {
            '--aside-basis':
              lessonViewMode === 'aula'
                ? '0px'
                : lessonViewMode === 'resumo'
                ? '100%'
                // Modo "Aula + Resumo": 40% para o resumo / 60% para o vídeo (Round 5 §6 — nunca
                // 50/50). O vídeo continua sendo o elemento dominante do palco.
                : 'clamp(340px, 40%, 460px)',
          } as React.CSSProperties
        }
      >
        {/* ================= COLUNA PRINCIPAL: PLAYER DE CONTEÚDO (~0-100%) ================= */}
        <section
          id="lesson-stage"
          aria-label="Conteúdo da Aula"
          aria-hidden={isResumoFocusMode}
          className={`flex flex-col overflow-hidden w-full min-w-0 transition-all duration-500 ease-out ${
            isAulaFocusMode
              ? 'bg-black border-0 shadow-2xl rounded-2xl sm:rounded-3xl flex-1 w-full'
              : 'bg-surface rounded-2xl border border-border/70 shadow-calm'
          } ${
            hasModeSwitcher ? (isAulaFocusMode ? 'w-full flex-1' : 'lg:flex-1 lg:basis-0') : ''
          } ${
            isResumoFocusMode
              ? 'hidden lg:hidden'
              : 'max-h-[3000px] lg:max-h-none opacity-100'
          }`}
        >
          {/* Canvas / Visualizador Adaptado à Trilha — flex-1 preenche a altura do palco.
              Em telas mais altas (1440×1200), o termo `calc(100vh-480px)` cresce além do piso
              para a aula continuar sendo a protagonista, sem sobrar espaço vazio abaixo do
              player.

              BUG REAL CORRIGIDO (Refinamento Visual §7.2): o piso fixo de 640px no desktop
              (`lg`/`xl`) ignorava a altura real do viewport — em 1440×900/1280×800 (os tamanhos
              de desktop mais comuns, e os pedidos explicitamente para validação), 640px de
              vídeo sozinho já excedia o espaço restante depois do cabeçalho/faixa/controles,
              obrigando a rolar a página só para ver os controles do player. Reduzido para um
              piso que cabe nesses viewports sem cortar o vídeo a um tamanho inutilizável.

              Round 5 §22/§25: no Modo "Aula" (vídeo em foco total), a faixa de objetivo e o
              painel lateral recolhem e sobra espaço vertical real que o cálculo de
              `calc(100vh-480px)` (pensado para os outros modos, com mais chrome ao redor) não
              reclamava — o palco ficava menor do que precisava, com uma faixa vazia abaixo dele.

              BUG REAL medido nesta rodada em 1280×800 (um dos dois viewports de desktop exigidos
              pela validação): o piso de 380px do modo padrão, multiplicado pelo `items-stretch`
              da linha com o painel lateral, resultava em ~468px de chrome ao redor do palco — a
              soma ultrapassava os 800px de altura da tela e forçava rolagem vertical, o oposto do
              pedido. Os pisos (300px no modo padrão, 400px no modo Aula) agora ficam abaixo do
              valor que `calc(100vh-…)` calcularia nos dois viewports testados, então quem decide
              a altura de verdade é sempre o cálculo relativo à tela — o piso só evita um palco
              minúsculo numa tela hipotética bem mais baixa que as testadas. */}
          <div
            className={`relative w-full flex-1 min-h-[340px] sm:min-h-[420px] flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none transition-[min-height] duration-500 ease-out ${
              isAulaFocusMode
                ? 'min-h-[500px] sm:min-h-[600px] lg:min-h-[calc(100vh-220px)]'
                : 'lg:min-h-[300px] xl:min-h-[max(300px,calc(100vh-480px))]'
            } ${isFaculdade ? 'bg-[#0B1120]' : 'bg-[#0E1311]'}`}
          >
            {/* Visualização de Fundo por Trilha — a composição (Aula/Aula+Resumo/Dividido) muda
                a proporção do palco, não o que toca nele: mesma cena visual nos 3 modos. */}
            <div className="absolute inset-0 flex items-center justify-center opacity-35 pointer-events-none">
                {isIngles ? (
                  // Visualizador de Espectro de Voz e Diálogo para Inglês
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
                    <AnimatedIcon
                      name={isPlaying ? 'pause' : 'play'}
                      state={isPlaying ? 'active' : 'idle'}
                      size={20}
                    />
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
                    <AnimatedIcon name="bookmark" size={14} />
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

          {/* Rodapé descritivo do vídeo — omitido no modo "Aula" para evitar o efeito de "card dentro de card" e maximizar o palco cinematográfico */}
          {!isAulaFocusMode && (
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
          )}
        </section>

        {/* ================= COLUNA COMPANHEIRA: ROTEIRO, RESUMO, VOCABULÁRIO & NOTAS (~50%) =================
            No mobile, o Modo "Aula" precisa recolher a ALTURA real do painel (não só a opacidade)
            — senão sobra um espaço vazio abaixo do vídeo antes do rodapé, já que em coluna a
            largura não é o eixo que "some". `max-height` cai para 0 junto com a opacidade.

            BUG REAL CORRIGIDO (Refinamento Visual §7.2): em telas lg+, `lg:max-h-none` era
            aplicado incondicionalmente (não só fora do modo "Aula"), então mesmo com a largura
            (`flex-basis`) recolhida a ~2px, o conteúdo de texto do painel (Roteiro/Resumo) ainda
            calculava uma altura intrínseca enorme ao ser espremido nessa largura mínima — e
            `align-items: stretch` da linha flex propagava essa altura para o palco de vídeo
            irmão, forçando um vídeo de milhares de pixels de altura e uma rolagem vertical
            gigante exatamente no modo que deveria ser o mais compacto. `lg:max-h-0` agora
            também recolhe no modo "Aula" — a largura sozinha não bastava. */}
        {(() => {
          const isAulaCollapsed = isAulaFocusMode;
          return (
            <aside
              aria-label="Companheiro da Sessão de Estudo"
              aria-hidden={isAulaCollapsed}
              className={`study-summary-enter flex flex-col bg-surface rounded-2xl border border-border/70 shadow-calm overflow-hidden w-full transition-[flex-basis,opacity,max-height] duration-500 ease-out ${
                hasModeSwitcher ? (isResumoFocusMode ? 'w-full flex-1' : 'lg:basis-[var(--aside-basis)] lg:flex-none') : ''
              } ${
                isAulaCollapsed
                  ? 'hidden lg:hidden'
                  : 'max-h-[2000px] lg:max-h-none opacity-100 min-h-[480px] lg:min-h-[480px]'
              }`}
            >
          {isResumoFocusMode ? (
            /* Round 7 §6/§9: o Modo "Resumo" agora é a Aula Escrita de verdade — nenhum aviso de
               sistema, nenhum "Roteiro da sessão"/"Avisos" competindo com o conteúdo. O botão
               "Perguntar ao Tutor" dentro dela abre o MESMO drawer contextual do cabeçalho. */
            <LessonWrittenContent trackDef={trackDef} onAskTutor={() => onOpenTutor(currentTime)} />
          ) : (
          <>
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

          {/* Avisos — somente trilhas com `notices` de verdade (hoje só Faculdade), simples e
              pontuais (não uma parede de cards) */}
          {trackDef.notices && trackDef.notices.length > 0 && (
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

          {/* Alternador de Abas (Resumo Vivo / Vocabulário / Notas) — o Tutor não é mais uma aba
              aqui (Round 7 §11): vira ação contextual pelo botão do cabeçalho. */}
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
          </>
          )}
            </aside>
          );
        })()}
      </div>
      </div>

      {/* Confirmação de Interrupção — redesenhada com scrim suave, sem peso visual de 'quadrado colado' (HG2 §8/§9) */}
      {showInterruptConfirm &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id="interrupt-lesson-confirm-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar interrupção da aula"
            className="modal-backdrop-enter fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/35 backdrop-blur-[2px]"
            onClick={() => {
              playFeedback('close');
              setShowInterruptConfirm(false);
            }}
          >
            <div
              id="interrupt-lesson-confirm-dialog"
              onClick={(e) => e.stopPropagation()}
              className="modal-pop-enter w-full max-w-sm sm:max-w-md bg-surface rounded-t-2xl sm:rounded-2xl border border-border/80 shadow-island p-5 sm:p-6 flex flex-col gap-4 animate-fadeRise"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-medusa-accent/20 border border-medusa-accent/40 flex items-center justify-center text-[#8A6D00] dark:text-medusa-accent flex-shrink-0">
                  <AnimatedIcon name="bookmark" size={18} />
                </span>
                <div>
                  <h3 className="text-[14px] font-bold text-text-primary">Interromper Sessão de Estudo?</h3>
                  <span className="text-[11px] font-mono text-text-muted">Momento salvo: {formatTime(currentTime)}</span>
                </div>
              </div>

              <p className="text-[12.5px] text-text-secondary leading-relaxed">
                Seu progresso e modo de visualização ficam guardados no Learning OS. Você poderá continuar exatamente de onde parou pelo Hub.
              </p>

              <div className="flex items-center gap-2.5 justify-end pt-1">
                <button
                  type="button"
                  id="btn-interrupt-cancel"
                  onClick={() => {
                    playFeedback('close');
                    setShowInterruptConfirm(false);
                  }}
                  className="btn-interactive px-4 py-2 rounded-full text-[12px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                >
                  Continuar aula
                </button>
                <button
                  type="button"
                  id="btn-interrupt-confirm"
                  onClick={() => {
                    playFeedback('close');
                    onInterruptLesson(currentTime, lessonViewMode);
                  }}
                  className="btn-interactive group px-4 py-2 rounded-full text-[12px] font-semibold bg-medusa-primary hover:opacity-95 text-[#1C2420] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex items-center gap-1.5 shadow-subtle"
                >
                  <AnimatedIcon name="logout" size={15} />
                  <span>Salvar e sair</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
