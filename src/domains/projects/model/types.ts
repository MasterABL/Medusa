/**
 * MEDUSA — Projects — Contrato
 *
 * Projeto = objetivo + marcos + prazos, com tarefas e eventos LIGADOS por id
 * (Task.projectId / Task.milestoneId / relatedEventIds). Nada é copiado para
 * dentro do projeto: a mesma tarefa aparece no projeto, no Hoje e no planner
 * sem duplicar dado.
 *
 * Exemplos que o contrato precisa aguentar: Projeto Multidisciplinar,
 * Projeto Integrado (faculdade), trabalhos importantes, projetos pessoais,
 * projetos de curso.
 *
 * Procedência: NOVA. O MINHA-VIDA tinha `projetos_contextos`/`projetos_tarefas`
 * (Kanban por contexto) e foi aposentado; ficou o aprendizado de que projeto
 * sem prazo e sem esforço vira lista de desejos.
 */

import type { LifeDomain } from '../../../foundation/types/lifeDomain';

export type ProjectStatus = 'planning' | 'active' | 'paused' | 'done' | 'cancelled';

export type ProjectKind = 'academic' | 'work' | 'personal' | 'course' | 'other';

export interface ProjectDeadline {
  id: string;
  label: string;
  /** ISO data ou data-hora. */
  dueAt: string;
  /** Prazo rígido (entrega oficial) vs. meta interna. */
  hard: boolean;
  milestoneId?: string;
}

export interface Milestone {
  id: string;
  title: string;
  /** Posição na sequência do projeto (0-based). */
  order: number;
  dueAt?: string;
}

export interface ProjectDocumentRef {
  id: string;
  label: string;
  /** Referência externa (URL, id de arquivo). O domínio não armazena o conteúdo. */
  ref: string;
}

export interface Project {
  id: string;
  title: string;
  objective: string;
  kind: ProjectKind;
  status: ProjectStatus;
  relatedDomains: LifeDomain[];
  milestones: Milestone[];
  deadlines: ProjectDeadline[];
  relatedEventIds: string[];
  documents: ProjectDocumentRef[];
  /** Vínculo opcional com o contrato acadêmico (disciplina/projeto integrado). */
  academicRef?: { programId?: string; disciplineId?: string; academicProjectId?: string };
  createdAt: string;
  updatedAt: string;
}

export type MilestoneState = 'concluido' | 'em_andamento' | 'nao_iniciado' | 'atrasado' | 'sem_tarefas';

export interface MilestoneProgress {
  milestoneId: string;
  state: MilestoneState;
  totalTasks: number;
  doneTasks: number;
  remainingMinutes: number;
  tasksWithoutEstimate: number;
}

export interface ProjectProgress {
  projectId: string;
  totalTasks: number;
  doneTasks: number;
  /** 0-1 por contagem de tarefas (não por tempo, que pode ser desconhecido). */
  completionRatio: number;
  remainingMinutes: number;
  /** Tarefas abertas sem estimativa: o esforço restante é PISO, não total. */
  tasksWithoutEstimate: number;
  milestones: MilestoneProgress[];
  nextDeadline?: ProjectDeadline;
}

/**
 * Viabilidade do prazo contra o tempo REALMENTE disponível (vindo do planner /
 * tempo livre da Agenda — deslocamento e buffer já descontados).
 *  - folgado:  disponível ≥ 1.5 × restante
 *  - apertado: restante ≤ disponível < 1.5 × restante
 *  - inviavel: disponível < restante
 *  - sem_estimativa: há tarefa aberta sem esforço estimado → não dá pra afirmar
 */
export type DeadlineFeasibility = 'folgado' | 'apertado' | 'inviavel' | 'sem_estimativa' | 'sem_prazo' | 'vencido';

export interface DeadlineAssessment {
  projectId: string;
  deadline?: ProjectDeadline;
  feasibility: DeadlineFeasibility;
  remainingMinutes: number;
  availableMinutes?: number;
  /** availableMinutes − remainingMinutes. */
  slackMinutes?: number;
  hoursUntilDeadline?: number;
}
