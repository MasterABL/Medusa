/**
 * MEDUSA FOUNDATION — ponte com o modelo já existente da Agenda (seção 14/20)
 *
 * A Agenda JÁ É agnóstica ao significado interno de cada domínio — ver
 * `AgendaDomain`/`AgendaSourceRef` em src/types/agenda.ts (código
 * pré-existente, não tocado nesta rodada). Este módulo só faz a tradução
 * entre o `DomainId` da fundação multidomínio e o vocabulário que a Agenda
 * já usa — nunca duplica a lógica da Agenda, nunca a reescreve.
 */

import type { DomainId } from '../types/domain';
import type { AgendaDomain, AgendaSourceRef, AgendaSourceType } from '@/types/agenda';

const DOMAIN_TO_AGENDA_DOMAIN: Partial<Record<DomainId, AgendaDomain>> = {
  education: 'education',
  body: 'body',
  finance: 'finance',
};

const DOMAIN_TO_SOURCE_TYPE: Partial<Record<DomainId, AgendaSourceType>> = {
  education: 'education_session',
  body: 'workout',
  finance: 'finance_deadline',
};

/**
 * Domínios que a Agenda ainda não tem um `AgendaDomain` dedicado (ex.:
 * Guardian nunca cria item de agenda) caem em `'external'` — nunca em erro,
 * porque a Agenda deve continuar funcionando mesmo que um domínio novo seja
 * registrado antes de alguém atualizar este mapa.
 */
export function toAgendaDomain(domain: DomainId): AgendaDomain {
  return DOMAIN_TO_AGENDA_DOMAIN[domain] ?? 'external';
}

export function toAgendaSourceRef(domain: DomainId, sourceId?: string, sourceLabel?: string): AgendaSourceRef {
  return {
    sourceType: DOMAIN_TO_SOURCE_TYPE[domain] ?? 'external',
    sourceId,
    sourceLabel,
  };
}
