'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useShell } from '@/context/ShellContext';
import {
  StudySessionState,
  StudyTrack,
  ExerciseQuestion,
  StudyNote,
  SessionResult,
} from './types';
import { TRACK_DEFINITIONS } from './educationFixtures';
import { EducationDashboard } from './EducationDashboard';
import { StudyLoadingState } from './StudyLoadingState';
import { StudyReadyState } from './StudyReadyState';
import { StudyErrorState } from './StudyErrorState';
import { StudyModeView } from './StudyModeView';
import { StudyExercisesView } from './StudyExercisesView';
import { StudyCompletionView } from './StudyCompletionView';
import { TutorDrawer } from './TutorDrawer';

export function EducationContainer() {
  const { setIslandState, setMode, mode, setVoiceActive } = useShell();

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

  // Tutor Contextual
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [tutorContextQuestion, setTutorContextQuestion] = useState<{
    id: number;
    topic: string;
    question: string;
    confusionDiagnosis: string;
  } | null>(null);
  const [currentVideoTimestamp, setCurrentVideoTimestamp] = useState(0);

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

  // 2. Loading concluído com sucesso: loading -> ready
  const handleLoadingComplete = useCallback(() => {
    setSessionState('ready');
    setIslandState('success');
  }, [setIslandState]);

  // 3. Loading falhou (simulado para teste de QA): loading -> error
  const handleLoadingError = useCallback(() => {
    setSessionState('error');
    setIslandState('error');
  }, [setIslandState]);

  // 4. Entrar no Study Mode: ready -> study
  // FOCUS MODE REAL: Shell entra em 'foco' (Painel Regional Global desaparece 100% da tela)
  const handleEnterStudyMode = useCallback(() => {
    setPreviousShellMode(mode === 'foco' ? 'amplo' : mode);
    setSessionState('study');
    setIslandState('active');
    setMode('foco');
  }, [mode, setIslandState, setMode]);

  // 5. Concluir aula e transicionar para exercícios: study -> transitioning_to_exercises -> exercises
  // O tempo do swap (320ms) casa exatamente com a duração real da animação CSS `study-recede`
  // (globals.css) — antes o timeout era 480ms contra uma animação de 320ms, criando uma pausa
  // "morta" sem movimento entre o fim do recede e a troca de estado.
  const handleCompleteLesson = useCallback(() => {
    setSessionState('transitioning_to_exercises');
    setIslandState('processing');
    setTimeout(() => {
      setSessionState('exercises');
      setIslandState('active');
    }, 320);
  }, [setIslandState]);

  // 6. Finalizar bateria de exercícios: exercises -> completion
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
      setSessionState('completion');
      setIslandState('success');
    },
    [currentTrack, trackDef.lesson.estimatedDuration, trackDef.lesson.topic, setIslandState]
  );

  // 7. Retornar para Educação: completion -> dashboard
  // Restaura o modo normal do shell (Painel Regional Global volta à tela)
  const handleReturnToEducation = useCallback(() => {
    setIsSessionCompleted(true);
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
    const isStudyActive = ['study', 'transitioning_to_exercises', 'exercises', 'completion'].includes(sessionState);
    if (isStudyActive && mode !== 'foco') {
      setMode('foco');
    }
  }, [sessionState, mode, setMode]);

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
        />
      )}

      {/* 2. Loading State: Preparando aula da trilha */}
      {sessionState === 'loading' && (
        <StudyLoadingState
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

      {/* 5. Study Mode: Palco de Estudo + Coluna Interna (Resumo Vivo + Notas) */}
      {(sessionState === 'study' || sessionState === 'transitioning_to_exercises') && (
        <div
          id="lesson-transition-wrapper"
          className={sessionState === 'transitioning_to_exercises' ? 'study-recede' : ''}
        >
          <StudyModeView
            trackDef={trackDef}
            onCompleteLesson={handleCompleteLesson}
            onOpenTutor={handleOpenTutorFromVideo}
            notes={notes}
            onSaveNote={handleSaveNote}
            onSelectTrack={handleSelectTrack}
          />
        </div>
      )}

      {/* 6. Exercícios: Prática Deliberada da Trilha Ativa */}
      {sessionState === 'exercises' && (
        <StudyExercisesView
          trackDef={trackDef}
          onFinishExercises={handleFinishExercises}
          onOpenTutorForError={handleOpenTutorForError}
        />
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
    </main>
  );
}
