/**
 * MEDUSA FOUNDATION — Evento canônico (compromisso no tempo)
 *
 * NÃO confundir com `DomainEvent` (types/event.ts), que é "algo aconteceu" no Event Bus.
 * Aqui é o COMPROMISSO: algo com início no tempo que pode vir de qualquer lugar —
 * Agenda do Medusa, Google Calendar, Outlook, um e-mail de confirmação, Educação,
 * Corpo, Finanças, Espiritual, Guardian, sistema.
 *
 * Princípio: uma forma de troca, várias fontes, e nenhuma cópia paralela.
 *   - A Agenda continua sendo a camada temporal oficial (AgendaItem).
 *   - EventContext continua sendo a visão calculada (importância, conflito, lead).
 *   - CanonicalEvent é o que atravessa a fronteira entre fontes e esse núcleo.
 *
 * Só `id`, `source`, `title`, `start` e `status` são obrigatórios: uma fonte que não
 * informa local, participantes ou fim não é obrigada a inventar.
 */

import type { AgendaItem } from '../../types/agenda';
import type { LifeDomain } from '../types/lifeDomain';
import type { ImportanceTier } from '../context/importance';
import type { EventContextCategory } from '../reminders/types';
import type { NotificationChannelId } from '../reminders/channels';
import type { EventContext, EventLinks } from '../context/eventContext';
import { buildEventContexts } from '../context/eventContext';
import type { ReminderPolicyV2 } from '../reminders/engine';
import { DEFAULT_REMINDER_POLICIES } from '../reminders/engine';
import type { BufferRule, RoutineBlock, TravelLeg } from '../../domains/agenda/model/temporal';

export type EventSourceKind =
  | 'internal'
  | 'google_calendar'
  | 'outlook_calendar'
  | 'gmail'
  | 'education'
  | 'body'
  | 'finance'
  | 'spiritual'
  | 'guardian'
  | 'system';

export const EVENT_SOURCE_KINDS: readonly EventSourceKind[] = [
  'internal', 'google_calendar', 'outlook_calendar', 'gmail', 'education', 'body', 'finance', 'spiritual', 'guardian', 'system',
];

/** Fontes que são calendário de verdade (o compromisso existe lá) vs. fontes que só SUGEREM um compromisso. */
export const AUTHORITATIVE_CALENDAR_SOURCES: readonly EventSourceKind[] = ['internal', 'google_calendar', 'outlook_calendar'];

export interface EventSourceRef {
  kind: EventSourceKind;
  /** Id do item na fonte (evento do Google, mensagem do Gmail, sessão de estudo...). */
  externalId?: string;
  /** Rótulo legível da origem ("Google Calendar · pessoal", "e-mail de Clínica X"). */
  label?: string;
  /** Quando o Medusa leu isso da fonte. */
  observedAt?: string;
}

export type CanonicalEventStatus = 'tentative' | 'confirmed' | 'cancelled' | 'completed';

export interface EventParticipant {
  name?: string;
  email?: string;
  role?: 'organizer' | 'attendee' | 'optional';
  response?: 'accepted' | 'declined' | 'tentative' | 'needs_action';
}

export interface EventReminderPolicyRef {
  offsetsMinutes: number[];
  channels?: NotificationChannelId[];
}

