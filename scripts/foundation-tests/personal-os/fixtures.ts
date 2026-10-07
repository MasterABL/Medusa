/**
 * FIXTURE / TESTE — cenários determinísticos do Personal OS. Nunca dado real.
 */
import type { Task } from '../../../src/domains/tasks/model/types';
import type { Project } from '../../../src/domains/projects/model/types';
import type { AgendaItem, AgendaDomain } from '../../../src/types/agenda';

export const DAY = '2026-10-06'; // terça-feira

export function task(id: string, o: Partial<Task> = {}): Task {
  return { id, title: id, priority: 'medium', status: 'todo', domain: 'education', dependsOn: [], createdAt: `${DAY}T08:00:00`, updatedAt: `${DAY}T08:00:00`, ...o };
}

export function project(id: string, o: Partial<Project> = {}): Project {
  return { id, title: id, objective: 'objetivo', kind: 'academic', status: 'active', relatedDomains: ['education'], milestones: [], deadlines: [], relatedEventIds: [], documents: [], createdAt: `${DAY}T08:00:00`, updatedAt: `${DAY}T08:00:00`, ...o };
}

export function agendaItem(id: string, title: string, start: string, end: string, o: Partial<AgendaItem> = {}): AgendaItem {
  return {
    id, title, kind: 'event', domain: 'personal' as AgendaDomain, categoryId: 'c', colorId: 'x', date: DAY, startTime: start, endTime: end,
    source: { sourceType: 'manual' }, status: 'scheduled', createdAt: `${DAY}T00:00:00`, updatedAt: `${DAY}T00:00:00`, ...o,
  };
}

/** Projeto Integrado: pesquisa → estrutura → redação → revisão → entrega, prazo na sexta. */
export function projetoIntegrado(): { project: Project; tasks: Task[] } {
  const project: Project = {
    ...projectBase(),
  };
  const tasks: Task[] = [
    task('t-pesquisa', { title: 'Levantamento bibliográfico', projectId: 'pi', milestoneId: 'm-pesquisa', estimatedMinutes: 45, priority: 'high' }),
    task('t-estrutura', { title: 'Estrutura', projectId: 'pi', milestoneId: 'm-pesquisa', estimatedMinutes: 60, dependsOn: ['t-pesquisa'], priority: 'high' }),
    task('t-redacao', { title: 'Redação', projectId: 'pi', milestoneId: 'm-texto', estimatedMinutes: 120, dependsOn: ['t-estrutura'] }),
    task('t-revisao', { title: 'Revisão', projectId: 'pi', milestoneId: 'm-texto', estimatedMinutes: 30, dependsOn: ['t-redacao'] }),
    task('t-entrega', { title: 'Entrega no AVA', projectId: 'pi', milestoneId: 'm-texto', estimatedMinutes: 10, dependsOn: ['t-revisao'] }),
  ];
  return { project, tasks };
}

function projectBase(): Project {
  return project('pi', {
    title: 'Projeto Integrado',
    milestones: [{ id: 'm-pesquisa', title: 'Pesquisa', order: 0, dueAt: '2026-10-07' }, { id: 'm-texto', title: 'Texto final', order: 1 }],
    deadlines: [{ id: 'd-entrega', label: 'Entrega oficial', dueAt: '2026-10-09', hard: true, milestoneId: 'm-texto' }],
  });
}
