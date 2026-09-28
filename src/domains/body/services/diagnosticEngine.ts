/**
 * MEDUSA — Body Domain — Diagnostic Engine (seção 10)
 *
 * Question → Answer → Diagnostic session → Body profile. Este arquivo cobre
 * as três primeiras etapas; `profileEngine.ts` cobre a última.
 */

import { validateAnswer } from '../validators';
import { getDiagnosticQuestion } from '../model/diagnosticQuestions';
import type { BodyAnswer, DiagnosticSession } from '../model/types';

export class DiagnosticSessionError extends Error {}

export function startDiagnosticSession(id: string, nowISO: string): DiagnosticSession {
  return {
    id,
    startedAt: nowISO,
    answers: [],
    status: 'in_progress',
  };
}

/**
 * Valida a resposta contra a pergunta do catálogo e a anexa à sessão.
 * Responder a mesma pergunta de novo SUBSTITUI a resposta anterior — uma
 * sessão não deve acumular respostas contraditórias pra uma pergunta só.
 */
export function answerQuestion(session: DiagnosticSession, answer: BodyAnswer): DiagnosticSession {
  if (session.status !== 'in_progress') {
    throw new DiagnosticSessionError(`Não é possível responder — sessão está "${session.status}", não "in_progress".`);
  }

  const question = getDiagnosticQuestion(answer.questionId);
  if (!question) {
    throw new DiagnosticSessionError(`Pergunta desconhecida: "${answer.questionId}".`);
  }

  validateAnswer(question, answer);

  const withoutPrevious = session.answers.filter((a) => a.questionId !== answer.questionId);
  return { ...session, answers: [...withoutPrevious, answer] };
}

export function completeDiagnosticSession(session: DiagnosticSession, nowISO: string): DiagnosticSession {
  if (session.status !== 'in_progress') {
    throw new DiagnosticSessionError(`Não é possível concluir — sessão está "${session.status}", não "in_progress".`);
  }
  return { ...session, status: 'completed', completedAt: nowISO };
}

export function abandonDiagnosticSession(session: DiagnosticSession, nowISO: string): DiagnosticSession {
  if (session.status !== 'in_progress') {
    throw new DiagnosticSessionError(`Não é possível abandonar — sessão está "${session.status}", não "in_progress".`);
  }
  return { ...session, status: 'abandoned', completedAt: nowISO };
}
