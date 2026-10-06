/**
 * MEDUSA FOUNDATION — registro do domínio Guardian
 *
 * Governança em si (policy/trust/approval/auditLog) já é lógica REAL nesta
 * própria rodada — ver src/foundation/guardian/*.ts. O que NÃO existe ainda é
 * a superfície de produto (a aba/dashboard descrita na seção 8) — por isso
 * `isLive: false` e as capabilities de UI ficam `implemented: false`, mesmo a
 * lógica de bastidor já funcionando.
 */

import type { DomainDefinition } from '../types/domain';

export const guardianDomain: DomainDefinition = {
  id: 'guardian',
  label: 'Guardian',
  icon: 'shield',
  route: '#guardian',
  isLive: false,
  persona: {
    id: 'persona-guardian',
    domain: 'guardian',
    displayName: 'Guardian',
    tone: 'formal, factual, nunca dramatiza risco nem minimiza impacto',
    interactionStyle: 'sempre mostra o motivo da classificação antes de pedir decisão',
    initiativeLevel: 'reativo',
    motionIdentityId: 'motion-guardian',
    soundProfileId: 'sound-guardian',
    decisionStyle: 'nunca eleva autonomia de um domínio sozinho — só registra e classifica',
  },
  capabilities: [
    {
      id: 'evaluateAction',
      domain: 'guardian',
      label: 'Avaliar ação',
      description: 'Classifica L1/L2/L3, gera Approval Request quando necessário e registra auditoria (já real, ver guardian/index.ts).',
      implemented: true,
      actionTypes: [],
    },
    {
      id: 'reviewApprovals',
      domain: 'guardian',
      label: 'Revisar aprovações pendentes',
      description: 'Dashboard de ApprovalRequest — superfície de produto ainda não construída.',
      implemented: false,
      actionTypes: [],
    },
    {
      id: 'viewAuditLog',
      domain: 'guardian',
      label: 'Ver histórico de autonomia',
      description: '"AUTONOMIA RECENTE" da seção 8 — superfície de produto ainda não construída.',
      implemented: false,
      actionTypes: [],
    },
  ],
  eventTypes: ['ACTION_EVALUATED', 'APPROVAL_REQUEST_CREATED', 'TRUST_STATE_CHANGED'],
  actionTypes: ['REMOVE_DUPLICATE_RECORDS', 'NORMALIZE_RECORD_FIELD', 'REDACT_EXPOSED_SECRET', 'ROTATE_SECRET'],
  motionIdentityId: 'motion-guardian',
  soundProfileId: 'sound-guardian',
  contextPanelId: 'context-panel-guardian',
};
