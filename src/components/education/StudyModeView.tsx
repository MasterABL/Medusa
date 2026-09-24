'use client';

import React, { useState, useEffect } from 'react';
import { TrackDefinition, LiveSummaryPoint, StudyNote } from './types';
import { TutorDrawer } from './TutorDrawer';
import { useEducationPanel } from '@/context/EducationPanelContext';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { getTrackAccent } from './trackAccent';

interface StudyModeViewProps {
  trackDef: TrackDefinition;
  onCompleteLesson: () => void;
  onOpenTutor: (timestamp: number) => void;
  notes: StudyNote[];
  onSaveNote: (note: StudyNote) => void;
  /** Reaproveita o mesmo mecanismo do Dynamic Island (nunca duplicado) para o Tutor inline do Modo Dividido. */
  onVoiceActiveChange?: (active: boolean) => void;
  /**
   * Interromper a aula: salva o instante atual (segundos) e devolve o controle para o dashboard
   * de Educação — reaproveita a MESMA máquina de estados de sessão já existente em
   * EducationContainer (dashboard/loading/ready/study/...), sem criar um segundo mecanismo de
   * sessão paralelo.
   */
  onInterruptLesson: (currentTimeSeconds: number) => void;
  /** Retomar de onde parou (ver "Continuar aula" no hero do dashboard) — 240s (04:00) por padrão. */
  initialTimeSeconds?: number;
}

