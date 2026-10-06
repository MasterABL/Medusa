/**
 * CORPO FOUNDATION — Evolução e Força (Modelo C) + Sessão Cinética (Modelo A)
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

export const CORPO_DATA = {
  readiness: {
    score: 89,
    hrvMs: 68,
    restingBpm: 56,
    autonomicTone: 'Parassimpático Dominante',
    recoveryStatus: 'Recuperado · Janela de estímulo aberta',
    nextOptimumWindow: 'Hoje às 18:00',
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
    timeEst: '55 min',
    targetTss: 72,
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
    ] as ExerciseItem[],
  },
};
