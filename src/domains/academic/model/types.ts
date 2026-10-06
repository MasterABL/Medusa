/**
 * MEDUSA — Acadêmico (Faculdade, Cursos, ENEM, Inglês) — Contratos
 *
 * Só ARQUITETURA: nenhum dado real aqui, nenhuma tela. Serve para a Educação
 * (UI do Anti, intocada) conversar com Tasks, Projects, Prazos, Planner e Hoje
 * sem cada aba inventar o próprio formato.
 *
 *   Faculdade → Disciplina → Atividade / Avaliação
 *   Faculdade → Projeto Integrado/Multidisciplinar → (Project + Tasks)
 *   Curso → Módulo → Aula
 *   ENEM → Área → Matéria → Conteúdo → Lacuna → Sessão / Revisão / Simulado
 *   Inglês → Habilidade → Aula / Prática → Rotina → Progresso
 *
 * Vocabulário alinhado ao que a Educação já usa em `components/education/types.ts`
 * (StudyTrack 'faculdade' | 'ingles' | 'vestibular', disciplina, módulo, aula),
 * sem importar tipos de UI para dentro do domínio.
 */

export type StudyTrackId = 'faculdade' | 'ingles' | 'vestibular' | 'curso';

// ---------- Faculdade ----------
export interface AcademicProgram {
  id: string;
  name: string;
  institution?: string;
  kind: 'graduacao' | 'tecnico' | 'pos_graduacao' | 'outro';
  modality?: 'ead' | 'presencial' | 'hibrido';
  status: 'ativo' | 'trancado' | 'concluido';
}

export interface Discipline {
  id: string;
  programId: string;
  name: string;
  code?: string;
  term?: string;
  credits?: number;
  status: 'cursando' | 'planejada' | 'concluida' | 'trancada';
}

export type AcademicActivityKind = 'atividade' | 'trabalho' | 'forum' | 'questionario' | 'leitura' | 'aula_gravada';

export interface AcademicActivity {
  id: string;
  disciplineId: string;
  kind: AcademicActivityKind;
  title: string;
  /** ISO. Ausente = sem prazo informado (não inventado). */
  dueAt?: string;
  estimatedMinutes?: number;
  /** Peso na nota, quando conhecido (0-1). */
  weight?: number;
  status: 'pendente' | 'em_andamento' | 'entregue' | 'dispensada';
}

export interface Assessment {
  id: string;
  disciplineId?: string;
  kind: 'prova' | 'av1' | 'av2' | 'exame' | 'simulado' | 'apresentacao';
  title: string;
  /** Data-hora ISO local. */
  at: string;
  durationMinutes?: number;
  online?: boolean;
  location?: string;
  grade?: { value: number; max: number };
}

/** Projeto da faculdade (Integrado, Multidisciplinar...). O trabalho em si vive no domínio Projects. */
export interface AcademicProject {
  id: string;
  programId: string;
  disciplineIds: string[];
  title: string;
  kind: 'integrado' | 'multidisciplinar' | 'extensao' | 'tcc' | 'outro';
  /** Project do domínio Projects que carrega marcos, prazos e tarefas. */
  projectId: string;
}

// ---------- Cursos ----------
export interface Lesson {
  id: string;
  title: string;
  order: number;
  durationMinutes?: number;
  status: 'pendente' | 'concluida';
}

export interface CourseModule {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  provider?: string;
  modules: CourseModule[];
  /** Prazo de conclusão/acesso, quando existe. */
  dueAt?: string;
}

// ---------- ENEM ----------
export type EnemArea = 'linguagens' | 'humanas' | 'natureza' | 'matematica' | 'redacao';

export interface EnemSubject {
  id: string;
  area: EnemArea;
  name: string;
}

export interface EnemContent {
  id: string;
  subjectId: string;
  title: string;
  /** Incidência histórica na prova, quando conhecida. */
  incidence?: 'alta' | 'media' | 'baixa';
  /** Esforço típico de uma sessão sobre o conteúdo. */
  sessionMinutes?: number;
}

/** Lacuna = domínio MEDIDO (nunca presumido) de um conteúdo. */
export interface EnemGap {
  contentId: string;
  /** 0 = não domina, 1 = domina. */
  mastery: number;
  source: 'diagnostico' | 'simulado' | 'exercicios' | 'autoavaliacao';
  measuredAt: string;
}

export interface StudySession {
  id: string;
  track: StudyTrackId;
  ref: { contentId?: string; disciplineId?: string; lessonId?: string; skill?: EnglishSkill };
  plannedMinutes: number;
  actualMinutes?: number;
  /** ISO de quando aconteceu/vai acontecer. */
  at: string;
  status: 'planejada' | 'feita' | 'pulada';
}

export interface ReviewItem {
  contentId: string;
  /** YYYY-MM-DD */
  dueDate: string;
  intervalDays: number;
}

export interface MockExam {
  id: string;
  at: string;
  areas: EnemArea[];
  /** Acertos por área, quando corrigido. */
  score?: Partial<Record<EnemArea, { correct: number; total: number }>>;
}

// ---------- Inglês ----------
export type EnglishSkill = 'speaking' | 'listening' | 'writing' | 'reading' | 'vocabulary' | 'grammar';

export interface EnglishPracticeSession {
  id: string;
  skill: EnglishSkill;
  minutes: number;
  at: string;
  kind: 'aula' | 'pratica' | 'revisao' | 'conversa';
}

/** Rotina desejada: minutos por semana em cada habilidade. */
export interface EnglishRoutine {
  targets: Array<{ skill: EnglishSkill; minutesPerWeek: number }>;
}

export interface EnglishSkillProgress {
  skill: EnglishSkill;
  targetMinutes: number;
  doneMinutes: number;
  /** 0-1+ */
  ratio: number;
  status: 'em_dia' | 'atrasado' | 'sem_meta';
}

// ---------- Prazo acadêmico unificado (derivado) ----------
export interface AcademicDeadline {
  id: string;
  label: string;
  dueAt: string;
  hard: boolean;
  track: StudyTrackId;
  source: { kind: 'atividade' | 'avaliacao' | 'projeto' | 'curso' | 'enem'; id: string };
  disciplineId?: string;
}
