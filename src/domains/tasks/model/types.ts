/**
 * MEDUSA — Tasks — Contrato
 *
 * EVENTO ≠ TAREFA. Um evento acontece num horário (a Agenda conhece);
 * uma tarefa é trabalho a fazer, com prazo e esforço, que PODE virar um
 * bloco na Agenda (via planner) ou se relacionar a um evento (relatedEventId),
 * mas não é um evento.
 *
 * Procedência: NOVA no Medusa. O MINHA-VIDA tinha Kanban (`projetos_tarefas`,
 * `faculdade_tarefas`: a_fazer/fazendo/feito) — os status abaixo cobrem esse
 * vocabulário e acrescentam `blocked`/`cancelled`, que o Kanban não distinguia.
 */

import type { LifeDomain } from '../../../foundation/types/lifeDomain';

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';

/** Prioridade DECLARADA pelo usuário. A prioridade calculada vem do Priority Engine. */
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type TaskRecurrence =
  | { frequency: 'daily'; interval?: number }
  | { frequency: 'weekly'; daysOfWeek: number[]; interval?: number }
  | { frequency: 'monthly'; dayOfMonth: number; interval?: number };

export interface TaskCompletion {
  completedAt: string;
  /** Minutos realmente gastos, quando informado — alimenta estimativas futuras. */
  actualMinutes?: number;
  note?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  /** ISO (data ou data-hora). Ausente = sem prazo. */
  dueAt?: string;
  /** Esforço estimado em minutos. Ausente = desconhecido (nunca presumido). */
  estimatedMinutes?: number;
  domain: LifeDomain;
  projectId?: string;
  milestoneId?: string;
  relatedEventId?: string;
  /** Ids de tarefas que precisam estar `done` antes desta ser executável. */
  dependsOn: string[];
  recurrence?: TaskRecurrence;
  completion?: TaskCompletion;
  /** Motivo explícito quando o usuário marca `blocked` (além do bloqueio por dependência). */
  blockedReason?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Executabilidade DERIVADA — nunca gravada. Uma tarefa `todo` com dependência
 * pendente não é executável, mesmo sem ninguém ter marcado `blocked`.
 */
export type Actionability =
  | { actionable: true }
  | { actionable: false; reason: 'concluida' | 'cancelada' | 'bloqueio_manual' | 'dependencia_pendente' | 'dependencia_inexistente' | 'ciclo_de_dependencia'; detail: string[] };
