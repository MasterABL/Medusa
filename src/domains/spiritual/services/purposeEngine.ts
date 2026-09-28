/**
 * MEDUSA — Spiritual — Propósito: ligação e continuidade (sem pontos, sem medalhas)
 */

import type { PracticeDefinition, SpiritualPurpose } from '../model/purpose';
import type { ReadingPlan, ReadingProgress } from '../model/reading';
import type { Study } from '../model/study';
import type { SpiritualGoal, SpiritualPractice } from '../model/types';
import { dayDiff, dayOf, todayOf } from './dates';

export interface PurposeInputs {
  definitions: PracticeDefinition[];
  practices: SpiritualPractice[];
  studies: Study[];
  plans: ReadingPlan[];
  progresses: ReadingProgress[];
  goals: SpiritualGoal[];
}

export interface PurposeContinuity {
  purposeId: string;
  linked: { definitions: number; studies: number; plans: number; goals: number };
  activityInWindow: { practices: number; readingEntries: number; studiesTouched: number };
  lastActivityAt?: string;
  daysSinceLastActivity: number | null;
  status: 'ativo' | 'quieto' | 'sem_atividade_registrada' | 'pausado';
  message: string;
}

export function computePurposeContinuity(purpose: SpiritualPurpose, inputs: PurposeInputs, now: Date, windowDays = 14): PurposeContinuity {
  const today = todayOf(now);
  const defs = inputs.definitions.filter((d) => d.purposeId === purpose.id);
  const defIds = new Set(defs.map((d) => d.id));
  const goals = inputs.goals.filter((g) => g.purposeId === purpose.id);
  const goalIds = new Set(goals.map((g) => g.id));
  const plans = inputs.plans.filter((p) => p.purposeId === purpose.id);
  const planIds = new Set(plans.map((p) => p.id));
  const studies = inputs.studies.filter((s) => s.purposeId === purpose.id);

  const inWindow = (iso: string) => {
    const diff = dayDiff(dayOf(iso), today);
    return diff >= 0 && diff <= windowDays;
  };

  const practiceDates = inputs.practices
    .filter((p) => (p.definitionId && defIds.has(p.definitionId)) || (p.relatedGoalId && goalIds.has(p.relatedGoalId)))
    .map((p) => p.completedAt);
  const readingDates = inputs.progresses.filter((pr) => planIds.has(pr.planId)).flatMap((pr) => pr.completed.map((c) => c.completedAt));
  const studyDates = studies.map((s) => s.concludedAt ?? s.items[s.items.length - 1]?.createdAt ?? s.createdAt);

  const all = [...practiceDates, ...readingDates, ...studyDates].sort();
  const lastActivityAt = all[all.length - 1];
  const daysSinceLastActivity = lastActivityAt ? dayDiff(dayOf(lastActivityAt), today) : null;

  const activityInWindow = {
    practices: practiceDates.filter(inWindow).length,
    readingEntries: readingDates.filter(inWindow).length,
    studiesTouched: studyDates.filter(inWindow).length,
  };
  const recent = activityInWindow.practices + activityInWindow.readingEntries + activityInWindow.studiesTouched;

  let status: PurposeContinuity['status'];
  let message: string;
  if (purpose.status !== 'active') {
    status = 'pausado';
    message = `O propósito "${purpose.label}" está em pausa.`;
  } else if (lastActivityAt === undefined) {
    status = 'sem_atividade_registrada';
    message = `Ainda não há prática, leitura ou estudo ligados a "${purpose.label}". Quer escolher um primeiro passo?`;
  } else if (recent > 0) {
    status = 'ativo';
    message = `"${purpose.label}" tem caminhado: ${recent} momento(s) nos últimos ${windowDays} dias.`;
  } else {
    status = 'quieto';
    message = `"${purpose.label}" está quieto há ${daysSinceLastActivity} dia(s). Quer retomar com algo simples?`;
  }

  return {
    purposeId: purpose.id,
    linked: { definitions: defs.length, studies: studies.length, plans: plans.length, goals: goals.length },
    activityInWindow,
    lastActivityAt,
    daysSinceLastActivity,
    status,
    message,
  };
}
