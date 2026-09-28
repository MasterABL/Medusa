/**
 * MEDUSA — Body Domain — Validators (seção 35)
 *
 * Nunca aceita estrutura inválida em silêncio. Erros interpretáveis.
 */

import type { BodyAnswer, BodyDiagnosticQuestion, BodyPlan } from '../model/types';

export class BodyValidationError extends Error {}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/;

export function validateDate(value: string, field = 'date'): void {
  if (!ISO_DATE_RE.test(value)) {
    throw new BodyValidationError(`${field} precisa ser uma data ISO 8601 válida, recebeu: "${value}"`);
  }
}

/**
 * Valida a FORMA da resposta contra a pergunta correspondente (seção 10) —
 * single/multi/scale/free_text/duration cada um com seu formato esperado.
 */
export function validateAnswer(question: BodyDiagnosticQuestion, answer: BodyAnswer): void {
  if (question.id !== answer.questionId) {
    throw new BodyValidationError(
      `answer.questionId ("${answer.questionId}") não corresponde à pergunta fornecida ("${question.id}").`
    );
  }
  if (answer.type !== question.type) {
    throw new BodyValidationError(
      `answer.type ("${answer.type}") não corresponde ao tipo da pergunta ("${question.type}").`
    );
  }
  validateDate(answer.answeredAt, 'answer.answeredAt');

  if (answer.confidence !== undefined && (answer.confidence < 0 || answer.confidence > 1)) {
    throw new BodyValidationError(`answer.confidence precisa estar entre 0 e 1, recebeu: ${answer.confidence}`);
  }

  switch (question.type) {
    case 'single':
    case 'free_text': {
      if (typeof answer.value !== 'string' || (question.validation?.required && !answer.value.trim())) {
        throw new BodyValidationError(`answer.value precisa ser uma string não-vazia para a pergunta "${question.id}".`);
      }
      if (question.type === 'single' && !question.allowCustom && question.options && !question.options.includes(answer.value)) {
        throw new BodyValidationError(
          `answer.value ("${answer.value}") não está entre as opções permitidas da pergunta "${question.id}".`
        );
      }
      break;
    }
    case 'multi': {
      if (!Array.isArray(answer.value)) {
        throw new BodyValidationError(`answer.value precisa ser um array para a pergunta multi "${question.id}".`);
      }
      const min = question.validation?.minSelected ?? (question.validation?.required ? 1 : 0);
      const max = question.validation?.maxSelected;
      if (answer.value.length < min) {
        throw new BodyValidationError(`answer.value precisa ter ao menos ${min} item(ns) selecionado(s).`);
      }
      if (max !== undefined && answer.value.length > max) {
        throw new BodyValidationError(`answer.value não pode ter mais de ${max} item(ns) selecionado(s).`);
      }
      if (!question.allowCustom && question.options) {
        const invalid = answer.value.filter((v) => !question.options!.includes(v));
        if (invalid.length > 0) {
          throw new BodyValidationError(`answer.value contém opção(ões) inválida(s): ${invalid.join(', ')}.`);
        }
      }
      break;
    }
    case 'scale': {
      if (typeof answer.value !== 'number' || !Number.isFinite(answer.value)) {
        throw new BodyValidationError(`answer.value precisa ser um número finito para a pergunta scale "${question.id}".`);
      }
      const min = question.validation?.scaleMin ?? 0;
      const max = question.validation?.scaleMax ?? 10;
      if (answer.value < min || answer.value > max) {
        throw new BodyValidationError(`answer.value (${answer.value}) fora da escala permitida [${min}, ${max}].`);
      }
      break;
    }
    case 'duration': {
      if (typeof answer.value !== 'number' || !Number.isFinite(answer.value) || answer.value < 0) {
        throw new BodyValidationError(`answer.value precisa ser um número de minutos não-negativo para a pergunta "${question.id}".`);
      }
      break;
    }
  }
}

/**
 * Consistência mínima de um plano — não substitui as regras de negócio do
 * planning engine, só garante que a estrutura em si é íntegra.
 */
export function validatePlanIntegrity(plan: BodyPlan): void {
  if (plan.sessions.length === 0 && plan.status === 'active') {
    throw new BodyValidationError('Um plano "active" precisa ter ao menos uma sessão.');
  }
  if (plan.frequencyPerWeek < 0 || plan.frequencyPerWeek > 14) {
    throw new BodyValidationError(`plan.frequencyPerWeek fora de uma faixa plausível (0-14): ${plan.frequencyPerWeek}`);
  }
  for (const session of plan.sessions) {
    if (session.durationMinutes <= 0) {
      throw new BodyValidationError(`session.durationMinutes precisa ser positivo (sessão "${session.id}").`);
    }
    if (session.preferredDays.some((d) => d < 0 || d > 6)) {
      throw new BodyValidationError(`session.preferredDays precisa conter valores entre 0 e 6 (sessão "${session.id}").`);
    }
  }
}
