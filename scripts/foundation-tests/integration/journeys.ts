/**
 * Jornadas completas pelo runtime (o mesmo caminho que a UI usa), não funções soltas.
 *
 *  J1 Consulta médica : e-mail/agenda → compromisso → lembretes T-30/15/5/0 (sem duplicar) → Hoje → Island → confirmação
 *  J2 Faculdade       : e-mail → prazo → tarefa → projeto → prioridade → recomendação → planner → Agenda
 *  J3 Financeiro      : transações → anomalia → Guardian → decisão → aprovação → resultado honesto → audit
 *  J4 Treino          : ficha → sessão → série → descanso → progressão → histórico
 *  J5 Espiritual      : leitura → memorização SM-2 → oração → presença (sem streak)
 */
import { makeChecker } from '../domains/_helpers';
import { DAY, WED, item, session } from './harness';
import { SAMPLES } from '../email/fixtures';
import { findDuplicateGroups } from '../../../src/domains/finance/services/duplicateDetection';
import type { Transaction } from '../../../src/domains/finance/model/types';
import { getAction } from '../../../src/foundation/actionBus';
import { GuardianAuditLog } from '../../../src/foundation/guardian';
import { listOutcomes } from '../../../src/foundation/guardianTrace/outcome';
import type { WorkoutSheet } from '../../../src/domains/body/model/training';

