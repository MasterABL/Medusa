/**
 * MEDUSA — Spiritual Domain — Fixtures (seção 37)
 *
 * FIXTURE / SYNTHETIC / TEST — nunca conteúdo real de reflexão de ninguém.
 */

import type { SpiritualGoal, SpiritualPractice, SpiritualReflection } from '../model/types';

export const FIXTURE_TAG = 'fixture' as const;

export function createFixturePractice(overrides: Partial<SpiritualPractice> = {}): SpiritualPractice {
  return {
    id: 'fixture_practice_1',
    type: 'oracao',
    label: 'Oração da manhã (fixture)',
    completedAt: '2026-01-01T07:00:00.000Z',
    durationMinutes: 10,
    ...overrides,
  };
}

export function createFixtureReflection(overrides: Partial<SpiritualReflection> = {}): SpiritualReflection {
  return {
    id: 'fixture_reflection_1',
    content: 'Texto de reflexão sintético — nunca conteúdo real (fixture).',
    createdAt: '2026-01-01T07:10:00.000Z',
    visibility: 'private',
    ...overrides,
  };
}

export function createFixtureGoal(overrides: Partial<SpiritualGoal> = {}): SpiritualGoal {
  return {
    id: 'fixture_goal_1',
    label: 'Ler os Salmos (fixture)',
    targetPracticeCount: 30,
    currentPracticeCount: 0,
    milestones: [{ id: 'fixture_milestone_1', label: '10 práticas', achieved: false }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
