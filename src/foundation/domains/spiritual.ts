/**
 * MEDUSA FOUNDATION — registro do domínio Espiritual (seção 25/26)
 *
 * Igual a finance.ts/body.ts: `isLive:false`, capabilities `implemented:false`
 * — nenhuma superfície de produto existe. A diferença desta rodada é que,
 * por baixo do registro, `src/domains/spiritual/` já tem um domínio real
 * (model/services/useCases/tests) — só não tem UI nem está registrado como
 * "ao vivo" pra ninguém confundir isso com feature pronta.
 *
 * Não assume nenhuma religião/crença específica — ver seção 26 (privacidade)
 * e docs/domains/SPIRITUAL.md.
 */

import type { DomainDefinition } from '../types/domain';

export const spiritualDomain: DomainDefinition = {
  id: 'spiritual',
  label: 'Espiritual',
  icon: 'sparkle',
  route: '#espiritual',
  isLive: false,
  persona: {
    id: 'persona-spiritual',
    domain: 'spiritual',
    displayName: 'Espiritual',
    tone: 'neutro, respeitoso, nunca prescritivo',
    interactionStyle: 'nunca opina sobre conteúdo de crença — só organiza prática/reflexão/rotina',
    initiativeLevel: 'reativo',
    motionIdentityId: 'motion-spiritual',
    soundProfileId: 'sound-spiritual',
    decisionStyle: 'nunca expõe conteúdo privado (reflexões) em canais genéricos — ver privacyBoundary',
  },
  capabilities: [
    {
      id: 'createReflection',
      domain: 'spiritual',
      label: 'Registrar reflexão',
      description: 'Registro privado de texto — nunca enviado a canais públicos do sistema automaticamente.',
      implemented: false,
      actionTypes: [],
    },
    {
      id: 'trackPractice',
      domain: 'spiritual',
      label: 'Registrar prática',
      description: 'Registro de uma prática concluída, alimenta progresso de metas.',
      implemented: false,
      actionTypes: [],
    },
    {
      id: 'schedulePractice',
      domain: 'spiritual',
      label: 'Agendar prática',
      description: 'Cria uma proposta de bloco na Agenda para uma prática recorrente.',
      implemented: false,
      actionTypes: ['SCHEDULE_PRACTICE'],
    },
    {
      id: 'createGoal',
      domain: 'spiritual',
      label: 'Criar meta espiritual',
      description: 'Meta com marcos, mesmo modelo compartilhado de Goals da fundação.',
      implemented: false,
      actionTypes: [],
    },
    {
      id: 'reviewRoutine',
      domain: 'spiritual',
      label: 'Revisar rotina espiritual',
      description: 'Consolida práticas/reflexões recentes num resumo.',
      implemented: false,
      actionTypes: [],
    },
    {
      id: 'readingPlan',
      domain: 'spiritual',
      label: 'Plano de leitura bíblica',
      description: 'Sequência, progresso, continuidade e retomada sem culpa (engine real em src/domains/spiritual/services).',
      implemented: false,
      actionTypes: [],
    },
    {
      id: 'bibleStudy',
      domain: 'spiritual',
      label: 'Estudo bíblico',
      description: 'Estudo com texto, explicação de IA e reflexão pessoal mantidos separados.',
      implemented: false,
      actionTypes: [],
    },
    {
      id: 'purpose',
      domain: 'spiritual',
      label: 'Propósito',
      description: 'Liga propósito a práticas, estudos e leitura; mede continuidade, não pontos.',
      implemented: false,
      actionTypes: [],
    },
    {
      id: 'contextualAssistant',
      domain: 'spiritual',
      label: 'Assistente contextual',
      description: 'Contrato para uma IA futura, com contexto autorizado e sem acesso a reflexões privadas.',
      implemented: false,
      actionTypes: [],
    },
  ],
  eventTypes: [
    'PRACTICE_COMPLETED',
    'REFLECTION_CREATED',
    'GOAL_PROGRESS_CHANGED',
    'PRACTICE_SCHEDULED',
    'READING_ENTRY_COMPLETED',
    'STUDY_CONCLUDED',
    'DAILY_VERSE_SELECTED',
  ],
  actionTypes: ['SCHEDULE_PRACTICE', 'UPDATE_GOAL_PROGRESS'],
  motionIdentityId: 'motion-spiritual',
  soundProfileId: 'sound-spiritual',
  contextPanelId: 'context-panel-spiritual',
};
