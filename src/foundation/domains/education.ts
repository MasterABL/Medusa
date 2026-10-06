/**
 * MEDUSA FOUNDATION — registro do domínio Educação
 *
 * Domínio REAL, já vivo no produto (Study Mode, Cronograma, Tutor — ver
 * src/components/education/). Este arquivo não reimplementa nada disso —
 * só declara o contrato (capabilities/eventos/tipos de ação) pra provar que
 * o registry funciona contra um domínio de verdade, não um brinquedo.
 */

import type { DomainDefinition } from '../types/domain';

export const educationDomain: DomainDefinition = {
  id: 'education',
  label: 'Educação',
  icon: 'school',
  accentToken: '--edu-accent',
  route: '#educacao',
  isLive: true,
  persona: {
    id: 'persona-education',
    domain: 'education',
    displayName: 'Educação',
    tone: 'didático, paciente, constrói explicações passo a passo',
    interactionStyle: 'pergunta o que já foi entendido antes de avançar',
    initiativeLevel: 'moderado',
    motionIdentityId: 'motion-education',
    soundProfileId: 'sound-education',
    decisionStyle: 'prioriza retenção de longo prazo sobre velocidade',
  },
  capabilities: [
    {
      id: 'createStudyPlan',
      domain: 'education',
      label: 'Criar plano de estudo',
      description: 'Monta o Cronograma a partir de diagnóstico e disponibilidade (já real, ver CronogramaOnboarding).',
      implemented: true,
      actionTypes: ['CREATE_STUDY_PLAN'],
    },
    {
      id: 'createReview',
      domain: 'education',
      label: 'Criar revisão derivada de uma aula',
      description: 'Gera um bloco de revisão espaçada após uma aula concluída.',
      implemented: false,
      actionTypes: ['CREATE_REVIEW_BLOCK'],
    },
    {
      id: 'analyzeMaterial',
      domain: 'education',
      label: 'Analisar material de estudo',
      description: 'Interpreta um material carregado e extrai pontos-chave.',
      implemented: false,
      actionTypes: ['ANALYZE_MATERIAL'],
    },
    {
      id: 'generateLesson',
      domain: 'education',
      label: 'Gerar aula',
      description: 'Aula Escrita por blocos pedagógicos (já real, ver LessonWrittenContent).',
      implemented: true,
      actionTypes: ['GENERATE_LESSON'],
    },
  ],
  eventTypes: ['LESSON_COMPLETED', 'STUDY_BLOCK_CREATED', 'MATERIAL_UPLOADED'],
  actionTypes: ['CREATE_STUDY_PLAN', 'CREATE_REVIEW_BLOCK', 'ANALYZE_MATERIAL', 'GENERATE_LESSON'],
  motionIdentityId: 'motion-education',
  soundProfileId: 'sound-education',
  contextPanelId: 'context-panel-education',
};
