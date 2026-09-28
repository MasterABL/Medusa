/**
 * MEDUSA — Spiritual Domain — Repository boundary (seção 33)
 *
 * `listReflectionMetadata()` existe separado de `listReflections()` de
 * propósito (seção 26): qualquer consumidor que só precise saber QUE uma
 * reflexão existe (contagem, data, prática relacionada) — nunca o
 * conteúdo — deve usar o primeiro. Minimização por desenho, não por
 * convenção informal que alguém pode esquecer de seguir.
 */

import type {
  SpiritualGoal,
  SpiritualPractice,
  SpiritualProfile,
  SpiritualReflection,
  SpiritualRoutine,
} from '../model/types';
import type { SpiritualReflectionMetadata } from '../services/reflectionPrivacy';

export interface SpiritualRepository {
  getProfile(id: string): SpiritualProfile | undefined;
  saveProfile(profile: SpiritualProfile): void;

  getPractice(id: string): SpiritualPractice | undefined;
  listPractices(filter?: { relatedGoalId?: string }): SpiritualPractice[];
  savePractice(practice: SpiritualPractice): void;

  getReflection(id: string): SpiritualReflection | undefined;
  listReflections(): SpiritualReflection[];
  listReflectionMetadata(): SpiritualReflectionMetadata[];
  saveReflection(reflection: SpiritualReflection): void;

  getGoal(id: string): SpiritualGoal | undefined;
  listGoals(): SpiritualGoal[];
  saveGoal(goal: SpiritualGoal): void;

  getRoutine(id: string): SpiritualRoutine | undefined;
  listRoutines(filter?: { active?: boolean }): SpiritualRoutine[];
  saveRoutine(routine: SpiritualRoutine): void;
}
