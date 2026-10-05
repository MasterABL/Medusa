export interface ExerciseItem {
  id: string;
  name: string;
  muscleGroup: string;
  currentSet: number;
  totalSets: number;
  reps: number;
  weightKg: number;
  progressionNote: string;
  restSeconds: number;
  status: 'concluido' | 'ativo' | 'aguardando';
  history: Array<{ date: string; weight: number; reps: number }>;
}

export interface WorkoutSession {
  title: string;
  split: string;
  durationMinutes: number;
  targetTss: number;
  completedSets: number;
  totalSets: number;
  exercises: ExerciseItem[];
}

export interface SleepPhase {
  name: 'REM' | 'Profundo' | 'Leve' | 'Acordado';
  hours: number;
  percentage: number;
  color: string;
}

export interface HourlyMovement {
  hour: string;
  steps: number;
  activeMinutes: number;
}

export const CORPO_DATA = {
  readiness: {
    score: 89,
    hrvMs: 68,
    restingBpm: 56,
    autonomicTone: 'Parassimpático Dominante',
    recoveryStatus: 'Janela de Estímulo Aberta',
    nextOptimumWindow: 'Em 2h 30m',
  },

  activeWorkout: {
    title: 'Força Hipertrófica & Padrões Fundamentais',
    split: 'Sessão B · Tração & Cadeia Posterior',
    durationMinutes: 52,
    targetTss: 70,
    completedSets: 8,
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
        weightKg: 28,
        progressionNote: 'Isometria no pico de contração',
        restSeconds: 60,
        status: 'aguardando',
        history: [{ date: '19 Set', weight: 26, reps: 15 }],
      },
    ] as ExerciseItem[],
  },

  sleep: {
    duration: '7h 44m',
    efficiency: 94,
    bedTime: '22:42',
    wakeTime: '06:26',
    debtHours: 0,
    consistencyScore: 92,
    phases: [
      { name: 'Profundo', hours: 1.8, percentage: 23, color: '#18534B' },
      { name: 'REM', hours: 1.9, percentage: 25, color: '#71DBD2' },
      { name: 'Leve', hours: 3.6, percentage: 46, color: '#ADE4B5' },
      { name: 'Acordado', hours: 0.5, percentage: 6, color: '#DDD8C9' },
    ] as SleepPhase[],
    timeline: [
      { time: '23:00', phase: 'Leve' },
      { time: '00:00', phase: 'Profundo' },
      { time: '01:30', phase: 'REM' },
      { time: '02:45', phase: 'Profundo' },
      { time: '04:00', phase: 'REM' },
      { time: '05:30', phase: 'Leve' },
      { time: '06:26', phase: 'Acordado' },
    ],
  },

  dailyMovement: {
    totalSteps: 11420,
    targetSteps: 10000,
    activeMinutes: 68,
    distanceKm: 8.6,
    hourlyDistribution: [
      { hour: '07h', steps: 2100, activeMinutes: 20 },
      { hour: '09h', steps: 850, activeMinutes: 8 },
      { hour: '11h', steps: 1200, activeMinutes: 12 },
      { hour: '13h', steps: 1950, activeMinutes: 18 },
      { hour: '15h', steps: 720, activeMinutes: 6 },
      { hour: '17h', steps: 3200, activeMinutes: 30 },
      { hour: '19h', steps: 1400, activeMinutes: 14 },
    ] as HourlyMovement[],
  },

  strainRecoveryCycle: {
    weeklyTssAccumulated: 420,
    targetTssRange: '400 - 450 TSS',
    strainIndex: 14.8,
    adaptationWindow: 'Sobrecarga Ótima (Sem Overtraining)',
    recoveryDaysPlanned: 2,
  },

  weeklyEvolution: [
    { day: 'Seg', tss: 65, strain: 12.1, recovery: 92, label: 'Força A' },
    { day: 'Ter', tss: 80, strain: 15.4, recovery: 84, label: 'Zona 2' },
    { day: 'Qua', tss: 45, strain: 8.2, recovery: 96, label: 'Mobilidade' },
    { day: 'Qui', tss: 85, strain: 16.2, recovery: 78, label: 'Força B' },
    { day: 'Sex', tss: 70, strain: 13.5, recovery: 89, label: 'Hoje' },
    { day: 'Sáb', tss: 50, strain: 9.8, recovery: 91, label: 'Trilha' },
    { day: 'Dom', tss: 25, strain: 4.5, recovery: 98, label: 'Descanso' },
  ],
};

export const BODY_DATA = CORPO_DATA;
export const INITIAL_BODY_DATA = CORPO_DATA;