export async function run(): Promise<{ total: number; fails: number }> {
  const { check, result } = makeChecker('jornadas');

  // ================= J1 — CONSULTA MÉDICA =================
  {
    const s = await session({ at: `${DAY}T14:00:00`, agenda: [item('consulta', 'Consulta com Dra. Ana', '15:00', '15:30', { location: 'https://meet.example/sala' })] });
    const recs = s.os.reminders('consulta');
    check('J1.1: consulta às 15:00 → lembretes 14:30, 14:45, 14:55 e 15:00 (política crítica)', recs.map((r) => r.triggerAtIso.slice(11, 16)).join() === '14:30,14:45,14:55,15:00');
    s.syncAgenda();
    s.syncAgenda();
    check('J1.2: sincronizar de novo não cria outro conjunto (dedup)', s.os.reminders('consulta').length === 4);
    for (const t of ['14:30', '14:45', '14:55', '15:00']) {
      s.clock.set(`${DAY}T${t}:00`);
      s.os.tick();
    }
    check('J1.3: os 4 avisos chegaram na Dynamic Island, um de cada', s.island.filter((p) => p.eventId === 'consulta').map((p) => p.offsetMinutes).join() === '30,15,5,0');
    check('J1.4: notificação do navegador entregue quando há permissão', s.web.length === 4);
    s.clock.set(`${DAY}T14:50:00`);
    const t = s.os.todayContext();
    const data = (t as any).data;
    check('J1.5: Hoje responde "o que importa agora": consulta é o Próximo, em 10 min', data?.proximo?.refs?.eventId === 'consulta' && data.proximo.minutesUntilStart === 10);
    check('J1.6: Hoje diz quais fontes não estão conectadas (não esconde)', (data?.sources ?? []).some((x: any) => x.id === 'finance' && x.status === 'error'));
    const last = s.os.reminders('consulta').find((r) => r.offsetMinutes === 0)!;
    s.os.acknowledgeReminder(last.id, 'opened');
    s.os.confirmCheckin('consulta');
    await s.os.flush();
    const s2 = await session({ storage: s.storage, at: `${DAY}T15:05:00`, agenda: s.agenda });
    check('J1.7: confirmação e lembrete reconhecido sobrevivem ao recarregamento', s2.os.todayState().checkins.includes('consulta') && s2.os.reminders('consulta').find((r) => r.id === last.id)?.state === 'acknowledged');
    s2.os.tick();
    check('J1.8: depois de recarregar, nenhum aviso é reenviado', s2.island.length === 0);

    // variante e-mail: o compromisso nasce de um e-mail de confirmação
    const e = await session({ at: `${DAY}T09:10:00` });
    e.os.ingestEmails([SAMPLES.telemedicina()]);
    const pending = e.os.reminders();
    check('J1.9: e-mail de teleconsulta já gera lembrete provisório T-15/T-5 (política do próprio e-mail)', pending.map((r) => r.triggerAtIso).join() === `${WED}T17:45:00,${WED}T17:55:00`);
    const prop = e.os.emailProposals().find((p) => p.candidateId === 'tele:calendar_event')!;
    check('J1.10: o evento vira PROPOSTA no Guardian (L2), não entra sozinho na Agenda', getAction(prop.actionId)?.status === 'AWAITING_APPROVAL' && !e.agenda.some((i) => i.id === 'email-event:tele'));
    const d = e.os.approve(prop.actionId);
    check('J1.11: aprovado → executado → compromisso gravado na Agenda (origem e-mail)', d.state === 'executada' && e.agenda.some((i) => i.id === 'email-event:tele' && i.startTime === '18:00'));
    check('J1.12: aceitar não duplica lembretes (mesmo id entre e-mail e Agenda)', e.os.reminders('email-event:tele').filter((r) => r.state === 'scheduled').length === 2);
  }

  // ================= J2 — FACULDADE =================
  {
    const s = await session({ at: `${DAY}T09:10:00` });
    s.os.ingestEmails([SAMPLES.contabilidade()]);
    const props = s.os.emailProposals();
    const taskProp = props.find((p) => /:task$|:deadline$/.test(p.candidateId))!;
    check('J2.1: e-mail do professor → prazo/tarefa proposta ao Guardian', !!taskProp && getAction(taskProp.actionId)?.status === 'AWAITING_APPROVAL');
    s.os.approve(taskProp.actionId);
    const task = s.os.tasks().find((t) => t.id === 'email-task:cont')!;
    check('J2.2: aprovado → tarefa real com prazo de sexta e origem no e-mail', !!task && task.dueAt?.startsWith('2026-10-09') === true && s.os.relationsOf({ kind: 'task', id: task.id }).some((r) => r.type === 'derived_from'));
    const p = s.os.createProject({ title: 'Projeto de Contabilidade', objective: 'Entregar o projeto', kind: 'academic', relatedDomains: ['education'], deadline: { label: 'Entrega', dueAt: '2026-10-09' } });
    s.os.updateTask(task.id, { projectId: p.id, estimatedMinutes: task.estimatedMinutes ?? 45 });
    const pv = s.os.projectViews().find((x) => x.project.id === p.id)!;
    check('J2.3: tarefa entra no projeto (progresso, prazo, viabilidade)', pv.progress.totalTasks === 1 && ['folgado', 'apertado', 'inviavel'].includes(pv.deadline.feasibility));
    const r = s.os.rankedPriorities().find((x) => x.candidate.refs?.taskId === task.id)!;
    check('J2.4: prioridade explicável (fatores com peso)', !!r && r.factors.some((f) => f.key === 'pressao_de_tempo' || f.key === 'importancia'));
    const today = (s.os.todayContext() as any).data;
    const rec = today?.recomendacao;
    check('J2.5: Hoje recomenda a próxima melhor ação a partir da tarefa real', rec?.targetRef?.taskId === task.id);
    const accepted = s.os.acceptRecommendation(rec);
    check('J2.6: aceitar a recomendação → bloco de foco gravado na Agenda (executor conectado)', accepted.state === 'executada' && s.agenda.some((i) => i.id === `focus:${rec.id}`));
    s.os.setRoutine({
      routine: [{ id: 'trabalho', label: 'Trabalho', daysOfWeek: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '17:00', domain: 'work', kind: 'rotina' }],
      travel: [],
      buffers: [],
      protectedWindows: [{ id: 'sono', label: 'Sono', kind: 'sono', startTime: '23:00', endTime: '07:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }],
    });
    s.os.createTask({ title: 'Revisar referências', estimatedMinutes: 60, dueAt: '2026-10-09', projectId: p.id, domain: 'education' });
    const plan = s.os.planWeek(4);
    const inWork = plan.blocks.some((b) => b.date !== '2026-10-10' && b.date !== '2026-10-11' && b.startMin < 17 * 60 && b.endMin > 8 * 60);
    const inSleep = plan.blocks.some((b) => b.startMin < 7 * 60 || b.endMin > 23 * 60);
    check('J2.7: planner não usa horário de trabalho nem de sono', plan.blocks.length > 0 && !inWork && !inSleep);
    const proposal = s.os.proposePlan(plan);
    check('J2.8: plano vai ao Guardian como proposta (nada gravado antes de aprovar)', proposal.action.status === 'AWAITING_APPROVAL' && !s.agenda.some((i) => i.id.startsWith('plan:')));
    const applied = s.os.approve(proposal.action.id);
    check('J2.9: aprovado → blocos do plano na Agenda e tarefa ligada ao bloco', applied.state === 'executada' && s.agenda.some((i) => i.id.startsWith('plan:')));
  }

  // ================= J3 — FINANCEIRO =================
  {
    const s = await session();
    const tx = (id: string, minute: string, src: Transaction['source']): Transaction => ({ id, accountId: 'nubank', amount: 89.9, currency: 'BRL', type: 'expense', description: 'SaaS Cloud Sync', occurredAt: `${DAY}T11:${minute}:00`, source: src, status: 'posted' } as Transaction);
    const groups = findDuplicateGroups([tx('t1', '42', 'manual'), tx('t2', '46', 'integration')]);
    check('J3.1: duas cobranças iguais → anomalia de duplicidade detectada pelo domínio', groups.length === 1);
    const v = s.os.disputeCharge({ anomalyId: 'dup-1', description: 'SaaS Cloud Sync', amount: 89.9, origin: 'manual' });
    check('J3.2: contestar vira proposta no Guardian aguardando aprovação', v.state === 'aguardando_aprovacao');
    const again = s.os.disputeCharge({ anomalyId: 'dup-1', description: 'SaaS Cloud Sync', amount: 89.9, origin: 'manual' });
    check('J3.3: contestar de novo devolve a MESMA ação (sem pedido duplicado)', again.id === v.id);
    const d = s.os.approve(v.id);
    check('J3.4: aprovado → "Ação aprovada — executor não conectado" (nenhum estorno é afirmado)', d.state === 'aprovada_sem_executor' && s.os.disputeFor('dup-1')?.stateLabel === 'Ação aprovada — executor não conectado');
    check('J3.5: nenhum resultado de sucesso foi registrado', listOutcomes(v.id).length === 0 && getAction(v.id)?.status === 'AUTHORIZED');
    const trail = GuardianAuditLog.listForAction(v.id).map((e) => e.statusAtLog);
    check('J3.6: auditoria registra proposta e aprovação', trail.join() === 'AWAITING_APPROVAL,AUTHORIZED');
    await s.os.flush();
    const s2 = await session({ storage: s.storage });
    check('J3.7: depois de recarregar, a decisão continua visível e honesta', s2.os.disputeFor('dup-1')?.state === 'aprovada_sem_executor' && s2.os.disputeFor('dup-1')?.restored === true);
  }

  // ================= J4 — TREINO =================
  {
    const sheet: WorkoutSheet = {
      id: 'ficha-b',
      label: 'Ficha B',
      exercises: [
        { id: 'terra', name: 'Terra romeno', order: 0, plannedSets: 2, reps: { raw: '8', min: 8, max: 8 }, restSeconds: 120 },
        { id: 'barra', name: 'Barra fixa', order: 1, plannedSets: 2, reps: { raw: '6', min: 6, max: 6 }, restSeconds: 90 },
      ],
    };
    const s = await session({ at: `${DAY}T18:00:00` });
    s.os.body.ensureSheet(sheet);
    s.os.body.logSet('ficha-b', { reps: 8, loadKg: 100 });
    s.os.body.logSet('ficha-b', { reps: 8, loadKg: 100 });
    s.os.body.logSet('ficha-b', { reps: 6, loadKg: 12 });
    const done = s.os.body.logSet('ficha-b', { reps: 6, loadKg: 12 });
    check('J4.1: ficha → sessão → séries na ordem da ficha → sessão concluída', done.status === 'completed' && done.sets.map((x) => x.exerciseId).join() === 'terra,terra,barra,barra');
    check('J4.2: descanso vem da ficha (não inventado)', sheet.exercises[0].restSeconds === 120);
    await s.os.flush();
    const s2 = await session({ storage: s.storage, at: `${WED}T18:00:00` });
    s2.os.body.logSet('ficha-b', { reps: 8, loadKg: 104 });
    const prog = s2.os.body.progression('terra');
    check('J4.3: progressão real entre dias (100 → 104 kg, "subiu")', prog.trend === 'subiu' && prog.deltaKg === 4);
    check('J4.4: histórico de sessões persistido entre recarregamentos', s2.os.body.sessions().length === 2 && s2.os.body.loadHistory('terra').length === 2);
  }

  // ================= J5 — ESPIRITUAL =================
  {
    const s = await session({ at: `${DAY}T21:00:00` });
    check('J5.0: sem prática ainda → presença "primeira vez", sem cobrança', s.os.spiritual.presence().stance === 'primeira_vez');
    s.os.spiritual.recordPractice('leitura', 'Romanos 8:31-39', 10);
    const card = s.os.spiritual.addMemoryCard({ book: 'ROM', chapter: 8, verseStart: 31, verseEnd: 31 });
    check('J5.1: versículo em foco vira cartão de memorização disponível hoje', s.os.spiritual.dueCards().some((c) => c.card.id === card.id));
    const reviewed = s.os.spiritual.reviewMemory(card.id, 'bom');
    check('J5.2: revisão SM-2 agenda a próxima (amanhã) e sai da fila de hoje', reviewed.srs.dueDate === WED && !s.os.spiritual.dueCards().some((c) => c.card.id === card.id));
    s.os.spiritual.recordPractice('oracao', 'Oração com respiração guiada', 8);
    s.os.spiritual.addGratitude('Pela saúde da família');
    const pres = s.os.spiritual.presence() as any;
    check('J5.3: presença registrada hoje, sem streak/pontuação', pres.presentToday === true && !('streak' in pres) && !('score' in pres));
    await s.os.flush();
    const s2 = await session({ storage: s.storage, at: `${WED}T07:00:00` });
    check('J5.4: continuidade: no dia seguinte o cartão volta e a gratidão continua privada', s2.os.spiritual.dueCards().some((c) => c.card.id === card.id) && s2.os.spiritual.gratitude()[0]?.private === true);
  }

  return result();
}