export interface CanonicalEvent {
  id: string;
  source: EventSourceRef;
  title: string;
  description?: string;
  /** Hora local ISO `YYYY-MM-DDTHH:MM:SS` (mesma convenção da Agenda) ou só `YYYY-MM-DD` quando `allDay`. */
  start: string;
  end?: string;
  allDay?: boolean;
  /** IANA (ex.: America/Sao_Paulo). Ausente = fuso local do usuário. */
  timezone?: string;
  importance?: ImportanceTier;
  category?: EventContextCategory;
  rigidity?: 'rigid' | 'flexible';
  domain?: LifeDomain;
  projectId?: string;
  taskId?: string;
  location?: string;
  participants?: EventParticipant[];
  reminderPolicy?: EventReminderPolicyRef;
  status: CanonicalEventStatus;
  /** Identidade entre fontes (ver EventLinks.dedupKey): a mesma consulta vinda do Gmail e do Calendar. */
  dedupKey?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const dateOf = (iso: string) => iso.slice(0, 10);
const timeOf = (iso: string) => (iso.length >= 16 ? iso.slice(11, 16) : undefined);

export function sourceKindOfAgendaItem(item: AgendaItem): EventSourceKind {
  switch (item.source?.sourceType) {
    case 'education_session':
    case 'review':
      return 'education';
    case 'workout':
      return 'body';
    case 'finance_deadline':
      return 'finance';
    case 'external': {
      const label = (item.source.sourceLabel ?? '').toLowerCase();
      if (label.includes('google')) return 'google_calendar';
      if (label.includes('outlook')) return 'outlook_calendar';
      if (label.includes('gmail')) return 'gmail';
      return 'system';
    }
    default:
      return 'internal';
  }
}

export function canonicalFromAgendaItem(item: AgendaItem): CanonicalEvent {
  const start = item.allDay || !item.startTime ? item.date : `${item.date}T${item.startTime}:00`;
  const end = item.allDay || !item.endTime ? undefined : `${item.date}T${item.endTime}:00`;
  return {
    id: item.id,
    source: { kind: sourceKindOfAgendaItem(item), externalId: item.source?.sourceId, label: item.source?.sourceLabel },
    title: item.title,
    description: item.description,
    start,
    end,
    allDay: item.allDay || !item.startTime || undefined,
    rigidity: item.isFlexible === undefined ? undefined : item.isFlexible ? 'flexible' : 'rigid',
    domain: item.domain,
    location: item.location,
    status: item.status === 'cancelled' ? 'cancelled' : item.status === 'completed' ? 'completed' : 'confirmed',
  };
}

export interface ToAgendaItemOptions {
  categoryId?: string;
  colorId?: string;
  now?: string;
}

/**
 * Rascunho de AgendaItem a partir de um evento canônico — para a Agenda (camada temporal
 * oficial) receber um compromisso vindo de fora. Não grava nada: quem grava é a Agenda,
 * depois da política do Guardian.
 */
export function canonicalToAgendaItem(ev: CanonicalEvent, opts: ToAgendaItemOptions = {}): AgendaItem & { importanceTier?: ImportanceTier; contextCategory?: EventContextCategory; rigid?: boolean } {
  const now = opts.now ?? ev.source.observedAt ?? `${dateOf(ev.start)}T00:00:00`;
  const startTime = ev.allDay ? undefined : timeOf(ev.start);
  let endTime = ev.end && !ev.allDay ? timeOf(ev.end) : undefined;
  if (startTime && !endTime) {
    // sem fim informado: 30 min por padrão, só para o bloco ocupar espaço na grade
    const [h, m] = startTime.split(':').map(Number);
    const t = Math.min(h * 60 + m + 30, 23 * 60 + 59);
    endTime = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
  }
  const domain = ev.domain ?? 'external';
  return {
    id: ev.id,
    title: ev.title,
    kind: 'event',
    domain,
    categoryId: opts.categoryId ?? `cat-${domain}`,
    colorId: opts.colorId ?? domain,
    date: dateOf(ev.start),
    startTime,
    endTime,
    allDay: ev.allDay,
    isFlexible: ev.rigidity === undefined ? undefined : ev.rigidity === 'flexible',
    description: ev.description,
    location: ev.location,
    source: ev.source.kind === 'internal' ? { sourceType: 'manual' } : { sourceType: 'external', sourceId: ev.source.externalId ?? ev.id, sourceLabel: ev.source.label ?? ev.source.kind },
    status: ev.status === 'cancelled' ? 'cancelled' : ev.status === 'completed' ? 'completed' : 'scheduled',
    createdAt: now,
    updatedAt: now,
    // importância já decidida por quem montou o evento (ex.: e-mail de consulta → critical)
    ...(ev.importance && ev.category ? { importanceTier: ev.importance, contextCategory: ev.category, rigid: ev.rigidity ? ev.rigidity === 'rigid' : undefined } : {}),
  };
}

export interface CanonicalContextInput {
  date: string;
  events: CanonicalEvent[];
  routine?: RoutineBlock[];
  travel?: TravelLeg[];
  buffers?: BufferRule[];
}

/**
 * Eventos canônicos de um dia → EventContext, passando pela camada temporal da Agenda
 * (conflito, deslocamento). Assim um compromisso vindo do Gmail entra no mesmo Priority
 * Engine e no mesmo Reminder Engine que um item criado à mão.
 */
export function canonicalToEventContexts(input: CanonicalContextInput): EventContext[] {
  const live = input.events.filter((e) => e.status !== 'cancelled' && !e.allDay && dateOf(e.start) === input.date);
  const items = live.map((e) => canonicalToAgendaItem(e));
  const links: Record<string, EventLinks> = {};
  for (const e of live) links[e.id] = { relatedProjectId: e.projectId, relatedTaskId: e.taskId, dedupKey: e.dedupKey };
  return buildEventContexts({ date: input.date, items, routine: input.routine, travel: input.travel, buffers: input.buffers, links });
}

export function isAuthoritative(ev: Pick<CanonicalEvent, 'source'>): boolean {
  return AUTHORITATIVE_CALENDAR_SOURCES.includes(ev.source.kind);
}

/**
 * Política de lembrete declarada no próprio evento (ex.: o e-mail da clínica pede aviso
 * T-15/T-5) → `policyFor` do Reminder Engine. Sem política declarada, vale a do tier.
 */
export function reminderPolicyResolver(events: CanonicalEvent[]): (ctx: EventContext) => ReminderPolicyV2 | undefined {
  const byId = new Map(events.filter((e) => e.reminderPolicy).map((e) => [e.id, e]));
  return (ctx) => {
    const ev = byId.get(ctx.eventId);
    if (!ev?.reminderPolicy) return undefined;
    const base = DEFAULT_REMINDER_POLICIES[ctx.tier];
    return { ...base, id: `event:${ev.id}`, offsetsMinutes: ev.reminderPolicy.offsetsMinutes, channels: ev.reminderPolicy.channels ?? base.channels };
  };
}
