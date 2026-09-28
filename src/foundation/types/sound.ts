/**
 * MEDUSA FOUNDATION — Sound Map multidomínio (seção 29)
 *
 * Expande o padrão já existente em src/lib/audioFeedback.ts (3 categorias
 * sintetizadas via Web Audio API) para um mapa por domínio, sem duplicar o
 * motor de áudio em si — este arquivo é só o CONTRATO de quais chaves cada
 * domínio pode registrar, não uma nova implementação de síntese sonora.
 *
 * Regra dura (seção 29): som presente, mas só em ações semanticamente
 * importantes. Nunca em hover, filtro banal ou navegação trivial — por isso
 * `SoundEventKey` é uma união fechada por domínio, não uma string livre.
 */

import type { DomainId } from './domain';

export type SystemSoundKey = 'action' | 'success' | 'warning' | 'error' | 'attention';
export type AgendaSoundKey = 'create' | 'edit' | 'move' | 'conflict' | 'delete';
export type EducationSoundKey =
  | 'lesson-start'
  | 'lesson-complete'
  | 'exercise-correct'
  | 'exercise-incorrect'
  | 'material-ready'
  | 'tutor';
export type FinanceSoundKey =
  | 'transaction'
  | 'payment'
  | 'goal-progress'
  | 'budget-warning'
  | 'projection';
export type BodySoundKey = 'workout-start' | 'workout-complete' | 'habit' | 'recovery' | 'plan-ready';
export type GuardianSoundKey = 'approval-request' | 'permission-change' | 'trust-change' | 'security-alert';

export interface DomainSoundProfile {
  id: string;
  domain: DomainId;
  /** Chaves válidas para este domínio (ex.: EducationSoundKey[] convertido pra string[]). */
  keys: string[];
}
