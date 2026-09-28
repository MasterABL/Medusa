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
import { computePurposeContinuity } from './services/purposeEngine';
import type { PurposeContinuity } from './services/purposeEngine';
import { buildSuggestions } from './services/suggestionEngine';
import { practiceContinuity } from './services/practiceEngine';
import type { PracticeContinuity } from './services/practiceEngine';
import { computeReadingState } from './services/readingPlanEngine';
import type { ReadingState } from './model/reading';
import { toStudySummary } from './services/studyEngine';
import { resolveSpiritualToday } from './adapters/hojeIntelligence';
import type { SpiritualTodayView } from './adapters/hojeIntelligence';
import { todayOf } from './services/dates';

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

/** Estado de cada plano de leitura (posição, o que vem depois, o que ficou, continuidade). */
export function getReadingStates(repository: SpiritualRepository, now: Date): ReadingState[] {
  return repository.listReadingPlans().flatMap((plan) => {
    const progress = repository.getReadingProgress(plan.id);
    return progress ? [computeReadingState(plan, progress, todayOf(now))] : [];
  });
}

export function getPracticeContinuities(repository: SpiritualRepository, now: Date): PracticeContinuity[] {
  const practices = repository.listPractices();
  return repository.listPracticeDefinitions().map((d) => practiceContinuity(d, practices, now));
}

export function getPurposeContinuities(repository: SpiritualRepository, now: Date): PurposeContinuity[] {
  const inputs = {
    definitions: repository.listPracticeDefinitions(),
    practices: repository.listPractices(),
    studies: repository.listStudies(),
    plans: repository.listReadingPlans(),
    progresses: repository.listReadingPlans().flatMap((p) => repository.getReadingProgress(p.id) ?? []),
    goals: repository.listGoals(),
  };
  return repository.listPurposes().map((p) => computePurposeContinuity(p, inputs, now));
}

/** Estudos SEM conteúdo do usuário. */
export function getStudySummaries(repository: SpiritualRepository) {
  return repository.listStudies().map(toStudySummary);
}

/** Espiritual → Hoje: até 3 itens compactos, só metadado. */
export function getTodayView(repository: SpiritualRepository, now: Date): SpiritualTodayView {
  const date = todayOf(now);
  const suggestions = buildSuggestions({
    now,
    purposes: repository.listPurposes(),
    definitions: repository.listPracticeDefinitions(),
    practices: repository.listPractices(),
    plans: repository.listReadingPlans(),
    progresses: repository.listReadingPlans().flatMap((p) => repository.getReadingProgress(p.id) ?? []),
    studies: repository.listStudies(),
  });
  return resolveSpiritualToday({ date, suggestions, dailyVerse: repository.getDailyVerse(date) });
}
