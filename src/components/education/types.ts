/**
 * MEDUSA — EDUCAÇÃO / STUDY MODE TYPES
 * Tipos e interfaces canônicas para a máquina de estados, trilhas, exercícios, notas e tutor.
 */

export type StudySessionState =
  | 'dashboard'
  | 'loading'
  | 'ready'
  | 'error'
  | 'study'
  | 'transitioning_to_voice_exercise'
  | 'voice_exercise'
  | 'transitioning_to_immersion'
  | 'live_immersion'
  | 'transitioning_to_exercises'
  | 'exercises'
  | 'transitioning_to_flashcards'
  | 'flashcards'
  | 'completion';

export type StudyTrack = 'faculdade' | 'ingles' | 'vestibular';

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
  confusionDiagnosis: string; // Explicação pedagógica do distrator ou confusão comum
}

export interface StudyNote {
  id: string;
  timestamp: number; // Segundos no vídeo / aula
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
  track: StudyTrack;
  trackLabel: string;
  discipline: string;
  topic: string;
  sessionObjective: string;
  estimatedDuration: string;
  actualDurationSeconds: number;
  module: string;
  nextTopic: string;
  nextTopicDescription: string;
}

export interface VocabularyItem {
  id: string;
  term: string;
  translation: string;
  example: string;
}

export interface VoicePrompt {
  id: string;
  instruction: string;
  targetPhrase: string;
  simulatedTranscript: string;
  feedback: string;
}

export interface ImmersionTurn {
  id: string;
  speakerLine: string;
  userPromptHint: string;
  simulatedTranscript: string;
  feedback: string;
}

export interface ImmersionScenario {
  title: string;
  setting: string;
  turns: ImmersionTurn[];
}

export interface TrackModuleItem {
  id: string;
  code: string;
  title: string;
  status: 'completed' | 'in_progress' | 'locked';
  score: string;
  date: string;
  duration: string;
}

export interface TrackDefinition {
  id: StudyTrack;
  name: string;
  tagline: string;
  domainLabel: string;
  accentColor: string;
  lesson: LessonMetadata;
  summaryPoints: LiveSummaryPoint[];
  exerciseQuestions: ExerciseQuestion[];
  modules: TrackModuleItem[];
  tutorGreeting: string;
  voiceEmphasis?: boolean;
  /** Sugestão estática de próxima revisão exibida no Hub, antes de iniciar a sessão (Fixture por trilha). */
  nextReviewSuggestion: string;
  /** Somente Inglês: vocabulário-alvo da sessão, exibido no painel companheiro e nos flashcards. */
  vocabulary?: VocabularyItem[];
  /** Somente Inglês: prática oral guiada (etapa "Exercício de voz" do fluxo). */
  voicePrompts?: VoicePrompt[];
  /** Somente Inglês: cenário de conversação guiada (etapa "Live Immersion" do fluxo). */
  immersionScenario?: ImmersionScenario;
}

export interface SessionResult {
  track: StudyTrack;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  durationFormatted: string;
  pointToReinforce: string;
  nextReviewDate: string;
  completedAt: string;
}
