/**
 * MEDUSA — Body ↔ Agenda adapter (seção 15)
 *
 * Fluxo: BodyPlan → candidate session → Agenda scheduling request → conflict
 * detection (responsabilidade da própria Agenda) → suggested window →
 * Action → Guardian. Este adapter só traduz, nunca decide horário — quem
 * decide conflito/horário final é a Agenda.
 */

import { toAgendaDomain, toAgendaSourceRef } from '../../../foundation/domains/agendaBridge';
import { getActivity } from '../model/activityCatalog';
import type { BodySession } from '../model/types';

export interface AgendaSchedulingRequest {
  title: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  agendaDomain: ReturnType<typeof toAgendaDomain>;
  source: ReturnType<typeof toAgendaSourceRef>;
  description?: string;
}

export function buildSessionSchedulingRequest(planId: string, session: BodySession, proposedDate: string): AgendaSchedulingRequest {
  const activity = getActivity(session.activityId);
  const label = activity?.label ?? 'Atividade física';

  return {
    title: label,
    date: proposedDate,
    durationMinutes: session.durationMinutes,
    agendaDomain: toAgendaDomain('body'),
    source: toAgendaSourceRef('body', planId, label),
    description: `Sessão planejada (${session.intensity}) — parte do plano ${planId}.`,
  };
}

export function buildLightActivitySchedulingRequest(activityId: string, proposedDate: string, durationMinutes: number, reason: string): AgendaSchedulingRequest {
  const activity = getActivity(activityId);
  const label = activity?.label ?? 'Atividade leve';

  return {
    title: label,
    date: proposedDate,
    durationMinutes,
    agendaDomain: toAgendaDomain('body'),
    source: toAgendaSourceRef('body', activityId, label),
    description: reason,
  };
}
