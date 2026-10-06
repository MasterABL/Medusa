/**
 * Evento ≠ prazo ≠ tarefa ≠ finanças; dedup contra o que existe; conversa (thread).
 */
import { makeChecker, resetAll } from '../domains/_helpers';
import { at, mail, SAMPLES, thread } from './fixtures';
import { analyzeEmail, analyzeThread, groupIntoThreads } from '../../../src/domains/email/services/pipeline';
import { createRelationStore } from '../../../src/foundation/relations/graph';
import type { CanonicalEvent } from '../../../src/foundation/events/canonical';
import type { Task } from '../../../src/domains/tasks/model/types';

const NOW = at('09:05');
const kinds = (a: ReturnType<typeof analyzeEmail>) => a.candidates.map((c) => c.kind).sort().join(',');

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('email-candidates');
  resetAll();

  // ===== Regra: evento ≠ prazo ≠ tarefa ≠ finanças =====
  {
    const meeting = analyzeEmail(SAMPLES.reuniao(), { now: NOW });
    check('1.1: "reunião às 14h" → EVENTO (sem prazo, sem tarefa)', meeting.candidates.some((c) => c.kind === 'calendar_event') && !meeting.candidates.some((c) => c.kind === 'deadline' || c.kind === 'task'));
    const ev = meeting.candidates.find((c) => c.kind === 'calendar_event') as any;
    check('1.2: evento carrega início, fuso, participantes, local e confiança', ev.start === at('14:00') && ev.timezone === 'America/Sao_Paulo' && ev.participants[0].address === 'paulo@empresa.com.br' && ev.location.includes('meet.google.com') && ev.confidence > 0.5);

    const entrega = analyzeEmail(SAMPLES.contabilidade(), { now: NOW });
    check('1.3: "entrega até sexta" → PRAZO + TAREFA (não evento)', entrega.candidates.some((c) => c.kind === 'deadline') && entrega.candidates.some((c) => c.kind === 'task') && !entrega.candidates.some((c) => c.kind === 'calendar_event'));

    const responda = analyzeEmail(mail('r', 'Pergunta', 'Responda este e-mail quando puder, por favor.'), { now: NOW });
    check('1.4: "responda este e-mail" → TAREFA + resposta (sem evento, sem prazo)', kinds(responda) === 'reply,task');

    const fat = analyzeEmail(SAMPLES.fatura(), { now: NOW });
    const fin = fat.candidates.find((c) => c.kind === 'finance') as any;
    check('1.5: "pagamento da fatura vence" → FINANÇAS + PRAZO, pagamento exige aprovação humana', !!fin && fin.paymentRequiresApproval === true && fin.amount === 1234.56 && fat.candidates.some((c) => c.kind === 'deadline'));
    check('1.6: finanças não vira tarefa de "pagar" automática', !fat.candidates.some((c) => c.kind === 'task'));

    const call = analyzeEmail(mail('c', 'Call', 'Vamos fazer uma call às 15h?'), { now: NOW });
    check('1.7: horário sem data → nenhum evento (o dia não é presumido) e o motivo fica na auditoria', !call.candidates.some((c) => c.kind === 'calendar_event') && call.audit.some((e) => e.reason.includes('não se presume')));

    const tele = analyzeEmail(SAMPLES.telemedicina(), { now: NOW });
    const rem = tele.candidates.find((c) => c.kind === 'reminder') as any;
    check('1.8: consulta crítica → lembrete T-15/T-5 ligado ao evento', rem?.offsetsMinutes.join() === '15,5' && rem.targetCandidateId === 'tele:calendar_event');
    check('1.9: telemedicina reconhecida como categoria própria', (tele.candidates.find((c) => c.kind === 'calendar_event') as any).category === 'telemedicine');
  }

  // ===== Dedup contra o que já existe =====
  resetAll();
  {
    const existingEvent: CanonicalEvent = { id: 'agenda-consulta', source: { kind: 'internal' }, title: 'Teleconsulta Dra. Ana', start: '2026-10-07T18:00:00', end: '2026-10-07T18:30:00', status: 'confirmed' };
    const a = analyzeEmail(SAMPLES.telemedicina(), { now: NOW, existing: { events: [existingEvent] } });
    const ev = a.candidates.find((c) => c.kind === 'calendar_event')!;
    check('2.1: consulta que já está na Agenda → candidato só se LIGA (linked_existing)', ev.status === 'linked_existing' && ev.matchedExisting?.id === 'agenda-consulta');
    check('2.2: …e não gera lembrete próprio (a Agenda já avisa)', !a.candidates.some((c) => c.kind === 'reminder'));
    check('2.3: …nem ação de "criar evento"', !a.actions.some((x) => x.kind === 'criar_evento'));

    const existingTask: Task = { id: 't-cont', title: 'Projeto de Contabilidade', priority: 'high', status: 'todo', dueAt: '2026-10-09', domain: 'education', dependsOn: [], createdAt: NOW, updatedAt: NOW };
    const b = analyzeEmail(SAMPLES.contabilidade(), { now: NOW, existing: { tasks: [existingTask] } });
    check('2.4: tarefa equivalente já existe → linked_existing, sem segunda tarefa', b.candidates.find((c) => c.kind === 'task')?.status === 'linked_existing');

    const rel = createRelationStore();
    rel.link({ kind: 'task', id: 'email-task:cont' }, 'derived_from', { kind: 'email', id: 'cont' }, { by: 'guardian', reason: 'teste' }, NOW);
    const c = analyzeEmail(SAMPLES.contabilidade(), { now: NOW, existing: { relations: rel } });
    check('2.5: reprocessar um e-mail que já gerou tarefa → nada novo', c.candidates.find((x) => x.kind === 'task')?.status === 'linked_existing');

    const d1 = analyzeEmail(SAMPLES.contabilidade(), { now: NOW });
    const d2 = analyzeEmail(SAMPLES.contabilidade(), { now: NOW });
    check('2.6: mesmo e-mail duas vezes → mesmos ids de candidato (determinístico)', d1.candidates.map((x) => x.id).join() === d2.candidates.map((x) => x.id).join());
    const counts = (x: typeof d1) => ['task', 'calendar_event', 'reminder'].map((k) => x.candidates.filter((c) => c.kind === k).length);
    check('2.7: nenhum e-mail gera mais de 1 tarefa, 1 evento e 2 lembretes', [d1, analyzeEmail(SAMPLES.telemedicina(), { now: NOW }), analyzeEmail(SAMPLES.fechamento(), { now: NOW })].every((x) => { const [t, e, r] = counts(x); return t <= 1 && e <= 1 && r <= 2; }));
  }

  // ===== Conversa =====
  resetAll();
  {
    const convite = mail('m1', 'Reunião de alinhamento', 'Podemos fazer a reunião terça-feira às 14h?', { receivedAt: '2026-10-05T10:00:00', sender: { name: 'Paulo', address: 'paulo@empresa.com.br' } });
    const confirma = mail('m2', 'Re: Reunião de alinhamento', 'Confirmado: reunião terça-feira às 14h.', { receivedAt: '2026-10-05T11:00:00', sender: { name: 'Paulo', address: 'paulo@empresa.com.br' } });
    const ta = analyzeThread(thread('th1', [convite, confirma]), { now: NOW });
    const events = ta.analyses.flatMap((a) => a.candidates.filter((c) => c.kind === 'calendar_event'));
    check('3.1: convite + confirmação na mesma conversa → UM evento (o da mensagem mais nova)', events.length === 1 && events[0].sourceEmailId === 'm2' && ta.deduplicated.length >= 1);
    check('3.2: a deduplicação fica registrada na auditoria', ta.analyses[0].audit.some((e) => e.step === 'deduplicacao'));

    const cancela = mail('m3', 'Re: Reunião de alinhamento', 'A reunião de terça foi cancelada.', { receivedAt: '2026-10-05T15:00:00', sender: { name: 'Paulo', address: 'paulo@empresa.com.br' } });
    const tc = analyzeThread(thread('th2', [convite, cancela]), { now: NOW });
    const ev = tc.analyses[0].candidates.find((c) => c.kind === 'calendar_event');
    check('3.3: "foi cancelada" numa resposta posterior → compromisso descartado, sem lembrete', ev?.status === 'dismissed' && !tc.analyses[0].candidates.some((c) => c.kind === 'reminder'));

    const pergunta = mail('s1', 'Orçamento', 'Você consegue me mandar o orçamento?', { direction: 'sent', sender: { address: 'eu@medusa.test' }, isRead: true, receivedAt: '2026-10-02T10:00:00' });
    const tw = analyzeThread(thread('th3', [pergunta]), { now: NOW });
    check('3.4: última mensagem é minha, com pergunta → conversa "aguardando resposta"', tw.thread.status === 'waiting_reply' && tw.analyses[0].readingStates.includes('waiting'));

    const tn = analyzeThread(thread('th4', [SAMPLES.fechamento()]), { now: NOW });
    check('3.5: conversa com pedido → "precisa de ação", importância da conversa = a maior', tn.thread.status === 'needs_action' && tn.thread.importance === 'high');
    const grouped = groupIntoThreads([convite, confirma, SAMPLES.fatura()].map((m, i) => ({ ...m, threadId: i < 2 ? 'g1' : 'g2' })));
    check('3.6: mensagens soltas agrupadas por conversa, assunto sem "Re:", não lidas contadas', grouped.length === 2 && grouped.find((g) => g.threadId === 'g1')!.subject === 'Reunião de alinhamento' && grouped.find((g) => g.threadId === 'g1')!.unreadCount === 2);
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[email-candidates] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
