/**
 * MEDUSA — Finance Domain — Goal Engine (seção 3)
 *
 * `currentAmount`/milestones `achieved` são sempre DERIVADOS de
 * `contributions` — nunca aceitos como valor manual incoerente com o
 * histórico (seção 3, "FinancialGoal").
 */

import type { FinancialGoal, GoalContribution } from '../model/types';

export function computeGoalCurrentAmount(contributions: GoalContribution[]): number {
  return contributions.reduce((sum, c) => sum + c.amount, 0);
}

export function computeGoalProgress(goal: Pick<FinancialGoal, 'currentAmount' | 'targetAmount'>): number {
  if (goal.targetAmount <= 0) return 0;
  return Math.min(1, goal.currentAmount / goal.targetAmount);
}

/** Adiciona uma contribuição e recalcula currentAmount + milestones — nunca aceita um valor manual solto. */
export function addContribution(goal: FinancialGoal, contribution: GoalContribution): FinancialGoal {
  const contributions = [...goal.contributions, contribution];
  const currentAmount = computeGoalCurrentAmount(contributions);
  const milestones = goal.milestones.map((m) => ({
    ...m,
    achieved: m.achieved || currentAmount >= m.targetAmount,
  }));
  return { ...goal, contributions, currentAmount, milestones };
}

export type GoalTrackStatus = 'no_prazo' | 'fora_do_prazo' | 'sem_prazo_definido' | 'concluido';

/**
 * Compara o ritmo de contribuição necessário (linear, do início até
 * targetDate) contra o ritmo real observado — determinístico, documentado,
 * nunca chamado de "previsão de IA".
 */
export function evaluateGoalTrack(goal: FinancialGoal, nowISO: string): GoalTrackStatus {
  if (goal.currentAmount >= goal.targetAmount) return 'concluido';
  if (!goal.targetDate) return 'sem_prazo_definido';

  const start = new Date(goal.createdAt).getTime();
  const target = new Date(goal.targetDate).getTime();
  const now = new Date(nowISO).getTime();

  if (now >= target) return 'fora_do_prazo';

  const totalDuration = target - start;
  const elapsed = now - start;
  if (totalDuration <= 0) return 'sem_prazo_definido';

  const expectedProgress = elapsed / totalDuration;
  const actualProgress = computeGoalProgress(goal);

  // Tolerância de 10 pontos percentuais antes de considerar "fora do prazo" —
  // evita marcar como atrasado por uma diferença insignificante.
  return actualProgress >= expectedProgress - 0.1 ? 'no_prazo' : 'fora_do_prazo';
}
