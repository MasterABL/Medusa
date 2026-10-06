/**
 * MEDUSA PERSONAL OS — Reminder Engine v2 + canais + Guardian + follow-up
 * Inclui os dois GATES da telemedicina (seção 30).
 */
import { makeChecker, resetAll } from '../domains/_helpers';
import { DAY, agendaItem } from './fixtures';
import { buildEventContexts } from '../../../src/foundation/context/eventContext';
import { createReminderEngine } from '../../../src/foundation/reminders/engine';
import type { ReminderPolicyV2 } from '../../../src/foundation/reminders/engine';
import { selectReminderOverview } from '../../../src/foundation/reminders/selectors';
import {
  createChannelRegistry, createDynamicIslandChannel, createWebNotificationChannel, createNativeMobileChannel, createEmailChannel,
} from '../../../src/foundation/reminders/channels';
import type { NotificationPayload, WebNotificationEnv } from '../../../src/foundation/reminders/channels';
import * as Trace from '../../../src/foundation/guardianTrace/causalTrace';
import { buildUniversalActionCenter } from '../../../src/foundation/actions/universal';
import { GuardianTrust } from '../../../src/foundation/guardian';

const at = (hhmm: string, s = '00') => `${DAY}T${hhmm}:${s}`;

function setup(webPermission: WebNotificationEnv['permission'] | 'unsupported' = 'granted', policyFor?: (c: any) => ReminderPolicyV2 | undefined) {
  const island: NotificationPayload[] = [];
  const web: Array<{ title: string; body: string; tag: string }> = [];
  const env = (): WebNotificationEnv => ({ supported: webPermission !== 'unsupported', permission: webPermission === 'unsupported' ? 'default' : webPermission, show: (title, o) => web.push({ title, body: o.body, tag: o.tag }) });
  const channels = createChannelRegistry([createDynamicIslandChannel((p) => island.push(p)), createWebNotificationChannel(env), createNativeMobileChannel(), createEmailChannel()]);
  const engine = createReminderEngine({ channels, policyFor });
  return { engine, island, web };
}

