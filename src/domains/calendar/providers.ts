/**
 * MEDUSA — Calendário — Provedores
 *
 * Um contrato para Medusa Internal Calendar, Google Calendar e Outlook Calendar:
 *   listEvents · getEvent · createEvent · updateEvent · deleteEvent · queryFreeBusy
 *
 * A Agenda do Medusa continua sendo a camada temporal oficial — este contrato é por onde
 * calendários de FORA entram e saem, sempre como CanonicalEvent.
 *
 * Escrita exige ação aprovada: createEvent/updateEvent recebem o id de uma ação AUTHORIZED
 * (ex.: email/SUGGEST_EVENT_FROM_EMAIL aprovada, agenda/SCHEDULE_ITEM); deleteEvent só com
 * uma ação de cancelamento (L3). Ler é livre.
 *
 * Google/Outlook reais: BLOQUEADO (sem backend/OAuth). Pronto: o contrato, o provedor
 * interno funcional, e o mapeamento do formato da API do Google Calendar (events.list)
 * para CanonicalEvent.
 */

import type { CanonicalEvent, EventParticipant } from '../../foundation/events/canonical';
import type { ProviderState } from '../../foundation/providers/state';
import { blockedProviderState } from '../../foundation/providers/state';
import type { Repository } from '../../foundation/persistence/snapshot';
import { getAction } from '../../foundation/actionBus';

export type CalendarProviderKind = 'internal' | 'google_calendar' | 'outlook_calendar';

export interface TimeRange {
  /** ISO local inclusivo. */
  from: string;
  to: string;
}

export interface BusyInterval {
  start: string;
  end: string;
  eventId: string;
}

export interface CalendarProvider {
  readonly kind: CalendarProviderKind;
  state(): ProviderState;
  listEvents(range: TimeRange): Promise<CanonicalEvent[]>;
  getEvent(id: string): Promise<CanonicalEvent | undefined>;
  createEvent(approvedActionId: string, ev: CanonicalEvent): Promise<CanonicalEvent>;
  updateEvent(approvedActionId: string, ev: CanonicalEvent): Promise<CanonicalEvent>;
  deleteEvent(approvedActionId: string, id: string): Promise<void>;
  queryFreeBusy(range: TimeRange): Promise<BusyInterval[]>;
}

export class CalendarWriteNotApprovedError extends Error {
  constructor(readonly actionId: string, readonly reason: string) {
    super(`Escrita no calendário recusada (${actionId}): ${reason}`);
    this.name = 'CalendarWriteNotApprovedError';
  }
}

const WRITE_TYPES = ['SUGGEST_EVENT_FROM_EMAIL', 'SCHEDULE_ITEM', 'RESCHEDULE_ITEM', 'APPLY_SUGGESTED_SCHEDULE'];
const DELETE_TYPES = ['CANCEL_EVENT_FROM_EMAIL'];

function assertAuthorized(actionId: string, allowed: string[]): void {
  const a = getAction(actionId);
  if (!a) throw new CalendarWriteNotApprovedError(actionId, 'ação inexistente');
  if (!allowed.includes(a.type)) throw new CalendarWriteNotApprovedError(actionId, `tipo ${a.type} não autoriza esta escrita`);
  if (a.status !== 'AUTHORIZED') throw new CalendarWriteNotApprovedError(actionId, `ação não autorizada (status: ${a.status})`);
}

const endOf = (e: CanonicalEvent) => e.end ?? (e.allDay ? `${e.start.slice(0, 10)}T23:59:59` : e.start);
const startOf = (e: CanonicalEvent) => (e.allDay ? `${e.start.slice(0, 10)}T00:00:00` : e.start);
const inRange = (e: CanonicalEvent, r: TimeRange) => startOf(e) <= r.to && endOf(e) >= r.from;

