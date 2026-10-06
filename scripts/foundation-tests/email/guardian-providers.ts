/**
 * E-mail → Guardian (L1/L2/L3, idempotência, ações sensíveis) e provedores (estado honesto,
 * fixture marcada, Gmail/Google Calendar bloqueados, mapeadores das APIs, calendário interno).
 */
import { makeChecker, resetAll, seedTrust } from '../domains/_helpers';
import { at, mail, SAMPLES } from './fixtures';
import { analyzeEmail } from '../../../src/domains/email/services/pipeline';
import { createEmailActionCenter, derivedTaskId } from '../../../src/domains/email/services/actions';
import { createRelationStore } from '../../../src/foundation/relations/graph';
import { createInMemoryTaskRepository } from '../../../src/domains/tasks/repository/types';
import { createInMemoryRepository } from '../../../src/foundation/persistence/snapshot';
import type { CanonicalEvent } from '../../../src/foundation/events/canonical';
import * as Lifecycle from '../../../src/foundation/guardianLifecycle';
import { getAction } from '../../../src/foundation/actionBus';
import { buildUniversalActionCenter } from '../../../src/foundation/actions/universal';
import { createFixtureEmailProvider, createUnavailableEmailProvider, gmailProviderState, fromGmailApiMessage, SensitiveActionNotApprovedError } from '../../../src/domains/email/providers/types';
import { createInternalCalendarProvider, createUnavailableCalendarProvider, googleCalendarProviderState, outlookCalendarProviderState, fromGoogleCalendarEvent } from '../../../src/domains/calendar/providers';
import { providerStateToDataState } from '../../../src/foundation/providers/state';
import type { ProviderState } from '../../../src/foundation/providers/state';

const NOW = at('09:05');

function setup(autoCreateTasks = false) {
  const relations = createRelationStore();
  const tasks = createInMemoryTaskRepository();
  const events = createInMemoryRepository<CanonicalEvent>();
  const center = createEmailActionCenter({ relations, tasks, events, autoCreateTasks });
  return { relations, tasks, events, center };
}

const approveAndApply = (center: ReturnType<typeof setup>['center'], a: ReturnType<typeof analyzeEmail>, candidateId: string) => {
  const p = center.propose(a, candidateId, NOW);
  if (!p.authorized) Lifecycle.resolveApproval(p.evaluation.approvalRequest!.id, 'approve');
  return { p, applied: center.apply(a, candidateId, NOW) };
};

