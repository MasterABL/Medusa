/**
 * MEDUSA FOUNDATION — contrato FUTURO do domínio Corpo (seções 21-26/46)
 *
 * Igual a finance.ts: nenhuma implementação de produto. Sem wearable real,
 * sem dados reais de saúde, sem questionário definitivo — só o contrato de
 * schema/tipos de pergunta/perfil/plano que a seção 22 pede.
 */

import type { DomainDefinition } from '../types/domain';

// ---------------------------------------------------------------------------
// Contratos de dados futuros
// ---------------------------------------------------------------------------

export type BodyQuestionType = 'single_choice' | 'multi_choice' | 'scale' | 'free_text' | 'duration';

export interface BodyDiagnosticQuestion {
  id: string;
  type: BodyQuestionType;
  prompt: string;
  options?: string[];
}

export interface BodyProfile {
  id: string;
  objectives: string[];
  routineSummary: string;
  availabilityWindows: string[]; // referências a janelas livres já resolvidas pela Agenda
  experienceLevel: 'iniciante' | 'intermediario' | 'avancado';
  limitations?: string[];
}

export type BodyPlanStage = 'diagnostico' | 'entendimento' | 'plano' | 'ativacao';

export interface BodyPlan {
  id: string;
  stage: BodyPlanStage;
  summary: string;
  /** Blocos que, uma vez ativados, viram AgendaItem com origin=body (ver types/agenda.ts). */
  scheduledSessionIds: string[];
}

// ---------------------------------------------------------------------------
// Registro do domínio — contrato apenas, `isLive: false`.
// ---------------------------------------------------------------------------

export const bodyDomain: DomainDefinition = {
  id: 'body',
  label: 'Corpo',
  icon: 'fitness',
  route: '#corpo',
  isLive: false,
  persona: {
    id: 'persona-body',
    domain: 'body',
    displayName: 'Corpo',
    tone: 'calmo, acolhedor, nunca performático ou "hardcore fitness"',
    interactionStyle: 'considera energia/rotina antes de propor qualquer atividade',
    initiativeLevel: 'moderado',
    motionIdentityId: 'motion-body',
    soundProfileId: 'sound-body',
    decisionStyle: 'nunca decide sozinho fora do escopo de planejamento/acompanhamento seguro',
  },
  capabilities: [
    {
      id: 'buildPlan',
      domain: 'body',
      label: 'Montar plano de atividade',
      description: 'Diagnóstico → Entendimento → Plano → Ativação (seção 22).',
      implemented: false,
      actionTypes: ['CREATE_BODY_PLAN'],
    },
    {
      id: 'suggestExercise',
      domain: 'body',
      label: 'Sugerir exercício',
      description: 'Considera disponibilidade, academia, trajeto e objetivo.',
      implemented: false,
      actionTypes: [],
    },
    {
      id: 'scheduleWorkout',
      domain: 'body',
      label: 'Encaixar sessão na Agenda',
      description: 'Pede à Agenda uma janela compatível — nunca cria direto sem passar pela Agenda.',
      implemented: false,
      actionTypes: ['SCHEDULE_WORKOUT'],
    },
    {
      id: 'analyzeRoutine',
      domain: 'body',
      label: 'Analisar carga da rotina',
      description: 'Cruza densidade da Agenda com energia/recuperação (seção 24).',
      implemented: false,
      actionTypes: [],
    },
  ],
  eventTypes: ['ROUTINE_LOAD_HIGH', 'WORKOUT_COMPLETED', 'RECOVERY_SUGGESTED'],
  actionTypes: ['CREATE_BODY_PLAN', 'SCHEDULE_WORKOUT', 'SCHEDULE_LIGHT_ACTIVITY'],
  motionIdentityId: 'motion-body',
  soundProfileId: 'sound-body',
  contextPanelId: 'context-panel-body',
};
