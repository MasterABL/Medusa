/**
 * MEDUSA PERSONAL OS — Contratos acadêmicos (Faculdade, Curso, ENEM, Inglês) e pontes.
 * FIXTURES de teste — nenhum dado real.
 */
import { makeChecker } from '../domains/_helpers';
import { DAY } from './fixtures';
import * as B from '../../../src/domains/academic/services/bridges';
import type { Course, Discipline, EnemContent } from '../../../src/domains/academic/model/types';
import { classifyEvent } from '../../../src/foundation/context/importance';
import { buildEventContexts } from '../../../src/foundation/context/eventContext';

const NOW = `${DAY}T10:00:00`;
const disc: Discipline = { id: 'd1', programId: 'p1', name: 'Gestão de Projetos', status: 'cursando' };

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('academic');

  // Faculdade
  {
    const t = B.activityToTask({ id: 'a1', disciplineId: 'd1', kind: 'trabalho', title: 'Estudo de caso', dueAt: '2026-10-10', estimatedMinutes: 90, weight: 0.4, status: 'pendente' }, disc, NOW);
    check('1.1: atividade vira Task de educação com prazo, esforço e prioridade pelo peso (40% → high)', t.domain === 'education' && t.priority === 'high' && t.estimatedMinutes === 90 && t.title.startsWith('Gestão de Projetos'));
    check('1.2: atividade entregue vira Task concluída com registro', B.activityToTask({ id: 'a2', disciplineId: 'd1', kind: 'forum', title: 'Fórum', status: 'entregue' }, disc, NOW).status === 'done');
    check('1.3: sem peso conhecido → prioridade média (não inventa)', B.activityToTask({ id: 'a3', disciplineId: 'd1', kind: 'leitura', title: 'Leitura', status: 'pendente' }, disc, NOW).priority === 'medium');
    const draft = B.assessmentEventDraft({ id: 'pr1', disciplineId: 'd1', kind: 'prova', title: 'AV1', at: '2026-10-08T19:00:00', durationMinutes: 90 }, disc);
    check('1.4: prova vira rascunho de evento crítico/rígido (sem gravar na Agenda)', draft.importanceTier === 'critical' && draft.contextCategory === 'exam' && draft.endTime === '20:30' && draft.rigid === true);
    const ctx = buildEventContexts({ date: '2026-10-08', items: [{ ...draft, categoryId: 'c', colorId: 'x', createdAt: NOW, updatedAt: NOW }] });
    check('1.5: o rascunho entra no contexto de evento como crítico (importância explícita respeitada)', ctx[0].tier === 'critical' && ctx[0].importanceSource === 'explicito_no_evento' && classifyEvent({ ...draft, categoryId: 'c', colorId: 'x', createdAt: NOW, updatedAt: NOW }).category === 'exam');
    const dls = B.academicDeadlines({
      activities: [{ id: 'a1', disciplineId: 'd1', kind: 'trabalho', title: 'Estudo de caso', dueAt: '2026-10-10', status: 'pendente' }, { id: 'old', disciplineId: 'd1', kind: 'forum', title: 'Velho', dueAt: '2026-09-01', status: 'pendente' }, { id: 'done', disciplineId: 'd1', kind: 'forum', title: 'Feito', dueAt: '2026-10-12', status: 'entregue' }],
      assessments: [{ id: 'pr1', disciplineId: 'd1', kind: 'prova', title: 'AV1', at: '2026-10-08T19:00:00' }],
      projects: [{ academic: { id: 'ap', programId: 'p1', disciplineIds: ['d1'], title: 'Projeto Integrado', kind: 'integrado', projectId: 'pi' }, deadlines: [{ id: 'e', label: 'Entrega', dueAt: '2026-10-09', hard: true }] }],
      disciplines: [disc],
      now: NOW,
    });
    check('1.6: prazos acadêmicos unificados, em ordem, sem vencidos nem entregues', dls.map((d) => d.source.kind).join() === 'avaliacao,projeto,atividade' && !dls.some((d) => d.source.id === 'old' || d.source.id === 'done'));
    check('1.7: projeto acadêmico aponta para o Project do domínio Projects (sem duplicar tarefas)', dls.find((d) => d.source.kind === 'projeto')!.source.id === 'pi');
  }

  // Curso
  {
    const course: Course = { id: 'c1', title: 'Excel', dueAt: '2026-10-21', modules: [{ id: 'm2', title: 'Fórmulas', order: 1, lessons: [{ id: 'l3', title: 'PROCV', order: 0, durationMinutes: 20, status: 'pendente' }] }, { id: 'm1', title: 'Básico', order: 0, lessons: [{ id: 'l1', title: 'Intro', order: 0, durationMinutes: 10, status: 'concluida' }, { id: 'l2', title: 'Células', order: 1, status: 'pendente' }] }] };
    const p = B.courseProgress(course);
    check('2.1: progresso de curso respeita a ordem dos módulos e aulas', p.nextLesson?.id === 'l2' && p.doneLessons === 1 && p.totalLessons === 3);
    check('2.2: aula sem duração conhecida é contada à parte (esforço restante é piso)', p.remainingMinutes === 20 && p.lessonsWithoutDuration === 1);
    check('2.3: próxima aula vira Task (só a próxima: sequência do curso)', B.nextLessonTask(course, NOW)?.id === 'course:c1:l2');
  }

  // ENEM
  {
    const contents: EnemContent[] = [
      { id: 'eco', subjectId: 'bio', title: 'Ecologia', incidence: 'alta', sessionMinutes: 30 },
      { id: 'gen', subjectId: 'bio', title: 'Genética', incidence: 'media', sessionMinutes: 30 },
      { id: 'pa', subjectId: 'mat', title: 'Progressões', incidence: 'baixa' },
    ];
    const ranked = B.enemPriorities({ contents, gaps: [{ contentId: 'eco', mastery: 0.2, source: 'simulado', measuredAt: NOW }, { contentId: 'gen', mastery: 0.9, source: 'exercicios', measuredAt: NOW }], examDate: '2026-11-08', now: NOW });
    check('3.1: alta incidência + lacuna grande vem primeiro', ranked[0].content.id === 'eco');
    check('3.2: conteúdo sem lacuna medida conta como neutro e é sinalizado (não presume)', ranked.find((r) => r.content.id === 'pa')!.basis.lacunaMedida === false && ranked.find((r) => r.content.id === 'pa')!.basis.lacuna === 0.5);
    check('3.3: prova a ~33 dias → urgência 0.75', ranked[0].basis.urgencia === 0.75);
    const t = B.enemContentToTask(ranked[0], NOW, '2026-11-08');
    check('3.4: conteúdo prioritário vira Task com prazo da prova e duração da sessão', t.dueAt === '2026-11-08' && t.estimatedMinutes === 30 && t.priority === 'high');
  }

  // Inglês
  {
    const prog = B.englishWeekProgress({ targets: [{ skill: 'speaking', minutesPerWeek: 60 }, { skill: 'listening', minutesPerWeek: 60 }] }, [
      { id: 's1', skill: 'listening', minutes: 70, at: '2026-10-05T07:30:00', kind: 'pratica' },
      { id: 's2', skill: 'speaking', minutes: 15, at: '2026-10-06T07:30:00', kind: 'conversa' },
      { id: 's3', skill: 'speaking', minutes: 30, at: '2026-09-28T07:30:00', kind: 'conversa' },
    ], '2026-10-05');
    check('4.1: progresso semanal por habilidade (fora da semana não conta)', prog.find((p) => p.skill === 'speaking')!.doneMinutes === 15 && prog.find((p) => p.skill === 'listening')!.status === 'em_dia');
    const opts = B.englishPracticeOptions(prog);
    check('4.2: prática curta sugerida para a habilidade atrasada (speaking), pronta para a Recomendação', opts.length === 1 && opts[0].id === 'eng:speaking' && opts[0].minutes === 15);
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[academic] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
