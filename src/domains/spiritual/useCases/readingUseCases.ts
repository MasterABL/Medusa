/**
 * MEDUSA — Spiritual — Casos de uso: plano de leitura
 * Eventos carregam só ids/contagens — nunca anotações do usuário.
 */

import { publish as publishEvent } from '../../../foundation/eventBus';
import { validateReference } from '../model/bible';
import type { ReadingPlan, ReadingState } from '../model/reading';
import { SPIRITUAL_EVENT_TYPES } from '../events/types';
import type { SpiritualRepository } from '../repository/types';
import { completeEntry, computeReadingState, initProgress, ReadingPlanError, resumePlan } from '../services/readingPlanEngine';

export function createReadingPlan(repo: SpiritualRepository, plan: ReadingPlan, nowISO: string): ReadingPlan {
  if (plan.entries.length === 0) throw new ReadingPlanError('Um plano precisa de ao menos uma leitura.');
  if (plan.purposeId && !repo.getPurpose(plan.purposeId)) throw new ReadingPlanError(`Propósito "${plan.purposeId}" não existe.`);
  for (const entry of plan.entries) entry.references.forEach((r) => validateReference(r, plan.canon));
  repo.saveReadingPlan(plan);
  repo.saveReadingProgress(initProgress(plan, nowISO));
  return plan;
}

function load(repo: SpiritualRepository, planId: string) {
  const plan = repo.getReadingPlan(planId);
  const progress = repo.getReadingProgress(planId);
  if (!plan || !progress) throw new ReadingPlanError(`Plano "${planId}" não encontrado.`);
  return { plan, progress };
}

export function completeReadingEntry(repo: SpiritualRepository, input: { planId: string; entryId: string; completedAt: string; today: string }): ReadingState {
  const { plan, progress } = load(repo, input.planId);
  const wasDone = progress.completed.some((c) => c.entryId === input.entryId);
  const next = completeEntry(plan, progress, input.entryId, input.completedAt);
  repo.saveReadingProgress(next);
  const state = computeReadingState(plan, next, input.today);
  if (!wasDone) {
    publishEvent({
      domain: 'spiritual',
      type: SPIRITUAL_EVENT_TYPES.READING_ENTRY_COMPLETED,
      payload: { planId: plan.id, entryId: input.entryId, completedCount: state.completedCount, total: state.total },
      dedupeKey: `reading-entry-${plan.id}-${input.entryId}`,
    });
  }
  return state;
}

export function resumeReadingPlan(repo: SpiritualRepository, input: { planId: string; today: string }): ReadingState {
  const { plan, progress } = load(repo, input.planId);
  const next = resumePlan(plan, progress, input.today);
  repo.saveReadingProgress(next);
  return computeReadingState(plan, next, input.today);
}

export function getReadingState(repo: SpiritualRepository, planId: string, today: string): ReadingState {
  const { plan, progress } = load(repo, planId);
  return computeReadingState(plan, progress, today);
}
