/**
 * MEDUSA FOUNDATION — Fontes → candidatos de prioridade
 *
 * Cada domínio continua dono do seu dado; aqui só se traduz para o formato
 * que o Priority Engine entende. Nenhum dado é copiado para um repositório novo.
 */

import type { PriorityCandidate } from './engine';
import type { EventContext } from '../context/eventContext';
import { startIso } from '../context/eventContext';
import type { Task } from '../../domains/tasks/model/types';
import type { Project, ProjectDeadline } from '../../domains/projects/model/types';
import type { LifeDomain } from '../types/lifeDomain';
import type { ImportanceTier } from '../context/importance';
import { actionabilityOf } from '../../domains/tasks/services/dependencies';

const AGENDA_TO_LIFE: Record<string, LifeDomain> = { work: 'work', education: 'education', body: 'body', finance: 'finance', spiritual: 'spiritual', guardian: 'guardian', personal: 'personal', external: 'external' };

export function fromEventContext(ctx: EventContext): PriorityCandidate {
  const end = { date: ctx.date, startMin: ctx.endMin };
  return {
    id: `event:${ctx.eventId}`,
    kind: 'event',
    title: ctx.title,
    domain: AGENDA_TO_LIFE[ctx.domain] ?? 'personal',
    tier: ctx.tier,
    rigid: ctx.rigid,
    startsAt: startIso(ctx),
    endsAt: startIso(end),
    actionable: true,
    inConflict: ctx.conflictsWith.length > 0,
    yieldsInConflict: ctx.yieldsInConflict,
    refs: { eventId: ctx.eventId, projectId: ctx.relatedProjectId, taskId: ctx.relatedTaskId },
  };
}

const TASK_TIER: Record<Task['priority'], ImportanceTier> = { critical: 'critical', high: 'high', medium: 'medium', low: 'low' };

export function fromTask(task: Task, all: Task[], opts: { availableMinutesBeforeDue?: number; rigidDeadline?: boolean; contextFit?: number } = {}): PriorityCandidate {
  const a = actionabilityOf(task, all);
  return {
    id: `task:${task.id}`,
    kind: 'task',
    title: task.title,
    domain: task.domain,
    tier: TASK_TIER[task.priority],
    rigid: opts.rigidDeadline ?? false,
    dueAt: task.dueAt,
    estimatedMinutes: task.estimatedMinutes,
    actionable: a.actionable,
    notActionableReason: a.actionable ? undefined : `${a.reason}${a.detail.length ? `: ${a.detail.join(', ')}` : ''}`,
    availableMinutesBeforeDue: opts.availableMinutesBeforeDue,
    contextFit: opts.contextFit,
    refs: { taskId: task.id, projectId: task.projectId, milestoneId: task.milestoneId },
  };
}

/**
 * Tarefas de um projeto herdam o prazo do projeto quando não têm prazo próprio
 * (a entrega de sexta vale para a pesquisa de hoje) e a rigidez do prazo oficial.
 */
export function fromProjectTasks(project: Project, all: Task[], now: string, availableMinutesBeforeDue?: number): PriorityCandidate[] {
  const next: ProjectDeadline | undefined = [...project.deadlines].filter((d) => d.dueAt >= now.slice(0, d.dueAt.length)).sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  return all
    .filter((t) => t.projectId === project.id && t.status !== 'done' && t.status !== 'cancelled')
    .map((t) => {
      const c = fromTask(t.dueAt || !next ? t : { ...t, dueAt: next.dueAt }, all, { availableMinutesBeforeDue, rigidDeadline: next?.hard });
      return { ...c, costOfDelay: next?.hard ? 'alto' : c.costOfDelay, refs: { ...c.refs, projectId: project.id } };
    });
}
