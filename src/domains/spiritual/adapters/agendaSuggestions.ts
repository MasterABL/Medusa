/**
 * MEDUSA — Spiritual → Agenda: sugestões temporais
 *
 * Converte práticas e leituras em SUGESTÕES para a Agenda — a Agenda continua
 * decidindo o horário e criando o item. Só metadado sai daqui: título genérico
 * da prática, janela, duração, prioridade. A intenção do usuário nunca.
 */

import { toAgendaDomain, toAgendaSourceRef } from '../../../foundation/domains/agendaBridge';
import type { AgendaItemKind } from '@/types/agenda';
import { formatReference } from '../model/bible';
import type { PracticeDefinition, PracticeKind } from '../model/purpose';
import type { ReadingPlan, ReadingState } from '../model/reading';
import { suggestPrayerMoment } from '../services/practiceEngine';

export interface PracticeAgendaSuggestion {
  title: string;
  date: string;
  kind: AgendaItemKind;
  agendaDomain: ReturnType<typeof toAgendaDomain>;
  source: ReturnType<typeof toAgendaSourceRef>;
  durationMinutes?: number;
  windowLabel?: string;
  priority: 'alta' | 'normal';
  rationale: string;
}

/** oração → sugestão de horário · leitura → compromisso · estudo → sessão · contemplação/silêncio → prática. */
const MAPPING: Record<PracticeKind, { title: string; kind: AgendaItemKind }> = {
  oracao: { title: 'Momento de oração', kind: 'time_block' },
  leitura: { title: 'Leitura bíblica', kind: 'event' },
  estudo: { title: 'Sessão de estudo bíblico', kind: 'time_block' },
  contemplacao: { title: 'Prática de contemplação', kind: 'routine' },
  silencio: { title: 'Momento de silêncio', kind: 'routine' },
};

export function suggestPracticeSchedule(input: { definition: PracticeDefinition; availableWindows: string[]; date: string }): PracticeAgendaSuggestion {
  const map = MAPPING[input.definition.kind];
  const moment = suggestPrayerMoment(input.definition, input.availableWindows);
  return {
    title: map.title,
    date: input.date,
    kind: map.kind,
    agendaDomain: toAgendaDomain('spiritual'),
    source: toAgendaSourceRef('spiritual', input.definition.id, map.title),
    durationMinutes: input.definition.durationMinutes,
    windowLabel: moment.windowLabel,
    priority: input.definition.priority,
    rationale: moment.rationale,
  };
}

export function suggestReadingSchedule(input: { plan: ReadingPlan; state: ReadingState; availableWindows: string[]; date: string }): PracticeAgendaSuggestion | undefined {
  const entry = input.state.todayEntry ?? input.state.nextEntry;
  if (!entry || input.state.status === 'concluido' || input.state.status === 'pausado') return undefined;
  const refs = entry.references.map((r) => formatReference(r, { names: true })).join(' + ');
  return {
    title: `Leitura: ${refs}`,
    date: input.date,
    kind: 'event',
    agendaDomain: toAgendaDomain('spiritual'),
    source: toAgendaSourceRef('spiritual', input.plan.id, input.plan.title),
    windowLabel: input.availableWindows[0],
    priority: 'normal',
    rationale: input.availableWindows.length ? `Primeira janela livre informada: ${input.availableWindows[0]}.` : 'Nenhuma janela livre informada pela Agenda.',
  };
}
