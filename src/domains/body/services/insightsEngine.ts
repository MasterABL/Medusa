/**
 * MEDUSA — Body Domain — Insights Engine (seção 17)
 *
 * Nunca chama nada de diagnóstico. Insights aqui são sobre planejamento de
 * rotina/atividade, nunca sobre condição física ou saúde.
 */

import type { DomainInsight } from '../../shared/insight';
import type { BodyPlan, RoutineLoadResult } from '../model/types';

export type BodyInsightType =
  | 'routine_load_high'
  | 'recovery_suggested'
  | 'workout_completed'
  | 'plan_ready'
  | 'schedule_window_found';

export interface BodyInsightContext {
  routineLoad?: RoutineLoadResult;
  plan?: BodyPlan;
  lastCompletedSessionId?: string;
  candidateWindowLabel?: string;
  now: string;
}

let counter = 0;
function makeId(type: string): string {
  counter += 1;
  return `body_insight_${type}_${Date.now()}_${counter}`;
}

export function generateBodyInsights(ctx: BodyInsightContext): Array<DomainInsight<BodyInsightType>> {
  const insights: Array<DomainInsight<BodyInsightType>> = [];

  if (ctx.routineLoad && ctx.routineLoad.level === 'alta') {
    insights.push({
      id: makeId('routine_load_high'),
      type: 'routine_load_high',
      observation: 'A rotina de hoje está com carga alta (trabalho + estudo + deslocamento comprometem boa parte do dia).',
      evidence: ctx.routineLoad.evidence,
      impact: 'Pouco espaço realista para atividade planejada hoje sem competir com outros compromissos.',
      severity: 'moderada',
      confidence: 0.75,
      proposedActionType: 'SCHEDULE_LIGHT_ACTIVITY',
      createdAt: ctx.now,
    });

    insights.push({
      id: makeId('recovery_suggested'),
      type: 'recovery_suggested',
      observation: 'Considerando a carga alta de hoje, uma sessão leve (mobilidade/caminhada) é mais sustentável que um treino intenso.',
      evidence: ctx.routineLoad.evidence,
      impact: 'Reduz risco de a rotina apertada virar motivo pra pular a atividade por completo.',
      severity: 'baixa',
      confidence: 0.6,
      createdAt: ctx.now,
    });
  }

  if (ctx.plan && ctx.plan.status === 'draft' && ctx.plan.sessions.length > 0) {
    insights.push({
      id: makeId('plan_ready'),
      type: 'plan_ready',
      observation: `Plano candidato pronto com ${ctx.plan.sessions.length} sessão(ões) por semana.`,
      evidence: [`frequência: ${ctx.plan.frequencyPerWeek}x/semana`, `estágio: ${ctx.plan.stage}`],
      impact: 'Plano aguardando aprovação para ser ativado.',
      severity: 'baixa',
      confidence: 1,
      proposedActionType: 'CREATE_BODY_PLAN',
      createdAt: ctx.now,
    });
  }

  if (ctx.lastCompletedSessionId) {
    insights.push({
      id: makeId('workout_completed'),
      type: 'workout_completed',
      observation: `Sessão "${ctx.lastCompletedSessionId}" concluída.`,
      evidence: [`sessionId: ${ctx.lastCompletedSessionId}`],
      severity: 'baixa',
      confidence: 1,
      createdAt: ctx.now,
    });
  }

  if (ctx.candidateWindowLabel) {
    insights.push({
      id: makeId('schedule_window_found'),
      type: 'schedule_window_found',
      observation: `Janela livre encontrada: "${ctx.candidateWindowLabel}".`,
      evidence: [`janela: ${ctx.candidateWindowLabel}`],
      severity: 'baixa',
      confidence: 0.8,
      proposedActionType: 'SCHEDULE_LIGHT_ACTIVITY',
      createdAt: ctx.now,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: makeId('insufficient_evidence'),
      type: 'insufficient_evidence',
      observation: 'Não há dados suficientes hoje para gerar um insight de Corpo confiável.',
      evidence: [],
      severity: 'baixa',
      confidence: 0,
      createdAt: ctx.now,
    });
  }

  return insights;
}
