/**
 * MEDUSA — Tasks — Ciclo de vida (transições válidas, imutáveis)
 */

import type { Task, TaskStatus } from '../model/types';
import { actionabilityOf } from './dependencies';

export class TaskTransitionError extends Error {}

const ALLOWED: Record<TaskStatus, TaskStatus[]> = {
  todo: ['in_progress', 'blocked', 'done', 'cancelled'],
  in_progress: ['todo', 'blocked', 'done', 'cancelled'],
  blocked: ['todo', 'in_progress', 'cancelled'],
  done: ['todo'], // reabrir
  cancelled: ['todo'], // reativar
};

export function transition(task: Task, to: TaskStatus, all: Task[], now: string, opts: { reason?: string; actualMinutes?: number } = {}): Task {
  if (task.status === to) return task;
  if (!ALLOWED[task.status].includes(to)) throw new TaskTransitionError(`Transição inválida: ${task.status} → ${to}.`);

  if (to === 'in_progress' || to === 'done') {
    const a = actionabilityOf({ ...task, status: 'todo' }, all);
    if (!a.actionable && a.reason !== 'bloqueio_manual') {
      throw new TaskTransitionError(`"${task.title}" não pode avançar: ${a.reason} (${a.detail.join(', ')}).`);
    }
  }
  if (to === 'blocked' && !opts.reason?.trim()) throw new TaskTransitionError('Bloquear uma tarefa exige o motivo.');

  return {
    ...task,
    status: to,
    blockedReason: to === 'blocked' ? opts.reason : undefined,
    completion: to === 'done' ? { completedAt: now, actualMinutes: opts.actualMinutes } : to === 'todo' ? undefined : task.completion,
    updatedAt: now,
  };
}

export function validateTask(task: Task): string[] {
  const errors: string[] = [];
  if (!task.title.trim()) errors.push('Tarefa sem título.');
  if (task.estimatedMinutes !== undefined && (!Number.isFinite(task.estimatedMinutes) || task.estimatedMinutes <= 0)) errors.push('Esforço estimado deve ser positivo.');
  if (task.dependsOn.includes(task.id)) errors.push('Tarefa não pode depender de si mesma.');
  if (task.dueAt && Number.isNaN(Date.parse(task.dueAt))) errors.push(`Prazo ilegível: ${task.dueAt}.`);
  if (task.status === 'done' && !task.completion) errors.push('Tarefa concluída sem registro de conclusão.');
  return errors;
}
