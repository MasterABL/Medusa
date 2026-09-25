'use client';

import React, { useState } from 'react';
import { ExerciseQuestion, TrackDefinition } from './types';
import { playFeedback } from '@/lib/audioFeedback';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';

interface StudyExercisesViewProps {
  trackDef: TrackDefinition;
  onFinishExercises: (correctCount: number, totalCount: number, errorTopics: string[]) => void;
  onOpenTutorForError: (question: ExerciseQuestion) => void;
}

export function StudyExercisesView({
  trackDef,
  onFinishExercises,
  onOpenTutorForError,
}: StudyExercisesViewProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [userAnswers, setUserAnswers] = useState<
    { questionId: number; selectedOptionId: string; isCorrect: boolean }[]
  >([]);

  const questions = trackDef.exerciseQuestions;
  const currentQuestion = questions[currentQuestionIndex] || questions[0];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const currentAnswer = userAnswers.find((a) => a.questionId === currentQuestion.id);
  const isCorrect = currentAnswer?.isCorrect ?? false;

  const handleSelectOption = (optId: string) => {
    if (isAnswerSubmitted) return;
    setSelectedOptionId(optId);
    playFeedback('action');
  };

  const handleSubmitAnswer = () => {
    if (!selectedOptionId || isAnswerSubmitted) return;

    const correct = selectedOptionId === currentQuestion.correctOptionId;
    const newAnswer = {
      questionId: currentQuestion.id,
      selectedOptionId,
      isCorrect: correct,
    };

    setUserAnswers((prev) => {
      const filtered = prev.filter((a) => a.questionId !== currentQuestion.id);
      return [...filtered, newAnswer];
    });
    setIsAnswerSubmitted(true);
    playFeedback(correct ? 'learning_correct' : 'learning_error');
  };

  const handleRetryQuestion = () => {
    setIsAnswerSubmitted(false);
    setSelectedOptionId(null);
    playFeedback('action');
  };

  const handleNextQuestion = () => {
    if (isLastQuestion) {
      // Calcular métricas derivadas da sessão
      const finalAnswers = [...userAnswers];
      const correctCount = finalAnswers.filter((a) => a.isCorrect).length;
      const errorQuestions = questions.filter(
        (q) => !finalAnswers.find((a) => a.questionId === q.id)?.isCorrect
      );
      const errorTopics = errorQuestions.map((q) => q.topic);
      onFinishExercises(correctCount, questions.length, errorTopics);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setIsAnswerSubmitted(false);
    }
  };

  return (
    <div
      id="study-exercises-container"
      className="study-exercise-slide w-full max-w-4xl mx-auto flex flex-col gap-6 py-6 pb-16"
    >
      {/* Header dos Exercícios */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 px-2.5 py-0.5 rounded-full border border-[#71DBD2]/30">
              Prática Deliberada · {trackDef.name}
            </span>
            <span className="text-text-muted/40">•</span>
            <span className="text-[11px] font-mono text-text-muted">
              Questão {currentQuestionIndex + 1} de {questions.length}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary">
            {currentQuestion.topic}
          </h2>
        </div>

        {/* Indicador de Progresso com bolinhas de estado */}
        <div className="flex items-center gap-1.5 bg-surface p-1.5 rounded-full border border-border/70 shadow-subtle">
          {questions.map((q, idx) => {
            const answered = userAnswers.find((a) => a.questionId === q.id);
            let dotClass = 'bg-surface-secondary border border-border text-text-muted';
            if (answered) {
              dotClass = answered.isCorrect
                ? 'bg-medusa-support/30 border-medusa-support text-[#1B502C] dark:text-medusa-support font-semibold'
                : 'bg-medusa-tertiary/30 border-medusa-tertiary text-[#3D4C1D] dark:text-[#D0EAA3] font-semibold';
            } else if (idx === currentQuestionIndex) {
              dotClass = 'bg-medusa-primary border-medusa-primary text-[#1C2420] font-bold';
            }

            return (
              <span
                key={q.id}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono transition-all ${dotClass}`}
                title={`Questão ${idx + 1}`}
              >
                {idx + 1}
              </span>
            );
          })}
        </div>
      </div>

      {/* Cartão Central da Questão */}
      <div className="bg-surface rounded-2xl p-6 sm:p-8 border border-border/70 shadow-calm flex flex-col gap-6">
        {/* Enunciado */}
        <div className="text-[15px] sm:text-[16px] text-text-primary leading-relaxed font-normal">
          {currentQuestion.question}
        </div>

        {/* Lista de Alternativas */}
        <div className="flex flex-col gap-3">
          {currentQuestion.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            let itemStyle =
              'bg-surface-secondary/60 border-border/60 hover:border-medusa-primary/40 text-text-secondary hover:text-text-primary active:scale-[0.98]';

            let statusIcon: React.ReactNode = opt.letter;

            if (isAnswerSubmitted) {
              if (opt.id === currentQuestion.correctOptionId) {
                itemStyle =
                  'bg-medusa-support/20 border-medusa-support/70 text-text-primary shadow-subtle spring-success font-medium';
                statusIcon = (
                  <AnimatedIcon name="check" state="success" size={15} />
                );
              } else if (isSelected && !isCorrect) {
                itemStyle =
                  'bg-medusa-alert/15 border-medusa-alert/70 text-text-primary shadow-subtle shake-error';
                statusIcon = (
                  <AnimatedIcon name="close" state="error" size={15} />
                );
              } else {
                itemStyle = 'opacity-40 bg-surface-secondary/40 border-border/40';
              }
            } else if (isSelected) {
              itemStyle =
                'bg-medusa-primary/15 border-medusa-primary text-text-primary shadow-subtle';
            }

            return (
              <button
                key={opt.id}
                type="button"
                id={`option-${opt.letter.toLowerCase()}`}
                disabled={isAnswerSubmitted}
                onClick={() => handleSelectOption(opt.id)}
                className={`btn-interactive p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all text-[13px] leading-relaxed focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none ${itemStyle}`}
              >
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-[12px] font-mono font-bold flex-shrink-0 mt-0.5 border ${
                    isSelected
                      ? 'bg-medusa-primary text-[#1C2420] border-medusa-primary'
                      : 'bg-surface border-border text-text-muted'
                  }`}
                >
                  {statusIcon}
                </span>
                <span className="flex-1">{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Painel de Feedback Consequente (Acerto ou Erro Pedagógico) */}
        {isAnswerSubmitted && (
          <div
            id="exercise-feedback-panel"
            className={`p-5 rounded-xl border flex flex-col gap-3 transition-all ${
              isCorrect
                ? 'bg-medusa-support/15 border-medusa-support/40 text-text-primary'
                : 'bg-medusa-tertiary/20 border-medusa-tertiary/50 text-text-primary'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">
                  {isCorrect ? 'check_circle' : 'error'}
                </span>
                <span className="font-semibold text-[14px]">
                  {isCorrect ? 'Resposta Correta' : 'Resposta Incorreta · Oportunidade de Aprendizado'}
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                {isCorrect ? 'Fixação Confirmada' : 'Diagnóstico'}
              </span>
            </div>

            <p className="text-[13px] leading-relaxed text-text-secondary">
              {currentQuestion.explanation}
            </p>

            {/* Se o usuário errou, consequência pedagógica real: o que foi confundido, retry e convite ao Tutor */}
            {!isCorrect && (
              <div className="mt-1 pt-3 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#3D4C1D] dark:text-[#D0EAA3] font-bold">
                    O que costuma ser confundido:
                  </span>
                  <p className="text-[12px] text-text-secondary leading-snug">
                    {currentQuestion.confusionDiagnosis}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    id="btn-retry-question"
                    onClick={handleRetryQuestion}
                    className="btn-interactive self-start sm:self-auto bg-surface hover:bg-surface-secondary border border-border/80 text-text-primary px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all shadow-subtle flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex-shrink-0"
                  >
                    <AnimatedIcon name="refresh" size={16} interactive />
                    <span>Tentar novamente</span>
                  </button>

                  <button
                    type="button"
                    id="btn-understand-error"
                    onClick={() => onOpenTutorForError(currentQuestion)}
                    className="btn-interactive self-start sm:self-auto bg-surface hover:bg-surface-secondary border border-border/80 text-text-primary px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all shadow-subtle flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex-shrink-0"
                  >
                    <AnimatedIcon name="tutor" size={16} interactive />
                    <span>Entender meu erro</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rodapé de Ação: Responder ou Próxima */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <span className="text-[11px] font-mono text-text-muted">
            {isAnswerSubmitted ? 'Conceito avaliado' : 'Selecione uma alternativa para validar'}
          </span>

          <div className="flex items-center gap-2">
            {!isAnswerSubmitted ? (
              <button
                type="button"
                id="btn-submit-answer"
                disabled={!selectedOptionId}
                onClick={handleSubmitAnswer}
                className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] disabled:opacity-40 disabled:pointer-events-none px-6 py-2 rounded-full text-[13px] font-semibold transition-all shadow-subtle focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
              >
                Confirmar Resposta
              </button>
            ) : (
              <button
                type="button"
                id="btn-next-question"
                onClick={handleNextQuestion}
                className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] px-6 py-2 rounded-full text-[13px] font-semibold transition-all shadow-subtle flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
              >
                <span>{isLastQuestion ? 'Finalizar Sessão' : 'Próxima Questão'}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
