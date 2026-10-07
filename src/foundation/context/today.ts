/**
 * MEDUSA FOUNDATION — Hoje (seletor de composição)
 *
 * Monta as fontes padrão e agrega. A tela Hoje (do Anti) consome
 * `DataState<TodayContext>`: Agora · Próximo · Atenção · Ritmo · Recomendação,
 * mais o estado de cada fonte. Nenhum dado é duplicado: tudo é lido dos
 * domínios donos na hora.
 */

import type { AgendaSource } from '../../domains/agenda/repository/source';
import type { TaskRepository } from '../../domains/tasks/repository/types';
import type { ProjectRepository } from '../../domains/projects/repository/types';
import type { ReminderEngine } from '../reminders/engine';
import type { ContextSource, TodayContext } from './aggregator';
import { aggregateToday, unavailableSource } from './aggregator';
import { agendaContextSource, guardianContextSource, projectsContextSource, recommendationsContextSource, remindersContextSource } from './sources';
import type { AgendaContextOptions } from './sources';
import type { RecommendationInput } from '../recommendations/engine';
import type { DataState } from '../types/dataState';

export interface TodayDeps {
  date: string;
  agenda?: AgendaSource;
  agendaOptions?: AgendaContextOptions;
  tasks?: TaskRepository;
  projects?: ProjectRepository;
  reminders?: ReminderEngine;
  /** Minutos livres até um prazo (planner). Sem isso, viabilidade fica "sem_estimativa". */
  availableMinutes?: (projectId: string, deadlineIso: string) => number | undefined;
  practices?: RecommendationInput['practices'];
  energy?: RecommendationInput['energy'];
  contextTag?: RecommendationInput['contextTag'];
  /** Fontes extras já conectadas (Finanças, Corpo, Espiritual, Educação...). */
  extraSources?: ContextSource[];
  includeGuardian?: boolean;
}

export function buildTodaySources(deps: TodayDeps): ContextSource[] {
  const sources: ContextSource[] = [];
  sources.push(deps.agenda ? agendaContextSource(deps.agenda, deps.date, deps.agendaOptions) : unavailableSource('agenda', 'fonte da Agenda não fornecida'));
  if (deps.projects && deps.tasks) sources.push(projectsContextSource(deps.projects, deps.tasks, deps.availableMinutes));
  else sources.push(unavailableSource('projects', 'repositórios de projeto/tarefa não fornecidos'));
  sources.push(deps.reminders ? remindersContextSource(deps.reminders) : unavailableSource('reminders', 'Reminder Engine não fornecido'));
  if (deps.includeGuardian !== false) sources.push(guardianContextSource());
  if (deps.agenda && deps.tasks) sources.push(recommendationsContextSource({ agenda: deps.agenda, date: deps.date, tasks: deps.tasks, projects: deps.projects, practices: deps.practices, energy: deps.energy, contextTag: deps.contextTag }));
  const extra = new Set((deps.extraSources ?? []).map((s) => s.id));
  for (const id of ['finance', 'body', 'spiritual', 'education'] as const) {
    if (!extra.has(id)) sources.push(unavailableSource(id, 'domínio ainda não conectado ao Hoje'));
  }
  return [...sources, ...(deps.extraSources ?? [])];
}

export function selectToday(deps: TodayDeps, now: string): DataState<TodayContext> {
  return aggregateToday(buildTodaySources(deps), now);
}