export async function run(): Promise<{ total: number; fails: number }> {
  const { check, result } = makeChecker('email-guardian-providers');

  // ===== L1 =====
  resetAll();
  {
    const { center } = setup();
    const msg = SAMPLES.telemedicina();
    const a = analyzeEmail(msg, { now: NOW });
    const c = center.recordClassification(msg, a, NOW);
    check('1.1: L1 classificar e-mail executa sozinho (informativo) e fica auditado', c.authorized && c.evaluation.decision.level === 'L1' && getAction(c.action.id)!.status === 'SUCCESS' && center.audit().some((e) => e.action === 'CLASSIFY_EMAIL' && e.outcome === 'executado'));
  }

  // ===== L2 =====
  resetAll();
  {
    const { center, tasks, relations } = setup();
    const a = analyzeEmail(SAMPLES.contabilidade(), { now: NOW });
    const p = center.propose(a, 'cont:task', NOW);
    check('2.1: L2 sugerir tarefa → aguardando aprovação, nada criado ainda', !p.authorized && p.evaluation.decision.level === 'L2' && tasks.list().length === 0);
    check('2.2: aparece no Action Center universal com domínio "email"', buildUniversalActionCenter().awaitingApproval.some((x) => x.sourceDomain === 'email'));
    check('2.3: propor de novo o mesmo candidato → mesma ação (um pedido de aprovação só)', center.propose(a, 'cont:task', NOW).action.id === p.action.id);
    let threw = false;
    try { center.apply(a, 'cont:task', NOW); } catch { threw = true; }
    check('2.4: aplicar sem aprovação é recusado', threw && tasks.list().length === 0);
    Lifecycle.resolveApproval(p.evaluation.approvalRequest!.id, 'approve');
    const r = center.apply(a, 'cont:task', NOW);
    const t = tasks.get(derivedTaskId('cont'));
    check('2.5: aprovado → tarefa criada com prazo, domínio, esforço dito no texto', r.report.ok && !!t && t.dueAt === '2026-10-09' && t.domain === 'education' && t.estimatedMinutes === 45);
    check('2.6: relação tarefa → derivada do e-mail registrada', relations.findLinked({ kind: 'email', id: 'cont' }, 'task', ['derived_from'])?.id === t!.id);
    check('2.7: resultado registrado na trilha (aceito, com ação e entidade)', center.audit().some((e) => e.step === 'resultado' && e.outcome === 'aceito' && e.refs?.entity?.id === t!.id));

    // idempotência entre sessões: outro centro, mesmas relações
    const center2 = createEmailActionCenter({ relations, tasks });
    const again = analyzeEmail(SAMPLES.contabilidade(), { now: NOW, existing: { relations, tasks: tasks.list() } });
    check('2.8: reanalisar depois de aceito → candidato já vem ligado ao existente', again.candidates.find((c) => c.kind === 'task')?.status === 'linked_existing');
    const fresh = analyzeEmail(SAMPLES.contabilidade(), { now: NOW });
    const { applied } = approveAndApply(center2, fresh, 'cont:task');
    check('2.9: mesmo que alguém aprove de novo, aplicar não duplica (sem efeito)', applied.report.noEffect === true && tasks.list().length === 1);
  }

  resetAll();
  {
    const { center, events, relations } = setup();
    const a = analyzeEmail(SAMPLES.telemedicina(), { now: NOW });
    const { p, applied } = approveAndApply(center, a, 'tele:calendar_event');
    const ev = events.list()[0];
    check('2.10: L2 sugerir evento → depois de aprovado vira CanonicalEvent de origem gmail, crítico e rígido', p.evaluation.decision.level === 'L2' && applied.report.ok && ev.source.kind === 'gmail' && ev.importance === 'critical' && ev.rigidity === 'rigid' && ev.start === '2026-10-07T18:00:00');
    check('2.11: evento ligado ao e-mail (relação) e com dedupKey para não duplicar lembretes', relations.findLinked({ kind: 'email', id: 'tele' }, 'event')?.id === ev.id && ev.dedupKey === 'email:tele');
  }

  resetAll();
  {
    const { center } = setup(true);
    const a = analyzeEmail(SAMPLES.contabilidade(), { now: NOW });
    check('2.12: "criar tarefa automaticamente" sem confiança conquistada → continua L2', center.propose(a, 'cont:task', NOW).evaluation.decision.level === 'L2');
    resetAll();
    seedTrust('email', 'CREATE_TASK_FROM_EMAIL', 8);
    const s = setup(true);
    const p = s.center.propose(analyzeEmail(SAMPLES.contabilidade(), { now: NOW }), 'cont:task', NOW);
    check('2.13: com histórico real de aceitação → L1, cria sem perguntar (política permite)', p.authorized && p.evaluation.decision.level === 'L1');
  }

  // ===== L3 =====
  resetAll();
  {
    const { center } = setup();
    const provider = createFixtureEmailProvider([SAMPLES.pedido()]);
    for (const type of ['SEND_EMAIL_REPLY', 'FORWARD_EMAIL', 'DELETE_EMAIL', 'CANCEL_EVENT_FROM_EMAIL', 'SCHEDULE_PAYMENT_FROM_EMAIL'] as const) {
      const s = center.requestSensitive(type, 'ped', {}, NOW);
      check(`3.${type}: L3 ${type} → sempre aprovação humana`, !s.authorized && s.evaluation.decision.level === 'L3');
    }
    const reply = center.requestSensitive('SEND_EMAIL_REPLY', 'ped', { body: 'ok' }, NOW);
    let refused: unknown;
    try { await provider.sendReply(reply.action.id, 'ped', 'ok'); } catch (e) { refused = e; }
    check('3.6: provedor recusa enviar resposta antes da aprovação', refused instanceof SensitiveActionNotApprovedError && provider.outbox.length === 0);
    Lifecycle.resolveApproval(reply.evaluation.approvalRequest!.id, 'approve');
    let wrongMsg: unknown;
    try { await provider.sendReply(reply.action.id, 'outra-msg', 'ok'); } catch (e) { wrongMsg = e; }
    check('3.7: aprovação vale só para a mensagem aprovada', wrongMsg instanceof SensitiveActionNotApprovedError);
    let wrongType: unknown;
    try { await provider.delete(reply.action.id, 'ped'); } catch (e) { wrongType = e; }
    check('3.8: aprovação de "responder" não serve para "excluir"', wrongType instanceof SensitiveActionNotApprovedError);
    await provider.sendReply(reply.action.id, 'ped', 'ok');
    check('3.9: aprovado → a fixture registra (nada sai de verdade)', provider.outbox.length === 1 && provider.outbox[0].op === 'reply');
  }

  // ===== Provedores =====
  resetAll();
  {
    const fx = createFixtureEmailProvider([SAMPLES.contabilidade(), SAMPLES.fatura()]);
    const st = fx.state();
    const threads = await fx.listThreads();
    check('4.1: fixture: estado "connected" mas marcado como demonstração, mensagens com origem fixture', st.isFixture === true && threads.items.every((t) => t.messages.every((m) => m.source.origin === 'fixture')));
    check('4.2: DataState de fixture nunca sai como dado real', (() => { const d = providerStateToDataState(st, threads.items, NOW); return d.status === 'ready' && d.origin === 'fixture'; })());
    await fx.markRead('cont');
    check('4.3: operações seguras (marcar lido) funcionam na fixture', (await fx.getMessage('cont'))!.isRead === true);

    const gmail = createUnavailableEmailProvider('gmail', gmailProviderState());
    let err: unknown;
    try { await gmail.listThreads(); } catch (e) { err = e; }
    const ds = providerStateToDataState(gmail.state(), undefined, NOW);
    check('4.4: Gmail real BLOQUEADO: chamada falha alto e o estado vira "permissão necessária" (não "caixa vazia")', !!err && ds.status === 'permission-required' && gmail.state().detail!.startsWith('BLOQUEADO'));
    const states: ProviderState['status'][] = ['available', 'connected', 'permission-required', 'expired', 'rate-limited', 'error', 'offline', 'partial'];
    const mapped = states.map((s) => providerStateToDataState({ provider: 'x', status: s }, [] as number[], NOW).status);
    check('4.5: os 8 estados de provedor viram DataState sem nenhum se passar por "pronto"', mapped.join() === 'permission-required,ready,permission-required,permission-required,stale,error,offline,partial');

    const api = {
      id: '18c1', threadId: '18c0', labelIds: ['INBOX', 'UNREAD', 'IMPORTANT'], snippet: 'Sua consulta foi confirmada para amanh&#39; às 18h', internalDate: String(Date.parse('2026-10-06T09:00:00')),
      payload: { headers: [{ name: 'From', value: '"Clínica Vida" <Agenda@ClinicaVida.com.br>' }, { name: 'To', value: 'eu@medusa.test, "Outra" <o@x.com>' }, { name: 'Subject', value: 'Consulta confirmada' }], parts: [{ filename: '', mimeType: 'text/plain', body: { size: 900 } }, { filename: 'preparo.pdf', mimeType: 'application/pdf', body: { attachmentId: 'att1', size: 2048 } }] },
    };
    const m = fromGmailApiMessage(api);
    check('4.6: mapeador Gmail (format=metadata): remetente, destinatários, assunto, não lido, rótulos, anexo por nome', m.sender.address === 'agenda@clinicavida.com.br' && m.sender.name === 'Clínica Vida' && m.recipients.length === 2 && m.subject === 'Consulta confirmada' && !m.isRead && m.attachments[0].filename === 'preparo.pdf' && m.receivedAt === '2026-10-06T09:00:00');
    check('4.7: mapeador não carrega corpo (só snippet), origem "real" e entidades HTML decodificadas', !('body' in m) && m.source.origin === 'real' && m.snippet.includes("amanh'"));

    const repo = createInMemoryRepository<CanonicalEvent>();
    const cal = createInternalCalendarProvider(repo);
    const ev: CanonicalEvent = { id: 'e1', source: { kind: 'internal' }, title: 'Reunião', start: at('14:00'), end: at('15:00'), status: 'confirmed' };
    let calRefused = false;
    try { await cal.createEvent('acao-inexistente', ev); } catch { calRefused = true; }
    check('4.8: calendário interno recusa escrita sem ação aprovada', calRefused && repo.list().length === 0);
    const { center } = setup();
    const a = analyzeEmail(SAMPLES.reuniao(), { now: NOW });
    const p = center.propose(a, 'reun:calendar_event', NOW);
    Lifecycle.resolveApproval(p.evaluation.approvalRequest!.id, 'approve');
    await cal.createEvent(p.action.id, ev);
    await cal.createEvent(p.action.id, ev);
    const busy = await cal.queryFreeBusy({ from: at('00:00'), to: at('23:59') });
    check('4.9: com ação aprovada cria (idempotente) e o free/busy reflete', repo.list().length === 1 && busy.length === 1 && busy[0].start === at('14:00'));
    let delRefused = false;
    try { await cal.deleteEvent(p.action.id, 'e1'); } catch { delRefused = true; }
    check('4.10: aprovação de "sugerir evento" não autoriza cancelar (cancelar é L3 próprio)', delRefused && repo.get('e1')!.status === 'confirmed');

    const g = createUnavailableCalendarProvider('google_calendar', googleCalendarProviderState());
    const o = createUnavailableCalendarProvider('outlook_calendar', outlookCalendarProviderState());
    let gErr = false;
    try { await g.listEvents({ from: at('00:00'), to: at('23:59') }); } catch { gErr = true; }
    check('4.11: Google Calendar e Outlook declarados BLOQUEADOS com motivo', gErr && g.state().detail!.startsWith('BLOQUEADO') && o.state().detail!.startsWith('BLOQUEADO'));
    const gev = fromGoogleCalendarEvent({ id: 'abc', summary: 'Telemedicina', start: { dateTime: '2026-10-07T18:00:00-03:00', timeZone: 'America/Sao_Paulo' }, end: { dateTime: '2026-10-07T18:30:00-03:00' }, attendees: [{ email: 'ana@clinica.com', organizer: true, responseStatus: 'accepted' }], reminders: { overrides: [{ method: 'popup', minutes: 10 }] } });
    check('4.12: mapeador Google Calendar → CanonicalEvent (hora local, fuso, participante, lembrete popup)', gev.source.kind === 'google_calendar' && gev.start === '2026-10-07T18:00:00' && gev.timezone === 'America/Sao_Paulo' && gev.participants![0].role === 'organizer' && gev.reminderPolicy!.offsetsMinutes[0] === 10);
  }

  return result();
}

if (require.main === module) {
  run().then(({ total, fails }) => {
    console.log(`\n[email-guardian-providers] ${total - fails}/${total} checagens OK`);
    process.exit(fails > 0 ? 1 : 0);
  });
}
