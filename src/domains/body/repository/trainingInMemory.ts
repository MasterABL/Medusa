/**
 * MEDUSA — Body — Repositório de treino em memória (testes, dev, cenários determinísticos)
 */

import type { BodyMetricEntry, LoadEntry, WorkoutSession, WorkoutSheet } from '../model/training';
import type { DataOrigin } from '../../../foundation/types/dataState';
import type { BodyTrainingRepository } from './training';
import { upsertLoad } from '../services/progressionEngine';

export function createInMemoryBodyTrainingRepository(origin: DataOrigin = 'manual'): BodyTrainingRepository {
  const sheets = new Map<string, WorkoutSheet>();
  let loads: LoadEntry[] = [];
  const sessions = new Map<string, WorkoutSession>();
  const metrics = new Map<string, BodyMetricEntry>();

  return {
    origin,
    listSheets: () => Array.from(sheets.values()),
    getSheet: (id) => sheets.get(id),
    saveSheet: (sheet) => void sheets.set(sheet.id, sheet),

    listLoads: (filter) => loads.filter((l) => !filter?.exerciseId || l.exerciseId === filter.exerciseId),
    saveLoad: (entry) => {
      loads = upsertLoad(loads, entry);
    },

    getSession: (id) => sessions.get(id),
    getActiveSession: (sheetId) =>
      Array.from(sessions.values()).find((s) => s.status === 'in_progress' && (!sheetId || s.sheetId === sheetId)),
    saveSession: (session) => void sessions.set(session.id, session),
    listSessions: () => Array.from(sessions.values()),

    listMetrics: (filter) =>
      Array.from(metrics.values()).filter((m) => (!filter?.from || m.date >= filter.from) && (!filter?.to || m.date <= filter.to)),
    saveMetric: (entry) => {
      // registros do mesmo dia mesclam campo a campo (manual sobre importado, etc.)
      const prev = metrics.get(entry.date);
      metrics.set(entry.date, prev ? { ...prev, ...Object.fromEntries(Object.entries(entry).filter(([, v]) => v !== undefined)) } as BodyMetricEntry : entry);
    },
  };
}
