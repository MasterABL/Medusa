/**
 * MEDUSA — Spiritual Domain — In-memory repository
 */

import { toMetadata } from '../services/reflectionPrivacy';
import type { SpiritualReflectionMetadata } from '../services/reflectionPrivacy';
import type {
  SpiritualGoal,
  SpiritualPractice,
  SpiritualProfile,
  SpiritualReflection,
  SpiritualRoutine,
} from '../model/types';
import type { PracticeDefinition, PrayerIntention, DailyVerse, SpiritualPurpose } from '../model/purpose';
import type { ReadingPlan, ReadingProgress } from '../model/reading';
import type { Study } from '../model/study';
import type { SensitiveAccessEntry, SpiritualRepository } from './types';

export function createInMemorySpiritualRepository(): SpiritualRepository {
  const profiles = new Map<string, SpiritualProfile>();
  const practices = new Map<string, SpiritualPractice>();
  const reflections = new Map<string, SpiritualReflection>();
  const goals = new Map<string, SpiritualGoal>();
  const routines = new Map<string, SpiritualRoutine>();
  const plans = new Map<string, ReadingPlan>();
  const progresses = new Map<string, ReadingProgress>();
  const studies = new Map<string, Study>();
  const purposes = new Map<string, SpiritualPurpose>();
  const definitions = new Map<string, PracticeDefinition>();
  const intentions = new Map<string, PrayerIntention>();
  const verses = new Map<string, DailyVerse>();
  const accessLog: SensitiveAccessEntry[] = [];

  return {
    getProfile: (id) => profiles.get(id),
    saveProfile: (profile) => void profiles.set(profile.id, profile),

    getPractice: (id) => practices.get(id),
    listPractices: (filter) =>
      Array.from(practices.values()).filter((p) => !filter?.relatedGoalId || p.relatedGoalId === filter.relatedGoalId),
    savePractice: (practice) => void practices.set(practice.id, practice),

    getReflection: (id) => reflections.get(id),
    listReflections: () => Array.from(reflections.values()),
    listReflectionMetadata: (): SpiritualReflectionMetadata[] => Array.from(reflections.values()).map(toMetadata),
    saveReflection: (reflection) => void reflections.set(reflection.id, reflection),

    getGoal: (id) => goals.get(id),
    listGoals: () => Array.from(goals.values()),
    saveGoal: (goal) => void goals.set(goal.id, goal),

    getRoutine: (id) => routines.get(id),
    listRoutines: (filter) =>
      Array.from(routines.values()).filter((r) => filter?.active === undefined || r.active === filter.active),
    saveRoutine: (routine) => void routines.set(routine.id, routine),

    getReadingPlan: (id) => plans.get(id),
    listReadingPlans: () => Array.from(plans.values()),
    saveReadingPlan: (plan) => void plans.set(plan.id, plan),
    getReadingProgress: (planId) => progresses.get(planId),
    saveReadingProgress: (progress) => void progresses.set(progress.planId, progress),

    getStudy: (id) => studies.get(id),
    listStudies: (filter) => Array.from(studies.values()).filter((st) => !filter?.status || st.status === filter.status),
    saveStudy: (study) => void studies.set(study.id, study),

    getPurpose: (id) => purposes.get(id),
    listPurposes: (filter) => Array.from(purposes.values()).filter((pu) => !filter?.status || pu.status === filter.status),
    savePurpose: (purpose) => void purposes.set(purpose.id, purpose),

    getPracticeDefinition: (id) => definitions.get(id),
    listPracticeDefinitions: (filter) => Array.from(definitions.values()).filter((d) => !filter?.status || d.status === filter.status),
    savePracticeDefinition: (definition) => void definitions.set(definition.id, definition),

    getPrayerIntention: (id) => intentions.get(id),
    listPrayerIntentions: () => Array.from(intentions.values()),
    savePrayerIntention: (intention) => void intentions.set(intention.id, intention),

    getDailyVerse: (date) => verses.get(date),
    listDailyVerses: () => Array.from(verses.values()).sort((a, b) => a.date.localeCompare(b.date)),
    saveDailyVerse: (verse) => void verses.set(verse.date, verse),

    appendSensitiveAccess: (entry) => void accessLog.push(entry),
    listSensitiveAccess: () => [...accessLog],
  };
}
