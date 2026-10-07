/**
 * MEDUSA PERSONAL OS — importância configurável, contexto de evento e Priority Engine.
 */
import { makeChecker } from '../domains/_helpers';
import { DAY, agendaItem, task, projetoIntegrado } from './fixtures';
import * as Imp from '../../../src/foundation/context/importance';
import { buildEventContexts } from '../../../src/foundation/context/eventContext';
import { rankCandidates, scoreCandidate } from '../../../src/foundation/priority/engine';
import { fromEventContext, fromTask, fromProjectTasks } from '../../../src/foundation/priority/candidates';
import { classifyEventImportance } from '../../../src/foundation/reminders/policy';

const NOW = `${DAY}T10:00:00`;

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('context-priority');

  // 1. Importância por regras
  {
    const tele = Imp.classifyEvent(agendaItem('tele', 'Telemedicina com Dra. Ana', '10:05', '10:35'));
    check('1.1: telemedicina → critical, rígido, categoria telemedicine, por regra', tele.tier === 'critical' && tele.rigid && tele.category === 'telemedicine' && tele.source === 'regra' && tele.ruleId === 'telemedicina');
    check('1.2: acento não importa ("medica"/"médica")', Imp.classifyEvent(agendaItem('c', 'Consulta medica', '10:00', '11:00')).category === 'medical_consultation');
    check('1.3: prova → critical; treino → medium; flexível → low', Imp.classifyEvent(agendaItem('p', 'Prova de Cálculo', '19:00', '21:00')).tier === 'critical' && Imp.classifyEvent(agendaItem('t', 'Treino A', '18:00', '19:00')).tier === 'medium' && Imp.classifyEvent(agendaItem('f', 'Ler algo', '15:00', '15:30', { isFlexible: true })).tier === 'low');
    check('1.4: sem regra → low/opcional (padrão declarado)', Imp.classifyEvent(agendaItem('x', 'Coisa qualquer', '09:00', '10:00')).source === 'padrao');
    check('1.5: override por categoria muda o tier sem mexer nas regras', Imp.classifyEvent(agendaItem('t', 'Treino A', '18:00', '19:00'), Imp.DEFAULT_IMPORTANCE_RULES, { byCategory: { workout: { tier: 'high' } } }).tier === 'high');
    check('1.6: override por evento vence tudo', Imp.classifyEvent(agendaItem('tele', 'Telemedicina', '10:05', '10:35'), Imp.DEFAULT_IMPORTANCE_RULES, { byEventId: { tele: { tier: 'medium' } } }).tier === 'medium');
    const custom: Imp.ImportanceRule[] = [{ id: 'violino', category: 'practice', tier: 'high', rigid: true, match: { keywords: ['violino'] } }, ...Imp.DEFAULT_IMPORTANCE_RULES];
    check('1.7: regra nova entra pela tabela, sem código novo', Imp.classifyEvent(agendaItem('v', 'Aula de violino', '19:00', '20:00'), custom).ruleId === 'violino');
    check('1.8: compatibilidade: contrato antigo de lembrete continua vendo telemedicina como "high"', classifyEventImportance(agendaItem('tele', 'Telemedicina', '10:05', '10:35')).importance === 'high');
    check('1.9: importância explícita no evento é respeitada', Imp.classifyEvent({ ...agendaItem('e', 'X', '09:00', '10:00'), importanceTier: 'critical', contextCategory: 'strict_appointment' }).source === 'explicito_no_evento');
  }

  // 2. Contexto de evento (reusa a Agenda: conflito, deslocamento)
  {
    const items = [
      agendaItem('trab', 'Trabalho', '08:00', '15:00', { domain: 'work' }),
      agendaItem('tele', 'Telemedicina', '10:05', '10:35'),
      agendaItem('aula', 'Aula de inglês', '19:00', '20:00', { domain: 'education' }),
    ];
    const ctxs = buildEventContexts({ date: DAY, items, travel: [{ id: 'ida', date: DAY, startTime: '18:30', endTime: '19:00', forItemId: 'aula' }], links: { tele: { relatedTaskId: 'task-x' } } });
    const tele = ctxs.find((c) => c.eventId === 'tele')!;
    check('2.1: telemedicina: critical, rígida, antecedência 5 min', tele.tier === 'critical' && tele.rigid && tele.leadTimeMinutes === 5);
    check('2.2: conflito com o trabalho é detectado nos dois sentidos', tele.conflictsWith.includes('trab') && ctxs.find((c) => c.eventId === 'trab')!.conflictsWith.includes('tele'));
    check('2.3: deslocamento entra na antecedência (15 + 30 = 45 min) da aula', ctxs.find((c) => c.eventId === 'aula')!.leadTimeMinutes === 45 && ctxs.find((c) => c.eventId === 'aula')!.travelMinutes === 30);
    check('2.4: vínculos de tarefa/projeto viajam no contexto', tele.relatedTaskId === 'task-x');
    check('2.5: quem cede no conflito vem da política já existente da Agenda (work > personal), sem regra nova', ctxs.find((c) => c.eventId === 'tele')!.yieldsInConflict === true);
  }

  // 3. Priority Engine — cenário do dia
  {
    const items = [agendaItem('tele', 'Telemedicina', '10:05', '10:35'), agendaItem('treino', 'Treino A', '13:00', '14:00', { domain: 'body' })];
    const [teleCtx, treinoCtx] = buildEventContexts({ date: DAY, items });
    const { project, tasks } = projetoIntegrado();
    const projectCands = fromProjectTasks({ ...project, deadlines: [{ id: 'd', label: 'Entrega', dueAt: '2026-10-07', hard: true }] }, tasks, NOW, 300);
    const curso = fromTask(task('curso', { title: 'Módulo do curso', dueAt: '2026-10-21', estimatedMinutes: 120, priority: 'medium' }), [], { availableMinutesBeforeDue: 3000 });

    const tele = scoreCandidate(fromEventContext(teleCtx), NOW);
    check('3.1: telemedicina T-5 → MÁXIMA por sobreposição (evento rígido iminente)', tele.band === 'maxima' && tele.overrides.some((o) => o.key === 'evento_rigido_iminente'));
    const pesquisa = scoreCandidate(projectCands.find((c) => c.id === 'task:t-pesquisa')!, NOW);
    check('3.2: projeto que vence amanhã (prazo rígido, pouca folga) → ALTA', pesquisa.band === 'alta');
    const treino = scoreCandidate(fromEventContext(treinoCtx), NOW);
    check('3.3: treino em 3h → MÉDIA', treino.band === 'media');
    const c = scoreCandidate(curso, NOW);
    check('3.4: curso que vence em 15 dias → BAIXA neste momento', c.band === 'baixa');
    const revisao = scoreCandidate(projectCands.find((x) => x.id === 'task:t-revisao')!, NOW);
    check('3.5: etapa com dependência pendente → BLOQUEADA, mesmo com prazo amanhã', revisao.band === 'bloqueada' && revisao.overrides.some((o) => o.key === 'nao_executavel'));

    const ranked = rankCandidates([curso, fromEventContext(treinoCtx), ...projectCands, fromEventContext(teleCtx)], NOW);
    check('3.6: ranking: telemedicina, depois projeto, depois treino, curso; bloqueadas no fim', ranked[0].candidate.id === 'event:tele' && ranked[1].candidate.id === 'task:t-pesquisa' && ranked[ranked.length - 1].band === 'bloqueada' && ranked.findIndex((r) => r.candidate.id === 'event:treino') < ranked.findIndex((r) => r.candidate.id === 'task:curso'));
    check('3.7: explicação estruturada: 6 fatores com peso, valor e contribuição somando o score', tele.factors.length === 6 && Math.abs(tele.factors.reduce((s, f) => s + f.contribution, 0) - tele.score) < 0.002);
    check('3.8: fator sem dado conta 0 e é marcado (nunca estimativa inventada)', treino.factors.find((f) => f.key === 'pressao_de_tempo')!.missingData === true && treino.factors.find((f) => f.key === 'pressao_de_tempo')!.value === 0);
    check('3.9: esforço maior que o tempo livre vira flag', scoreCandidate(fromTask(task('big', { dueAt: '2026-10-07', estimatedMinutes: 500 }), [], { availableMinutesBeforeDue: 200 }), NOW).flags.includes('esforco_maior_que_tempo'));
    check('3.10: prazo vencido vira flag e proximidade máxima', (() => { const r = scoreCandidate(fromTask(task('late', { dueAt: '2026-10-01', estimatedMinutes: 30 }), []), NOW); return r.flags.includes('prazo_vencido') && r.factors.find((f) => f.key === 'proximidade')!.value === 1; })());
    check('3.11: item flexível que cede no conflito perde prioridade', scoreCandidate({ ...fromEventContext(treinoCtx), rigid: false, yieldsInConflict: true }, NOW).score < treino.score);
    check('3.12: contexto conta: mesmo item com encaixe alto sobe', scoreCandidate({ ...curso, contextFit: 1 }, NOW).score > c.score);
    check('3.13: determinístico (mesma entrada, mesma saída)', JSON.stringify(rankCandidates([curso, ...projectCands], NOW)) === JSON.stringify(rankCandidates([curso, ...projectCands], NOW)));
    check('3.14: evento já terminado não fica urgente', scoreCandidate(fromEventContext(teleCtx), `${DAY}T11:00:00`).factors.find((f) => f.key === 'proximidade')!.value === 0);
    check('3.15: evento rígido em andamento → máxima', scoreCandidate(fromEventContext(teleCtx), `${DAY}T10:10:00`).overrides.some((o) => o.key === 'evento_em_andamento'));
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[context-priority] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
