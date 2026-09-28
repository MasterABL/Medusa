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
import type { SpiritualRepository } from './types';

export function createInMemorySpiritualRepository(): SpiritualRepository {
  const profiles = new Map<string, SpiritualProfile>();
  const practices = new Map<string, SpiritualPractice>();
  const reflections = new Map<string, SpiritualReflection>();
  const goals = new Map<string, SpiritualGoal>();
  const routines = new Map<string, SpiritualRoutine>();

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
  };
}
