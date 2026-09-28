/**
 * MEDUSA — Spiritual Domain — Model (seção 25-27)
 *
 * NÃO assume uma religião específica, NÃO assume crença, NÃO define conteúdo
 * teológico — só infraestrutura de domínio. `label`/`focusAreas`/`content`
 * são sempre texto livre definido pelo usuário, nunca um enum prescritivo.
 *
 * Dado sensível/subjetivo (seção 26): reflexões guardam CONTEÚDO privado.
 * Todo consumo que não precise do texto em si deve usar
 * `SpiritualReflectionMetadata` (ver repository/types.ts), nunca o objeto
 * completo — minimização por desenho, não por convenção informal.
 */

export type SpiritualPracticeType = 'oracao' | 'leitura' | 'meditacao' | 'gratidao' | 'jejum' | 'outro';

export interface SpiritualProfile {
  id: string;
  /** Áreas de foco definidas pelo próprio usuário — texto livre, nunca prescrito pelo sistema. */
  focusAreas: string[];
  preferredPracticeTypes: SpiritualPracticeType[];
  createdAt: string;
  updatedAt: string;
}

export interface SpiritualPractice {
  id: string;
  type: SpiritualPracticeType;
  label: string;
  completedAt: string;
  durationMinutes?: number;
  relatedGoalId?: string;
}

/** Hoje só existe 'private' — nenhum mecanismo de compartilhamento foi implementado (seção 26). */
export type ReflectionVisibility = 'private';

export interface SpiritualReflection {
  id: string;
  content: string;
  createdAt: string;
  visibility: ReflectionVisibility;
  relatedPracticeId?: string;
}

export interface SpiritualGoalMilestone {
  id: string;
  label: string;
  achieved: boolean;
  achievedAt?: string;
}

export interface SpiritualGoal {
  id: string;
  label: string;
  targetPracticeCount?: number;
  /** Sempre derivado de `SpiritualPractice.relatedGoalId` — nunca setado manualmente de forma incoerente com o histórico. */
  currentPracticeCount: number;
  milestones: SpiritualGoalMilestone[];
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpiritualRoutine {
  id: string;
  practiceType: SpiritualPracticeType;
  preferredDays: number[]; // 0-6
  preferredWindowLabel?: string;
  active: boolean;
}
