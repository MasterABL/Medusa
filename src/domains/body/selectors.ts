/**
 * MEDUSA — Body — Seletores de leitura (o que uma tela consome)
 *
 * UI -> seletor -> repositório -> fonte. Nenhum componente deve conhecer
 * Supabase, localStorage ou fixtures: recebe `DataState<...>` daqui.
 */

import type { BodyTrainingRepository } from './repository/training';
import type { BodyMetricKey, MetricWindowSummary, WorkoutView } from './model/training';
import { viewWorkout } from './services/sessionEngine';
import { summarizeMetric } from './services/metricsEngine';
import * as DS from '../../foundation/dataState';
import type { DataState } from '../../foundation/types/dataState';

/** "O que estou fazendo agora?" — a ficha pedida (ou a da sessão ativa). */
export function selectWorkoutView(repo: BodyTrainingRepository, now: string, sheetId?: string): DataState<WorkoutView> {
  const active = repo.getActiveSession(sheetId);
  const sheet = (active ? repo.getSheet(active.sheetId) : undefined) ?? (sheetId ? repo.getSheet(sheetId) : repo.listSheets()[0]);
  if (!sheet) return DS.empty('Nenhuma ficha de treino cadastrada.');
  if (sheet.exercises.length === 0) return DS.empty(`A ficha ${sheet.label} ainda não tem exercícios.`);

  const view = viewWorkout({ sheet, session: active, loads: repo.listLoads(), now });
  const hasNoLoads = repo.listLoads().length === 0;
  if (hasNoLoads) return DS.partial(view, ['cargas'], 'dados_insuficientes', repo.origin, now);
  return DS.ready(view, repo.origin, now);
}

const ALL_KEYS: BodyMetricKey[] = ['sleepHours', 'steps', 'calories', 'weightKg', 'workoutMinutes'];

export function selectMetrics(
  repo: BodyTrainingRepository,
  endDate: string,
  windowDays: number
): DataState<Record<BodyMetricKey, MetricWindowSummary>> {
  const entries = repo.listMetrics();
  if (entries.length === 0) return DS.empty('Nenhum registro corporal ainda.');

  const summaries = Object.fromEntries(ALL_KEYS.map((k) => [k, summarizeMetric(entries, k, endDate, windowDays)])) as Record<BodyMetricKey, MetricWindowSummary>;
  const missing = ALL_KEYS.filter((k) => summaries[k].daysWithData === 0);
  return DS.partial(summaries, missing, 'dados_insuficientes', repo.origin, endDate);
}
