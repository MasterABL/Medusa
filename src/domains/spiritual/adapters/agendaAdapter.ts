/**
 * MEDUSA — Spiritual ↔ Agenda adapter (seção 27)
 *
 * A Agenda só conhece `domain: spiritual / sourceType / sourceId` — nunca
 * sabe o que é uma "prática" de verdade. Como `AgendaDomain`/
 * `AgendaSourceType` (src/types/agenda.ts, código real da Agenda, não
 * tocado) ainda não têm um valor dedicado para Espiritual, a ponte
 * (`agendaBridge.ts`) já cai em `'external'` por desenho — não é erro, é o
 * comportamento documentado para qualquer domínio sem mapeamento ainda.
 */

import { toAgendaDomain, toAgendaSourceRef } from '../../../foundation/domains/agendaBridge';

export interface AgendaSchedulingRequest {
  title: string;
  date: string; // YYYY-MM-DD
  agendaDomain: ReturnType<typeof toAgendaDomain>;
  source: ReturnType<typeof toAgendaSourceRef>;
  description?: string;
}

export function buildPracticeSchedulingRequest(practiceType: string, label: string, proposedDate: string): AgendaSchedulingRequest {
  return {
    title: label,
    date: proposedDate,
    agendaDomain: toAgendaDomain('spiritual'),
    source: toAgendaSourceRef('spiritual', undefined, label),
    description: `Prática espiritual planejada (${practiceType}).`,
  };
}
