/**
 * MEDUSA — Projects — Seletores (DataState)
 */
import type { ProjectRepository } from './repository/types';
import type { TaskRepository } from '../tasks/repository/types';
import type { DeadlineAssessment, Project, ProjectProgress } from './model/types';
import type { Task } from '../tasks/model/types';
import type { DataState } from '../../foundation/types/dataState';
import * as DS from '../../foundation/dataState';
import { assessDeadline, nextActionableTasks, projectProgress } from './services/progress';

export interface ProjectOverview {
  project: Project;
  progress: ProjectProgress;
  deadline: DeadlineAssessment;
  nextTasks: Task[];
}

export function selectProjectOverview(
  projects: ProjectRepository,
  tasks: TaskRepository,
  projectId: string,
  now: string,
  availableMinutes?: number
): DataState<ProjectOverview> {
  const project = projects.get(projectId);
  if (!project) return DS.empty('Projeto não encontrado.');
  const all = tasks.list();
  const overview: ProjectOverview = {
    project,
    progress: projectProgress(project, all, now),
    deadline: assessDeadline(project, all, now, availableMinutes),
    nextTasks: nextActionableTasks(project, all),
  };
  const missing: string[] = [];
  if (overview.progress.totalTasks === 0) missing.push('tarefas');
  if (overview.progress.tasksWithoutEstimate > 0) missing.push('estimativa de esforço');
  if (availableMinutes === undefined) missing.push('tempo disponível');
  const origin = projects.origin === 'fixture' || tasks.origin === 'fixture' ? 'fixture' : projects.origin;
  return DS.partial(overview, missing, 'dados_insuficientes', origin, now);
}

export function selectActiveProjects(projects: ProjectRepository, tasks: TaskRepository, now: string): DataState<ProjectOverview[]> {
  const active = projects.list({ status: ['active', 'planning'] });
  if (active.length === 0) return DS.empty('Nenhum projeto ativo.');
  const all = tasks.list();
  const list = active.map((project) => ({
    project,
    progress: projectProgress(project, all, now),
    deadline: assessDeadline(project, all, now),
    nextTasks: nextActionableTasks(project, all),
  }));
  return DS.ready(list, projects.origin, now);
}
