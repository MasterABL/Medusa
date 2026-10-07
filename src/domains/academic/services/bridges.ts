/**
 * MEDUSA — Acadêmico — Pontes com o Personal OS
 *
 * Traduções puras (sem gravar nada) do vocabulário acadêmico para Task,
 * evento de Agenda, prazo, prioridade e prática curta. A Educação continua
 * dona do dado; o Personal OS só lê pela tradução.
 */

import type { Task, TaskPriority } from '../../tasks/model/types';
import type { AgendaItem } from '../../../types/agenda';
import type { ExplicitImportance } from '../../../foundation/context/importance';
import type { ShortPractice } from '../../../foundation/recommendations/engine';
import type {
  AcademicActivity, AcademicDeadline, AcademicProject, Assessment, Course, Discipline, EnemContent, EnemGap, EnemSubject,
  EnglishPracticeSession, EnglishRoutine, EnglishSkillProgress, Lesson,
} from '../model/types';

const STATUS: Record<AcademicActivity['status'], Task['status']> = { pendente: 'todo', em_andamento: 'in_progress', entregue: 'done', dispensada: 'cancelled' };

/** Atividade da faculdade → Task (domínio educação). Prioridade pelo peso na nota quando conhecido. */
export function activityToTask(a: AcademicActivity, d: Discipline | undefined, now: string): Task {
  const priority: TaskPriority = a.weight === undefined ? 'medium' : a.weight >= 0.3 ? 'high' : a.weight >= 0.1 ? 'medium' : 'low';
  return {
    id: `acad:${a.id}`,
    title: d ? `${d.name}: ${a.title}` : a.title,
    priority,
    status: STATUS[a.status],
    dueAt: a.dueAt,
    estimatedMinutes: a.estimatedMinutes,
    domain: 'education',
    dependsOn: [],
    completion: a.status === 'entregue' ? { completedAt: now } : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

/** Avaliação → rascunho de evento de Agenda já marcado como crítico (prova). Não grava na Agenda. */
export function assessmentEventDraft(a: Assessment, d?: Discipline): Omit<AgendaItem, 'categoryId' | 'colorId' | 'createdAt' | 'updatedAt'> & ExplicitImportance {
  const start = a.at.slice(11, 16);
  const dur = a.durationMinutes ?? 120;
  const endMin = Number(start.slice(0, 2)) * 60 + Number(start.slice(3)) + dur;
  const end = `${String(Math.floor(Math.min(endMin, 1439) / 60)).padStart(2, '0')}:${String(Math.min(endMin, 1439) % 60).padStart(2, '0')}`;
  const critical = a.kind !== 'simulado';
  return {
    id: `assess:${a.id}`,
    title: d ? `${a.title} — ${d.name}` : a.title,
    kind: 'event',
    domain: 'education',
    date: a.at.slice(0, 10),
    startTime: start,
    endTime: end,
    durationMinutes: dur,
    isFlexible: false,
    location: a.online ? 'online' : a.location,
    source: { sourceType: 'education_session', sourceId: a.id },
    status: 'scheduled',
    importanceTier: critical ? 'critical' : 'high',
    contextCategory: critical ? 'exam' : 'study',
    rigid: true,
  };
}

export function academicDeadlines(input: {
  activities?: AcademicActivity[];
  assessments?: Assessment[];
  projects?: Array<{ academic: AcademicProject; deadlines: Array<{ id: string; label: string; dueAt: string; hard: boolean }> }>;
  courses?: Course[];
  disciplines?: Discipline[];
  now: string;
}): AcademicDeadline[] {
  const dName = (id?: string) => input.disciplines?.find((d) => d.id === id)?.name;
  const out: AcademicDeadline[] = [];
  for (const a of input.activities ?? []) {
    if (!a.dueAt || a.status === 'entregue' || a.status === 'dispensada') continue;
    out.push({ id: `dl:act:${a.id}`, label: dName(a.disciplineId) ? `${dName(a.disciplineId)}: ${a.title}` : a.title, dueAt: a.dueAt, hard: true, track: 'faculdade', source: { kind: 'atividade', id: a.id }, disciplineId: a.disciplineId });
  }
  for (const s of input.assessments ?? []) {
    out.push({ id: `dl:ass:${s.id}`, label: s.title, dueAt: s.at, hard: true, track: s.kind === 'simulado' ? 'vestibular' : 'faculdade', source: { kind: 'avaliacao', id: s.id }, disciplineId: s.disciplineId });
  }
  for (const p of input.projects ?? []) {
    for (const d of p.deadlines) out.push({ id: `dl:proj:${p.academic.id}:${d.id}`, label: `${p.academic.title}: ${d.label}`, dueAt: d.dueAt, hard: d.hard, track: 'faculdade', source: { kind: 'projeto', id: p.academic.projectId } });
  }
  for (const c of input.courses ?? []) if (c.dueAt) out.push({ id: `dl:course:${c.id}`, label: c.title, dueAt: c.dueAt, hard: false, track: 'curso', source: { kind: 'curso', id: c.id } });
  return out.filter((d) => d.dueAt >= input.now.slice(0, d.dueAt.length)).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

// ---------- Cursos ----------
export interface CourseProgress {
  courseId: string;
  totalLessons: number;
  doneLessons: number;
  remainingMinutes: number;
  lessonsWithoutDuration: number;
  nextLesson?: Lesson & { moduleId: string };
}

export function courseProgress(course: Course): CourseProgress {
  const lessons = [...course.modules].sort((a, b) => a.order - b.order).flatMap((m) => [...m.lessons].sort((a, b) => a.order - b.order).map((l) => ({ ...l, moduleId: m.id })));
  const pending = lessons.filter((l) => l.status === 'pendente');
  return {
    courseId: course.id,
    totalLessons: lessons.length,
    doneLessons: lessons.length - pending.length,
    remainingMinutes: pending.reduce((s, l) => s + (l.durationMinutes ?? 0), 0),
    lessonsWithoutDuration: pending.filter((l) => l.durationMinutes === undefined).length,
    nextLesson: pending[0],
  };
}

/** Próxima aula do curso como Task (a sequência do curso vira dependência implícita: só a próxima). */
export function nextLessonTask(course: Course, now: string): Task | undefined {
  const next = courseProgress(course).nextLesson;
  if (!next) return undefined;
  return { id: `course:${course.id}:${next.id}`, title: `${course.title}: ${next.title}`, priority: 'medium', status: 'todo', dueAt: course.dueAt, estimatedMinutes: next.durationMinutes, domain: 'education', dependsOn: [], createdAt: now, updatedAt: now };
}

// ---------- ENEM ----------
export interface EnemPriority {
  content: EnemContent;
  subject?: EnemSubject;
  /** 0-1: incidência × lacuna × urgência da prova. */
  score: number;
  mastery?: number;
  basis: { incidencia: number; lacuna: number; urgencia: number; lacunaMedida: boolean };
}

const INCIDENCE = { alta: 1, media: 0.6, baixa: 0.3 } as const;

/**
 * Prioridade de conteúdos do ENEM. Lacuna não medida conta como NEUTRA (0.5)
 * e é sinalizada — o sistema não presume que a pessoa sabe ou não sabe.
 */
export function enemPriorities(input: { contents: EnemContent[]; subjects?: EnemSubject[]; gaps: EnemGap[]; examDate?: string; now: string }): EnemPriority[] {
  const days = input.examDate ? Math.max(0, (Date.parse(`${input.examDate}T00:00:00`) - Date.parse(input.now)) / 86_400_000) : undefined;
  const urgency = days === undefined ? 0.5 : days <= 30 ? 1 : days <= 90 ? 0.75 : days <= 180 ? 0.5 : 0.3;
  return input.contents
    .map((c) => {
      const gap = [...input.gaps].filter((g) => g.contentId === c.id).sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
      const lacuna = gap ? 1 - Math.min(1, Math.max(0, gap.mastery)) : 0.5;
      const inc = c.incidence ? INCIDENCE[c.incidence] : 0.5;
      return { content: c, subject: input.subjects?.find((s) => s.id === c.subjectId), score: Math.round(inc * 0.4 * 1000 + lacuna * 0.4 * 1000 + urgency * 0.2 * 1000) / 1000, mastery: gap?.mastery, basis: { incidencia: inc, lacuna, urgencia: urgency, lacunaMedida: !!gap } };
    })
    .sort((a, b) => b.score - a.score || a.content.id.localeCompare(b.content.id));
}

export function enemContentToTask(p: EnemPriority, now: string, examDate?: string): Task {
  return {
    id: `enem:${p.content.id}`,
    title: `ENEM: ${p.content.title}`,
    priority: p.score >= 0.75 ? 'high' : p.score >= 0.5 ? 'medium' : 'low',
    status: 'todo',
    dueAt: examDate,
    estimatedMinutes: p.content.sessionMinutes,
    domain: 'education',
    dependsOn: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ---------- Inglês ----------
export function englishWeekProgress(routine: EnglishRoutine, sessions: EnglishPracticeSession[], weekStart: string): EnglishSkillProgress[] {
  const end = new Date(Date.parse(`${weekStart}T00:00:00`) + 7 * 86_400_000);
  const inWeek = sessions.filter((s) => s.at >= `${weekStart}T00:00:00` && Date.parse(s.at) < end.getTime());
  const skills = Array.from(new Set([...routine.targets.map((t) => t.skill), ...inWeek.map((s) => s.skill)]));
  return skills.map((skill) => {
    const target = routine.targets.find((t) => t.skill === skill)?.minutesPerWeek ?? 0;
    const done = inWeek.filter((s) => s.skill === skill).reduce((x, s) => x + s.minutes, 0);
    return { skill, targetMinutes: target, doneMinutes: done, ratio: target === 0 ? 0 : Math.round((done / target) * 100) / 100, status: target === 0 ? 'sem_meta' : done >= target ? 'em_dia' : 'atrasado' };
  });
}

/** Práticas curtas para a Recomendação: as habilidades mais atrasadas primeiro. */
export function englishPracticeOptions(progress: EnglishSkillProgress[], minutes = 15): ShortPractice[] {
  const label: Record<string, string> = { speaking: 'Prática de speaking', listening: 'Prática de listening', writing: 'Prática de writing', reading: 'Leitura em inglês', vocabulary: 'Revisão de vocabulário', grammar: 'Revisão de gramática' };
  return progress
    .filter((p) => p.status === 'atrasado')
    .sort((a, b) => a.ratio - b.ratio)
    .map((p) => ({ id: `eng:${p.skill}`, title: label[p.skill] ?? p.skill, domain: 'education' as const, minutes, kind: p.skill === 'vocabulary' || p.skill === 'grammar' ? ('revisao' as const) : ('pratica' as const) }));
}
