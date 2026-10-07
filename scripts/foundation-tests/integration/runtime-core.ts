/**
 * Runtime do Personal OS: tarefas, projetos, persistência entre "recarregamentos",
 * snapshot do Guardian (segurança de re-hidratação) e executores honestos.
 */
import { makeChecker, resetAll } from '../domains/_helpers';
import { DAY, item, session } from './harness';
import { createMemoryStorageAdapter, createUnavailableStorageAdapter } from '../../../src/foundation/persistence/storage';
import { submitThroughGuardian, executeAuthorized } from '../../../src/foundation/actions/submit';
import { approveAction, executionStateOf, __resetExecutorsForTests } from '../../../src/foundation/actions/executors';
import * as Lifecycle from '../../../src/foundation/guardianLifecycle';
import { exportGuardianState, importGuardianState } from '../../../src/foundation/guardianSnapshot';
import { getAction } from '../../../src/foundation/actionBus';
import { listOutcomes } from '../../../src/foundation/guardianTrace/outcome';
import { createPersonalOS } from '../../../src/foundation/runtime/personalOS';

export async function run(): Promise<{ total: number; fails: number }> {
  const { check, result } = makeChecker('runtime-core');

  // ---------- Tarefas: criar, depender, bloquear, cancelar, concluir ----------
  {
    const s = await session();
    const a = s.os.createTask({ title: 'Levantar bibliografia', estimatedMinutes: 45, dueAt: `${DAY}T18:00:00`, domain: 'education', priority: 'high' });
    const b = s.os.createTask({ title: 'Escrever introdução', estimatedMinutes: 60, dependsOn: [a.id], domain: 'education' });
    check('T1: criar tarefa com prazo e esforço', s.os.tasks().length === 2 && a.status === 'todo');
    const vb = s.os.taskViews().find((v) => v.task.id === b.id)!;
    check('T2: dependência pendente torna a tarefa NÃO executável (derivado, nunca gravado)', !vb.actionable && /dependencia_pendente/.test(vb.blockedBy ?? ''));
    let threw = false;
    try {
      s.os.setTaskStatus(b.id, 'done');
    } catch {
      threw = true;
    }
    check('T3: concluir tarefa com dependência aberta é recusado pelo ciclo de vida', threw);
    threw = false;
    try {
      s.os.setTaskStatus(a.id, 'blocked');
    } catch {
      threw = true;
    }
    check('T4: bloquear exige motivo', threw);
    s.os.setTaskStatus(a.id, 'blocked', { reason: 'aguardando lista do professor' });
    check('T5: bloquear com motivo funciona', s.os.tasks().find((t) => t.id === a.id)!.status === 'blocked');
    s.os.setTaskStatus(a.id, 'todo');
    const done = s.os.setTaskStatus(a.id, 'done', { actualMinutes: 50 });
    check('T6: concluir registra conclusão e libera a dependente', done.task.completion?.actualMinutes === 50 && done.unlocked.includes(b.id));
    check('T7: dependente agora executável', s.os.taskViews().find((v) => v.task.id === b.id)!.actionable);
    const c = s.os.createTask({ title: 'Tarefa descartada' });
    s.os.setTaskStatus(c.id, 'cancelled');
    check('T8: cancelar', s.os.tasks().find((t) => t.id === c.id)!.status === 'cancelled');
    threw = false;
    try {
      s.os.updateTask(a.id, { dependsOn: [b.id] });
    } catch {
      threw = true;
    }
    check('T9: dependência circular é recusada', threw);
    threw = false;
    try {
      s.os.createTask({ title: '  ' });
    } catch {
      threw = true;
    }
    check('T10: tarefa sem título é recusada', threw);
    const rel = s.os.relationsOf({ kind: 'task', id: b.id });
    check('T11: dependência vira relação task→depends_on→task', rel.some((r) => r.type === 'depends_on' && r.to.id === a.id));

    // ---------- Projetos ----------
    const p = s.os.createProject({ title: 'Projeto Integrado', objective: 'Entregar o PI', kind: 'academic', relatedDomains: ['education'], deadline: { label: 'Entrega', dueAt: '2026-10-09' }, milestones: [{ title: 'Pesquisa' }, { title: 'Texto' }] });
    s.os.createTask({ title: 'Pesquisa de campo', projectId: p.id, milestoneId: p.milestones[0].id, estimatedMinutes: 90, domain: 'education' });
    const pv = s.os.projectViews().find((x) => x.project.id === p.id)!;
    check('P1: projeto com objetivo, marcos, prazo e progresso calculado', pv.project.milestones.length === 2 && pv.progress.totalTasks === 1 && pv.progress.remainingMinutes === 90);
    check('P2: viabilidade do prazo contra tempo livre REAL da Agenda (dias sem compromisso → folgado)', pv.deadline.feasibility === 'folgado' && (pv.deadline.availableMinutes ?? 0) > 0);
    const ranked = s.os.rankedPriorities();
    check('P3: prioridade explicável (fatores) para tarefas abertas', ranked.length >= 2 && ranked.every((r) => Array.isArray(r.factors) && r.factors.length > 0));

    // ---------- Persistência: recarregar não perde ----------
    await s.os.flush();
    const s2 = await session({ storage: s.storage });
    check('R1: tarefas sobrevivem ao recarregamento', s2.os.tasks().length === 4);
    check('R2: projetos sobrevivem ao recarregamento', s2.os.projects().some((x) => x.title === 'Projeto Integrado'));
    check('R3: relações sobrevivem ao recarregamento', s2.os.relationsOf({ kind: 'task', id: b.id }).some((r) => r.type === 'depends_on'));
  }

  // ---------- Hoje: estado do dia persiste ----------
  {
    const s = await session({ agenda: [item('bloco1', 'Bloco de foco', '13:30', '15:00')] });
    s.os.completeBlock({ itemId: 'bloco1', title: 'Bloco de foco', durationMinutes: 90 });
    s.os.extendBlock('bloco1', 15);
    s.os.confirmCheckin('bloco1');
    s.os.dismissNotice('aviso-x');
    await s.os.flush();
    const s2 = await session({ storage: s.storage, agenda: s.agenda });
    const st = s2.os.todayState();
    check('H1: concluir/estender/check-in/dispensar sobrevivem ao recarregamento', st.completedIds.includes('bloco1') && st.extendedMinutes.bloco1 === 15 && st.checkins.includes('bloco1') && st.dismissed.includes('aviso-x'));
    check('H2: histórico do dia registrado uma vez só', st.history.filter((h) => h.itemId === 'bloco1').length === 1);
    s2.clock.set(`2026-10-07T08:00:00`);
    s2.os.tick();
    check('H3: virou o dia → estado do dia recomeça (nunca carrega "concluído" de ontem)', s2.os.todayState().completedIds.length === 0 && s2.os.todayState().date === '2026-10-07');
  }

  // ---------- Armazenamento indisponível: falha alto, nunca finge ----------
  {
    resetAll();
    __resetExecutorsForTests();
    const os = createPersonalOS({ storage: createUnavailableStorageAdapter('local_storage', 'modo privado'), autoFlushMs: 0 });
    await os.hydrate();
    os.createTask({ title: 'x' });
    const f = await os.flush();
    check('S1: sem armazenamento, flush devolve erro (a UI pode dizer "não será salvo")', !f.ok && !!os.lastFlushError());
  }

  // ---------- Executores: aprovar sem executor NÃO é sucesso ----------
  {
    resetAll();
    __resetExecutorsForTests();
    const sub = submitThroughGuardian({ domain: 'finance', type: 'DISPUTE_CHARGE', intent: 'Contestar R$ 89,90', payload: {}, riskLevel: 'moderado', reversible: false, correlationId: 'c1' });
    check('E1: contestação exige aprovação (L2)', sub.action.status === 'AWAITING_APPROVAL' && sub.evaluation.decision.level === 'L2');
    const r = approveAction(sub.action.id);
    check('E2: aprovada sem executor → estado "aprovada_sem_executor", status AUTHORIZED, sem resultado inventado', r.state === 'aprovada_sem_executor' && r.action.status === 'AUTHORIZED' && listOutcomes(sub.action.id).length === 0 && !r.report);
  }

  // ---------- Snapshot do Guardian: re-hidratar nunca re-executa ----------
  {
    resetAll();
    const pend = submitThroughGuardian({ domain: 'agenda', type: 'SUGGEST_FOCUS_BLOCK', intent: 'bloco', payload: { recommendationId: 'r1', window: { startIso: `${DAY}T16:00:00` }, durationMinutes: 30 }, riskLevel: 'baixo', reversible: true, correlationId: 'p' });
    const auth = submitThroughGuardian({ domain: 'finance', type: 'DISPUTE_CHARGE', intent: 'x', payload: {}, riskLevel: 'moderado', reversible: false, correlationId: 'a' });
    Lifecycle.resolveApproval(auth.evaluation.approvalRequest!.id, 'approve');
    const exec = submitThroughGuardian({ domain: 'finance', type: 'DISPUTE_CHARGE', intent: 'y', payload: {}, riskLevel: 'moderado', reversible: false, correlationId: 'e' });
    Lifecycle.resolveApproval(exec.evaluation.approvalRequest!.id, 'approve');
    Lifecycle.beginExecution(exec.action.id); // sessão "morre" aqui
    const snap = JSON.parse(JSON.stringify(exportGuardianState()));
    resetAll();
    const rep = importGuardianState(snap, `${DAY}T15:00:00`);
    check('G1: restaurou as 3 ações e o audit log', rep.actions === 3 && getAction(pend.action.id)?.status === 'AWAITING_APPROVAL');
    check('G2: EXECUTING interrompida vira FAILED com resultado "falhou" (nunca sucesso presumido)', getAction(exec.action.id)?.status === 'FAILED' && listOutcomes(exec.action.id)[0]?.result === 'falhou' && rep.interruptedMarkedFailed === 1);
    let refused = false;
    try {
      executeAuthorized(auth.action.id, () => ({ ok: true, evidence: 'não deveria rodar' }));
    } catch {
      refused = true;
    }
    check('G3: AUTHORIZED de sessão anterior NÃO é reexecutada', refused && executionStateOf(getAction(auth.action.id)!) === 'aprovada_sem_executor');
    const s = await session({ storage: createMemoryStorageAdapter() });
    // a pendente restaurada continua decidível NESTA sessão: aprovar agora autoriza agora
    importGuardianState(snap, `${DAY}T15:00:00`);
    const d = s.os.approve(pend.action.id);
    check('G4: pendente restaurada pode ser aprovada e o executor conectado roda (bloco gravado na Agenda)', d.state === 'executada' && s.agenda.some((i) => i.id === 'focus:r1'));
  }

  return result();
}