export function StudyModeView({
  trackDef,
  onCompleteLesson,
  onOpenTutor,
  notes,
  onSaveNote,
  onVoiceActiveChange,
  onInterruptLesson,
  initialTimeSeconds = 240,
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
  const [activeTab, setActiveTab] = useState<'summary' | 'notes' | 'vocabulary' | 'tutor'>('summary');
  // Inglês e Faculdade: controla a COMPOSIÇÃO da tela da aula — quanto espaço o palco ocupa e se a
  // região lateral está presente. Não controla "o que" toca no palco (isso não muda entre os
  // modos); controla apenas a proporção e a presença/domínio de cada lado.
  // Inglês usa 'dividido' (Tutor inline); Faculdade usa 'resumo' (Round 5 §6 — Modo B: o resumo
  // estruturado da aula ocupa a tela sozinho, vídeo recolhido). Times de composição distintos por
  // trilha porque o conteúdo do lado companheiro é diferente (Tutor de voz vs. resumo em texto) —
  // não faria sentido Faculdade ganhar uma aba "Tutor" que não existe para essa trilha.
  const [lessonViewMode, setLessonViewMode] = useState<'aula' | 'aula-resumo' | 'dividido' | 'resumo'>('aula-resumo');
  const hasModeSwitcher = isIngles || isFaculdade;
  // Modo "Aula" (foco total no vídeo) — usado para recolher chrome redundante ao redor do palco
  // (Refinamento Visual §7.2: o vídeo não pode exigir rolar a página para ver os controles).
  const isAulaFocusMode = hasModeSwitcher && lessonViewMode === 'aula';
  // Modo "Resumo" (Round 5 §6, Modo B) — o inverso do "Aula": o palco de vídeo recolhe e o
  // resumo estruturado (painel companheiro) ocupa a tela inteira. Só existe para Faculdade —
  // chamado de "Resumo" (não "aula gerada por IA", como o pedido original nomeou) porque o
  // conteúdo aqui é fixture estático desta tela, não uma geração de IA em tempo real; nomear como
  // IA seria apresentar como real algo que não é (Round 5 §27).
  const isResumoFocusMode = isFaculdade && lessonViewMode === 'resumo';
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

  // A aba "Tutor" só existe dentro do Modo Dividido — se o usuário sair do Dividido com o Tutor
  // ativo, a aba volta para Resumo (o Tutor inline continua montado, só deixa de estar visível).
  useEffect(() => {
    if (lessonViewMode !== 'dividido' && activeTab === 'tutor') {
      setActiveTab('summary');
    }
  }, [lessonViewMode, activeTab]);

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
      className="study-stage-enter w-full flex flex-col gap-4 max-w-7xl mx-auto pb-8"
    >
      {/* Topo da Sessão de Estudo & Contexto da Trilha — enxuto (Round 6 §10): prioriza
          disciplina/tópico/estado/ação. Removidos o badge "Modo Estudo Ativo · Foco Zen" e o
          rótulo cru de `lesson.module` (ex.: "Caderno de Ouro ENEM · Habilidades 01 a 04") —
          metadata de organização interna da fixture, sem valor de decisão pro usuário. O estado
          agora é um indicador compacto com a cor de identidade da trilha (Round 6 §2.3/§2.1). */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${accent.solidBg} living-pulse`} />
            <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${accent.text}`}>
              {trackDef.name} · Em estudo
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            {lesson.discipline} · {lesson.topic}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            id="btn-interrupt-lesson"
            onClick={() => setShowInterruptConfirm(true)}
            title="Salvar progresso e sair da aula"
            className="btn-interactive bg-surface hover:bg-surface-secondary border border-border/70 text-text-secondary hover:text-medusa-alert px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all shadow-subtle flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Interromper aula</span>
          </button>

          {/* Somente ENEM: abre o cronograma em contexto (Refinamento Visual §10) — o usuário
              vê o mapa de preparação sem sair da aula, o mesmo overlay usado pelo Context Panel. */}
          {trackDef.id === 'vestibular' && (
            <button
              type="button"
              id="btn-open-cronograma-from-study-mode"
              onClick={openCronogramaOverlay}
              className="btn-interactive bg-surface hover:bg-surface-secondary border border-border/70 text-text-secondary hover:text-text-primary px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all shadow-subtle flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
            >
              <span className="material-symbols-outlined text-[16px] text-[#8A6D00] dark:text-medusa-accent">calendar_month</span>
              <span>Ver Cronograma</span>
            </button>
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
          {(isIngles
            ? ([
                { id: 'aula', label: 'Aula', icon: 'fullscreen', title: 'Aula em foco total' },
                { id: 'aula-resumo', label: 'Aula + Resumo', icon: 'view_sidebar', title: 'Aula com pontos-chave ao lado' },
                // Round 5 §23: "Dividido" e "Aula + Resumo" eram quase indistinguíveis (mesmo
                // ícone genérico de layout, ambos mostram vídeo + painel lateral). O rótulo e
                // o ícone agora nomeiam a função real e distinta deste modo — conversar com o
                // Tutor ao vivo lado a lado — em vez de descrever só a geometria da tela. O
                // `id` interno continua 'dividido' (não é usado como texto visível em nenhum
                // outro lugar do app).
                { id: 'dividido', label: 'Tutor ao Vivo', icon: 'record_voice_over', title: 'Vídeo com o Tutor de conversação lado a lado' },
              ] as const)
            : ([
                { id: 'aula', label: 'Aula', icon: 'fullscreen', title: 'Vídeo em foco total' },
                { id: 'aula-resumo', label: 'Aula + Resumo', icon: 'view_sidebar', title: 'Vídeo com resumo ao lado (60/40)' },
                { id: 'resumo', label: 'Resumo', icon: 'subject', title: 'Resumo estruturado da aula, em foco total' },
              ] as const)
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              id={`btn-lesson-mode-${m.id}`}
              onClick={() => {
                setLessonViewMode(m.id);
                // O modo se chama "Tutor ao Vivo" agora (Round 5 §23) — entrar nele já deveria
                // mostrar o Tutor, sem exigir um segundo clique na aba além do já feito aqui.
                if (m.id === 'dividido') setActiveTab('tutor');
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

      {/* Palco Central: ~50% Conteúdo da Aula + ~50% Companheiro da Sessão (Resumo/Vocabulário/
          Notas/Tutor) no ENEM (única trilha sem modos de composição ainda — fora do escopo desta
          rodada, ver Round 5 §6/§9). Em Inglês e Faculdade, o usuário controla a composição via
          modos (Aula / Aula + Resumo / Dividido ou Resumo, por trilha). Em vez de uma largura fixa
          por modo, o painel lateral usa `flex-basis: clamp(mín, alvo, máx)` — um sistema fluido
          que nunca deixa a lateral "microscópica" nem trava exatamente em 60/40 em toda largura de
          tela — e o palco (`flex: 1`) preenche o restante. Nenhum dos dois lados é desmontado: a
          sensação é de "mudar como estudo esta aula", não de navegar para outra tela. */}
      <div
        className={
          hasModeSwitcher
            ? 'flex flex-col lg:flex-row gap-5 items-stretch'
            : 'grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch'
        }
        style={
          hasModeSwitcher
            ? ({
                '--aside-basis':
                  lessonViewMode === 'aula'
                    ? '0px'
                    : lessonViewMode === 'resumo'
                    ? '100%'
                    : lessonViewMode === 'dividido'
                    // "Tutor ao Vivo" (id interno continua 'dividido'): precisa de mais espaço que
                    // o resumo estático porque hospeda uma conversa de chat inteira, não só uma
                    // lista de pontos — Round 5 §23 apontou que a proporção quase idêntica à de
                    // "Aula + Resumo" (antes 40% vs 36%, uma diferença pequena demais pra perceber)
                    // reforçava a sensação de modo redundante. 46% cria uma diferença visível.
                    ? 'clamp(380px, 46%, 520px)'
                    // Modo "Aula + Resumo": 40% para o resumo / 60% para o vídeo (Round 5 §6 — nunca
                    // 50/50). O vídeo continua sendo o elemento dominante do palco.
                    : 'clamp(340px, 40%, 460px)',
              } as React.CSSProperties)
            : undefined
        }
      >
        {/* ================= COLUNA PRINCIPAL: PLAYER DE CONTEÚDO (~0-100%) ================= */}
        <section
          id="lesson-stage"
          aria-label="Conteúdo da Aula"
          aria-hidden={isResumoFocusMode}
          className={`flex flex-col bg-surface rounded-2xl border border-border/70 shadow-calm overflow-hidden w-full min-w-0 transition-[flex-basis,opacity,max-height] duration-500 ease-out ${
            hasModeSwitcher ? 'lg:flex-1 lg:basis-0' : ''
          } ${
            isResumoFocusMode
              ? 'max-h-0 lg:max-h-0 opacity-0 pointer-events-none'
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
            className={`relative w-full flex-1 min-h-[320px] sm:min-h-[380px] flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none transition-[min-height] duration-500 ease-out ${
              isAulaFocusMode
                ? 'lg:min-h-[400px] xl:min-h-[max(400px,calc(100vh-380px))]'
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
                hasModeSwitcher ? 'lg:basis-[var(--aside-basis)] lg:flex-none' : ''
              } ${
                isAulaCollapsed
                  ? 'max-h-0 lg:max-h-0 opacity-0 pointer-events-none'
                  : 'max-h-[2000px] lg:max-h-none opacity-100 min-h-[480px] lg:min-h-[480px]'
              }`}
            >
          {/* Aviso do Modo "Resumo" (Round 5 §6, Modo B): explica por que o vídeo sumiu — sem
              isso, o palco recolhido pareceria um erro de carregamento em vez de uma escolha do
              usuário. */}
          {isResumoFocusMode && (
            <div className="mx-4 mt-3.5 px-3 py-2 rounded-lg bg-medusa-primary/10 border border-medusa-primary/30 flex items-center gap-2 text-[11px] text-text-secondary">
              <span className="material-symbols-outlined text-[15px] text-[#18534B] dark:text-medusa-primary">subject</span>
              <span>Modo Resumo: a aula em texto estruturado, sem o vídeo. Volte para &quot;Aula&quot; ou &quot;Aula + Resumo&quot; a qualquer momento.</span>
            </div>
          )}
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

          {/* Alternador de Abas (Tutor [só no Modo Dividido] / Resumo Vivo / Vocabulário / Notas) */}
          <div className="flex items-center border-b border-border/70 bg-surface-secondary/40 p-1.5">
            {isIngles && lessonViewMode === 'dividido' && (
              <button
                type="button"
                id="tab-tutor"
                onClick={() => setActiveTab('tutor')}
                className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                  activeTab === 'tutor'
                    ? 'bg-surface text-text-primary shadow-subtle'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">record_voice_over</span>
                <span>Tutor</span>
              </button>
            )}

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

          {/* Conteúdo da Aba: Tutor inline (somente Inglês, Modo Dividido) — montado permanentemente
              desde que a trilha seja Inglês (não só quando a aba está ativa) e apenas alterna
              visibilidade via CSS, para que a conversa persista ao alternar para Resumo e voltar. */}
          {isIngles && (
            <div className={`flex-1 flex-col overflow-hidden ${activeTab === 'tutor' ? 'flex' : 'hidden'}`}>
              <TutorDrawer
                variant="inline"
                isOpen
                onClose={() => setActiveTab('summary')}
                trackDef={trackDef}
                videoTimestamp={currentTime}
                onVoiceActiveChange={onVoiceActiveChange}
              />
            </div>
          )}

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
          );
        })()}
      </div>
      </div>

      {/* Confirmação de Interrupção — a sessão nunca é destruída silenciosamente ao sair. */}
      {showInterruptConfirm && (
        <div
          id="interrupt-lesson-confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar interrupção da aula"
          className="modal-backdrop-enter fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowInterruptConfirm(false)}
        >
          <div
            id="interrupt-lesson-confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            className="modal-pop-enter w-full max-w-md bg-surface rounded-2xl border border-border/70 shadow-island p-6 flex flex-col gap-4"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-medusa-accent/25 border border-medusa-accent/50 flex items-center justify-center text-[#8A6D00] dark:text-medusa-accent flex-shrink-0">
                <span className="material-symbols-outlined text-[18px]">save</span>
              </span>
              <h3 className="text-[14px] font-semibold text-text-primary">Salvar progresso e sair?</h3>
            </div>
            <p className="text-[12px] text-text-secondary leading-relaxed">
              Seu progresso até {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')} desta aula fica salvo — você pode continuar de onde parou.
            </p>
            <div className="flex items-center gap-2.5 justify-end pt-1">
              <button
                type="button"
                id="btn-interrupt-cancel"
                onClick={() => setShowInterruptConfirm(false)}
                className="btn-interactive px-4 py-2 rounded-full text-[12px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-interrupt-confirm"
                onClick={() => onInterruptLesson(currentTime)}
                className="btn-interactive px-4 py-2 rounded-full text-[12px] font-semibold bg-medusa-primary hover:opacity-95 text-[#1C2420] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">logout</span>
                Salvar e sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
