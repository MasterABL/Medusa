/**
 * CORPO FOUNDATION — Evolução e Força (Modelo C) + Sessão Cinética (Modelo A)
 * Sistema completo de Saúde, Treino, Prontidão, Rotina e Composição Corporal
 */

export interface ExerciseItem {
  id: string;
  name: string;
  muscleGroup: string;
  currentSet: number;
  totalSets: number;
  reps: number;
  weightKg: number;
  previousWeightKg: number;
  progressionNote: string;
  restSeconds: number;
  status: 'concluido' | 'ativo' | 'aguardando';
  history: Array<{ date: string; weight: number; reps: number }>;
}

export interface FundamentalMovement {
  id: string;
  name: string;
  pattern: string; // Agachamento, Tração, Empurrar, Dobradiça
  currentMax: number;
  startMax: number;
  unit: string;
  weeklyPoints: number[]; // pontos de carga ao longo das semanas
  historyLabel: string;
}

export interface WorkoutSplitRoutine {
  id: string;
  splitCode: 'A' | 'B' | 'C';
  title: string;
  focusMuscles: string;
  daysOfWeek: string;
  estimatedMinutes: number;
  totalExercises: number;
  lastDoneDate: string;
  exercises: ExerciseItem[];
}

export interface MuscleRecoveryStatus {
  muscle: string;
  recoveryPercent: number; // 0 - 100
  hoursRested: number;
  statusLabel: 'Recuperado' | 'Recuperando' | 'Fadiga Ativa';
}

export interface BodyCompositionData {
  currentWeightKg: number;
  startWeightKg: number;
  weeklyWeightPoints: number[];
  measurements: Array<{ part: string; cm: number; changeCm: string }>;
}

export interface PastWorkoutSession {
  id: string;
  date: string;
  split: string;
  title: string;
  durationMinutes: number;
  tonnageKg: number;
  setsCompleted: number;
  feeling: 'ótimo' | 'bom' | 'desafiador';
}

export const FUNDAMENTAL_MOVEMENTS: FundamentalMovement[] = [
  {
    id: 'agachamento',
    name: 'Agachamento Livre',
    pattern: 'Dominância de Joelho',
    currentMax: 110,
    startMax: 95,
    unit: 'kg',
    weeklyPoints: [95, 97.5, 100, 102.5, 105, 107.5, 110],
    historyLabel: '+15 kg em 7 semanas',
  },
  {
    id: 'terra',
    name: 'Levantamento Terra Romeno',
    pattern: 'Cadeia Posterior',
    currentMax: 125,
    startMax: 100,
    unit: 'kg',
    weeklyPoints: [100, 105, 110, 115, 118, 122, 125],
    historyLabel: '+25 kg em 7 semanas',
  },
  {
    id: 'supino',
    name: 'Supino Reto com Barra',
    pattern: 'Empurrar Horizontal',
    currentMax: 85,
    startMax: 75,
    unit: 'kg',
    weeklyPoints: [75, 77.5, 80, 80, 82.5, 82.5, 85],
    historyLabel: '+10 kg em 7 semanas',
  },
  {
    id: 'barra',
    name: 'Barra Fixa Lastrada',
    pattern: 'Tração Vertical',
    currentMax: 14,
    startMax: 6,
    unit: 'kg cinto',
    weeklyPoints: [6, 8, 10, 10, 12, 12, 14],
    historyLabel: '+8 kg de sobrecarga',
  },
];

export const WEEKLY_TONNAGE = [
  { week: 'Sem 1', tonnage: 13.8 },
  { week: 'Sem 2', tonnage: 14.6 },
  { week: 'Sem 3', tonnage: 15.4 },
  { week: 'Sem 4', tonnage: 16.1 },
  { week: 'Sem 5', tonnage: 15.8 }, // deload programado
  { week: 'Sem 6', tonnage: 16.9 },
  { week: 'Sem 7', tonnage: 17.5 },
];

export const MUSCLE_RECOVERIES: MuscleRecoveryStatus[] = [
  { muscle: 'Peitoral & Tríceps', recoveryPercent: 100, hoursRested: 72, statusLabel: 'Recuperado' },
  { muscle: 'Dorsal & Bíceps', recoveryPercent: 92, hoursRested: 48, statusLabel: 'Recuperado' },
  { muscle: 'Quadríceps', recoveryPercent: 70, hoursRested: 36, statusLabel: 'Recuperando' },
  { muscle: 'Posteriores & Lombar', recoveryPercent: 95, hoursRested: 72, statusLabel: 'Recuperado' },
  { muscle: 'Ombros & Trapézio', recoveryPercent: 88, hoursRested: 48, statusLabel: 'Recuperado' },
];

