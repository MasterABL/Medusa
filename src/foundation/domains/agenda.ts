/**
 * MEDUSA FOUNDATION — registro do domínio Agenda
 *
 * Domínio REAL. A Agenda já é agnóstica ao significado de cada item — ver
 * `AgendaItem.domain`/`AgendaItem.source` em src/types/agenda.ts (`AgendaDomain`,
 * `AgendaSourceRef`), que já satisfaz a seção 14 da missão ("a Agenda sabe que
 * isso veio de Corpo, mas não precisa saber qual músculo está sendo
 * treinado"). Este arquivo NÃO duplica esse modelo — só declara o contrato de
 * capabilities pro Domain Registry.
 */

import type { DomainDefinition } from '../types/domain';

export const agendaDomain: DomainDefinition = {
  id: 'agenda',
  label: 'Agenda',
  icon: 'calendar',
  accentToken: '--agenda-accent',
  route: '#agenda',
  isLive: true,
  persona: {
    id: 'persona-agenda',
    domain: 'agenda',
    displayName: 'Agenda',
    tone: 'direto, objetivo, fala em janelas de tempo concretas',
    interactionStyle: 'sempre explica a partir de que horário/conflito concluiu algo',
    initiativeLevel: 'proativo',
    motionIdentityId: 'motion-agenda',
    soundProfileId: 'sound-agenda',
    decisionStyle: 'nunca cria silenciosamente quando detecta ambiguidade — pergunta ou propõe alternativa',
  },
  capabilities: [
    {
      id: 'schedule',
      domain: 'agenda',
      label: 'Agendar item',
      description: 'Cria um AgendaItem novo (já real, ver AgendaContext.addItem).',
      implemented: true,
      actionTypes: ['SCHEDULE_ITEM'],
    },
    {
      id: 'reschedule',
      domain: 'agenda',
      label: 'Reagendar item',
      description: 'Move um item existente para outro horário/dia.',
      implemented: true,
      actionTypes: ['RESCHEDULE_ITEM'],
    },
    {
      id: 'detectConflict',
      domain: 'agenda',
      label: 'Detectar conflito',
      description: 'Identifica sobreposição de horário (já real, ver detectTimeConflicts em agendaHelpers.ts).',
      implemented: true,
      actionTypes: [],
    },
    {
      id: 'suggestWindow',
      domain: 'agenda',
      label: 'Sugerir janela livre',
      description: 'Encontra um horário compatível para uma solicitação de outro domínio.',
      implemented: false,
      actionTypes: ['SUGGEST_TIME_WINDOW'],
    },
  ],
  eventTypes: ['TIME_CONFLICT_DETECTED', 'ITEM_SCHEDULED', 'ITEM_RESCHEDULED', 'AGENDA_DENSITY_HIGH'],
  // MOVE_STUDY_BLOCK_WITHIN_WINDOW/RESCHEDULE_IMPORTANT_EVENT/CANCEL_EVENT existem aqui como
  // tipos de ação mais finos que RESCHEDULE_ITEM — são exatamente os 3 exemplos de risco
  // crescente da seção 4 da missão (L1/L2/L3 na mesma Agenda, nunca "Agenda = X% de confiança").
  actionTypes: [
    'SCHEDULE_ITEM',
    'RESCHEDULE_ITEM',
    'SUGGEST_TIME_WINDOW',
    'MOVE_STUDY_BLOCK_WITHIN_WINDOW',
    'RESCHEDULE_IMPORTANT_EVENT',
    'CANCEL_EVENT',
  ],
  motionIdentityId: 'motion-agenda',
  soundProfileId: 'sound-agenda',
  contextPanelId: 'context-panel-agenda',
};
