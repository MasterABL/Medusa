/**
 * MEDUSA — Body Domain — Model
 *
 * Corpo NÃO é fitness tracker nem sistema médico (seção 9). Nenhum
 * diagnóstico clínico, nenhuma inferência de doença, nenhuma recomendação
 * médica. O domínio trata rotina, movimento, energia/sono/recuperação
 * RELATADOS pelo usuário, e planejamento seguro de atividade.
 */

export type BodyQuestionSection =
  | 'objetivos'
  | 'rotina'
  | 'disponibilidade'
  | 'experiencia'
  | 'habitos'
  | 'sono_energia'
  | 'limitacoes';

export type BodyQuestionType = 'single' | 'multi' | 'scale' | 'free_text' | 'duration';

export interface BodyDiagnosticQuestion {
  id: string;
  section: BodyQuestionSection;
  type: BodyQuestionType;
  prompt: string;
  options?: string[];
  allowMultiple: boolean;
  allowCustom: boolean;
  /** Regras simples de validação — ver validators/index.ts pra aplicação real. */
  validation?: { required?: boolean; minSelected?: number; maxSelected?: number; scaleMin?: number; scaleMax?: number };
  metadata?: Record<string, unknown>;
}

export type BodyAnswerSource = 'self_reported' | 'derived';

export interface BodyAnswer {
  id: string;
  questionId: string;
  type: BodyQuestionType;
  /** single/free_text -> string; multi -> string[]; scale -> number; duration -> minutos (number). */
  value: string | string[] | number;
  answeredAt: string;
  source: BodyAnswerSource;
  confidence?: number;
  notes?: string;
}

export type DiagnosticSessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface DiagnosticSession {
  id: string;
  startedAt: string;
  completedAt?: string;
  answers: BodyAnswer[];
  status: DiagnosticSessionStatus;
}

export type ExperienceLevel = 'iniciante' | 'intermediario' | 'avancado';

/** Cada campo pode ser `selfReported` (o que o usuário disse) ou `derived` (o que o sistema calculou) — nunca misturado sem dizer a origem. */
export interface ProfileField<T> {
  value: T;
  origin: BodyAnswerSource;
}

export interface BodyProfile {
  id: string;
  objectives: ProfileField<string[]>;
  routineSummary: ProfileField<string>;
  availabilityWindows: ProfileField<string[]>; // referências a janelas — resolvidas pela Agenda, não recalculadas aqui
  location?: ProfileField<string>;
  gymContext?: ProfileField<string>;
  commuteMinutes?: ProfileField<number>;
  weeklyFrequency: ProfileField<number>;
  experienceLevel: ProfileField<ExperienceLevel>;
  habits: ProfileField<string[]>;
  sleepQuality?: ProfileField<'ruim' | 'regular' | 'boa'>;
  energyLevel?: ProfileField<'baixa' | 'moderada' | 'alta'>;
  recoveryQuality?: ProfileField<'ruim' | 'regular' | 'boa'>;
  limitations: ProfileField<string[]>;
  preferences: ProfileField<string[]>;
  createdAt: string;
  updatedAt: string;
}

export type BodyPlanStage = 'diagnostico' | 'entendimento' | 'plano' | 'ativacao';
export type BodyPlanStatus = 'draft' | 'active' | 'paused' | 'completed';

/** Descritor de planejamento SEGURO — nunca um pseudodiagnóstico médico (seção 12). */
export type IntensityDescriptor = 'leve' | 'moderada' | 'desafiadora';

export interface BodySession {
  id: string;
  activityId: string;
  preferredDays: number[]; // 0-6
  preferredWindowLabel?: string; // ex.: "após o trabalho"
  durationMinutes: number;
  intensity: IntensityDescriptor;
  scheduledAgendaItemId?: string;
}

export interface BodyPlan {
  id: string;
  stage: BodyPlanStage;
  status: BodyPlanStatus;
  sessions: BodySession[];
  frequencyPerWeek: number;
  progressionNotes?: string;
  recoveryNotes?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ActivityCategory = 'caminhada' | 'mobilidade' | 'treino_geral' | 'atividade_recreativa' | 'sessao_planejada';

export interface BodyActivity {
  id: string;
  category: ActivityCategory;
  label: string;
  defaultDurationMinutes: number;
  difficultyDescriptor: IntensityDescriptor;
  equipment: string[];
  environment: 'casa' | 'academia' | 'ar_livre' | 'qualquer';
  recoveryExpectation: string; // texto curto, nunca prescrição médica
  progressionFromActivityId?: string; // referência a uma atividade mais leve da mesma progressão
}

export type RoutineLoadLevel = 'baixa' | 'moderada' | 'alta';

export interface RoutineLoadResult {
  level: RoutineLoadLevel;
  score: number; // 0-1, determinístico — ver services/routineLoadHeuristic.ts
  evidence: string[];
}
