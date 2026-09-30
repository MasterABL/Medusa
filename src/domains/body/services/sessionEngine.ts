/**
 * MEDUSA — Body — Motor de sessão de treino
 *
 * Responde "O que estou fazendo agora?" como função PURA de
 * (ficha, sessão, histórico de cargas, instante). Sem relógio global, sem
 * estado escondido: o mesmo input dá sempre a mesma resposta — é isso que
 * deixa qualquer composição visual futura (cinética, rítmica, lista) ler o
 * mesmo dado sem recalcular regra.
 *
 * Ordem de execução: exercícios na ordem da ficha, séries em sequência
 * (todas as séries do exercício 1, depois as do 2...). Um exercício está
 * completo quando tem `plannedSets` séries registradas.
 */

import type {
  ExerciseRef,
  LoadEntry,
  RepsSpec,
  SetLog,
  SheetExercise,
  WorkoutSession,
  WorkoutSheet,
  WorkoutView,
} from '../model/training';
import { progressionFor } from './progressionEngine';

export class WorkoutError extends Error {}

export function orderedExercises(sheet: WorkoutSheet): SheetExercise[] {
  return [...sheet.exercises].sort((a, b) => a.order - b.order);
}

/**
 * "8 a 10" / "8-10" / "12" -> faixa numérica; qualquer outra coisa ("FALHA",
 * "até a falha") mantém só o texto — nunca inventa um número.
 */
export function parseReps(raw: string): RepsSpec {
  const text = raw.trim();
  const range = text.match(/^(\d{1,3})\s*(?:a|à|-|–|até)\s*(\d{1,3})$/i);
  if (range) {
    const [a, b] = [Number(range[1]), Number(range[2])];
    return { raw: text, min: Math.min(a, b), max: Math.max(a, b) };
  }
  const single = text.match(/^(\d{1,3})$/);
  if (single) return { raw: text, min: Number(single[1]), max: Number(single[1]) };
  return { raw: text };
}

export function startWorkout(sheet: WorkoutSheet, id: string, now: string): WorkoutSession {
  if (sheet.exercises.length === 0) throw new WorkoutError(`A ficha "${sheet.label}" não tem exercícios.`);
  return { id, sheetId: sheet.id, startedAt: now, status: 'in_progress', sets: [] };
}

function setsDone(session: WorkoutSession, exerciseId: string): number {
  return session.sets.filter((s) => s.exerciseId === exerciseId).length;
}

/** Primeiro exercício (na ordem) que ainda tem série pendente. */
function firstPending(sheet: WorkoutSheet, session: WorkoutSession): { exercise: SheetExercise; index: number } | undefined {
  const list = orderedExercises(sheet);
  for (let i = 0; i < list.length; i += 1) {
    if (setsDone(session, list[i].id) < list[i].plannedSets) return { exercise: list[i], index: i };
  }
  return undefined;
}

export interface LogSetInput {
  reps: number;
  loadKg?: number;
}

/**
 * Registra a PRÓXIMA série pendente. Imutável: devolve a sessão nova.
 * Completar a última série planejada fecha a sessão como `completed`.
 */
export function logSet(sheet: WorkoutSheet, session: WorkoutSession, input: LogSetInput, now: string): WorkoutSession {
  if (session.status !== 'in_progress') throw new WorkoutError('A sessão já foi encerrada.');
  if (!Number.isInteger(input.reps) || input.reps < 0) throw new WorkoutError(`Repetições inválidas: ${input.reps}.`);
  if (input.loadKg !== undefined && (!Number.isFinite(input.loadKg) || input.loadKg < 0)) throw new WorkoutError(`Carga inválida: ${input.loadKg}.`);

  const pending = firstPending(sheet, session);
  if (!pending) throw new WorkoutError('Todas as séries planejadas já foram registradas.');

  const log: SetLog = {
    exerciseId: pending.exercise.id,
    setNumber: setsDone(session, pending.exercise.id) + 1,
    reps: input.reps,
    loadKg: input.loadKg,
    completedAt: now,
  };
  const next: WorkoutSession = { ...session, sets: [...session.sets, log] };
  if (!firstPending(sheet, next)) return { ...next, status: 'completed', endedAt: now };
  return next;
}

export function endWorkout(session: WorkoutSession, now: string): WorkoutSession {
  if (session.status !== 'in_progress') return session;
  return { ...session, status: 'abandoned', endedAt: now };
}

function toRef(e: SheetExercise | undefined): ExerciseRef | undefined {
  return e ? { id: e.id, name: e.name, order: e.order } : undefined;
}

export function viewWorkout(input: {
  sheet?: WorkoutSheet;
  session?: WorkoutSession;
  loads: LoadEntry[];
  now: string;
  /** Dia (YYYY-MM-DD) usado pra ler "carga atual" — padrão: dia de `now`. */
  today?: string;
}): WorkoutView {
  const { sheet, session, loads, now } = input;
  if (!sheet || sheet.exercises.length === 0) {
    return { phase: 'sem_ficha', completedSetsTotal: 0, plannedSetsTotal: 0 };
  }

  const list = orderedExercises(sheet);
  const plannedSetsTotal = list.reduce((sum, e) => sum + e.plannedSets, 0);
  const completedSetsTotal = session ? Math.min(session.sets.length, plannedSetsTotal) : 0;
  const base = { sheetLabel: sheet.label, completedSetsTotal, plannedSetsTotal };

  if (session?.status === 'abandoned') return { phase: 'encerrado', ...base };

  const pending = session ? firstPending(sheet, session) : { exercise: list[0], index: 0 };
  if (!pending) return { phase: 'concluido', ...base };

  const { exercise, index } = pending;
  const today = input.today ?? input.now.slice(0, 10);
  const progression = progressionFor(exercise.id, loads, today);

  const lastSet = session?.sets[session.sets.length - 1];
  let restRemainingSeconds: number | undefined;
  // O descanso vale contra o exercício da série que ACABOU de ser feita (é ele que define o tempo).
  const lastExercise = lastSet ? list.find((e) => e.id === lastSet.exerciseId) : undefined;
  if (lastSet && lastExercise && lastExercise.restSeconds !== undefined) {
    const elapsed = (Date.parse(now) - Date.parse(lastSet.completedAt)) / 1000;
    const remaining = Math.ceil(lastExercise.restSeconds - elapsed);
    restRemainingSeconds = remaining > 0 ? remaining : undefined;
  }

  return {
    ...base,
    phase: restRemainingSeconds !== undefined ? 'descansando' : 'executando',
    position: { index: index + 1, total: list.length },
    currentExercise: exercise,
    currentSet: session ? setsDone(session, exercise.id) + 1 : 1,
    plannedSets: exercise.plannedSets,
    repsTarget: exercise.reps,
    currentLoadKg: progression.current?.loadKg,
    previousLoadKg: progression.previous?.loadKg,
    progression,
    restSeconds: lastExercise?.restSeconds ?? exercise.restSeconds,
    restRemainingSeconds,
    previousExercise: toRef(list[index - 1]),
    nextExercise: toRef(list[index + 1]),
  };
}
