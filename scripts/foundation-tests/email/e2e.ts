/**
 * E2E conceituais (sem rede, sem conta real):
 *   E-mail → classificação → contexto → risco → candidato → prioridade → Guardian
 *          → tarefa/evento/lembrete → Hoje
 * Telemedicina (obrigatório), Faculdade e Financeiro.
 */
import { makeChecker, resetAll } from '../domains/_helpers';
import { at, SAMPLES } from './fixtures';
import { analyzeEmail } from '../../../src/domains/email/services/pipeline';
import { createEmailActionCenter, derivedEventId, derivedTaskId } from '../../../src/domains/email/services/actions';
import { emailContextSource, emailPriorityCandidates, reminderEventsFromEmail } from '../../../src/domains/email/services/bridges';
import { createFixtureEmailProvider } from '../../../src/domains/email/providers/types';
import { createRelationStore } from '../../../src/foundation/relations/graph';
import { createInMemoryRepository } from '../../../src/foundation/persistence/snapshot';
import { createInMemoryTaskRepository } from '../../../src/domains/tasks/repository/types';
import { createInMemoryProjectRepository } from '../../../src/domains/projects/repository/types';
import { createInMemoryAgendaSource } from '../../../src/domains/agenda/repository/source';
import { dayInputFrom } from '../../../src/domains/agenda/selectors';
import type { CanonicalEvent } from '../../../src/foundation/events/canonical';
import { canonicalToEventContexts, reminderPolicyResolver, canonicalToAgendaItem } from '../../../src/foundation/events/canonical';
import { createReminderEngine } from '../../../src/foundation/reminders/engine';
import { createChannelRegistry, createDynamicIslandChannel, createWebNotificationChannel, createNativeMobileChannel } from '../../../src/foundation/reminders/channels';
import type { NotificationPayload, WebNotificationEnv } from '../../../src/foundation/reminders/channels';
import { rankCandidates } from '../../../src/foundation/priority/engine';
import { recommend } from '../../../src/foundation/recommendations/engine';
import { suggestSchedule } from '../../../src/foundation/planner/planner';
import { selectToday } from '../../../src/foundation/context/today';
import { buildUniversalActionCenter } from '../../../src/foundation/actions/universal';
import * as Lifecycle from '../../../src/foundation/guardianLifecycle';
import type { Project } from '../../../src/domains/projects/model/types';

const TUE = '2026-10-06';
const WED = '2026-10-07';

