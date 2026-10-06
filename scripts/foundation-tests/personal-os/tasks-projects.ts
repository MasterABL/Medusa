/**
 * MEDUSA PERSONAL OS — Tasks e Projects: dependências, prazos, marcos, esforço.
 */
import { makeChecker } from '../domains/_helpers';
import { DAY, task, projetoIntegrado, project } from './fixtures';
import * as Deps from '../../../src/domains/tasks/services/dependencies';
import * as Life from '../../../src/domains/tasks/services/lifecycle';
import * as Progress from '../../../src/domains/projects/services/progress';
import * as Sel from '../../../src/domains/projects/selectors';
import { createInMemoryTaskRepository } from '../../../src/domains/tasks/repository/types';
import { createInMemoryProjectRepository } from '../../../src/domains/projects/repository/types';

const NOW = `${DAY}T10:00:00`;

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('tasks-projects');

  // 1. Dependências
  {
    const { tasks } = projetoIntegrado();
    check('1.1: só a primeira etapa é executável no início', tasks.filter((t) => Deps.actionabilityOf(t, tasks).actionable).map((t) => t.id).join() === 't-pesquisa');
    const revisao = tasks.find((t) => t.id === 't-revisao')!;
    const a = Deps.actionabilityOf(revisao, tasks);
    check('1.2: revisão (etapa 4) NÃO é executável enquanto a redação está pendente', !a.actionable && a.reason === 'dependencia_pendente' && a.detail.includes('t-redacao'));
    check('1.3: ordem de execução respeita a cadeia', Deps.executionOrder(tasks).order.join() === 't-pesquisa,t-estrutura,t-redacao,t-revisao,t-entrega');
    check('1.4: concluir a pesquisa libera só a estrutura', Deps.unlockedBy('t-pesquisa', tasks).join() === 't-estrutura');
    const cyc = [task('a', { dependsOn: ['b'] }), task('b', { dependsOn: ['a'] }), task('c')];
    check('1.5: ciclo é detectado e as tarefas do ciclo nunca ficam executáveis', Deps.findCycles(cyc).length === 1 && Deps.actionabilityOf(cyc[0], cyc).actionable === false && (Deps.actionabilityOf(cyc[0], cyc) as { reason: string }).reason === 'ciclo_de_dependencia');
    check('1.6: dependência inexistente bloqueia com motivo', (Deps.actionabilityOf(task('x', { dependsOn: ['fantasma'] }), [task('x', { dependsOn: ['fantasma'] })]) as { reason: string }).reason === 'dependencia_inexistente');
    const withCancelled = [task('dep', { status: 'cancelled' }), task('y', { dependsOn: ['dep'] })];
    check('1.7: dependência cancelada não trava (o trabalho dela deixou de existir)', Deps.actionabilityOf(withCancelled[1], withCancelled).actionable);
    check('1.8: bloqueio manual mantém o motivo', (Deps.actionabilityOf(task('z', { status: 'blocked', blockedReason: 'aguardando professor' }), []) as { detail: string[] }).detail[0] === 'aguardando professor');
  }

  // 2. Ciclo de vida
  {
    const { tasks } = projetoIntegrado();
    const revisao = tasks.find((t) => t.id === 't-revisao')!;
    check('2.1: não dá pra iniciar tarefa com dependência pendente', (() => { try { Life.transition(revisao, 'in_progress', tasks, NOW); return false; } catch (e) { return e instanceof Life.TaskTransitionError; } })());
    const pesquisa = tasks[0];
    const done = Life.transition(pesquisa, 'done', tasks, NOW, { actualMinutes: 50 });
    check('2.2: concluir registra quando e quanto tempo levou, sem mutar a original', done.status === 'done' && done.completion?.actualMinutes === 50 && pesquisa.status === 'todo');
    check('2.3: bloquear exige motivo', (() => { try { Life.transition(pesquisa, 'blocked', tasks, NOW); return false; } catch { return true; } })());
    check('2.4: transição inválida (cancelada → concluída) é recusada', (() => { try { Life.transition({ ...pesquisa, status: 'cancelled' }, 'done', tasks, NOW); return false; } catch { return true; } })());
    check('2.5: reabrir apaga a conclusão', Life.transition(done, 'todo', tasks, NOW).completion === undefined);
    check('2.6: validação: auto-dependência, esforço negativo, done sem conclusão', Life.validateTask(task('q', { dependsOn: ['q'], estimatedMinutes: -5, status: 'done' })).length === 3);
  }

  // 3. Projeto: marcos, progresso, prazo
  {
    const { project: p, tasks } = projetoIntegrado();
    const prog = Progress.projectProgress(p, tasks, NOW);
    check('3.1: esforço restante = 45+60+120+30+10 = 265 min', prog.remainingMinutes === 265 && prog.tasksWithoutEstimate === 0);
    check('3.2: marcos na ordem, nenhum iniciado', prog.milestones.map((m) => `${m.milestoneId}:${m.state}`).join() === 'm-pesquisa:nao_iniciado,m-texto:nao_iniciado');
    check('3.3: próximo prazo = entrega oficial de sexta', prog.nextDeadline?.id === 'd-entrega');
    const late = Progress.projectProgress(p, tasks, '2026-10-08T10:00:00');
    check('3.4: marco de pesquisa vencido sem concluir → atrasado', late.milestones[0].state === 'atrasado');
    const halfDone = tasks.map((t) => (t.id === 't-pesquisa' ? { ...t, status: 'done' as const, completion: { completedAt: NOW } } : t));
    check('3.5: com a pesquisa feita, marco fica em andamento e a próxima ação é a estrutura', Progress.projectProgress(p, halfDone, NOW).milestones[0].state === 'em_andamento' && Progress.nextActionableTasks(p, halfDone)[0].id === 't-estrutura');

    check('3.6: 300 min livres até sexta para 265 restantes → apertado (folga 35)', (() => { const a = Progress.assessDeadline(p, tasks, NOW, 300); return a.feasibility === 'apertado' && a.slackMinutes === 35; })());
    check('3.7: 200 min livres → inviável', Progress.assessDeadline(p, tasks, NOW, 200).feasibility === 'inviavel');
    check('3.8: 600 min livres → folgado', Progress.assessDeadline(p, tasks, NOW, 600).feasibility === 'folgado');
    const noEst = [...tasks, task('t-sem', { projectId: 'pi' })];
    check('3.9: tarefa aberta sem estimativa → não afirma viabilidade (sem_estimativa)', Progress.assessDeadline(p, noEst, NOW, 10_000).feasibility === 'sem_estimativa');
    check('3.10: sem saber o tempo disponível → sem_estimativa (nunca chuta)', Progress.assessDeadline(p, tasks, NOW).feasibility === 'sem_estimativa');
    check('3.11: prazo já passou com trabalho aberto → vencido', Progress.assessDeadline(p, tasks, '2026-10-10T10:00:00', 999).feasibility === 'vencido');
    check('3.12: validação: marco duplicado e prazo apontando para marco inexistente', Progress.validateProject(project('v', { milestones: [{ id: 'a', title: 'a', order: 0 }, { id: 'b', title: 'b', order: 0 }], deadlines: [{ id: 'd', label: 'x', dueAt: '2026-10-09', hard: true, milestoneId: 'zzz' }] })).length === 2);
  }

  // 4. Seletores
  {
    const { project: p, tasks } = projetoIntegrado();
    const projects = createInMemoryProjectRepository('manual', [p]);
    const repo = createInMemoryTaskRepository('manual', tasks);
    check('4.1: projeto inexistente → empty', Sel.selectProjectOverview(projects, repo, 'nada', NOW).status === 'empty');
    const ov = Sel.selectProjectOverview(projects, repo, 'pi', NOW);
    check('4.2: sem tempo disponível informado → partial dizendo o que falta, dado presente', ov.status === 'partial' && ov.missing.includes('tempo disponível') && ov.data.nextTasks[0].id === 't-pesquisa');
    check('4.3: com tempo disponível e tudo estimado → ready', Sel.selectProjectOverview(projects, repo, 'pi', NOW, 600).status === 'ready');
    check('4.4: nenhum projeto ativo → empty', Sel.selectActiveProjects(createInMemoryProjectRepository(), repo, NOW).status === 'empty');
    check('4.5: tarefa e projeto não duplicam dado (a tarefa vive no repositório de tarefas)', !('tasks' in p));
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[tasks-projects] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
