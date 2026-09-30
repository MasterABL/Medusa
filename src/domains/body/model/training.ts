/**
 * MEDUSA — Body — Ficha de treino, execução e cargas (contratos)
 *
 * Procedência: MINHA-VIDA (treino_exercicios/treino_cargas — ficha A/B, reps
 * em texto livre, uma carga por exercício por dia) re-expressada em
 * vocabulário Medusa. NÃO substitui `BodyPlan`/`BodySession` (que planejam
 * QUANDO treinar, na Agenda): isto modela O QUE se faz durante o treino.
 *
 * Nome `WorkoutSession` (e não BodySession) de propósito: `BodySession` já
 * existe aqui com outro significado (slot planejado) — reusar o nome
 * quebraria quem já o importa.
 */

/** Rótulo livre ('A', 'B', 'C'...) — a ficha legada usa A/B, mas nada no contrato impede um terceiro treino. */
export type WorkoutSheetLabel = string;

/**
 * Repetições como o usuário escreveu ("8 a 10", "12", "FALHA"). O texto é a
 * fonte; `min`/`max` só existem quando dá pra ler números SEM inventar —
 * "FALHA" fica sem faixa, e a tela mostra o texto.
 */
export interface RepsSpec {
  raw: string;
  min?: number;
  max?: number;
}

export interface SheetExercise {
  id: string;
  name: string;
  /** Posição na ficha (0-based). A ordem é contrato, não detalhe de exibição. */
  order: number;
  plannedSets: number;
  reps: RepsSpec;
  /** Descanso entre séries. Ausente = a ficha não diz; o contrato não inventa um padrão. */
  restSeconds?: number;
  /** Vínculo opcional com um catálogo externo de exercícios (ex.: wger) — só referência. */
  catalogRef?: { provider: string; id: string };
}

export interface WorkoutSheet {
  id: string;
  label: WorkoutSheetLabel;
  exercises: SheetExercise[];
}

/** Carga registrada. Uma por (exercício, dia): registrar de novo no mesmo dia CORRIGE, não cria ponto falso. */
export interface LoadEntry {
  exerciseId: string;
  /** YYYY-MM-DD */
  date: string;
  loadKg: number;
  recordedAt: string;
  source: 'manual' | 'session';
}

export interface SetLog {
  exerciseId: string;
  setNumber: number; // 1-based
  reps: number;
  loadKg?: number;
  completedAt: string;
}

export type WorkoutSessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface WorkoutSession {
  id: string;
  sheetId: string;
  startedAt: string;
  endedAt?: string;
  status: WorkoutSessionStatus;
  sets: SetLog[];
}

export type LoadTrend = 'subiu' | 'manteve' | 'reduziu' | 'sem_base';

export interface LoadProgression {
  exerciseId: string;
  current?: LoadEntry;
  previous?: LoadEntry;
  trend: LoadTrend;
  /** current - previous, em kg. Ausente quando não há dois pontos. */
  deltaKg?: number;
}

export interface ExerciseRef {
  id: string;
  name: string;
  order: number;
}

/**
 * Resposta a "O que estou fazendo agora?". Toda combinação de `phase` tem os
 * campos que a tela precisa — a UI nunca recalcula posição de exercício.
 *
 *  - `sem_ficha`: não há sheet/exercícios (estado vazio honesto).
 *  - `executando`: há uma série a fazer agora.
 *  - `descansando`: a série anterior acabou e o descanso ainda não passou.
 *  - `concluido`: todas as séries planejadas de todos os exercícios foram feitas.
 *  - `encerrado`: a sessão foi abandonada/finalizada manualmente.
 */
export type WorkoutPhase = 'sem_ficha' | 'executando' | 'descansando' | 'concluido' | 'encerrado';

export interface WorkoutView {
  phase: WorkoutPhase;
  sheetLabel?: string;
  /** Posição do exercício atual, 1-based, e o total — "exercício 3 de 6". */
  position?: { index: number; total: number };
  currentExercise?: SheetExercise;
  currentSet?: number; // 1-based
  plannedSets?: number;
  repsTarget?: RepsSpec;
  currentLoadKg?: number;
  previousLoadKg?: number;
  progression?: LoadProgression;
  restSeconds?: number;
  restRemainingSeconds?: number;
  previousExercise?: ExerciseRef;
  nextExercise?: ExerciseRef;
  completedSetsTotal: number;
  plannedSetsTotal: number;
}

/** Métrica corporal REGISTRADA pelo usuário (ou importada) — nunca inferida. Todos os campos são independentes e opcionais. */
export interface BodyMetricEntry {
  /** YYYY-MM-DD */
  date: string;
  sleepHours?: number;
  steps?: number;
  calories?: number;
  weightKg?: number;
  workoutMinutes?: number;
  workoutLabel?: string;
  source: 'manual' | 'imported';
  recordedAt: string;
}

export type BodyMetricKey = 'sleepHours' | 'steps' | 'calories' | 'weightKg' | 'workoutMinutes';

export interface MetricWindowSummary {
  key: BodyMetricKey;
  windowDays: number;
  /** Dias da janela que TÊM registro dessa métrica. */
  daysWithData: number;
  /** Média só sobre dias com dado; undefined se nenhum. Dia sem registro NÃO conta como zero. */
  average?: number;
  latest?: { date: string; value: number };
  /** Dias da janela sem registro — a tela decide como sinalizar; o número nunca é preenchido com 0. */
  missingDates: string[];
}