export const BODY_COMPOSITION: BodyCompositionData = {
  currentWeightKg: 78.4,
  startWeightKg: 76.0,
  weeklyWeightPoints: [76.0, 76.5, 77.0, 77.4, 77.9, 78.1, 78.4],
  measurements: [
    { part: 'Tórax / Peito', cm: 104, changeCm: '+3 cm' },
    { part: 'Braço Contraído', cm: 38.5, changeCm: '+1.5 cm' },
    { part: 'Cintura Abdominal', cm: 81, changeCm: '-1 cm' },
    { part: 'Coxa Medial', cm: 60.5, changeCm: '+2 cm' },
  ],
};

export const PAST_SESSIONS: PastWorkoutSession[] = [
  {
    id: 'past-1',
    date: 'Ontem · 05 Out',
    split: 'Ficha A',
    title: 'Empurrar · Peitoral, Ombros & Tríceps',
    durationMinutes: 54,
    tonnageKg: 6240,
    setsCompleted: 14,
    feeling: 'ótimo',
  },
  {
    id: 'past-2',
    date: 'Sex · 03 Out',
    split: 'Ficha C',
    title: 'Pernas · Quadríceps & Panturrilha',
    durationMinutes: 62,
    tonnageKg: 7890,
    setsCompleted: 15,
    feeling: 'desafiador',
  },
  {
    id: 'past-3',
    date: 'Qua · 01 Out',
    split: 'Ficha B',
    title: 'Puxar · Dorsais & Bíceps',
    durationMinutes: 50,
    tonnageKg: 5890,
    setsCompleted: 14,
    feeling: 'bom',
  },
];

