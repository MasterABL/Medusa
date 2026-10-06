/**
 * MEDUSA — Projects — Progresso, próximos passos e viabilidade de prazo
 */

import type { Task } from '../../tasks/model/types';
import type { DeadlineAssessment, MilestoneProgress, Project, ProjectDeadline, ProjectProgress } from '../model/types';
import { actionabilityOf, executionOrder } from '../../tasks/services/dependencies';

const open = (t: Task) => t.status !== 'done' && t.status !== 'cancelled';

function sumRemaining(tasks: Task[]): { minutes: number; withoutEstimate: number } {
  const o = tasks.filter(open);
  return { minutes: o.reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0), withoutEstimate: o.filter((t) => t.estimatedMinutes === undefined).length };
}

export function nextDeadline(project: Project, now: string): ProjectDeadline | undefined {
  return [...project.deadlines].filter((d) => d.dueAt >= now.slice(0, d.dueAt.length)).sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
}

export function projectProgress(project: Project, allTasks: Task[], now: string): ProjectProgress {
  const tasks = allTasks.filter((t) => t.projectId === project.id && t.status !== 'cancelled');
  const done = tasks.filter((t) => t.status === 'done').length;
  const rem = sumRemaining(tasks);

  const milestones: MilestoneProgress[] = [...project.milestones]
    .sort((a, b) => a.order - b.order)
    .map((m) => {
      const mt = tasks.filter((t) => t.milestoneId === m.id);
      const mDone = mt.filter((t) => t.status === 'done').length;
      const r = sumRemaining(mt);
      let state: MilestoneProgress['state'];
      if (mt.length === 0) state = 'sem_tarefas';
      else if (mDone === mt.length) state = 'concluido';
      else if (m.dueAt && m.dueAt < now.slice(0, m.dueAt.length)) state = 'atrasado';
      else if (mDone > 0 || mt.some((t) => t.status === 'in_progress')) state = 'em_andamento';
      else state = 'nao_iniciado';
      return { milestoneId: m.id, state, totalTasks: mt.length, doneTasks: mDone, remainingMinutes: r.minutes, tasksWithoutEstimate: r.withoutEstimate };
    });

  return {
    projectId: project.id,
    totalTasks: tasks.length,
    doneTasks: done,
    completionRatio: tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100) / 100,
    remainingMinutes: rem.minutes,
    tasksWithoutEstimate: rem.withoutEstimate,
    milestones,
    nextDeadline: nextDeadline(project, now),
  };
}

/** Próximas tarefas executáveis do projeto, na ordem de dependência e de marco. */
export function nextActionableTasks(project: Project, allTasks: Task[], limit = 3): Task[] {
  const tasks = allTasks.filter((t) => t.projectId === project.id);
  const order = executionOrder(tasks).order;
  const milestoneOrder = new Map(project.milestones.map((m) => [m.id, m.order]));
  const pos = new Map(order.map((id, i) => [id, i]));
  return tasks
    .filter((t) => actionabilityOf(t, allTasks).actionable)
    .sort((a, b) => (milestoneOrder.get(a.milestoneId ?? '') ?? 999) - (milestoneOrder.get(b.milestoneId ?? '') ?? 999) || (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0))
    .slice(0, limit);
}

/**
 * Viabilidade do próximo prazo dado o tempo disponível até ele.
 * `availableMinutes` vem de fora (planner / tempo livre real); sem ele a
 * avaliação ainda diz quanto falta, mas não afirma viabilidade.
 */
export function assessDeadline(project: Project, allTasks: Task[], now: string, availableMinutes?: number): DeadlineAssessment {
  const tasks = allTasks.filter((t) => t.projectId === project.id);
  const rem = sumRemaining(tasks);
  const all = [...project.deadlines].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const deadline = nextDeadline(project, now);

  if (!deadline) {
    const overdue = all.length > 0 && rem.minutes + rem.withoutEstimate > 0;
    return { projectId: project.id, deadline: overdue ? all[all.length - 1] : undefined, feasibility: overdue ? 'vencido' : 'sem_prazo', remainingMinutes: rem.minutes };
  }
  const hoursUntilDeadline = Math.round(((Date.parse(deadline.dueAt.length === 10 ? `${deadline.dueAt}T23:59:59` : deadline.dueAt) - Date.parse(now)) / 3_600_000) * 10) / 10;
  const base = { projectId: project.id, deadline, remainingMinutes: rem.minutes, hoursUntilDeadline };
  if (rem.withoutEstimate > 0) return { ...base, feasibility: 'sem_estimativa', availableMinutes };
  if (availableMinutes === undefined) return { ...base, feasibility: 'sem_estimativa' };
  const slackMinutes = availableMinutes - rem.minutes;
  const feasibility = availableMinutes < rem.minutes ? 'inviavel' : availableMinutes < rem.minutes * 1.5 ? 'apertado' : 'folgado';
  return { ...base, feasibility, availableMinutes, slackMinutes };
}

export function validateProject(p: Project): string[] {
  const errors: string[] = [];
  if (!p.title.trim()) errors.push('Projeto sem título.');
  const orders = p.milestones.map((m) => m.order);
  if (new Set(orders).size !== orders.length) errors.push('Dois marcos com a mesma posição.');
  for (const d of p.deadlines) {
    if (Number.isNaN(Date.parse(d.dueAt))) errors.push(`Prazo ilegível: ${d.dueAt}.`);
    if (d.milestoneId && !p.milestones.some((m) => m.id === d.milestoneId)) errors.push(`Prazo "${d.label}" aponta para marco inexistente.`);
  }
  return errors;
}
