/**
 * MEDUSA PERSONAL OS — Context Aggregator / Hoje e integração
 *   Agenda → Reminder → Guardian → Hoje → Actions
 */
import { makeChecker, resetAll } from '../domains/_helpers';
import { DAY, agendaItem, projetoIntegrado } from './fixtures';
import { createInMemoryAgendaSource } from '../../../src/domains/agenda/repository/source';
import { createInMemoryTaskRepository } from '../../../src/domains/tasks/repository/types';
import { createInMemoryProjectRepository } from '../../../src/domains/projects/repository/types';
import { selectToday } from '../../../src/foundation/context/today';
import { aggregateToday, unavailableSource } from '../../../src/foundation/context/aggregator';
import type { ContextSource } from '../../../src/foundation/context/aggregator';
import { eventContextsFor, freeWindowsFor } from '../../../src/foundation/context/sources';
import { createReminderEngine } from '../../../src/foundation/reminders/engine';
import { createChannelRegistry, createDynamicIslandChannel, createWebNotificationChannel, createNativeMobileChannel } from '../../../src/foundation/reminders/channels';
import type { NotificationPayload } from '../../../src/foundation/reminders/channels';
import { buildUniversalActionCenter } from '../../../src/foundation/actions/universal';
import { proposeRecommendation } from '../../../src/foundation/recommendations/engine';
import * as Lifecycle from '../../../src/foundation/guardianLifecycle';
import * as Trace from '../../../src/foundation/guardianTrace/causalTrace';
import * as DS from '../../../src/foundation/dataState';
import type { RoutineBlock } from '../../../src/domains/agenda/model/temporal';

const at = (hhmm: string) => `${DAY}T${hhmm}:00`;
const ROTINA: RoutineBlock[] = [{ id: 'trab', label: 'Trabalho', daysOfWeek: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '15:00', domain: 'work', kind: 'rotina' }];

