/**
 * MEDUSA — EDUCAÇÃO / STUDY MODE TYPES
 * Tipos e interfaces canônicas para a máquina de estados, exercícios, notas e tutor.
 */

export type StudySessionState =
  | 'dashboard'
  | 'loading'
  | 'ready'
  | 'error'
  | 'study'
  | 'transitioning_to_exercises'
  | 'exercises'
  | 'completion';

export interface ExerciseOption {
  id: string;
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface ExerciseQuestion {
  id: number;
  topic: string;
  question: string;
  options: ExerciseOption[];
  correctOptionId: string;
  explanation: string;
  confusionDiagnosis: string; // Explicação pedagógica do que costuma ser confundido
}

export interface StudyNote {
  id: string;
  timestamp: number; // Segundos no vídeo
  formattedTime: string; // "12:40"
  text: string;
  createdAt: string;
}

export interface LiveSummaryPoint {
  id: string;
  timestamp: number;
  formattedTime: string;
  title: string;
  text: string;
  icon: string;
}

export interface TutorMessage {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  timestamp: string;
  isVoice?: boolean;
  contextQuestionId?: number;
}

export interface LessonMetadata {
  discipline: string;
  topic: string;
  estimatedDuration: string;
  actualDurationSeconds: number;
  module: string;
  nextTopic: string;
}

export interface SessionResult {
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  durationFormatted: string;
  pointToReinforce: string;
  nextReviewDate: string;
  completedAt: string;
}