function channels(web: Array<{ title: string }>, island: NotificationPayload[], permission: WebNotificationEnv['permission'] = 'granted') {
  const env = (): WebNotificationEnv => ({ supported: true, permission, show: (title) => web.push({ title }) });
  return createChannelRegistry([createDynamicIslandChannel((p) => island.push(p)), createWebNotificationChannel(env), createNativeMobileChannel()]);
}

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('email-e2e');

  // ================= TELEMEDICINA =================
  resetAll();
  {
    const msg = SAMPLES.telemedicina(); // terça 09:00: "teleconsulta confirmada para amanhã às 18h"
    const a = analyzeEmail(msg, { now: at('09:05', TUE) });
    check('T1: classificação → medical / critical', a.classification.category === 'medical' && a.classification.importance === 'critical');
    const ev = a.candidates.find((c) => c.kind === 'calendar_event') as any;
    check('T2: contexto → CalendarEventCandidate quarta 18:00, telemedicina, rígido', ev?.start === `${WED}T18:00:00` && ev.category === 'telemedicine' && ev.rigid);
    check('T3: risco médico crítico', a.risks[0].type === 'medical' && a.risks[0].severity === 'critical');

    // lembrete pelo MESMO Reminder Engine, antes mesmo de aceitar na Agenda
    const events = reminderEventsFromEmail([a], at('09:05', TUE));
    check('T4: política de lembrete T-15/T-5 declarada no evento derivado do e-mail', events.length === 1 && events[0].reminderPolicy!.offsetsMinutes.join() === '15,5' && events[0].status === 'tentative');
    const island: NotificationPayload[] = [];
    const web: Array<{ title: string }> = [];
    const engine = createReminderEngine({ channels: channels(web, island), policyFor: reminderPolicyResolver(events) });
    engine.syncEvents(canonicalToEventContexts({ date: WED, events }), at('17:00', WED));
    check('T5: dois gatilhos planejados (17:45 e 17:55)', engine.list().map((r) => r.triggerAtIso.slice(11, 16)).join() === '17:45,17:55');
    engine.tick(at('17:45', WED));
    engine.tick(at('17:55', WED));
    check('T6: T-15 e T-5 entregues na Dynamic Island E na notificação do navegador', island.map((p) => p.offsetMinutes).join() === '15,5' && web.length === 2);
    const t5 = engine.get(`${derivedEventId('tele')}@${WED}#T5`)!;
    const native = t5.deliveries.find((d) => d.channel === 'native_mobile_notification');
    check('T7: notificação nativa do celular: BLOQUEADA, nunca fingida (estado parcial)', native?.status === 'blocked' && t5.state === 'partially_delivered');
    check('T8: o lembrete passou pelo Guardian (agenda/CREATE_REMINDER, L1 informativo)', buildUniversalActionCenter().autonomous.some((x) => x.type === 'CREATE_REMINDER' && x.autonomy === 'L1'));

    // Hoje às 17:55: "Telemedicina em 5 min" como Próximo (provisório) + Atenção
    const provider = createFixtureEmailProvider([msg]);
    const today = selectToday({ date: WED, reminders: engine, extraSources: [emailContextSource({ provider: provider.state(), analyses: [a], subjects: { tele: msg.subject } })] }, at('17:55', WED));
    const data = (today as any).data;
    check('T9: Hoje → Próximo é a consulta, em 5 min, marcada como provisória (veio do e-mail)', data?.proximo?.refs?.emailId === 'tele' && data.proximo.minutesUntilStart === 5 && !!data.proximo.provisional);
    check('T10: Hoje → Atenção cita o e-mail que pede ação', data.atencao.some((x: any) => x.source === 'email' && x.detail.messageId === 'tele'));
    check('T11: Hoje diz que a fonte de e-mail é demonstração (origem fixture), não esconde', provider.state().isFixture === true);

    // aceitar o evento depois: mesmo id → nenhum lembrete repetido
    const relations = createRelationStore();
    const evRepo = createInMemoryRepository<CanonicalEvent>();
    const center = createEmailActionCenter({ relations, events: evRepo });
    const p = center.propose(a, 'tele:calendar_event', at('17:56', WED));
    Lifecycle.resolveApproval(p.evaluation.approvalRequest!.id, 'approve');
    center.apply(a, 'tele:calendar_event', at('17:56', WED));
    const accepted = evRepo.list();
    engine.syncEvents(canonicalToEventContexts({ date: WED, events: accepted }), at('17:57', WED));
    engine.tick(at('18:00', WED));
    check('T12: aceitar na Agenda depois não duplica lembrete (mesmo compromisso, mesmo id)', island.length === 2 && accepted[0].id === derivedEventId('tele'));
    const agendaDraft = canonicalToAgendaItem(accepted[0]);
    check('T13: o evento aceito vira rascunho de AgendaItem com origem "gmail" (a Agenda segue sendo a camada temporal)', agendaDraft.source.sourceType === 'external' && agendaDraft.source.sourceLabel === 'e-mail' && agendaDraft.startTime === '18:00');
  }

  // ================= FACULDADE =================
  resetAll();
  {
    const msg = SAMPLES.contabilidade(); // "Projeto de Contabilidade deve ser entregue sexta. Leva cerca de 45 min."
    const project: Project = { id: 'p-cont', title: 'Projeto de Contabilidade', objective: 'entregar', kind: 'academic', status: 'active', relatedDomains: ['education'], milestones: [], deadlines: [], relatedEventIds: [], documents: [], createdAt: at('08:00', TUE), updatedAt: at('08:00', TUE) };
    const a = analyzeEmail(msg, { now: at('09:05', TUE), knownProjects: [{ id: project.id, title: project.title }] });
    check('F1: classificação → academic / high, disciplina Contabilidade', a.classification.category === 'academic' && a.classification.importance === 'high' && a.extraction.discipline?.value.name === 'Contabilidade');
    const task = a.candidates.find((c) => c.kind === 'task') as any;
    const dl = a.candidates.find((c) => c.kind === 'deadline') as any;
    check('F2: prazo sexta + tarefa ligada ao projeto conhecido', dl?.dueAt === '2026-10-09' && task?.projectId === 'p-cont' && task.dueAt === '2026-10-09');

    const ranked = rankCandidates([...emailPriorityCandidates([a]), ...emailPriorityCandidates([analyzeEmail(SAMPLES.informativo(), { now: at('09:05', TUE) })])], at('18:00', TUE));
    check('F3: prioridade pelo Priority Engine existente (a entrega vem primeiro, com explicação)', ranked[0].candidate.refs?.emailCandidateId === 'cont:task' && ranked[0].factors.length > 0);
    const recs = recommend({ now: at('19:15', TUE), freeWindows: [{ startIso: at('19:15', TUE), endIso: at('20:05', TUE), minutes: 50 }], ranked });
    check('F4: recomendação pelo motor existente: 50 min livres (5 de folga) cabem os 45 min → fazer agora', recs[0]?.targetRef.emailCandidateId === 'cont:task' && recs[0].timing === 'agora' && recs[0].durationMinutes === 45);

    const today = selectToday({ date: TUE, extraSources: [emailContextSource({ provider: { provider: 'gmail', status: 'connected' }, analyses: [a], subjects: { cont: msg.subject } })] }, at('09:10', TUE));
    check('F5: Hoje → Atenção "entrega da faculdade" com o prazo', (today as any).data.atencao.some((x: any) => x.reason === 'email_prazo' && x.dueIso === '2026-10-09'));

    // aceitar → Tasks real → o Planner e o Hoje existentes passam a enxergar
    const relations = createRelationStore();
    const tasks = createInMemoryTaskRepository();
    const projects = createInMemoryProjectRepository('manual', [project]);
    const center = createEmailActionCenter({ relations, tasks });
    const p = center.propose(a, 'cont:task', at('09:10', TUE));
    Lifecycle.resolveApproval(p.evaluation.approvalRequest!.id, 'approve');
    center.apply(a, 'cont:task', at('09:11', TUE));
    check('F6: tarefa criada e ligada ao projeto (relação, sem copiar o projeto)', tasks.get(derivedTaskId('cont'))?.projectId === 'p-cont' && relations.findLinked({ kind: 'task', id: derivedTaskId('cont') }, 'project')?.id === 'p-cont');

    const agenda = createInMemoryAgendaSource('manual', { items: [canonicalToAgendaItem({ id: 'aula', source: { kind: 'internal' }, title: 'Trabalho', start: at('08:00', TUE), end: at('19:00', TUE), status: 'confirmed', rigidity: 'rigid', domain: 'work' })] });
    const plan = suggestSchedule({ now: at('18:00', TUE), fromDate: TUE, days: 1, dayInput: (d) => dayInputFrom(agenda, d), tasks: tasks.list(), projects: projects.list(), protectedWindows: [{ id: 'sono', label: 'Sono', kind: 'sono', startTime: '23:00', endTime: '06:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }] });
    const block = plan.blocks.find((b) => b.taskId === derivedTaskId('cont'));
    check('F7: Planner sugere o bloco de 45 min na noite livre (sem mover nada sozinho)', !!block && block.endMin - block.startMin === 45 && block.startMin >= 19 * 60);

    const again = analyzeEmail(msg, { now: at('10:00', TUE), knownProjects: [{ id: project.id, title: project.title }], existing: { relations, tasks: tasks.list() } });
    check('F8: reanalisar o e-mail não gera segunda tarefa nem segundo prazo', again.candidates.filter((c) => c.status === 'proposed' && (c.kind === 'task' || c.kind === 'deadline')).length === 0);
    const todayAfter = selectToday({ date: TUE, tasks, projects, agenda, extraSources: [emailContextSource({ provider: { provider: 'gmail', status: 'connected' }, analyses: [again], subjects: { cont: msg.subject } })] }, at('18:30', TUE));
    const recAfter = (todayAfter as any).data?.recomendacao;
    check('F9: depois de aceita, a recomendação vem do recomendador do Hoje, apontando para a tarefa real', recAfter?.targetRef.taskId === derivedTaskId('cont'));
  }

  // ================= FINANCEIRO =================
  resetAll();
  {
    const fat = SAMPLES.fatura();
    const a = analyzeEmail(fat, { now: at('09:05', TUE) });
    const fin = a.candidates.find((c) => c.kind === 'finance') as any;
    check('$1: fatura → finance / high, risco financeiro com valor e vencimento', a.classification.domain === 'finance' && a.risks[0].type === 'financial' && a.risks[0].financialImpact?.amount === 1234.56 && a.risks[0].deadline === '2026-10-10');
    check('$2: candidato financeiro exige aprovação para pagar; prazo + lembrete propostos', fin.paymentRequiresApproval && a.candidates.some((c) => c.kind === 'deadline') && a.candidates.some((c) => c.kind === 'reminder'));
    const relations = createRelationStore();
    const tasks = createInMemoryTaskRepository();
    const center = createEmailActionCenter({ relations, tasks });
    const dl = center.propose(a, 'fat:deadline', at('09:10', TUE));
    const pay = center.requestSensitive('SCHEDULE_PAYMENT_FROM_EMAIL', 'fat', { amount: 1234.56 }, at('09:10', TUE));
    check('$3: registrar o vencimento é L2 (aguarda); agendar pagamento é L3 (sempre aprovação)', dl.evaluation.decision.level === 'L2' && pay.evaluation.decision.level === 'L3' && !pay.authorized);
    Lifecycle.resolveApproval(dl.evaluation.approvalRequest!.id, 'approve');
    center.apply(a, 'fat:deadline', at('09:11', TUE));
    check('$4: aprovado o prazo → tarefa de vencimento criada; nenhum pagamento executado', tasks.list().length === 1 && tasks.list()[0].dueAt === '2026-10-10' && buildUniversalActionCenter().awaitingApproval.some((x) => x.type === 'SCHEDULE_PAYMENT_FROM_EMAIL'));

    const neg = analyzeEmail(SAMPLES.negativacao(), { now: at('09:05', TUE) });
    const today = selectToday({ date: TUE, extraSources: [emailContextSource({ provider: { provider: 'gmail', status: 'connected' }, analyses: [a, neg] })] }, at('09:10', TUE));
    const att = (today as any).data.atencao.filter((x: any) => x.source === 'email');
    check('$5: Hoje → risco de negativação em Atenção com severidade alta, acima da fatura', att[0].reason === 'email_risco' && att[0].severity === 'alta' && att[0].detail.messageId === 'neg');
  }

  // ================= sem Gmail conectado =================
  resetAll();
  {
    const today = selectToday({ date: TUE, extraSources: [emailContextSource({ provider: { provider: 'gmail', status: 'available', detail: 'BLOQUEADO: sem OAuth' }, analyses: [] })] }, at('09:10', TUE));
    const src = (today as any).status === 'error' ? undefined : (today as any).data?.sources?.find((s: any) => s.id === 'email');
    check('X1: Gmail não conectado → fonte "email" aparece como permissão necessária, nunca como "sem e-mails"', (today as any).status === 'error' || src?.status === 'permission-required');
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[email-e2e] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
