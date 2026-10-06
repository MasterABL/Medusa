/**
 * MEDUSA FOUNDATION — registro do domínio Hoje
 *
 * Hoje NÃO é especialista de um domínio (seção 3/13) — é a camada de síntese/
 * contexto/atenção. Registrado aqui só para caber no mesmo Domain Registry
 * que todo o resto, sem virar um "domínio de conteúdo" com capabilities de
 * produto como os outros.
 */

import type { DomainDefinition } from '../types/domain';

export const hojeDomain: DomainDefinition = {
  id: 'hoje',
  label: 'Hoje',
  icon: 'today',
  route: '#hoje',
  isLive: true,
  persona: {
    id: 'persona-hoje',
    domain: 'hoje',
    displayName: 'Hoje',
    tone: 'sintetiza sem repetir o que os domínios já disseram',
    interactionStyle: 'responde "o que merece minha atenção agora", nunca duplica um domínio inteiro',
    initiativeLevel: 'reativo',
  },
  capabilities: [
    {
      id: 'aggregateContext',
      domain: 'hoje',
      label: 'Agregar contexto multidomínio',
      description: 'Lê AGORA/PRÓXIMO/ATENÇÃO/RITMO de todos os domínios registrados e apresenta uma síntese.',
      implemented: false,
      actionTypes: [],
    },
  ],
  eventTypes: [],
  actionTypes: [],
  contextPanelId: 'context-panel-hoje',
};
