/**
 * ==============================================================================
 * MEDUSA SHELL V2 — ISLAND DEMONSTRATION FIXTURES (SHELL V2 CLOSED CATALOG)
 * ==============================================================================
 * NOTA DE ARQUITETURA:
 * Os textos e estados abaixo ("Física Quântica", "Refinamento Arquitetural",
 * "Sessão Concluída", "Síntese Diária", etc.) são ESTRITAMENTE FIXTURES DEMONSTRATIVOS
 * do Shell V2 nesta etapa de fundação visual.
 * 
 * NÃO representam modelos de domínio ou lógicas de estudo ativas.
 * O catálogo abaixo é rigorosamente fechado em exatamente 10 estados canônicos.
 * ==============================================================================
 */

import { IslandFixture, IslandState } from '@/types/shell';

export const ISLAND_FIXTURES: Record<IslandState, IslandFixture> = {
  idle: {
    state: 'idle',
    num: 1,
    label: 'Idle',
    signature: '[ • Hoje ]',
    tag: 'Hoje',
    desc: 'Ciclo 03 · Tudo em dia',
    timerBadge: 'Pronto',
    badgeType: 'primary',
    primaryAction: {
      label: 'Iniciar',
      variant: 'primary',
    },
    returnBehavior: 'Persistente',
  },
  context: {
    state: 'context',
    num: 2,
    label: 'Context',
    signature: '[ Estudo · Física ]',
    tag: 'Estudo',
    desc: 'Física Quântica',
    timerBadge: 'Ciclo 03',
    badgeType: 'secondary',
    primaryAction: {
      label: 'Ver',
      variant: 'secondary',
    },
    returnBehavior: 'Ao navegar',
  },
  active: {
    state: 'active',
    num: 3,
    label: 'Active',
    signature: '[ ● Física · 32m | Pausar | Concluir ]',
    tag: 'Foco Contínuo',
    desc: 'Revisão de Rotina',
    timerBadge: '32 min',
    badgeType: 'primary',
    secondaryAction: {
      label: 'Pausar',
      variant: 'ghost',
    },
    primaryAction: {
      label: 'Concluir',
      icon: 'check',
      variant: 'primary',
    },
    returnBehavior: 'Sessão em curso',
  },
  processing: {
    state: 'processing',
    num: 4,
    label: 'Processing',
    signature: '[ Sincronizando... ]',
    tag: 'Sincronizando',
    desc: 'Gravando na nuvem pessoal',
    timerBadge: '...',
    badgeType: 'accent',
    returnBehavior: 'Auto (800ms)',
  },
  success: {
    state: 'success',
    num: 5,
    label: 'Success',
    signature: '[ ✓ Sessão Concluída ]',
    tag: 'Sessão Concluída',
    desc: '32m registrados no Ciclo',
    timerBadge: '✓ 100%',
    badgeType: 'support',
    returnBehavior: 'Retorno 3s',
  },
  attention: {
    state: 'attention',
    num: 6,
    label: 'Attention',
    signature: '[ Alinhamento em 15m ]',
    tag: 'Alinhamento Iminente',
    desc: 'Início em 15 minutos',
    timerBadge: '14:30',
    badgeType: 'accent',
    primaryAction: {
      label: 'Abrir',
      variant: 'accent',
    },
    returnBehavior: 'Ao dispensar',
  },
  error: {
    state: 'error',
    num: 7,
    label: 'Error',
    signature: '[ ! Falha de Sync · Tentar ]',
    tag: 'Aviso de Sincronia',
    desc: 'Reconectando rede...',
    timerBadge: '!',
    badgeType: 'tertiary',
    primaryAction: {
      label: 'Repetir',
      variant: 'tertiary',
    },
    returnBehavior: 'Manual',
  },
  summary: {
    state: 'summary',
    num: 8,
    label: 'Summary',
    signature: '[ 3/4 Blocos Feitos · Próximo 14h ]',
    tag: 'Síntese Diária',
    desc: '3 de 4 Blocos Feitos',
    timerBadge: '75%',
    badgeType: 'secondary',
    primaryAction: {
      label: 'Ver',
      variant: 'secondary',
    },
    returnBehavior: 'Ao clicar',
  },
  focus: {
    state: 'focus',
    num: 9,
    label: 'Focus (Zen)',
    signature: '[ ● Física · 32m ]',
    tag: '● Física',
    desc: '32m',
    badgeType: 'primary',
    returnBehavior: 'Durante Foco',
  },
  collapsed: {
    state: 'collapsed',
    num: 10,
    label: 'Collapsed',
    signature: '[ • ]',
    tag: '•',
    desc: '',
    badgeType: 'muted',
    returnBehavior: 'Hover/Toque',
  },
};

export const ISLAND_STATE_LIST: IslandState[] = [
  'active',
  'idle',
  'context',
  'processing',
  'success',
  'attention',
  'error',
  'summary',
  'focus',
  'collapsed',
];