const tele = () => agendaItem('tele', 'Telemedicina com Dra. Ana', '10:05', '10:35');

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('reminders-v2');

  // ===== GATE 1: telemedicina, faltam 5 min, canais web disponíveis =====
  resetAll();
  {
    const { engine, island, web } = setup('granted', (c) => (c.category === 'telemedicine' ? { id: 'tele_T5', offsetsMinutes: [5], channels: ['dynamic_island', 'web_notification', 'native_mobile_notification'], minGapMs: 60_000, requiresAcknowledgement: true } : undefined));
    const ctxs = buildEventContexts({ date: DAY, items: [tele()] });
    check('G1.1: evento detectado como CRÍTICO e rígido', ctxs[0].tier === 'critical' && ctxs[0].rigid);
    const sync = engine.syncEvents(ctxs, at('09:00'));
    check('G1.2: política gera lembrete T-5 (planejado às 10:00)', sync.planned.join() === 'tele@2026-10-06#T5' && engine.get('tele@2026-10-06#T5')!.triggerAtIso === at('10:00'));
    check('G1.3: antes da hora nada sai', engine.tick(at('09:59')).delivered.length === 0 && island.length === 0);
    const r = engine.tick(at('10:00')).delivered[0];
    check('G1.4: faltam 5 min → entrega elegível e feita', !!r && r.offsetMinutes === 5);
    check('G1.5: intenção da Dynamic Island criada (evento, alvo, tier crítico)', island.length === 1 && island[0].eventId === 'tele' && island[0].tier === 'critical' && island[0].target.tab === 'agenda');
    check('G1.6: Web Notification criada com tag única por gatilho', web.length === 1 && web[0].tag === 'medusa:tele:5' && web[0].body.includes('5 min'));
    check('G1.7: canal nativo NÃO finge: blocked com motivo', r.deliveries.find((d) => d.channel === 'native_mobile_notification')!.status === 'blocked' && /app nativo/.test(r.deliveries.find((d) => d.channel === 'native_mobile_notification')!.reason!));
    check('G1.8: estado honesto: entregue parcialmente (2 de 3 canais)', r.state === 'partially_delivered');
    const trace = Trace.buildCausalTrace('reminder:tele@2026-10-06');
    check('G1.9: passou pelo Guardian: ação L1 informativa, sem aprovação, executada e com resultado', trace.actions[0].type === 'CREATE_REMINDER' && trace.actions[0].autonomyLevel === 'L1' && trace.approvals.length === 0 && trace.outcomes[0].result === 'efeito_confirmado');
    check('G1.10: trilha causal completa sem violação (contexto registrado)', trace.violations.length === 0 && trace.context.length === 1);
  }

  // ===== GATE 2: canal nativo indisponível e web sem permissão → nunca fingir sucesso =====
  resetAll();
  {
    const nativeOnly = (c: any): ReminderPolicyV2 | undefined => (c.category === 'telemedicine' ? { id: 'native', offsetsMinutes: [5], channels: ['native_mobile_notification'], minGapMs: 60_000, requiresAcknowledgement: true } : undefined);
    const { engine } = setup('default', nativeOnly);
    engine.syncEvents(buildEventContexts({ date: DAY, items: [tele()] }), at('09:00'));
    const r = engine.tick(at('10:00')).delivered[0];
    check('G2.1: só canal nativo → estado BLOCKED, nenhuma entrega "delivered"', r.state === 'blocked' && r.deliveries.every((d) => d.status !== 'delivered'));
    check('G2.2: resultado no Guardian é "sem_efeito", nunca efeito confirmado', Trace.buildCausalTrace('reminder:tele@2026-10-06').outcomes[0].result === 'sem_efeito');

    resetAll();
    const webOnly = (c: any): ReminderPolicyV2 | undefined => (c.category === 'telemedicine' ? { id: 'web', offsetsMinutes: [5], channels: ['web_notification'], minGapMs: 60_000, requiresAcknowledgement: true } : undefined);
    const s2 = setup('default', webOnly);
    s2.engine.syncEvents(buildEventContexts({ date: DAY, items: [tele()] }), at('09:00'));
    const r2 = s2.engine.tick(at('10:00')).delivered[0];
    check('G2.3: Web Notification sem permissão → PERMISSION_REQUIRED, nada mostrado', r2.deliveries[0].status === 'permission_required' && s2.web.length === 0 && r2.state === 'blocked');
    check('G2.4: capacidades por canal: island disponível, web pede permissão, nativo bloqueado, e-mail não implementado', (() => {
      const caps = Object.fromEntries(s2.engine.capabilities().map((c) => [c.channel, c.status]));
      return caps.dynamic_island === 'available' && caps.web_notification === 'permission-required' && caps.native_mobile_notification === 'blocked' && caps.email === 'not-implemented';
    })());
    const s3 = setup('unsupported', webOnly);
    s3.engine.syncEvents(buildEventContexts({ date: DAY, items: [tele()] }), at('09:00'));
    check('G2.5: navegador sem a API → blocked (não "permission")', s3.engine.tick(at('10:00')).delivered[0].deliveries[0].status === 'blocked');
  }

  // ===== Gatilhos T-30/T-15/T-5/horário exato, dedupe, superseded, expiração =====
  resetAll();
  {
    const all: ReminderPolicyV2 = { id: 'all', offsetsMinutes: [30, 15, 5, 0], channels: ['dynamic_island'], minGapMs: 60_000, requiresAcknowledgement: true };
    const { engine, island } = setup('granted', () => all);
    engine.syncEvents(buildEventContexts({ date: DAY, items: [agendaItem('prova', 'Prova de Cálculo', '19:00', '21:00')] }), at('12:00'));
    check('3.1: quatro gatilhos planejados: 18:30, 18:45, 18:55, 19:00', engine.list().map((r) => r.triggerAtIso.slice(11, 16)).join() === '18:30,18:45,18:55,19:00');
    engine.tick(at('18:30'));
    check('3.2: T-30 entregue', island.length === 1 && island[0].offsetMinutes === 30);
    engine.tick(at('18:30', '30'));
    check('3.3: o mesmo gatilho nunca sai duas vezes', island.length === 1);
    engine.tick(at('18:45')); engine.tick(at('18:55')); engine.tick(at('19:00'));
    check('3.4: T-15, T-5 e horário exato (0) entregues em ordem', island.map((p) => p.offsetMinutes).join() === '30,15,5,0');
    check('3.5: nada depois que o evento começou', engine.tick(at('19:10')).delivered.length === 0 && island.length === 4);
  }
  resetAll();
  {
    const { engine, island } = setup('granted', () => ({ id: 'p', offsetsMinutes: [15, 5], channels: ['dynamic_island'], minGapMs: 60_000, requiresAcknowledgement: false }));
    engine.syncEvents(buildEventContexts({ date: DAY, items: [agendaItem('aula', 'Aula de inglês', '19:00', '20:00', { domain: 'education' })] }), at('12:00'));
    const rep = engine.tick(at('18:56')); // app reabriu depois de T-15 e T-5
    check('3.6: gatilhos vencidos juntos → só o mais próximo sai, o outro vira superseded', rep.delivered.length === 1 && rep.delivered[0].offsetMinutes === 5 && rep.superseded.length === 1 && island.length === 1);
    resetAll();
    const s = setup('granted', () => ({ id: 'p', offsetsMinutes: [15, 5], channels: ['dynamic_island'], minGapMs: 60_000, requiresAcknowledgement: false }));
    s.engine.syncEvents(buildEventContexts({ date: DAY, items: [agendaItem('aula', 'Aula de inglês', '19:00', '20:00', { domain: 'education' })] }), at('12:00'));
    const late = s.engine.tick(at('19:05'));
    check('3.7: app aberto depois que o evento começou → lembretes expiram, nada é enviado atrasado', late.delivered.length === 0 && late.expired.length === 2 && s.island.length === 0);
  }
  resetAll();
  {
    const { engine, island } = setup('granted', () => ({ id: 'p', offsetsMinutes: [15, 5], channels: ['dynamic_island'], minGapMs: 60_000, requiresAcknowledgement: true }));
    const r = engine.syncEvents(buildEventContexts({ date: DAY, items: [agendaItem('rapida', 'Consulta', '10:03', '10:30')] }), at('10:00'));
    check('3.8: evento criado em cima da hora (faltam 3 min, sem gatilho restante) → um lembrete de recuperação', r.planned.join() === 'rapida@2026-10-06#C');
    engine.tick(at('10:00'));
    check('3.9: o lembrete de recuperação sai imediatamente', island.length === 1 && island[0].offsetMinutes === 3);
  }

  // ===== Cooldown entre lembretes do mesmo evento =====
  resetAll();
  {
    const { engine, island } = setup('granted', () => ({ id: 'gap', offsetsMinutes: [6, 5], channels: ['dynamic_island'], minGapMs: 120_000, requiresAcknowledgement: false }));
    engine.syncEvents(buildEventContexts({ date: DAY, items: [agendaItem('x', 'Reunião com cliente', '10:10', '11:00')] }), at('09:00'));
    engine.tick(at('10:04'));
    const rep = engine.tick(at('10:05'));
    check('4.1: segundo gatilho 1 min depois respeita o intervalo mínimo (adiado, não perdido)', island.length === 1 && rep.deferred.length === 1);
    engine.tick(at('10:06'));
    check('4.2: passado o intervalo, o adiado sai', island.length === 2);
  }

  // ===== Cancelamento e reagendamento =====
  resetAll();
  {
    const { engine, island } = setup('granted');
    engine.syncEvents(buildEventContexts({ date: DAY, items: [tele()] }), at('09:00'));
    const moved = engine.syncEvents(buildEventContexts({ date: DAY, items: [{ ...tele(), startTime: '11:05', endTime: '11:35' }] }), at('09:30'));
    check('5.1: evento remarcado → lembretes antigos superseded e novos planejados no novo horário', moved.superseded.length === 4 && engine.get('tele@2026-10-06#T5')!.triggerAtIso === at('11:00'));
    engine.tick(at('10:00'));
    check('5.2: nada sai no horário antigo', island.length === 0);
    const gone = engine.syncEvents(buildEventContexts({ date: DAY, items: [{ ...tele(), status: 'cancelled' }] }), at('09:40'), { coveredDates: [DAY] });
    check('5.3: evento cancelado na Agenda → lembretes pendentes cancelados', gone.cancelled.length === 4 && engine.list({ states: ['scheduled'] }).length === 0);
    check('5.4: cancelamento explícito por id também funciona', (() => { resetAll(); const s = setup(); s.engine.syncEvents(buildEventContexts({ date: DAY, items: [tele()] }), at('09:00')); return s.engine.cancelEvent('tele', 'usuário desmarcou', at('09:10')).length === 4; })());
  }

  // ===== Acknowledgement, soneca e follow-up =====
  resetAll();
  {
    const { engine, island } = setup('granted', () => ({ id: 'ack', offsetsMinutes: [5], channels: ['dynamic_island'], minGapMs: 60_000, requiresAcknowledgement: true }));
    engine.syncEvents(buildEventContexts({ date: DAY, items: [tele()] }), at('09:00'));
    check('6.1: não dá pra reconhecer lembrete que não foi entregue', (() => { try { engine.acknowledge('tele@2026-10-06#T5', 'viewed', at('09:10')); return false; } catch { return true; } })());
    engine.tick(at('10:00'));
    const before = GuardianTrust.getTrust('agenda', 'CREATE_REMINDER')?.sampleSize ?? 0;
    const acked = engine.acknowledge('tele@2026-10-06#T5', 'opened', at('10:01'));
    check('6.2: abrir pelo lembrete → acknowledged + follow-up "ação tomada" + feedback explícito no Guardian', acked.state === 'acknowledged' && acked.followUp === 'acao_tomada' && (GuardianTrust.getTrust('agenda', 'CREATE_REMINDER')?.sampleSize ?? 0) === before + 1);
    check('6.3: follow-up após o evento: reconhecido', engine.followUp(at('10:40'))[0].state === 'acao_tomada');
    check('6.4: soneca cria um novo lembrete (antes do início)', (() => {
      resetAll();
      const s = setup('granted', () => ({ id: 'z', offsetsMinutes: [15], channels: ['dynamic_island'], minGapMs: 0, requiresAcknowledgement: true }));
      s.engine.syncEvents(buildEventContexts({ date: DAY, items: [tele()] }), at('09:00'));
      s.engine.tick(at('09:50'));
      s.engine.acknowledge('tele@2026-10-06#T15', 'snoozed', at('09:51'), 10);
      const snooze = s.engine.get('tele@2026-10-06#S1');
      s.engine.tick(at('10:01'));
      return !!snooze && snooze.triggerAtIso === at('10:01') && s.island.length === 2;
    })());
    void island;
  }
  resetAll();
  {
    const { engine } = setup('granted', () => ({ id: 'f', offsetsMinutes: [5], channels: ['dynamic_island'], minGapMs: 60_000, requiresAcknowledgement: true }));
    engine.syncEvents(buildEventContexts({ date: DAY, items: [tele()] }), at('09:00'));
    engine.tick(at('10:00'));
    const f = engine.followUp(at('10:40'));
    check('7.1: entregue e ninguém reconheceu até o fim → "perdido sem reconhecimento" registrado', f.length === 1 && f[0].state === 'perdido_sem_reconhecimento' && f[0].deliveredChannels.join() === 'dynamic_island');
    check('7.2: follow-up não gera nenhum lembrete novo (sem spam)', engine.list({ states: ['scheduled'] }).length === 0 && engine.tick(at('10:41')).delivered.length === 0);
    check('7.3: follow-up antes do fim do evento não conclui nada', engine.followUp(at('10:20')).length === 0);
  }
  resetAll();
  {
    const { engine } = setup('default', () => ({ id: 'n', offsetsMinutes: [5], channels: ['native_mobile_notification'], minGapMs: 60_000, requiresAcknowledgement: true }));
    engine.syncEvents(buildEventContexts({ date: DAY, items: [tele()] }), at('09:00'));
    engine.tick(at('10:00'));
    check('7.4: nada entregue (canal bloqueado) → follow-up "não entregue", não "perdido"', engine.followUp(at('10:40'))[0].state === 'nao_entregue');
  }

  // ===== Lembrete recorrente =====
  resetAll();
  {
    const { engine, island } = setup('granted');
    engine.addRecurringRule({ id: 'remedio', title: 'Tomar remédio', time: '22:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], tier: 'high', active: true });
    const d1 = engine.syncRecurring(DAY, at('08:00'));
    const again = engine.syncRecurring(DAY, at('08:30'));
    const d2 = engine.syncRecurring('2026-10-07', at('08:00'));
    check('8.1: regra diária gera um lembrete por dia, no horário exato, sem duplicar', d1.join() === 'rule:remedio@2026-10-06#T0' && again.length === 0 && d2.join() === 'rule:remedio@2026-10-07#T0');
    engine.tick(at('22:00'));
    check('8.2: lembrete recorrente entregue', island.length === 1 && island[0].title === 'Tomar remédio');
    check('8.3: sincronizar a Agenda não cancela lembretes de regra recorrente', engine.syncEvents([], at('22:01'), { coveredDates: ['2026-10-07'] }).cancelled.length === 0);
    engine.addRecurringRule({ id: 'semana', title: 'Planejar a semana', time: '20:00', daysOfWeek: [0], tier: 'medium', active: true });
    check('8.4: regra semanal só no dia configurado (terça não, domingo sim)', engine.syncRecurring(DAY, at('08:00')).length === 0 && engine.syncRecurring('2026-10-11', at('08:00')).includes('rule:semana@2026-10-11#T0'));
  }

  // ===== Persistência via export/import (adapter futuro) =====
  resetAll();
  {
    const a = setup('granted', () => ({ id: 'p', offsetsMinutes: [5], channels: ['dynamic_island'], minGapMs: 60_000, requiresAcknowledgement: true }));
    a.engine.syncEvents(buildEventContexts({ date: DAY, items: [tele()] }), at('09:00'));
    a.engine.tick(at('10:00'));
    const snapshot = JSON.parse(JSON.stringify(a.engine.exportState()));
    const b = setup('granted', () => ({ id: 'p', offsetsMinutes: [5], channels: ['dynamic_island'], minGapMs: 60_000, requiresAcknowledgement: true }));
    b.engine.importState(snapshot);
    b.engine.syncEvents(buildEventContexts({ date: DAY, items: [tele()] }), at('10:01'));
    b.engine.tick(at('10:01'));
    check('8.5: estado restaurado (simula recarregar a página) → o T-5 já entregue NÃO sai de novo', b.island.length === 0 && b.engine.get('tele@2026-10-06#T5')!.state === 'delivered');
    const c = setup('granted', () => ({ id: 'p', offsetsMinutes: [5], channels: ['dynamic_island'], minGapMs: 60_000, requiresAcknowledgement: true }));
    c.engine.syncEvents(buildEventContexts({ date: DAY, items: [tele()] }), at('10:01'));
    c.engine.tick(at('10:01'));
    check('8.6: SEM estado persistido, um motor novo re-entregaria (por isso o adapter de persistência é pendência real)', c.island.length === 1);
  }

  // ===== Guardian: aprovação e Action Center universal =====
  resetAll();
  {
    for (let i = 0; i < 8; i += 1) GuardianTrust.recordOutcome({ domain: 'agenda', actionType: 'CREATE_REMINDER', outcome: 'rejected', actionId: `r${i}` });
    const { engine, island } = setup('granted');
    engine.syncEvents(buildEventContexts({ date: DAY, items: [tele()] }), at('09:00'));
    const rep = engine.tick(at('09:50'));
    check('9.1: se o usuário vem rejeitando lembretes, o Guardian rebaixa para L2 e o lembrete fica aguardando aprovação (não sai sozinho)', rep.held.length === 1 && island.length === 0 && rep.held[0].state === 'held_for_approval');
    const center = buildUniversalActionCenter();
    check('9.2: aparece no Action Center universal com domínio, risco, autonomia e motivo', center.awaitingApproval.length === 1 && center.awaitingApproval[0].sourceDomain === 'agenda' && center.awaitingApproval[0].autonomy === 'L2' && !!center.awaitingApproval[0].reason);
    const ov = selectReminderOverview(engine, at('09:50'));
    check('9.3: overview lista o lembrete parado em aprovação (decisão do usuário, não dado faltando)', (ov.status === 'partial' || ov.status === 'ready') && ov.data.held.length === 1);
  }
  resetAll();
  {
    const { engine } = setup('default');
    check('10.1: sem lembretes → empty', selectReminderOverview(engine, at('08:00')).status === 'empty');
    engine.syncEvents(buildEventContexts({ date: DAY, items: [tele()] }), at('09:00'));
    const ov = selectReminderOverview(engine, at('09:00'));
    check('10.2: canais indisponíveis aparecem como "faltando" (partial), sem esconder', ov.status === 'partial' && ov.missing.some((m) => m.startsWith('web_notification')) && ov.missing.some((m) => m.startsWith('native_mobile_notification')));
  }

  // ===== Política padrão crítica e dedup entre fontes =====
  resetAll();
  {
    const { engine } = setup('granted');
    engine.syncEvents(buildEventContexts({ date: DAY, items: [tele()] }), at('09:00'));
    check('11.1: evento crítico sem política específica → T-30, T-15, T-5 e horário exato', engine.list().map((r) => r.offsetMinutes).join() === '30,15,5,0');
  }
  resetAll();
  {
    // o mesmo compromisso chega por duas fontes com ids diferentes (Agenda + Google Calendar/e-mail)
    const { engine, island } = setup('granted');
    const a = tele();
    const b = agendaItem('gcal-tele', 'Telemedicina com Dra. Ana', '10:05', '10:35');
    const sync = engine.syncEvents(buildEventContexts({ date: DAY, items: [a, b] }), at('09:00'));
    check('11.2: mesmo título e horário em dois eventos → um só conjunto de lembretes', new Set(engine.list().map((r) => r.eventId)).size === 1 && sync.deduplicated.length === 1 && sync.deduplicated[0].coveredBy === `${engine.list()[0].eventId}@${DAY}`);
    engine.tick(at('09:35'));
    engine.tick(at('09:50'));
    engine.tick(at('10:00'));
    engine.tick(at('10:05'));
    check('11.3: cada gatilho sai uma vez só, nunca uma vez por fonte', island.map((p) => p.offsetMinutes).join() === '30,15,5,0');
    const again = engine.syncEvents(buildEventContexts({ date: DAY, items: [a, b] }), at('10:06'));
    check('11.4: sincronizar de novo não reabre a duplicata', again.planned.length === 0 && island.length === 4);
  }
  resetAll();
  {
    // títulos diferentes, mas a fonte afirma que é o mesmo compromisso (dedupKey)
    const { engine, island } = setup('granted');
    const items = [tele(), agendaItem('email-consulta', 'Consulta confirmada (e-mail)', '10:05', '10:35')];
    const ctxs = buildEventContexts({ date: DAY, items, links: { tele: { dedupKey: 'consulta-ana' }, 'email-consulta': { dedupKey: 'consulta-ana' } } });
    engine.syncEvents(ctxs, at('09:58'));
    engine.tick(at('10:00'));
    check('11.5: dedupKey explícita funde fontes com títulos diferentes', island.length === 1 && new Set(engine.list().map((r) => r.eventId)).size === 1);
  }
  resetAll();
  {
    const { engine } = setup('granted');
    const items = [tele(), agendaItem('outra', 'Reunião de equipe', '10:05', '10:35')];
    engine.syncEvents(buildEventContexts({ date: DAY, items }), at('09:00'));
    check('11.6: compromissos diferentes no mesmo horário NÃO são fundidos', new Set(engine.list().map((r) => r.eventId)).size === 2);
  }
  resetAll();
  {
    // a fonte principal some (cancelada) → a outra passa a carregar os lembretes
    const { engine } = setup('granted');
    const a = tele();
    const b = agendaItem('gcal-tele', 'Telemedicina com Dra. Ana', '10:05', '10:35');
    engine.syncEvents(buildEventContexts({ date: DAY, items: [a, b] }), at('09:00'));
    const owner = engine.list()[0].eventId;
    const survivor = owner === 'tele' ? b : a;
    engine.syncEvents(buildEventContexts({ date: DAY, items: [survivor] }), at('09:10'), { coveredDates: [DAY] });
    check('11.7: se a fonte que cobria some, a outra herda os lembretes na mesma sincronização (não fica sem aviso)', engine.list({ states: ['scheduled'] }).some((r) => r.eventId === survivor.id));
  }
  resetAll();
  {
    // estado exportado antes desta versão (sem intentKey) continua deduplicando
    const a = setup('granted', () => ({ id: 'p', offsetsMinutes: [5], channels: ['dynamic_island'], minGapMs: 60_000, requiresAcknowledgement: true }));
    a.engine.syncEvents(buildEventContexts({ date: DAY, items: [tele()] }), at('09:00'));
    a.engine.tick(at('10:00'));
    const legacy = a.engine.exportState();
    legacy.records = legacy.records.map(({ intentKey, ...r }) => r as typeof legacy.records[number]);
    const b = setup('granted', () => ({ id: 'p', offsetsMinutes: [5], channels: ['dynamic_island'], minGapMs: 60_000, requiresAcknowledgement: true }));
    b.engine.importState(legacy);
    b.engine.syncEvents(buildEventContexts({ date: DAY, items: [agendaItem('gcal-tele', 'Telemedicina com Dra. Ana', '10:05', '10:35')] }), at('10:01'));
    b.engine.tick(at('10:01'));
    check('11.8: estado antigo importado ganha intentKey e a outra fonte não repete o T-5 já entregue', b.island.length === 0);
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[reminders-v2] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
