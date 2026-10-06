/**
 * MEDUSA FOUNDATION — Goal / Progress / Insight (seção 34)
 */

import type { Goal, Insight, Milestone } from '../types/goals';
import type { DomainId } from '../types/domain';
import { computeGoalProgress } from '../types/goals';

const goals = new Map<string, Goal>();
const insights: Insight[] = [];
let goalCounter = 0;
let insightCounter = 0;

export interface CreateGoalInput {
  domain: DomainId;
  title: string;
  description?: string;
  targetDate?: string;
  milestones?: Omit<Milestone, 'id' | 'achieved'>[];
}

export function createGoal(input: CreateGoalInput): Goal {
  goalCounter += 1;
  const milestones: Milestone[] = (input.milestones ?? []).map((m, i) => ({
    id: `milestone_${Date.now()}_${goalCounter}_${i}`,
    label: m.label,
    achieved: false,
    targetDate: m.targetDate,
  }));
  const goal: Goal = {
    id: `goal_${Date.now()}_${goalCounter}`,
    domain: input.domain,
    title: input.title,
    description: input.description,
    milestones,
    progress: computeGoalProgress({ milestones }),
    createdAt: new Date().toISOString(),
    targetDate: input.targetDate,
    relatedActionIds: [],
  };
  goals.set(goal.id, goal);
  return goal;
}

export function addMilestone(goalId: string, label: string, targetDate?: string): Goal {
  const goal = goals.get(goalId);
  if (!goal) throw new Error(`Goal "${goalId}" não encontrado.`);
  const milestone: Milestone = {
    id: `milestone_${Date.now()}_${goal.milestones.length}`,
    label,
    achieved: false,
    targetDate,
  };
  const updated: Goal = {
    ...goal,
    milestones: [...goal.milestones, milestone],
  };
  updated.progress = computeGoalProgress(updated);
  goals.set(goalId, updated);
  return updated;
}

export function achieveMilestone(goalId: string, milestoneId: string): Goal {
  const goal = goals.get(goalId);
  if (!goal) throw new Error(`Goal "${goalId}" não encontrado.`);
  const milestones = goal.milestones.map((m) =>
    m.id === milestoneId ? { ...m, achieved: true, achievedAt: new Date().toISOString() } : m
  );
  const updated: Goal = { ...goal, milestones, progress: computeGoalProgress({ milestones }) };
  goals.set(goalId, updated);
  return updated;
}

export function linkActionToGoal(goalId: string, actionId: string): Goal {
  const goal = goals.get(goalId);
  if (!goal) throw new Error(`Goal "${goalId}" não encontrado.`);
  const updated: Goal = { ...goal, relatedActionIds: [...goal.relatedActionIds, actionId] };
  goals.set(goalId, updated);
  return updated;
}

export function getGoal(id: string): Goal | undefined {
  return goals.get(id);
}

export function listGoals(filter?: { domain?: DomainId }): Goal[] {
  return Array.from(goals.values()).filter((g) => !filter?.domain || g.domain === filter.domain);
}

export interface CreateInsightInput {
  domain: DomainId;
  observation: string;
  evidence: string[];
  reasoningSummary: string;
  confidence: number;
  proposedActionId?: string;
  relatedGoalId?: string;
}

export function createInsight(input: CreateInsightInput): Insight {
  insightCounter += 1;
  const insight: Insight = {
    id: `insight_${Date.now()}_${insightCounter}`,
    domain: input.domain,
    observation: input.observation,
    evidence: input.evidence,
    reasoningSummary: input.reasoningSummary,
    confidence: input.confidence,
    proposedActionId: input.proposedActionId,
    relatedGoalId: input.relatedGoalId,
    createdAt: new Date().toISOString(),
  };
  insights.push(insight);
  return insight;
}

export function listInsights(filter?: { domain?: DomainId }): Insight[] {
  return insights.filter((i) => !filter?.domain || i.domain === filter.domain);
}

/** Só para testes de contrato. */
export function __resetGoalsForTests(): void {
  goals.clear();
  insights.length = 0;
  goalCounter = 0;
  insightCounter = 0;
}
