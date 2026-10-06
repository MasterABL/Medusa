/**
 * MEDUSA — Body — Adapter do MINHA-VIDA (treino_exercicios, treino_cargas, corpo_registros)
 *
 * Só TRADUZ linhas já lidas (snake_case, como o Supabase devolve) para os
 * contratos do Medusa. Não abre conexão, não escreve, não conhece o banco:
 * quem lê as linhas é uma camada de infraestrutura que ainda não existe aqui.
 *
 * O que NÃO é importado, de propósito:
 *  - `frequencia_cardiaca_media`: veio de uma integração (Fitness API) que o
 *    próprio MINHA-VIDA marcou como bloqueada; este contrato não promete
 *    sensores que ninguém consegue alimentar.
 */

import type { BodyMetricEntry, LoadEntry, SheetExercise, WorkoutSheet } from '../model/training';
import { parseReps } from '../services/sessionEngine';

export interface LegacyTreinoExercicioRow {
  id: number | string;
  treino: string;
  nome: string;
  series: number;
  reps: string;
  ordem: number;
  wger_id?: number | null;
}

export interface LegacyTreinoCargaRow {
  id?: number | string;
  exercicio_id: number | string;
  carga_kg: number | string;
  data: string;
}

export interface LegacyCorpoRegistroRow {
  id?: number | string;
  data: string;
  peso_kg?: number | string | null;
  sono_horas?: number | string | null;
  treino_tipo?: string | null;
  treino_minutos?: number | null;
  passos?: number | null;
  calorias?: number | null;
  origem?: string | null;
  criado_em?: string | null;
}

const num = (v: number | string | null | undefined): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export const legacyExerciseId = (id: number | string): string => `ex-${id}`;

/** Agrupa por `treino` ('A', 'B'...). A ordem da ficha é a coluna `ordem` — não a ordem de chegada das linhas. */
export function mapSheets(rows: LegacyTreinoExercicioRow[]): WorkoutSheet[] {
  const groups = new Map<string, SheetExercise[]>();
  for (const r of rows) {
    const exercise: SheetExercise = {
      id: legacyExerciseId(r.id),
      name: r.nome,
      order: r.ordem,
      plannedSets: r.series,
      reps: parseReps(r.reps),
      catalogRef: r.wger_id ? { provider: 'wger', id: String(r.wger_id) } : undefined,
    };
    groups.set(r.treino, [...(groups.get(r.treino) ?? []), exercise]);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, exercises]) => ({ id: label, label, exercises: exercises.sort((a, b) => a.order - b.order) }));
}

/**
 * O legado guarda só a DATA da carga. Sem hora real, `recordedAt` é o início
 * do dia — o suficiente pra a regra "uma carga por exercício por dia" (única
 * no banco de origem) continuar valendo, e honesto sobre não haver hora.
 */
export function mapLoads(rows: LegacyTreinoCargaRow[]): LoadEntry[] {
  const out: LoadEntry[] = [];
  for (const r of rows) {
    const loadKg = num(r.carga_kg);
    if (loadKg === undefined) continue; // linha corrompida: não inventa 0 kg
    out.push({ exerciseId: legacyExerciseId(r.exercicio_id), date: r.data.slice(0, 10), loadKg, recordedAt: `${r.data.slice(0, 10)}T00:00:00.000Z`, source: 'manual' });
  }
  return out;
}

export function mapMetrics(rows: LegacyCorpoRegistroRow[]): BodyMetricEntry[] {
  return rows.map((r) => ({
    date: r.data.slice(0, 10),
    weightKg: num(r.peso_kg),
    sleepHours: num(r.sono_horas),
    steps: num(r.passos),
    calories: num(r.calorias),
    workoutMinutes: num(r.treino_minutos),
    workoutLabel: r.treino_tipo ?? undefined,
    source: r.origem === 'fitness_api' ? ('imported' as const) : ('manual' as const),
    recordedAt: r.criado_em ?? `${r.data.slice(0, 10)}T00:00:00.000Z`,
  }));
}
