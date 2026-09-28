/**
 * MEDUSA — Spiritual Domain — Public API (seção 36)
 *
 * `getReflections()` deliberadamente NÃO existe aqui — só
 * `getReflectionsMetadata()`. Quem precisar do conteúdo de verdade (a
 * própria tela de reflexão do usuário) lê direto do repository, nunca por
 * este contrato genérico (seção 26: minimização por desenho).
 */

import type { SpiritualRepository } from './repository/types';
import type { SpiritualReflectionMetadata } from './services/reflectionPrivacy';
import { computeGoalProgress } from './services/goalEngine';
import type { SpiritualGoal, SpiritualPractice, SpiritualProfile } from './model/types';

export function getProfile(repository: SpiritualRepository, profileId: string): SpiritualProfile | undefined {
  return repository.getProfile(profileId);
}

export interface SpiritualGoalView {
  goal: SpiritualGoal;
  progress: number;
}

export function getGoals(repository: SpiritualRepository): SpiritualGoalView[] {
  return repository.listGoals().map((goal) => ({ goal, progress: computeGoalProgress(goal) }));
}

export function getPractices(repository: SpiritualRepository): SpiritualPractice[] {
  return repository.listPractices();
}

export function getReflectionsMetadata(repository: SpiritualRepository): SpiritualReflectionMetadata[] {
  return repository.listReflectionMetadata();
}
