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
import type { PracticeDefinition, PrayerIntention, DailyVerse, SpiritualPurpose } from '../model/purpose';
import type { ReadingPlan, ReadingProgress } from '../model/reading';
import type { Study } from '../model/study';

/** Registro de acesso a conteúdo sensível — o Guardian consulta isto; nunca guarda o conteúdo acessado. */
export interface SensitiveAccessEntry {
  at: string;
  accessor: string;
  scope: 'reflection' | 'prayer' | 'study_private' | 'ai_context';
  targetId?: string;
  purpose: string;
}

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

  getReadingPlan(id: string): ReadingPlan | undefined;
  listReadingPlans(): ReadingPlan[];
  saveReadingPlan(plan: ReadingPlan): void;
  getReadingProgress(planId: string): ReadingProgress | undefined;
  saveReadingProgress(progress: ReadingProgress): void;

  getStudy(id: string): Study | undefined;
  listStudies(filter?: { status?: Study['status'] }): Study[];
  saveStudy(study: Study): void;

  getPurpose(id: string): SpiritualPurpose | undefined;
  listPurposes(filter?: { status?: SpiritualPurpose['status'] }): SpiritualPurpose[];
  savePurpose(purpose: SpiritualPurpose): void;

  getPracticeDefinition(id: string): PracticeDefinition | undefined;
  listPracticeDefinitions(filter?: { status?: PracticeDefinition['status'] }): PracticeDefinition[];
  savePracticeDefinition(definition: PracticeDefinition): void;

  getPrayerIntention(id: string): PrayerIntention | undefined;
  listPrayerIntentions(): PrayerIntention[];
  savePrayerIntention(intention: PrayerIntention): void;

  getDailyVerse(date: string): DailyVerse | undefined;
  listDailyVerses(): DailyVerse[];
  saveDailyVerse(verse: DailyVerse): void;

  appendSensitiveAccess(entry: SensitiveAccessEntry): void;
  listSensitiveAccess(): SensitiveAccessEntry[];
}