function world() {
  const agenda = createInMemoryAgendaSource('manual', {
    items: [
      agendaItem('tele', 'Telemedicina com Dra. Ana', '10:05', '10:35'),
      agendaItem('treino', 'Treino A', '18:00', '19:00', { domain: 'body' }),
    ],
    routine: ROTINA,
  });
  const { project, tasks } = projetoIntegrado();
  const projects = createInMemoryProjectRepository('manual', [{ ...project, deadlines: [{ id: 'd', label: 'Entrega oficial', dueAt: '2026-10-07', hard: true }] }]);
  const taskRepo = createInMemoryTaskRepository('manual', tasks);
  const island: NotificationPayload[] = [];
  const reminders = createReminderEngine({
    channels: createChannelRegistry([createDynamicIslandChannel((p) => island.push(p)), createWebNotificationChannel(() => ({ supported: true, permission: 'default', show: () => undefined })), createNativeMobileChannel()]),
    policyFor: (c) => (c.category === 'telemedicine' ? { id: 'tele', offsetsMinutes: [5], channels: ['dynamic_island', 'web_notification', 'native_mobile_notification'], minGapMs: 60_000, requiresAcknowledgement: true } : undefined),
  });
  return { agenda, projects, taskRepo, reminders, island };
}

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('today-integration');

  // 1. Aggregator: estados de fonte
  {
    const ok: ContextSource = { id: 'agenda', read: () => DS.ready({ now: [{ id: 'a', title: 'A', kind: 'event', domain: 'work', tier: 'high', startIso: at('09:00'), endIso: at('11:00'), source: 'agenda' }] }, 'real') };
    const stale: ContextSource = { id: 'projects', read: () => DS.stale({ attention: [] }, at('06:00'), 'sync antigo') };
    const off: ContextSource = { id: 'finance', read: () => DS.offline() };
    const boom: ContextSource = { id: 'body', read: () => { throw new Error('quebrou'); } };
    const t = aggregateToday([ok, stale, off, boom, unavailableSource('spiritual', 'não conectado')], at('10:00'));
    check('1.1: fonte velha, offline, com erro e não conectada aparecem nos sources; o Hoje fica PARCIAL', t.status === 'partial' && t.missing.length === 4);
    check('1.2: o que respondeu continua aparecendo (agora = A)', t.status === 'partial' && t.data.agora?.id === 'a');
    check('1.3: exceção numa fonte não derruba o agregador', t.status === 'partial' && t.data.sources.find((s) => s.id === 'body')!.status === 'error');
    check('1.4: nenhuma fonte respondeu → erro (não "vazio")', aggregateToday([off, boom], at('10:00')).status === 'error');
    check('1.5: tudo respondeu e não há nada → empty', aggregateToday([{ id: 'agenda', read: () => DS.empty('nada') }], at('10:00')).status === 'empty');
  }

  // 2. Integração completa (o dia do exemplo)
  resetAll();
  {
    const w = world();
    const ctxs = eventContextsFor(w.agenda, DAY);
    w.reminders.syncEvents(ctxs, at('07:00'));
    const tick = w.reminders.tick(at('10:00'));
    check('2.1: Agenda → Reminder: telemedicina gera lembrete T-5 entregue na Dynamic Island às 10:00', tick.delivered.length === 1 && w.island[0].eventId === 'tele');

    const today = selectToday({ date: DAY, agenda: w.agenda, tasks: w.taskRepo, projects: w.projects, reminders: w.reminders, availableMinutes: () => 300 }, at('10:00'));
    const data = DS.dataOf(today)!;
    check('2.2: Hoje é parcial e diz quais domínios ainda não estão conectados (finance/body/spiritual/education)', today.status === 'partial' && ['finance', 'body', 'spiritual', 'education'].every((id) => today.missing.some((m) => m.startsWith(id))));
    check('2.3: AGORA → trabalho', data.agora?.title === 'Trabalho');
    check('2.4: PRÓXIMO → telemedicina em 5 min', data.proximo?.title.startsWith('Telemedicina') === true && data.proximo.minutesUntilStart === 5 && data.proximo.tier === 'critical');
    check('2.5: ATENÇÃO → projeto integrado vence amanhã (alta) e lembrete crítico ainda sem reconhecimento', data.atencao.some((a) => a.reason === 'prazo_proximo' && a.refs?.projectId === 'pi' && a.severity === 'alta') && data.atencao.some((a) => a.reason === 'lembrete_sem_reconhecimento' && a.refs?.eventId === 'tele'));
    check('2.6: ATENÇÃO → conflito da telemedicina com o trabalho aparece (não é escondido)', data.atencao.some((a) => a.reason === 'conflito' && a.refs?.eventId === 'tele'));
    check('2.7: RITMO → treino às 18h', data.ritmo.some((r) => r.kind === 'treino' && r.startIso === at('18:00')));
    check('2.8: RECOMENDAÇÃO → reservar 45 min para a etapa executável do projeto, depois do trabalho', data.recomendacao?.targetRef.taskId === 't-pesquisa' && data.recomendacao.durationMinutes === 45 && data.recomendacao.window.startIso >= at('15:00') && data.recomendacao.strength === 'forte');
    check('2.9: canal web sem permissão aparece como atenção (canal bloqueado) só se havia lembrete importante dependendo dele', !data.atencao.some((a) => a.reason === 'canal_bloqueado'));

    // Reminder → Guardian: a entrega deixou ação auditada e resultado
    const trace = Trace.buildCausalTrace('reminder:tele@2026-10-06');
    check('2.10: Reminder → Guardian: CREATE_REMINDER L1, executada, resultado confirmado, sem violação', trace.actions[0].status === 'SUCCESS' && trace.outcomes[0].result === 'efeito_confirmado' && trace.violations.length === 0);

    // Hoje → Actions: recomendação vira proposta L2, aparece no Action Center e na Atenção do Hoje
    const proposal = proposeRecommendation(data.recomendacao!);
    const center = buildUniversalActionCenter();
    check('2.11: Hoje → Actions: bloco sugerido é proposta L2 aguardando decisão no Action Center universal', !proposal.authorized && center.awaitingApproval.some((a) => a.id === proposal.action.id && a.type === 'SUGGEST_FOCUS_BLOCK'));
    const today2 = DS.dataOf(selectToday({ date: DAY, agenda: w.agenda, tasks: w.taskRepo, projects: w.projects, reminders: w.reminders, availableMinutes: () => 300 }, at('10:01')))!;
    check('2.12: a proposta pendente aparece na Atenção do Hoje (aprovação pendente)', today2.atencao.some((a) => a.reason === 'aprovacao_pendente' && a.refs?.actionId === proposal.action.id));
    Lifecycle.resolveApproval(proposal.evaluation.approvalRequest!.id, 'approve');
    const today3 = DS.dataOf(selectToday({ date: DAY, agenda: w.agenda, tasks: w.taskRepo, projects: w.projects, reminders: w.reminders, availableMinutes: () => 300 }, at('10:02')))!;
    check('2.13: aprovada → sai da Atenção', !today3.atencao.some((a) => a.reason === 'aprovacao_pendente'));

    // reconhecimento do lembrete limpa a atenção correspondente
    w.reminders.acknowledge('tele@2026-10-06#T5', 'opened', at('10:03'));
    const today4 = DS.dataOf(selectToday({ date: DAY, agenda: w.agenda, tasks: w.taskRepo, projects: w.projects, reminders: w.reminders }, at('10:03')))!;
    check('2.14: lembrete reconhecido sai da Atenção', !today4.atencao.some((a) => a.reason === 'lembrete_sem_reconhecimento'));
    check('2.15: sem tempo disponível informado, o prazo continua em atenção mas sem afirmar viabilidade', today4.atencao.find((a) => a.reason === 'prazo_proximo')?.detail.viabilidade === 'sem_estimativa');

    // às 10:10 a telemedicina está acontecendo junto com o trabalho
    const t1010 = DS.dataOf(selectToday({ date: DAY, agenda: w.agenda, tasks: w.taskRepo, projects: w.projects, reminders: w.reminders }, at('10:10')))!;
    check('2.16: durante a telemedicina, ela é o AGORA (crítica) e o trabalho fica em "agora também"', t1010.agora?.title.startsWith('Telemedicina') === true && t1010.agoraTambem.some((i) => i.title === 'Trabalho'));
    check('2.17: janelas livres reais do dia descontam trabalho e treino', freeWindowsFor(w.agenda, DAY, at('10:00')).every((x) => x.startIso >= at('15:00')));
  }

  // 3. Sem nenhuma fonte de dado fornecida
  resetAll();
  {
    const t = selectToday({ date: DAY, includeGuardian: false }, at('10:00'));
    check('3.1: Hoje sem Agenda/tarefas/lembretes → erro honesto ("nenhuma fonte respondeu"), nunca um dia vazio inventado', t.status === 'error');
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[today-integration] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