export const WORKOUT_ROUTINES: WorkoutSplitRoutine[] = [
  {
    id: 'routine-a',
    splitCode: 'A',
    title: 'Ficha A · Empurrar & Deltóides',
    focusMuscles: 'Peito, Ombro Anterior e Tríceps',
    daysOfWeek: 'Segunda-feira',
    estimatedMinutes: 55,
    totalExercises: 4,
    lastDoneDate: 'Ontem',
    exercises: [
      {
        id: 'ex-a1',
        name: 'Supino Reto com Barra',
        muscleGroup: 'Peitoral Maior',
        currentSet: 1,
        totalSets: 4,
        reps: 6,
        weightKg: 85,
        previousWeightKg: 82.5,
        progressionNote: '+2.5kg na 1ª série de trabalho',
        restSeconds: 120,
        status: 'ativo',
        history: [{ date: '29 Set', weight: 82.5, reps: 6 }],
      },
      {
        id: 'ex-a2',
        name: 'Desenvolvimento Militar com Halteres',
        muscleGroup: 'Deltoide Anterior/Médio',
        currentSet: 1,
        totalSets: 3,
        reps: 8,
        weightKg: 28,
        previousWeightKg: 26,
        progressionNote: 'Controle na descida',
        restSeconds: 90,
        status: 'aguardando',
        history: [{ date: '29 Set', weight: 26, reps: 8 }],
      },
      {
        id: 'ex-a3',
        name: 'Paralelas com Peso Corporal',
        muscleGroup: 'Peitoral Inferior & Tríceps',
        currentSet: 1,
        totalSets: 3,
        reps: 10,
        weightKg: 0,
        previousWeightKg: 0,
        progressionNote: 'Corpo inclinado à frente',
        restSeconds: 75,
        status: 'aguardando',
        history: [{ date: '29 Set', weight: 0, reps: 10 }],
      },
      {
        id: 'ex-a4',
        name: 'Tríceps Corda na Polia',
        muscleGroup: 'Tríceps Braquial',
        currentSet: 1,
        totalSets: 4,
        reps: 12,
        weightKg: 30,
        previousWeightKg: 30,
        progressionNote: 'Pico de contração 1s',
        restSeconds: 60,
        status: 'aguardando',
        history: [{ date: '29 Set', weight: 30, reps: 12 }],
      },
    ],
  },
  {
    id: 'routine-b',
    splitCode: 'B',
    title: 'Ficha B · Puxar & Posterior (Hoje)',
    focusMuscles: 'Costas, Bíceps e Trapézio',
    daysOfWeek: 'Terça-feira (Hoje)',
    estimatedMinutes: 52,
    totalExercises: 4,
    lastDoneDate: 'Há 5 dias',
    exercises: [
      {
        id: 'ex-1',
        name: 'Levantamento Terra Romeno',
        muscleGroup: 'Posterior & Glúteo',
        currentSet: 3,
        totalSets: 3,
        reps: 8,
        weightKg: 104,
        previousWeightKg: 100,
        progressionNote: '+4kg vs ciclo anterior',
        restSeconds: 120,
        status: 'concluido',
        history: [{ date: '19 Set', weight: 100, reps: 8 }, { date: '12 Set', weight: 96, reps: 8 }],
      },
      {
        id: 'ex-2',
        name: 'Barra Fixa com Sobrecarga',
        muscleGroup: 'Dorsal & Bíceps',
        currentSet: 2,
        totalSets: 4,
        reps: 6,
        weightKg: 14,
        previousWeightKg: 12,
        progressionNote: '+2kg no cinto de carga',
        restSeconds: 90,
        status: 'ativo',
        history: [{ date: '19 Set', weight: 12, reps: 6 }, { date: '12 Set', weight: 10, reps: 6 }],
      },
      {
        id: 'ex-3',
        name: 'Remada Unilateral com Halter',
        muscleGroup: 'Dorsal Médio',
        currentSet: 1,
        totalSets: 4,
        reps: 10,
        weightKg: 36,
        previousWeightKg: 34,
        progressionNote: 'Cadência 3-1-1 controlada',
        restSeconds: 75,
        status: 'aguardando',
        history: [{ date: '19 Set', weight: 34, reps: 10 }],
      },
      {
        id: 'ex-4',
        name: 'Face Pull & Manguito Rotador',
        muscleGroup: 'Deltoide Posterior',
        currentSet: 1,
        totalSets: 3,
        reps: 15,
        weightKg: 25,
        previousWeightKg: 25,
        progressionNote: 'Foco em estabilidade e controle escapular',
        restSeconds: 60,
        status: 'aguardando',
        history: [{ date: '19 Set', weight: 25, reps: 15 }],
      },
    ],
  },
  {
    id: 'routine-c',
    splitCode: 'C',
    title: 'Ficha C · Membros Inferiores',
    focusMuscles: 'Quadríceps, Panturrilhas e Core',
    daysOfWeek: 'Quinta-feira',
    estimatedMinutes: 60,
    totalExercises: 4,
    lastDoneDate: 'Há 4 dias',
    exercises: [
      {
        id: 'ex-c1',
        name: 'Agachamento Livre com Barra',
        muscleGroup: 'Quadríceps & Glúteo',
        currentSet: 1,
        totalSets: 4,
        reps: 6,
        weightKg: 110,
        previousWeightKg: 107.5,
        progressionNote: 'Meta: 4 séries limpas a 90°',
        restSeconds: 150,
        status: 'ativo',
        history: [{ date: '25 Set', weight: 107.5, reps: 6 }],
      },
      {
        id: 'ex-c2',
        name: 'Leg Press 45°',
        muscleGroup: 'Quadríceps',
        currentSet: 1,
        totalSets: 3,
        reps: 10,
        weightKg: 240,
        previousWeightKg: 230,
        progressionNote: 'Pés alinhados na base média',
        restSeconds: 90,
        status: 'aguardando',
        history: [{ date: '25 Set', weight: 230, reps: 10 }],
      },
      {
        id: 'ex-c3',
        name: 'Mesa Flexora',
        muscleGroup: 'Isquiotibiais',
        currentSet: 1,
        totalSets: 4,
        reps: 12,
        weightKg: 45,
        previousWeightKg: 45,
        progressionNote: 'Extensão controlada',
        restSeconds: 60,
        status: 'aguardando',
        history: [{ date: '25 Set', weight: 45, reps: 12 }],
      },
      {
        id: 'ex-c4',
        name: 'Elevação de Panturrilha em Pé',
        muscleGroup: 'Gastrocnêmio',
        currentSet: 1,
        totalSets: 4,
        reps: 15,
        weightKg: 70,
        previousWeightKg: 65,
        progressionNote: 'Alongamento profundo embaixo',
        restSeconds: 60,
        status: 'aguardando',
        history: [{ date: '25 Set', weight: 65, reps: 15 }],
      },
    ],
  },
];

export const CORPO_DATA = {
  readiness: {
    score: 89,
    hrvMs: 68,
    restingBpm: 56,
    autonomicTone: 'Parassimpático Dominante',
    recoveryStatus: 'Recuperado · Janela de estímulo aberta',
    nextOptimumWindow: 'Hoje às 18:30',
  },

  sleep: {
    duration: '7h 42m',
    efficiency: 92,
    deepHours: 1.8,
    remHours: 1.9,
    debtMinutes: 0,
    qualityLabel: 'Sono restaurador e profundo',
  },

  nextSession: {
    title: 'Sessão B · Tração & Posterior',
    split: 'Ficha B',
    timeEst: '52 min',
    targetTss: 70,
    exercisesCount: 4,
    status: 'pronto_para_iniciar',
  },

  dailyMovement: {
    totalSteps: 8420,
    targetSteps: 10000,
  },

  activeWorkout: {
    title: 'Força Hipertrófica & Padrões Fundamentais',
    split: 'Sessão B · Tração & Cadeia Posterior',
    durationMinutes: 52,
    targetTss: 70,
    completedSets: 2,
    totalSets: 14,
    exercises: WORKOUT_ROUTINES[1].exercises,
  },
};
