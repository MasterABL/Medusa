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

/**
 * Tipo pedagógico do exercício de voz — usado só como rótulo visual (ver Refinamento Visual
 * §7.4), não muda a máquina de estados do exercício (Idle→Listening→Processing→Resposta é a
 * mesma para todos os tipos).
 */
export type VoicePromptType = 'repeticao' | 'resposta_curta' | 'pergunta_resposta' | 'role_play' | 'pronuncia' | 'resposta_contextual';

export interface VoicePrompt {
  id: string;
  type: VoicePromptType;
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

export interface ModuleLessonItem {
  id: string;
  title: string;
  status: 'completed' | 'current' | 'locked';
  durationMinutes: number;
}

export interface TrackModuleItem {
  id: string;
  code: string;
  title: string;
  status: 'completed' | 'in_progress' | 'locked';
  score: string;
  date: string;
  duration: string;
  /** Somente Inglês: aulas dentro do módulo — a unidade principal do curso é o módulo, não a sessão do dia. */
  lessons?: ModuleLessonItem[];
}

export interface CompletedLessonRecord {
  id: string;
  title: string;
  moduleTitle: string;
  completedAt: string;
  durationMinutes: number;
}

/**
 * Bloco do Cronograma do ENEM — a unidade do mapa operacional de preparação, não um item de
 * to-do list. Cruza tempo (data/dia da semana/semana) com disciplina, conteúdo, tipo de
 * atividade, recurso e status de execução.
 */
export interface CronogramaBlock {
  id: string;
  date: string; // "22/Set"
  weekday: string; // "Ter"
  /** 0 = semana atual (usada pelo filtro "Semana"), 1 = próxima semana (some ao filtro "Mês"). */
  weekOffset: 0 | 1;
  isToday?: boolean;
  discipline: string; // "Física" | "Todas as áreas" (simulados que cruzam disciplinas)
  topic: string;
  subtopic?: string;
  activityType: 'aula' | 'video' | 'exercicio' | 'simulado' | 'revisao' | 'redacao';
  status: 'planejado' | 'concluido' | 'atrasado';
  durationMinutes: number;
  hasVideoResource?: boolean;
  nextAction: string;
}

export interface DisciplineMaterial {
  id: string;
  name: string;
  kind: 'pdf' | 'slides' | 'planilha' | 'imagem';
  sizeLabel: string;
}

export interface DisciplineDeadline {
  id: string;
  label: string;
  date: string;
}

/** Semântica visual de um aviso — ver DESIGN.md §2 (gramática de cor). Nunca todo aviso vira "urgente". */
export type NoticeSeverity = 'informativo' | 'atencao' | 'urgente';

export interface DisciplineNotice {
  text: string;
  severity: NoticeSeverity;
}

export interface DisciplineChip {
  code: string;
  title: string;
  dateRange: string;
  credits: number;
  /** Seleção inicial (fixture) ao entrar no Hub — a seleção real em uso vira estado de UI. */
  isActive: boolean;
  /** Sessão em foco específica desta disciplina, exibida quando ela está selecionada. */
  focusTopic: string;
  focusObjective: string;
  focusDuration: string;
  /** Aulas/conteúdos desta disciplina — reaproveita o mesmo shape de módulo curado. */
  content: TrackModuleItem[];
  notices: string[];
  /**
   * Mesmos avisos de `notices`, com severidade semântica classificada (ver DESIGN.md §2) para o
   * Context Panel. Opcional — quando ausente, o painel trata todo item de `notices` como
   * "informativo" (nunca assume urgência sem essa classificação explícita).
   */
  noticeDetails?: DisciplineNotice[];
  /** Materiais já disponibilizados da disciplina — fixture de leitura, sem upload/IA real. */
  materials: DisciplineMaterial[];
  deadlines: DisciplineDeadline[];
}

/**
 * Indicador de domínio/mastery por competência ou área — usado nos Context Panels (ver
 * DESIGN.md §Motion/Cardificação e Rodada 4 §12). FIXTURE ilustrativa: não existe, nesta fase,
 * um motor de avaliação real que produza esses percentuais — o valor é estático, do mesmo modo
 * que outras métricas já expostas na Educação (ex.: `nextReviewSuggestion`).
 */
export interface MasteryDomain {
  id: string;
  label: string;
  percent: number;
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
  /** Somente Faculdade: avisos simples e pontuais da turma/monitoria (Fixture, sem notificação real). */
  notices?: string[];
  /** Somente Inglês: histórico de aulas concluídas ("Minhas Aulas"), base da lógica de revisão futura. */
  completedLessonsHistory?: CompletedLessonRecord[];
  /** Somente ENEM: cronograma de preparação (planejamento temporal, não uma lista de tarefas genérica). */
  cronograma?: CronogramaBlock[];
  /** Somente Faculdade: disciplinas ativas do período letivo. */
  disciplines?: DisciplineChip[];
  /**
   * Domínio por competência/área — Inglês (Speaking/Writing/Listening/Reading) e ENEM (Ciências
   * da Natureza/Matemática/Linguagens/Ciências Humanas). A Faculdade não usa este campo: seu
   * domínio é calculado ao vivo a partir de `disciplines[].content` (dado real de progresso),
   * não uma métrica por habilidade separada.
   */
  masteryDomains?: MasteryDomain[];
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