/** Calendário interno do Medusa sobre um Repository<CanonicalEvent> (memória hoje; o mesmo contrato persiste). */
export function createInternalCalendarProvider(repo: Repository<CanonicalEvent> & { remove?(id: string): void }): CalendarProvider {
  return {
    kind: 'internal',
    state: () => ({ provider: 'medusa', status: 'connected' }),
    listEvents: async (r) => repo.list().filter((e) => e.status !== 'cancelled' && inRange(e, r)).sort((a, b) => startOf(a).localeCompare(startOf(b))),
    getEvent: async (id) => repo.get(id),
    createEvent: async (actionId, ev) => {
      assertAuthorized(actionId, WRITE_TYPES);
      if (repo.get(ev.id)) return repo.get(ev.id)!; // idempotente
      repo.save(ev);
      return ev;
    },
    updateEvent: async (actionId, ev) => {
      assertAuthorized(actionId, WRITE_TYPES);
      repo.save(ev);
      return ev;
    },
    deleteEvent: async (actionId, id) => {
      assertAuthorized(actionId, DELETE_TYPES);
      const ev = repo.get(id);
      if (ev) repo.save({ ...ev, status: 'cancelled' }); // cancela, não apaga: o histórico fica
    },
    queryFreeBusy: async (r) =>
      repo
        .list()
        .filter((e) => e.status !== 'cancelled' && !e.allDay && inRange(e, r))
        .map((e) => ({ start: e.start, end: endOf(e), eventId: e.id }))
        .sort((a, b) => a.start.localeCompare(b.start)),
  };
}

export function createUnavailableCalendarProvider(kind: Exclude<CalendarProviderKind, 'internal'>, state: ProviderState): CalendarProvider {
  const fail = async (): Promise<never> => {
    throw new Error(`${state.provider} indisponível (${state.status}): ${state.detail ?? ''}`.trim());
  };
  return { kind, state: () => state, listEvents: fail, getEvent: fail, createEvent: fail, updateEvent: fail, deleteEvent: fail, queryFreeBusy: fail };
}

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export function googleCalendarProviderState(): ProviderState {
  return { ...blockedProviderState('google_calendar', 'o Medusa não tem backend nem OAuth do Google conectados'), missingScopes: [GOOGLE_CALENDAR_SCOPE] };
}

export function outlookCalendarProviderState(): ProviderState {
  return blockedProviderState('outlook_calendar', 'integração com Microsoft Graph não implementada (contrato pronto)');
}

// ===== Mapeamento da API do Google Calendar (events.list, singleEvents=true) =====

export interface GoogleCalendarApiEvent {
  id: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email?: string; displayName?: string; organizer?: boolean; optional?: boolean; responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted' }>;
  recurringEventId?: string;
  reminders?: { useDefault?: boolean; overrides?: Array<{ method: 'email' | 'popup'; minutes: number }> };
}

/** dateTime com offset (2026-10-07T18:00:00-03:00) → hora local do próprio evento, sem converter fuso. */
const localOf = (dt: string) => dt.slice(0, 19);

export function fromGoogleCalendarEvent(api: GoogleCalendarApiEvent, opts: { calendarLabel?: string; observedAt?: string } = {}): CanonicalEvent {
  const allDay = !api.start?.dateTime && !!api.start?.date;
  const response: Record<string, EventParticipant['response']> = { needsAction: 'needs_action', declined: 'declined', tentative: 'tentative', accepted: 'accepted' };
  const popups = api.reminders?.overrides?.filter((o) => o.method === 'popup').map((o) => o.minutes);
  return {
    id: `gcal:${api.id}`,
    source: { kind: 'google_calendar', externalId: api.id, label: opts.calendarLabel ?? 'Google Calendar', observedAt: opts.observedAt },
    title: api.summary ?? '(sem título)',
    description: api.description,
    start: allDay ? api.start!.date! : localOf(api.start?.dateTime ?? ''),
    end: allDay ? undefined : api.end?.dateTime ? localOf(api.end.dateTime) : undefined,
    allDay: allDay || undefined,
    timezone: api.start?.timeZone,
    location: api.location,
    participants: api.attendees?.map((a) => ({ name: a.displayName, email: a.email, role: a.organizer ? 'organizer' : a.optional ? 'optional' : 'attendee', response: a.responseStatus ? response[a.responseStatus] : undefined })),
    reminderPolicy: popups && popups.length > 0 ? { offsetsMinutes: popups } : undefined,
    status: api.status === 'cancelled' ? 'cancelled' : api.status === 'tentative' ? 'tentative' : 'confirmed',
    dedupKey: api.recurringEventId ? undefined : `gcal:${api.id}`,
  };
}
