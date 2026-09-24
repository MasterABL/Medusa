'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useShell } from '@/context/ShellContext';
import { useEducationPanel } from '@/context/EducationPanelContext';
import {
  StudySessionState,
  StudyTrack,
  ExerciseQuestion,
  StudyNote,
  SessionResult,
  LessonViewMode,
} from './types';
import { TRACK_DEFINITIONS } from './educationFixtures';
import { EducationDashboard } from './EducationDashboard';
import { StudyLoadingState } from './StudyLoadingState';
import { StudyReadyState } from './StudyReadyState';
import { StudyErrorState } from './StudyErrorState';
import { StudyModeView } from './StudyModeView';
import { VoiceExerciseView } from './VoiceExerciseView';
import { LiveImmersionView } from './LiveImmersionView';
import { StudyExercisesView } from './StudyExercisesView';
import { FlashcardsView } from './FlashcardsView';
import { StudyCompletionView } from './StudyCompletionView';
import { TutorDrawer } from './TutorDrawer';
import { LessonReviewModal } from './LessonReviewModal';
import { CronogramaOverlay } from './CronogramaOverlay';
import { playFeedback } from '@/lib/audioFeedback';

const RECEDE_MS = 320;

export function EducationContainer() {
  const { setIslandState, setMode, mode, setVoiceActive } = useShell();
  const { setCurrentTrackMirror, setIsSessionCompletedMirror, setSessionResultMirror, setRequestStartStudyMirror } = useEducationPanel();

  // Trilha ativa no Learning OS (Faculdade, Inglês, Vestibular)
  const [currentTrack, setCurrentTrack] = useState<StudyTrack>('faculdade');

  // Máquina de estados canônica do fluxo de Educação / Study Mode
  const [sessionState, setSessionState] = useState<StudySessionState>('dashboard');
  const [isSimulateFailureActive, setIsSimulateFailureActive] = useState(false);
  const [previousShellMode, setPreviousShellMode] = useState(mode);

  // Estados mantidos estritamente em memória React (escopo da sessão atual / Local State).
  // AUDITORIA: NÃO sobrevivem a reload de página (F5) nem sincronizam com backend nesta fase.
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [isSessionCompleted, setIsSessionCompleted] = useState(false);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);

  // Aula interrompida (ver seção "Interromper aula" do Study Mode) — guarda o instante em segundos
  // E o modo de composição em que o usuário estava, para o hero do dashboard oferecer "Continuar
  // aula". Estado local em memória (mesmo nível de auditoria de `notes`/`isSessionCompleted`):
  // some ao recarregar a página (F5).
  //
  // BUG REAL corrigido (Round 7 §14): antes só `currentTimeSeconds` era guardado — retomar sempre
  // reabria em "Aula + Resumo" (o valor inicial de `lessonViewMode` em StudyModeView), mesmo que a
  // interrupção tivesse sido em "Resumo". `viewMode` agora viaja junto e é restaurado abaixo.
  const [interruptedSession, setInterruptedSession] = useState<{ track: StudyTrack; currentTimeSeconds: number; viewMode: LessonViewMode } | null>(null);
  // Instante e modo a retomar na sessão ATIVA (só populados ao clicar "Continuar aula") —
  // desacoplados de `interruptedSession` para que StudyModeView receba os valores certos mesmo
  // depois que o marcador do dashboard já foi limpo ao entrar em loading/ready.
  const [activeResumeTimeSeconds, setActiveResumeTimeSeconds] = useState<number | null>(null);
  const [activeResumeViewMode, setActiveResumeViewMode] = useState<LessonViewMode | null>(null);

  // Tutor Contextual
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [tutorContextQuestion, setTutorContextQuestion] = useState<{
    id: number;
    topic: string;
    question: string;
    confusionDiagnosis: string;
  } | null>(null);
  const [currentVideoTimestamp, setCurrentVideoTimestamp] = useState(0);

  // Espelha trilha ativa + sessão concluída para o Context Panel do Shell — ele não tem acesso
  // direto ao estado local deste container (ver EducationPanelContext.tsx).
  useEffect(() => {
    setCurrentTrackMirror(currentTrack);
  }, [currentTrack, setCurrentTrackMirror]);
  useEffect(() => {
    setIsSessionCompletedMirror(isSessionCompleted);
  }, [isSessionCompleted, setIsSessionCompletedMirror]);
  useEffect(() => {
    setSessionResultMirror(sessionResult);
  }, [sessionResult, setSessionResultMirror]);

  // Definição da trilha ativa (Derivado de currentTrack + FIXTURE)
  const trackDef = TRACK_DEFINITIONS[currentTrack];

  // Alternância de Trilha sem reload de página. O Island participa da troca com um pulso do
  // próprio catálogo canônico (processing -> active) — sem inventar um 11º estado — e o
  // conteúdo dependente da trilha se remonta com a animação de entrada já existente (ver
  // StudyModeView.tsx), então a troca é percebida como o mesmo Study Mode reorganizando o
  // contexto, não uma tela nova substituindo a anterior.
  const handleSelectTrack = useCallback(
    (track: StudyTrack) => {
      if (track === currentTrack) return;
      const restingIslandState = sessionState === 'study' ? 'active' : 'idle';
      setIslandState('processing');
      setCurrentTrack(track);
      window.setTimeout(() => {
        setIslandState(restingIslandState);
      }, 320);
    },
    [currentTrack, sessionState, setIslandState]
  );

  // 1. Iniciar fluxo de estudo: dashboard -> loading
  const handleStartStudy = useCallback(
    (simulateError = false) => {
      setIsSimulateFailureActive(simulateError);
      setPreviousShellMode(mode === 'foco' ? 'amplo' : mode);
      setSessionState('loading');
      setIslandState('processing');
    },
    [mode, setIslandState]
  );

  // Espelha handleStartStudy pro card "Próxima Ação" dos 3 Context Panels (Round 5 §9) — só
  // quando a Educação está no dashboard (mesma trava já usada por CronogramaOverlay logo
  // abaixo): iniciar uma sessão nova a partir do painel enquanto já existe uma em andamento
  // seria uma segunda sessão silenciosa por cima da atual.
  useEffect(() => {
    setRequestStartStudyMirror(sessionState === 'dashboard' ? () => handleStartStudy(false) : null);
  }, [sessionState, handleStartStudy, setRequestStartStudyMirror]);

  // 2. Loading concluído com sucesso: loading -> ready
  const handleLoadingComplete = useCallback(() => {
    setSessionState('ready');
    setIslandState('success');
  }, [setIslandState]);

  // 3. Loading falhou (simulado para teste de QA): loading -> error
  const handleLoadingError = useCallback(() => {
    setSessionState('error');
    setIslandState('error');
    // Round 6 §33: "erro" também tem som — categoria `notification` (não existe uma 4a
    // categoria "erro" no toggle de Ajustes, ver AudioSettingsWidget; um erro é, semanticamente,
    // "algo que pede atenção sem o usuário ter pedido agora", o mesmo critério de `notification`).
    playFeedback('notification');
  }, [setIslandState]);

  // 4. Entrar no Study Mode: ready -> study
  // FOCUS MODE REAL: Shell entra em 'foco' (Painel Regional Global desaparece 100% da tela)
  const handleEnterStudyMode = useCallback(() => {
    setPreviousShellMode(mode === 'foco' ? 'amplo' : mode);
    setSessionState('study');
    setIslandState('active');
    setMode('foco');
  }, [mode, setIslandState, setMode]);

  // Transição genérica entre etapas do fluxo de estudo, reaproveitando a MESMA coreografia
  // já provada (recede 320ms + pulso `processing` do Island) que antes só existia para o salto
  // Aula -> Exercícios. Generalizada aqui para servir também às etapas extras da trilha de
  // Inglês (Exercício de Voz / Live Immersion / Flashcards) sem inventar um segundo mecanismo.
  const advanceStudyFlow = useCallback(
    (nextState: StudySessionState, transitioningState: StudySessionState, restingIslandState: 'active' | 'success' = 'active') => {
      setSessionState(transitioningState);
      setIslandState('processing');
      setTimeout(() => {
        setSessionState(nextState);
        setIslandState(restingIslandState);
      }, RECEDE_MS);
    },
    [setIslandState]
  );

  // 5. Concluir aula: study -> [voz -> imersão ->] exercícios
  // Inglês segue o fluxo estendido (seção 4 do produto); as demais trilhas (ENEM/Faculdade)
  // preservam o salto direto original Aula -> Exercícios (byte-a-byte o mesmo comportamento
  // já provado em E-029/E-033), por instrução explícita de não criar exceção para o ENEM nem
  // mudar a estrutura das trilhas que já funcionam.
  const handleCompleteLesson = useCallback(() => {
    if (currentTrack === 'ingles') {
      advanceStudyFlow('voice_exercise', 'transitioning_to_voice_exercise');
    } else {
      advanceStudyFlow('exercises', 'transitioning_to_exercises');
    }
  }, [currentTrack, advanceStudyFlow]);

  // 5b. Somente Inglês: Exercício de Voz -> Live Immersion
  const handleFinishVoiceExercise = useCallback(() => {
    advanceStudyFlow('live_immersion', 'transitioning_to_immersion');
  }, [advanceStudyFlow]);

  // 5c. Somente Inglês: Live Immersion -> Exercícios (reaproveita StudyExercisesView já existente)
  const handleFinishImmersion = useCallback(() => {
    advanceStudyFlow('exercises', 'transitioning_to_exercises');
  }, [advanceStudyFlow]);

  // 6. Finalizar bateria de exercícios: exercises -> completion (ENEM/Faculdade) ou -> flashcards (Inglês)
  // Métricas DERIVADAS (Local State + Fixture)
  const handleFinishExercises = useCallback(
    (correctCount: number, totalCount: number, errorTopics: string[]) => {
      const scorePercentage = Math.round((correctCount / totalCount) * 100);
      const pointToReinforce =
        errorTopics.length > 0
          ? `Reforço recomendado em: ${errorTopics.join(', ')}. Revisão dos pontos diagnosticados nas questões.`
          : `Excelente domínio em todos os conceitos avaliados em ${trackDef.lesson.topic}.`;

      const result: SessionResult = {
        track: currentTrack,
        totalQuestions: totalCount,
        correctAnswers: correctCount,
        scorePercentage,
        durationFormatted: trackDef.lesson.estimatedDuration,
        pointToReinforce,
        nextReviewDate: 'Amanhã · 09:00',
        completedAt: new Date().toLocaleDateString('pt-BR'),
      };

      setSessionResult(result);

      if (currentTrack === 'ingles') {
        advanceStudyFlow('flashcards', 'transitioning_to_flashcards');
      } else {
        setSessionState('completion');
        setIslandState('success');
      }
    },
    [currentTrack, trackDef.lesson.estimatedDuration, trackDef.lesson.topic, setIslandState, advanceStudyFlow]
  );

  // 6b. Somente Inglês: Flashcards -> Conclusão
  const handleFinishFlashcards = useCallback(() => {
    setSessionState('completion');
    setIslandState('success');
  }, [setIslandState]);

  // 7. Retornar para Educação: completion -> dashboard
  // Restaura o modo normal do shell (Painel Regional Global volta à tela)
  const handleReturnToEducation = useCallback(() => {
    setIsSessionCompleted(true);
    setActiveResumeTimeSeconds(null);
    setActiveResumeViewMode(null);
    setSessionState('dashboard');
    setIslandState('idle');
    setMode(previousShellMode || 'amplo');
  }, [previousShellMode, setIslandState, setMode]);

  // Recuperação de Erro: Tentar novamente (error -> loading)
  const handleRetryFromError = useCallback(() => {
    setIsSimulateFailureActive(false);
    setSessionState('loading');
    setIslandState('processing');
  }, [setIslandState]);

  // Cancelar Loading ou Voltar de Erro: -> dashboard
  const handleReturnToDashboard = useCallback(() => {
    setSessionState('dashboard');
    setIslandState('idle');
    setMode(previousShellMode || 'amplo');
  }, [previousShellMode, setIslandState, setMode]);

  // Interromper aula: study -> dashboard, reaproveitando EXATAMENTE a mesma transição de saída
  // de `handleReturnToDashboard` (sem inventar um segundo caminho de "sair"), só que guardando
  // antes o instante da trilha para permitir "Continuar aula" no hero do dashboard.
  const handleInterruptLesson = useCallback(
    (currentTimeSeconds: number, viewMode: LessonViewMode) => {
      setInterruptedSession({ track: currentTrack, currentTimeSeconds, viewMode });
      setSessionState('dashboard');
      setIslandState('idle');
      setMode(previousShellMode || 'amplo');
    },
    [currentTrack, previousShellMode, setIslandState, setMode]
  );

  // Retomar a aula interrompida: entra pelo MESMO fluxo de início de sessão (loading -> ready ->
  // study) que qualquer outra sessão nova — StudyModeView recebe o instante E o modo de composição
  // salvos (`initialTimeSeconds`/`initialViewMode`) para retomar exatamente de onde parou, em vez
  // de reiniciar do zero e sempre cair em "Aula + Resumo" (Round 7 §14).
  const handleResumeInterruptedSession = useCallback(() => {
    if (interruptedSession && interruptedSession.track === currentTrack) {
      setActiveResumeTimeSeconds(interruptedSession.currentTimeSeconds);
      setActiveResumeViewMode(interruptedSession.viewMode);
      setInterruptedSession(null);
    }
    handleStartStudy(false);
  }, [interruptedSession, currentTrack, handleStartStudy]);

  // Abrir Tutor a partir do conteúdo
  const handleOpenTutorFromVideo = useCallback((timestamp: number) => {
    setCurrentVideoTimestamp(timestamp);
    setTutorContextQuestion(null);
    setIsTutorOpen(true);
  }, []);

  // Abrir Tutor a partir de erro no exercício ("[ Entender meu erro ]")
  const handleOpenTutorForError = useCallback((question: ExerciseQuestion) => {
    setTutorContextQuestion({
      id: question.id,
      topic: question.topic,
      question: question.question,
      confusionDiagnosis: question.confusionDiagnosis,
    });
    setIsTutorOpen(true);
  }, []);

  const handleCloseTutor = useCallback(() => {
    setIsTutorOpen(false);
  }, []);

  const handleSaveNote = useCallback((note: StudyNote) => {
    setNotes((prev) => [note, ...prev]);
  }, []);

  // Garantia de Focus Mode nos estados de estudo ativos
  useEffect(() => {
    const isStudyActive = [
      'study',
      'transitioning_to_voice_exercise',
      'voice_exercise',
      'transitioning_to_immersion',
      'live_immersion',
      'transitioning_to_exercises',
      'exercises',
      'transitioning_to_flashcards',
      'flashcards',
      'completion',
    ].includes(sessionState);
    if (isStudyActive && mode !== 'foco') {
      setMode('foco');
    }
  }, [sessionState, mode, setMode]);

  // A etapa "transitioning_to_exercises" é compartilhada por dois caminhos diferentes: ENEM/
  // Faculdade saltam direto de Aula, enquanto Inglês chega vindo de Live Immersion. A tela que
  // deve receder (`study-recede`) durante essa transição depende de qual delas está saindo.
  const showStudyStage =
    sessionState === 'study' ||
    sessionState === 'transitioning_to_voice_exercise' ||
    (sessionState === 'transitioning_to_exercises' && currentTrack !== 'ingles');
  const showLiveImmersion =
    sessionState === 'live_immersion' ||
    (sessionState === 'transitioning_to_exercises' && currentTrack === 'ingles');

  return (
    <main
      id="education-experience-root"
      className="w-full flex-1 flex flex-col px-4 sm:px-8 max-w-7xl mx-auto pt-4 relative"
    >
      {/* 1. Visão Geral / Dashboard da Trilha com Seletor Multi-Trilha */}
      {sessionState === 'dashboard' && (
        <EducationDashboard
          currentTrack={currentTrack}
          onSelectTrack={handleSelectTrack}
          onStartStudy={handleStartStudy}
          isSessionCompleted={isSessionCompleted}
          completedScore={sessionResult?.scorePercentage ?? 80}
          interruptedSession={interruptedSession}
          onResumeInterruptedSession={handleResumeInterruptedSession}
        />
      )}

      {/* 2. Loading State: Preparando aula da trilha */}
      {sessionState === 'loading' && (
        <StudyLoadingState
          trackDef={trackDef}
          onCancel={handleReturnToDashboard}
          onComplete={handleLoadingComplete}
          simulateFailure={isSimulateFailureActive}
          onSimulatedError={handleLoadingError}
        />
      )}

      {/* 3. Ready State: Aula pronta com metadados da trilha ativa */}
      {sessionState === 'ready' && (
        <StudyReadyState
          onEnterStudy={handleEnterStudyMode}
          trackDef={trackDef}
        />
      )}

      {/* 4. Error State: Recuperável */}
      {sessionState === 'error' && (
        <StudyErrorState
          onRetry={handleRetryFromError}
          onReturnToDashboard={handleReturnToDashboard}
        />
      )}

      {/* 5. Study Mode: Palco de Estudo + Coluna Companheira (Resumo/Vocabulário/Notas/Tutor) */}
      {showStudyStage && (
        <div
          id="lesson-transition-wrapper"
          className={sessionState === 'transitioning_to_voice_exercise' || (sessionState === 'transitioning_to_exercises' && currentTrack !== 'ingles') ? 'study-recede' : ''}
        >
          <StudyModeView
            trackDef={trackDef}
            onCompleteLesson={handleCompleteLesson}
            onOpenTutor={handleOpenTutorFromVideo}
            notes={notes}
            onSaveNote={handleSaveNote}
            onInterruptLesson={handleInterruptLesson}
            initialTimeSeconds={activeResumeTimeSeconds ?? undefined}
            initialViewMode={activeResumeViewMode ?? undefined}
          />
        </div>
      )}

      {/* 5b. Somente Inglês: Exercício de Voz (Idle -> Listening -> Processing -> Resposta) */}
      {(sessionState === 'voice_exercise' || sessionState === 'transitioning_to_immersion') && trackDef.voicePrompts && (
        <div className={sessionState === 'transitioning_to_immersion' ? 'study-recede' : ''}>
          <VoiceExerciseView trackDef={trackDef} onFinish={handleFinishVoiceExercise} />
        </div>
      )}

      {/* 5c. Somente Inglês: Live Immersion (cenário de conversação guiada) */}
      {showLiveImmersion && trackDef.immersionScenario && (
        <div className={sessionState === 'transitioning_to_exercises' ? 'study-recede' : ''}>
          <LiveImmersionView trackDef={trackDef} onFinish={handleFinishImmersion} />
        </div>
      )}

      {/* 6. Exercícios: Prática Deliberada da Trilha Ativa */}
      {(sessionState === 'exercises' || sessionState === 'transitioning_to_flashcards') && (
        <div className={sessionState === 'transitioning_to_flashcards' ? 'study-recede' : ''}>
          <StudyExercisesView
            trackDef={trackDef}
            onFinishExercises={handleFinishExercises}
            onOpenTutorForError={handleOpenTutorForError}
          />
        </div>
      )}

      {/* 6b. Somente Inglês: Flashcards de Vocabulário */}
      {sessionState === 'flashcards' && trackDef.vocabulary && (
        <FlashcardsView trackDef={trackDef} onFinish={handleFinishFlashcards} />
      )}

      {/* 7. Conclusão da Sessão: Métricas Derivadas Auditáveis */}
      {sessionState === 'completion' && sessionResult && (
        <StudyCompletionView
          result={sessionResult}
          trackDef={trackDef}
          onReturnToEducation={handleReturnToEducation}
        />
      )}

      {/* Drawer Contextual do Tutor */}
      <TutorDrawer
        isOpen={isTutorOpen}
        onClose={handleCloseTutor}
        trackDef={trackDef}
        contextQuestion={tutorContextQuestion}
        videoTimestamp={currentVideoTimestamp}
        onVoiceActiveChange={setVoiceActive}
      />

      {/* Destino real de "Rever"/"Revisão" — Minhas Aulas (Hub) e "Próximas Revisões" (Context
          Panel) abrem o mesmo modal, ver LessonReviewModal.tsx */}
      <LessonReviewModal />

      {/* Cronograma do ENEM em contexto (Refinamento Visual §10) — acionável tanto do Context
          Panel quanto de dentro do Study Mode; "Iniciar Sessão" só é oferecido quando estamos no
          dashboard (nunca por cima de uma sessão já em andamento, ver CronogramaOverlay.tsx). */}
      <CronogramaOverlay onStartStudy={sessionState === 'dashboard' ? handleStartStudy : undefined} />
    </main>
  );
}
