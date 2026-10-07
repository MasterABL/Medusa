/**
 * MEDUSA PERSONAL OS — Evento canônico (fontes) + relações entre entidades.
 */
import { makeChecker, resetAll } from '../domains/_helpers';
import { DAY, agendaItem } from './fixtures';
import type { CanonicalEvent } from '../../../src/foundation/events/canonical';
import {
  canonicalFromAgendaItem, canonicalToAgendaItem, canonicalToEventContexts, reminderPolicyResolver, isAuthoritative, EVENT_SOURCE_KINDS,
} from '../../../src/foundation/events/canonical';
import { createRelationStore } from '../../../src/foundation/relations/graph';
import { createReminderEngine } from '../../../src/foundation/reminders/engine';
import { createChannelRegistry, createDynamicIslandChannel } from '../../../src/foundation/reminders/channels';
import type { NotificationPayload } from '../../../src/foundation/reminders/channels';

const at = (hhmm: string) => `${DAY}T${hhmm}:00`;

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('events-relations');

  // ===== Evento canônico =====
  {
    check('1.1: as dez origens previstas existem no contrato', ['internal', 'google_calendar', 'outlook_calendar', 'gmail', 'education', 'body', 'finance', 'spiritual', 'guardian', 'system'].every((k) => (EVENT_SOURCE_KINDS as readonly string[]).includes(k)));

    const fromAgenda = canonicalFromAgendaItem(agendaItem('a1', 'Reunião', '14:00', '15:00', { location: 'Sala 2' }));
    check('1.2: item da Agenda → canônico interno com início/fim/local', fromAgenda.source.kind === 'internal' && fromAgenda.start === at('14:00') && fromAgenda.end === at('15:00') && fromAgenda.location === 'Sala 2');

    const google = canonicalFromAgendaItem(agendaItem('g1', 'Dentista', '09:00', '09:30', { source: { sourceType: 'external', sourceId: 'gcal-123', sourceLabel: 'Google Calendar' } }));
    check('1.3: item externo marcado como Google Calendar é reconhecido como tal', google.source.kind === 'google_calendar' && google.source.externalId === 'gcal-123' && isAuthoritative(google));

    const minimal: CanonicalEvent = { id: 'e1', source: { kind: 'gmail', externalId: 'msg-1' }, title: 'Consulta', start: at('18:00'), status: 'tentative' };
    const draft = canonicalToAgendaItem(minimal);
    check('1.4: só os campos mínimos bastam; sem fim informado o rascunho ocupa 30 min (sem inventar local/participantes)', draft.startTime === '18:00' && draft.endTime === '18:30' && draft.location === undefined && draft.source.sourceType === 'external' && draft.source.sourceId === 'msg-1');
    check('1.5: e-mail não é calendário: um compromisso vindo do Gmail não é "autoritativo"', !isAuthoritative(minimal));
  }

  // ===== Canônico → EventContext → Reminder Engine =====
  resetAll();
  {
    const events: CanonicalEvent[] = [
      { id: 'consulta', source: { kind: 'gmail', externalId: 'm1' }, title: 'Consulta confirmada', start: at('18:00'), end: at('18:30'), importance: 'critical', category: 'medical_consultation', rigidity: 'rigid', domain: 'body', status: 'confirmed', reminderPolicy: { offsetsMinutes: [15, 5] }, dedupKey: 'consulta-18h' },
      { id: 'cancelada', source: { kind: 'google_calendar' }, title: 'Almoço', start: at('12:00'), end: at('13:00'), status: 'cancelled' },
      { id: 'dia-todo', source: { kind: 'internal' }, title: 'Feriado', start: DAY, allDay: true, status: 'confirmed' },
      { id: 'outro-dia', source: { kind: 'internal' }, title: 'Amanhã', start: '2026-10-07T10:00:00', status: 'confirmed' },
    ];
    const ctxs = canonicalToEventContexts({ date: DAY, events });
    check('2.1: cancelado, dia inteiro e outro dia ficam fora do contexto temporal do dia', ctxs.length === 1 && ctxs[0].eventId === 'consulta');
    check('2.2: importância decidida na origem chega intacta (critical, rígido, consulta médica)', ctxs[0].tier === 'critical' && ctxs[0].rigid && ctxs[0].category === 'medical_consultation' && ctxs[0].importanceSource === 'explicito_no_evento');
    check('2.3: dedupKey da fonte chega ao EventContext', ctxs[0].dedupKey === 'consulta-18h');

    const island: NotificationPayload[] = [];
    const engine = createReminderEngine({ channels: createChannelRegistry([createDynamicIslandChannel((p) => island.push(p))]), policyFor: reminderPolicyResolver(events) });
    engine.syncEvents(ctxs, at('17:00'));
    check('2.4: política de lembrete declarada no evento vence a do tier (T-15 e T-5, sem T-30)', engine.list().map((r) => r.offsetMinutes).join() === '15,5');
    engine.tick(at('17:45'));
    engine.tick(at('17:55'));
    check('2.5: o compromisso vindo de fora é lembrado pelo MESMO motor (nenhum timer novo)', island.map((p) => p.offsetMinutes).join() === '15,5');
  }

  // ===== Relações =====
  {
    const g = createRelationStore();
    const email = { kind: 'email' as const, id: 'm1' };
    const proj = { kind: 'project' as const, id: 'pi' };
    const t = { kind: 'task' as const, id: 't1' };
    const dl = { kind: 'deadline' as const, id: 'd1' };
    const ev = { kind: 'event' as const, id: 'e1' };
    const rem = { kind: 'reminder' as const, id: 'r1' };
    const why = { by: 'rule' as const, reason: 'teste' };
    g.link(email, 'mentions', proj, why, at('08:00'));
    g.link(t, 'derived_from', email, why, at('08:00'));
    g.link(t, 'belongs_to', proj, why, at('08:00'));
    g.link(t, 'scheduled_as', dl, why, at('08:00'));
    g.link(dl, 'scheduled_as', ev, why, at('08:00'));
    g.link(rem, 'reminds_about', ev, why, at('08:00'));
    const again = g.link(t, 'derived_from', email, why, at('09:00'));
    check('3.1: afirmar a mesma relação de novo não duplica (idempotente, mantém a data original)', g.all().length === 6 && again.createdAt === at('08:00'));
    const chain = g.neighborhood(email, 5).map((r) => r.kind);
    check('3.2: cadeia Email → Projeto → Tarefa → Prazo → Evento → Lembrete navegável a partir do e-mail', ['project', 'task', 'deadline', 'event', 'reminder'].every((k) => chain.includes(k as any)));
    check('3.3: findLinked acha a tarefa já derivada do e-mail (base para não criar uma segunda)', g.findLinked(email, 'task', ['derived_from'])?.id === 't1');
    check('3.4: entidades não são copiadas — a relação só guarda referências', JSON.stringify(g.all()[0]).length < 400 && !('title' in (g.all()[0].from as any)));
    check('3.5: relação de uma entidade com ela mesma é recusada', (() => { try { g.link(t, 'depends_on', t, why, at('08:00')); return false; } catch { return true; } })());
    const g2 = createRelationStore();
    g2.importState(g.exportState());
    check('3.6: relações exportam/importam (prontas para o mesmo PersistenceAdapter)', g2.all().length === 6);
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[events-relations] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
