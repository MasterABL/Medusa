/**
 * MEDUSA — Finance Domain — Public API (seção 36)
 *
 * Contratos internos claros pra futura UI (Stitch) consumir — NUNCA
 * componentes visuais aqui, só funções que devolvem view models a partir do
 * domínio real. `finance.getOverview()` etc. da missão viram os métodos
 * abaixo.
 */

import type { FinanceRepository } from './repository/types';
import { computeCashflow, type CashflowResult } from './services/cashflowEngine';
import { computeCategoryTotals, detectCategorySpike, type CategoryTotal } from './services/categoryEngine';
import { computeAllBudgetConsumptions } from './services/budgetEngine';
import { computeNextOccurrence, daysUntil } from './services/recurringCommitmentEngine';
import { detectRecurringCandidates, type RecurrenceCandidate } from './services/recurrenceHeuristic';
import { computeGoalProgress, evaluateGoalTrack } from './services/goalEngine';
import { generateFinanceInsights, type FinanceInsightType, type UpcomingCommitment } from './services/insightsEngine';
import type { DomainInsight } from '../shared/insight';
import type { Budget, BudgetConsumption, FinancialAccount, FinancialGoal, Projection } from './model/types';

export interface FinanceOverview {
  accounts: FinancialAccount[];
  totalBalance: number;
  cashflow: CashflowResult;
  topCategories: CategoryTotal[];
}

export function getOverview(repository: FinanceRepository, periodFrom: string, periodTo: string, nowISO: string): FinanceOverview {
  const accounts = repository.listAccounts({ active: true });
  const transactions = repository.listTransactions({ from: periodFrom, to: periodTo });
  const categories = repository.listCategories();

  return {
    accounts,
    totalBalance: accounts.reduce((sum, a) => sum + a.currentBalance, 0),
    cashflow: computeCashflow(transactions, periodFrom, periodTo),
    topCategories: computeCategoryTotals(transactions, categories).slice(0, 5),
  };
}

export function getCashflow(repository: FinanceRepository, periodFrom: string, periodTo: string): CashflowResult {
  return computeCashflow(repository.listTransactions({ from: periodFrom, to: periodTo }), periodFrom, periodTo);
}

export function getBudgetsWithConsumption(
  repository: FinanceRepository,
  periodFrom: string,
  periodTo: string
): Array<Budget & { consumption: BudgetConsumption }> {
  const budgets = repository.listBudgets({ active: true });
  const transactions = repository.listTransactions({ from: periodFrom, to: periodTo });
  const consumptions = computeAllBudgetConsumptions(budgets, transactions);

  return budgets.map((budget) => ({
    ...budget,
    consumption: consumptions.find((c) => c.budgetId === budget.id)!,
  }));
}

export interface FinanceGoalView {
  goal: FinancialGoal;
  progress: number;
  trackStatus: ReturnType<typeof evaluateGoalTrack>;
}

export function getGoals(repository: FinanceRepository, nowISO: string): FinanceGoalView[] {
  return repository.listGoals().map((goal) => ({
    goal,
    progress: computeGoalProgress(goal),
    trackStatus: evaluateGoalTrack(goal, nowISO),
  }));
}

export function getProjections(repository: FinanceRepository): Projection[] {
  return repository.listProjections();
}

export function getRecurrenceCandidates(repository: FinanceRepository): RecurrenceCandidate[] {
  return detectRecurringCandidates(repository.listTransactions());
}

export function getInsights(
  repository: FinanceRepository,
  periodFrom: string,
  periodTo: string,
  nowISO: string
): Array<DomainInsight<FinanceInsightType>> {
  const transactions = repository.listTransactions({ from: periodFrom, to: periodTo });
  const categories = repository.listCategories();
  const cashflow = computeCashflow(transactions, periodFrom, periodTo);

  const budgets = repository.listBudgets({ active: true });
  const budgetConsumptions = computeAllBudgetConsumptions(budgets, transactions).map((c) => ({
    ...c,
    categoryLabel:
      categories.find((cat) => cat.id === budgets.find((b) => b.id === c.budgetId)?.categoryId)?.name ?? 'Sem categoria',
  }));

  const commitments = repository.listRecurringCommitments({ active: true });
  const upcomingCommitments: UpcomingCommitment[] = commitments
    .map((commitment) => {
      const nextDueDate = computeNextOccurrence(commitment, nowISO);
      if (!nextDueDate) return null;
      return { commitment, nextDueDate, daysUntilDue: daysUntil(nextDueDate, nowISO) };
    })
    .filter((c): c is UpcomingCommitment => c !== null);

  const categoryTotals = computeCategoryTotals(transactions, categories);
  const categorySpikes = categoryTotals
    .map((total) => {
      // Heurística simples de "histórico": metade do total atual como base de comparação
      // até existir uma janela de meses anteriores real — documentado como best-effort.
      const historicalAverage = total.total * 0.5;
      const isSpike = detectCategorySpike(total.total, historicalAverage);
      return isSpike
        ? {
            categoryLabel: total.categoryLabel,
            spike: { categoryId: total.categoryId, currentTotal: total.total, historicalAverage, multiplier: total.total / historicalAverage },
          }
        : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const goals = repository.listGoals();
  const goalTracks = goals.map((goal) => ({ goal, status: evaluateGoalTrack(goal, nowISO) }));

  return generateFinanceInsights({
    cashflow,
    budgetConsumptions,
    upcomingCommitments,
    categorySpikes,
    goalTracks,
    now: nowISO,
  });
}
