/**
 * MEDUSA PERSONAL OS — Recomendações e Planner (buffers, deslocamento, horário protegido, conflito).
 */
import { makeChecker, resetAll } from '../domains/_helpers';
import { DAY, agendaItem, task, projetoIntegrado } from './fixtures';
import { recommend, proposeRecommendation } from '../../../src/foundation/recommendations/engine';
import type { FreeWindow } from '../../../src/foundation/recommendations/engine';
import { rankCandidates } from '../../../src/foundation/priority/engine';
import { fromTask, fromProjectTasks } from '../../../src/foundation/priority/candidates';
import { suggestSchedule, selectSuggestedSchedule, proposeSchedule } from '../../../src/foundation/planner/planner';
import type { ProtectedWindow } from '../../../src/foundation/planner/planner';
import { createInMemoryAgendaSource } from '../../../src/domains/agenda/repository/source';
import { dayInputFrom } from '../../../src/domains/agenda/selectors';
import type { RoutineBlock } from '../../../src/domains/agenda/model/temporal';

const at = (hhmm: string) => `${DAY}T${hhmm}:00`;
const win = (s: string, e: string): FreeWindow => ({ startIso: at(s), endIso: at(e), minutes: (Number(e.slice(0, 2)) * 60 + Number(e.slice(3))) - (Number(s.slice(0, 2)) * 60 + Number(s.slice(3))) });
const toHH = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const ROTINA: RoutineBlock[] = [
  { id: 'trab', label: 'Trabalho', daysOfWeek: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '15:00', domain: 'work', kind: 'rotina' },
  { id: 'onibus', label: 'Ônibus', daysOfWeek: [1, 2, 3, 4, 5], startTime: '07:20', endTime: '07:50', domain: 'personal', kind: 'deslocamento' },
];
const SONO: ProtectedWindow[] = [{ id: 'sono', label: 'Sono', kind: 'sono', startTime: '23:00', endTime: '06:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }];

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('planner-recs');

  // 1. Recomendações
  resetAll();
  {
    const { project, tasks } = projetoIntegrado();
    const ranked = rankCandidates([...fromProjectTasks({ ...project, deadlines: [{ id: 'd', label: 'Entrega', dueAt: '2026-10-07', hard: true }] }, tasks, at('10:00'), 300)], at('10:00'));
    const r70 = recommend({ now: at('15:00'), freeWindows: [win('15:00', '16:10')], ranked });
    check('1.1: 70 min livres e o projeto precisa de 45 → recomendação FORTE da etapa executável', r70[0]?.strength === 'forte' && r70[0].targetRef.taskId === 't-pesquisa' && r70[0].durationMinutes === 45 && r70[0].timing === 'agora');
    check('1.2: nunca recomenda etapa dependente (estrutura/revisão) antes da anterior', !r70.some((r) => ['t-estrutura', 't-revisao', 't-redacao'].includes(r.targetRef.taskId ?? '')));
    const practices = [{ id: 'eng', title: 'Revisão curta de inglês', domain: 'education' as const, minutes: 15, kind: 'revisao' as const }];
    const r20 = recommend({ now: at('06:30'), freeWindows: [win('06:30', '06:50')], ranked, practices, contextTag: 'antes_de_sair' });
    check('1.3: 20 min antes de sair → prática curta (revisão de inglês), não o projeto', r20[0]?.kind === 'pratica_curta' && r20[0].targetRef.practiceId === 'eng');
    check('1.4: janela de 8 min → nada (abaixo do mínimo útil)', recommend({ now: at('06:30'), freeWindows: [win('06:30', '06:38')], ranked, practices }).length === 0);
    const tired = recommend({ now: at('15:00'), freeWindows: [win('15:00', '16:10')], ranked, energy: 'baixa' });
    check('1.5: energia baixa rebaixa bloco longo (forte → moderada) e diz por quê', tired[0].strength === 'moderada' && tired[0].reasons.some((x) => x.key === 'energia'));
    const later = recommend({ now: at('10:00'), freeWindows: [win('15:00', '18:00')], ranked });
    check('1.6: janela mais tarde no dia → recomendação "mais tarde" (reservar bloco)', later[0].timing === 'mais_tarde' && later[0].window.startIso === at('15:00'));
    const big = rankCandidates([fromTask(task('grande', { estimatedMinutes: 180, priority: 'high', dueAt: '2026-10-07' }), [], { availableMinutesBeforeDue: 200 })], at('10:00'));
    const split = recommend({ now: at('15:00'), freeWindows: [win('15:00', '16:00')], ranked: big });
    check('1.7: tarefa longa de alta prioridade avança em bloco parcial (55 de 180 min) e marca a divisão', split[0].durationMinutes === 55 && split[0].reasons.some((x) => x.key === 'dividido'));
    const p = proposeRecommendation(r70[0]);
    check('1.8: transformar recomendação em bloco passa pelo Guardian como L2 (o usuário decide)', p.evaluation.decision.level === 'L2' && p.evaluation.decision.requiresApproval && !p.authorized);
  }

  // 2. Planner
  resetAll();
  {
    const { project, tasks } = projetoIntegrado();
    const agenda = createInMemoryAgendaSource('manual', {
      items: [agendaItem('treino', 'Treino', '18:00', '19:00', { domain: 'body' }), agendaItem('reuniao', 'Reunião com cliente', '16:00', '16:30', { domain: 'work', date: '2026-10-07' })],
      routine: ROTINA,
      travel: [{ id: 'volta', date: DAY, startTime: '15:00', endTime: '15:40', forItemId: 'treino' }],
      buffers: [{ appliesTo: { domain: 'body' }, beforeMinutes: 0, afterMinutes: 20 }],
    });
    const s = suggestSchedule({ now: at('07:00'), fromDate: DAY, days: 3, dayInput: (d) => dayInputFrom(agenda, d), tasks, projects: [project], protectedWindows: SONO });
    const blocks = s.blocks;
    const clash = (b: (typeof blocks)[0], s0: string, e0: string, date = DAY) => b.date === date && b.startMin < Number(e0.slice(0, 2)) * 60 + Number(e0.slice(3)) && b.endMin > Number(s0.slice(0, 2)) * 60 + Number(s0.slice(3));
    check('2.1: nada planejado em cima do trabalho (trabalho > estudo)', !blocks.some((b) => clash(b, '08:00', '15:00') || clash(b, '08:00', '15:00', '2026-10-07') || clash(b, '08:00', '15:00', '2026-10-08')));
    check('2.2: deslocamento é tempo ocupado (15:00–15:40 livre de blocos)', !blocks.some((b) => clash(b, '15:00', '15:40')));
    check('2.3: buffer depois do treino é respeitado (19:00–19:20 livre)', !blocks.some((b) => clash(b, '19:00', '19:20')));
    check('2.4: sono protegido (nada entre 23:00 e 06:00)', !blocks.some((b) => b.endMin > 23 * 60 || b.startMin < 6 * 60));
    const order = ['t-pesquisa', 't-estrutura', 't-redacao', 't-revisao', 't-entrega'];
    const first = (id: string) => blocks.filter((b) => b.taskId === id).sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin)[0];
    const lastEnd = (id: string) => blocks.filter((b) => b.taskId === id).sort((a, b) => b.date.localeCompare(a.date) || b.endMin - a.endMin)[0];
    check('2.5: dependências: cada etapa começa depois do fim da anterior', order.every((id, i) => i === 0 || (() => { const f = first(id); const l = lastEnd(order[i - 1]); return !!f && !!l && (f.date > l.date || (f.date === l.date && f.startMin >= l.endMin)); })()));
    check('2.6: tudo cabe antes da entrega de sexta e nada fica sem lugar', s.unplaced.length === 0 && blocks.every((b) => b.date <= '2026-10-09'));
    check('2.7: tarefa de 120 min é dividida em blocos de no máximo 90', blocks.filter((b) => b.taskId === 't-redacao').every((b) => b.endMin - b.startMin <= 90) && blocks.filter((b) => b.taskId === 't-redacao').reduce((x, b) => x + b.endMin - b.startMin, 0) === 120);
    check('2.8: intervalo entre blocos no mesmo dia ≥ 10 min', blocks.every((b, i) => i === 0 || blocks[i - 1].date !== b.date || b.startMin >= blocks[i - 1].endMin + 10));
    check('2.9: primeiro bloco do dia só depois de "agora" (07:00) e fora do ônibus', blocks.filter((b) => b.date === DAY).every((b) => b.startMin >= 7 * 60 && !clash(b, '07:20', '07:50')));
    void toHH;

    const noEst = suggestSchedule({ now: at('07:00'), fromDate: DAY, days: 1, dayInput: (d) => dayInputFrom(agenda, d), tasks: [task('x', { title: 'Sem estimativa' })] });
    check('2.10: tarefa sem estimativa não é planejada (não inventa duração)', noEst.unplaced[0]?.reason === 'sem_estimativa');
    const tight = suggestSchedule({ now: at('07:00'), fromDate: DAY, days: 3, dayInput: (d) => dayInputFrom(agenda, d), tasks: [task('t', { title: 'Enorme', estimatedMinutes: 2000, dueAt: '2026-10-06' })], protectedWindows: SONO });
    check('2.11: esforço que não cabe antes do prazo → sem_tempo_antes_do_prazo, sem blocos depois do prazo', tight.unplaced[0]?.reason === 'sem_tempo_antes_do_prazo' && tight.blocks.length === 0);
    const blocked = suggestSchedule({ now: at('07:00'), fromDate: DAY, days: 1, dayInput: (d) => dayInputFrom(agenda, d), tasks: [task('b', { status: 'blocked', blockedReason: 'esperando professor', estimatedMinutes: 30 })] });
    check('2.12: tarefa bloqueada não é planejada', blocked.unplaced[0]?.reason === 'nao_executavel');
    check('2.13: seletor: sem tarefas abertas → empty; com sobras → partial dizendo o quê', selectSuggestedSchedule({ now: at('07:00'), fromDate: DAY, days: 1, dayInput: (d) => dayInputFrom(agenda, d), tasks: [] }).status === 'empty' && selectSuggestedSchedule({ now: at('07:00'), fromDate: DAY, days: 1, dayInput: (d) => dayInputFrom(agenda, d), tasks: [task('x')] }).status === 'partial');
    const applied = proposeSchedule(s, 'planner:test');
    check('2.14: gravar o plano na Agenda exige confirmação (Guardian L2)', applied.evaluation.decision.level === 'L2' && !applied.authorized);
    const wed = suggestSchedule({ now: at('07:00'), fromDate: '2026-10-07', days: 1, dayInput: (d) => dayInputFrom(agenda, d), tasks: [task('w', { title: 'Estudo', estimatedMinutes: 60 })], protectedWindows: SONO });
    check('2.15: compromisso de trabalho fora da rotina (reunião 16:00) também é respeitado', !wed.blocks.some((b) => clash(b, '16:00', '16:30', '2026-10-07')));
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[planner-recs] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
