'use client';

import React, { useState, useCallback } from 'react';
import { useShell } from '@/context/ShellContext';
import {
  StudySessionState,
  ExerciseQuestion,
  StudyNote,
  SessionResult,
} from './types';
import { EducationDashboard } from './EducationDashboard';
import { StudyLoadingState } from './StudyLoadingState';
import { StudyReadyState } from './StudyReadyState';
import { StudyErrorState } from './StudyErrorState';
import { StudyModeView } from './StudyModeView';
import { StudyExercisesView } from './StudyExercisesView';
import { StudyCompletionView } from './StudyCompletionView';
import { TutorDrawer } from './TutorDrawer';

export function EducationContainer() {
  const { setIslandState, setMode, mode } = useShell();

  // Máquina de estados canônica do fluxo de Educação / Study Mode
  const [sessionState, setSessionState] = useState<StudySessionState>('dashboard');
  const [isSimulateFailureActive, setIsSimulateFailureActive] = useState(false);
  const [previousShellMode, setPreviousShellMode] = useState(mode);

  // Estados persistidos no escopo da experiência da sessão
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

  // 1. Iniciar fluxo de estudo: dashboard -> loading
  const handleStartStudy = useCallback(
    (simulateError = false) => {
      setIsSimulateFailureActive(simulateError);
      setPreviousShellMode(mode);
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
  const handleEnterStudyMode = useCallback(() => {
    setSessionState('study');
    setIslandState('active');
    // Recolhe a Sidebar para compacto para ceder 80-90% de palco ao Main
    if (mode === 'amplo') {
      setMode('compacto');
    }
  }, [mode, setIslandState, setMode]);

  // 5. Concluir aula e transicionar para exercícios: study -> transitioning_to_exercises -> exercises
  const handleCompleteLesson = useCallback(() => {
    setSessionState('transitioning_to_exercises');
    // Transição coordenada com acomodação do palco (~480ms)
    setTimeout(() => {
      setSessionState('exercises');
    }, 480);
  }, []);

  // 6. Finalizar bateria de exercícios: exercises -> completion
  const handleFinishExercises = useCallback(
    (correctCount: number, totalCount: number, errorTopics: string[]) => {
      const scorePercentage = Math.round((correctCount / totalCount) * 100);
      const pointToReinforce =
        errorTopics.length > 0
          ? `Reforço recomendado em: ${errorTopics.join(', ')}. Revisão dos nós de interferência e compressão do Efeito Doppler.`
          : 'Excelente domínio em todos os conceitos avaliados: ondulatória mecânica, superposição e difração.';

      const result: SessionResult = {
        totalQuestions: totalCount,
        correctAnswers: correctCount,
        scorePercentage,
        durationFormatted: '45 min',
        pointToReinforce,
        nextReviewDate: 'Amanhã · 09:00',
        completedAt: new Date().toLocaleDateString('pt-BR'),
      };

      setSessionResult(result);
      setSessionState('completion');
      setIslandState('success');
    },
    [setIslandState]
  );

  // 7. Retornar para Educação: completion -> dashboard (com trilha e próxima ação atualizadas)
  const handleReturnToEducation = useCallback(() => {
    setIsSessionCompleted(true);
    setSessionState('dashboard');
    setIslandState('idle');
    // Restaura o modo do shell se foi alterado
    if (previousShellMode) {
      setMode(previousShellMode);
    }
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
    if (previousShellMode) {
      setMode(previousShellMode);
    }
  }, [previousShellMode, setIslandState, setMode]);

  // Abrir Tutor a partir do vídeo
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

  return (
    <main
      id="education-experience-root"
      className="w-full flex-1 flex flex-col px-4 sm:px-8 max-w-7xl mx-auto pt-4 relative"
    >
      {/* 1. Visão Geral / Dashboard da Trilha */}
      {sessionState === 'dashboard' && (
        <EducationDashboard
          onStartStudy={handleStartStudy}
          isSessionCompleted={isSessionCompleted}
          completedScore={sessionResult?.scorePercentage ?? 80}
        />
      )}

      {/* 2. Loading State: "PREPARANDO SUA AULA" */}
      {sessionState === 'loading' && (
        <StudyLoadingState
          onCancel={handleReturnToDashboard}
          onComplete={handleLoadingComplete}
          simulateFailure={isSimulateFailureActive}
          onSimulatedError={handleLoadingError}
        />
      )}

      {/* 3. Ready State: "AULA PRONTA" */}
      {sessionState === 'ready' && (
        <StudyReadyState onEnterStudy={handleEnterStudyMode} />
      )}

      {/* 4. Error State: Recuperável */}
      {sessionState === 'error' && (
        <StudyErrorState
          onRetry={handleRetryFromError}
          onReturnToDashboard={handleReturnToDashboard}
        />
      )}

      {/* 5. Study Mode: Vídeo + Resumo Vivo + Notas */}
      {(sessionState === 'study' || sessionState === 'transitioning_to_exercises') && (
        <div
          className={
            sessionState === 'transitioning_to_exercises' ? 'study-recede opacity-40' : ''
          }
        >
          <StudyModeView
            onCompleteLesson={handleCompleteLesson}
            onOpenTutor={handleOpenTutorFromVideo}
            notes={notes}
            onSaveNote={handleSaveNote}
          />
        </div>
      )}

      {/* 6. Exercícios: Prática Deliberada (5 questões) */}
      {sessionState === 'exercises' && (
        <StudyExercisesView
          onFinishExercises={handleFinishExercises}
          onOpenTutorForError={handleOpenTutorForError}
        />
      )}

      {/* 7. Conclusão da Sessão: Métricas Reais Auditáveis */}
      {sessionState === 'completion' && sessionResult && (
        <StudyCompletionView
          result={sessionResult}
          onReturnToEducation={handleReturnToEducation}
        />
      )}

      {/* Drawer Contextual do Tutor (Com suporte a Modo de Voz e Anti-Autoescuta) */}
      <TutorDrawer
        isOpen={isTutorOpen}
        onClose={handleCloseTutor}
        contextQuestion={tutorContextQuestion}
        videoTimestamp={currentVideoTimestamp}
      />
    </main>
  );
}
