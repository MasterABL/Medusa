/**
 * MEDUSA — Body — Repositório de treino e métricas
 *
 * Interface separada de `BodyRepository` de propósito: aquele cobre
 * diagnóstico/plano (planejamento); este cobre execução e registro. Assim
 * nenhum implementador existente precisa mudar. A origem do dado (memória,
 * Supabase do MINHA-VIDA via adapter, futuro storage) é assunto de quem
 * implementa — o domínio só conhece esta interface.
 */

import type { BodyMetricEntry, LoadEntry, WorkoutSession, WorkoutSheet } from '../model/training';
import type { DataOrigin } from '../../../foundation/types/dataState';

export interface BodyTrainingRepository {
  /** De onde vêm os dados deste repositório — viaja pra dentro do DataState, nunca é escondido. */
  readonly origin: DataOrigin;

  listSheets(): WorkoutSheet[];
  getSheet(id: string): WorkoutSheet | undefined;
  saveSheet(sheet: WorkoutSheet): void;

  listLoads(filter?: { exerciseId?: string }): LoadEntry[];
  /** Upsert por (exerciseId, date). */
  saveLoad(entry: LoadEntry): void;

  getSession(id: string): WorkoutSession | undefined;
  getActiveSession(sheetId?: string): WorkoutSession | undefined;
  saveSession(session: WorkoutSession): void;
  listSessions(): WorkoutSession[];

  listMetrics(filter?: { from?: string; to?: string }): BodyMetricEntry[];
  saveMetric(entry: BodyMetricEntry): void;
}
