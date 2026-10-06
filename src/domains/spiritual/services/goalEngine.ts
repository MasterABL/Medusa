/**
 * MEDUSA — Spiritual Domain — Goal Engine
 *
 * Progresso é sempre DERIVADO das práticas registradas vinculadas à meta —
 * nunca um contador que o usuário ou a UI possa incrementar direto, senão
 * ele descolaria do histórico real (mesmo princípio do goalEngine de
 * Finanças, seção 3: "nunca permitir progresso manual incoerente").
 */

import type { SpiritualGoal, SpiritualGoalMilestone, SpiritualPractice } from '../model/types';

export function recalculateGoalProgress(goal: SpiritualGoal, allPractices: SpiritualPractice[], nowISO: string): SpiritualGoal {
  const linked = allPractices.filter((p) => p.relatedGoalId === goal.id);
  const currentPracticeCount = linked.length;

  const milestones: SpiritualGoalMilestone[] = goal.milestones.map((milestone) => {
    if (milestone.achieved) return milestone;
    const target = extractMilestoneTarget(milestone.label);
    if (target !== null && currentPracticeCount >= target) {
      return { ...milestone, achieved: true, achievedAt: nowISO };
    }
    return milestone;
  });

  return { ...goal, currentPracticeCount, milestones, updatedAt: nowISO };
}

/** Convenção simples: um milestone rotulado "N práticas" é reconhecido automaticamente. Fora desse formato, fica manual. */
function extractMilestoneTarget(label: string): number | null {
  const match = label.match(/(\d+)\s*práticas?/i);
  return match ? Number(match[1]) : null;
}

export function computeGoalProgress(goal: SpiritualGoal): number {
  if (!goal.targetPracticeCount || goal.targetPracticeCount <= 0) return 0;
  return Math.min(goal.currentPracticeCount / goal.targetPracticeCount, 1);
}
