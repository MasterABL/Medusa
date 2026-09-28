/**
 * View model de Finanças: compõe as saídas de `FinanceApi` para as perguntas da tela.
 * Só faz aritmética de composição (somas, sobra do mês, margem por dia) — limiar de orçamento,
 * ritmo de meta, detecção de recorrência e insights continuam vindo dos engines do domínio.
 */

import { FinanceApi, RecurringCommitmentEngine } from '@/domains/finance';
import type { Budget, BudgetConsumption, FinancialGoal, RecurringCommitment } from '@/domains/finance';
import type { DomainInsight } from '@/domains/shared/insight';
import { isoDay, monthName } from '../shared/format';
import { getFinanceSession } from './financeSession';

export interface BillView {
  commitment: RecurringCommitment;
  dueDate: string;
  daysUntil: number;
  status: 'vencida' | 'hoje' | 'a_vencer';
}

export interface BudgetView {
  budget: Budget;
  categoryName: string;
  consumption: BudgetConsumption;
  transactions: Array<{ id: string; description: string; amount: number; occurredAt: string }>;
}

export interface GoalRow {
  goal: FinancialGoal;
  progress: number;
  track: ReturnType<typeof FinanceApi.getGoals>[number]['trackStatus'];
  remaining: number;
}

export interface SubscriptionView {
  label: string;
  monthlyAmount: number;
  confidence: string;
  occurrences: number;
}

export interface FinanceView {
  scenario: 'tranquilo' | 'apertado';
  monthLabel: string;
  daysInMonth: number;
  daysLeft: number;
  available: number;
  saved: number;
  income: number;
  spent: number;
  billsTotal: number;
  bills: BillView[];
  /** Sobra do mês = entradas − gasto realizado − contas que ainda faltam pagar. Negativa = mês no vermelho. */
  free: number;
  dailyMargin: number;
  budgets: BudgetView[];
  goals: GoalRow[];
  subscriptions: SubscriptionView[];
  subscriptionsTotal: number;
  attention: Array<DomainInsight>;
  hiddenInsightCount: number;
}

const SEVERITY_RANK = { alta: 3, moderada: 2, baixa: 1 } as const;

export function buildFinanceView(): FinanceView {
  const { repo, now, scenario } = getFinanceSession();
  const y = now.getFullYear();
  const m = now.getMonth();
  const dim = new Date(y, m + 1, 0).getDate();
  const from = isoDay(new Date(y, m, 1));
  const to = isoDay(new Date(y, m, dim));
  const today = isoDay(now);

  const overview = FinanceApi.getOverview(repo, from, to, today);
  const available = overview.accounts.filter((a) => a.type === 'checking' || a.type === 'cash').reduce((s, a) => s + a.currentBalance, 0);
  const saved = overview.accounts.filter((a) => a.type === 'savings' || a.type === 'investment').reduce((s, a) => s + a.currentBalance, 0);

  const monthTxns = repo.listTransactions({ from, to });
  const paidIds = new Set(monthTxns.map((t) => t.recurringCommitmentId).filter(Boolean));
  const bills: BillView[] = repo
    .listRecurringCommitments({ active: true })
    .filter((c) => c.type === 'expense' && c.frequency === 'monthly' && c.dueDayOfMonth && !paidIds.has(c.id))
    .map((commitment) => {
      const dueDate = isoDay(new Date(y, m, Math.min(commitment.dueDayOfMonth!, dim)));
      const daysUntil = RecurringCommitmentEngine.daysUntil(dueDate, today);
      return { commitment, dueDate, daysUntil, status: daysUntil < 0 ? ('vencida' as const) : daysUntil === 0 ? ('hoje' as const) : ('a_vencer' as const) };
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const billsTotal = bills.reduce((s, b) => s + b.commitment.expectedAmount, 0);

  const income = overview.cashflow.income;
  const spent = overview.cashflow.expense;
  const free = income - spent - billsTotal;
  const daysLeft = Math.max(1, dim - now.getDate() + 1);

  const categories = repo.listCategories();
  const budgets: BudgetView[] = FinanceApi.getBudgetsWithConsumption(repo, from, to).map((b) => ({
    budget: b,
    categoryName: categories.find((c) => c.id === b.categoryId)?.name ?? 'Sem categoria',
    consumption: b.consumption,
    transactions: monthTxns
      .filter((t) => t.categoryId === b.categoryId && t.type === 'expense')
      .sort((a, c) => c.occurredAt.localeCompare(a.occurredAt))
      .map((t) => ({ id: t.id, description: t.description, amount: t.amount, occurredAt: t.occurredAt })),
  }));

  const goals: GoalRow[] = FinanceApi.getGoals(repo, today).map(({ goal, progress, trackStatus }) => ({
    goal,
    progress,
    track: trackStatus,
    remaining: Math.max(0, goal.targetAmount - goal.currentAmount),
  }));

  const subscriptions: SubscriptionView[] = FinanceApi.getRecurrenceCandidates(repo)
    .filter((c) => c.confidence !== 'baixa' && c.averageIntervalDays >= 25 && c.averageIntervalDays <= 35)
    .map((c) => {
      const txns = c.transactionIds.map((id) => repo.getTransaction(id)).filter((t): t is NonNullable<typeof t> => !!t);
      return {
        label: txns[0]?.description ?? c.descriptionPattern,
        monthlyAmount: txns.reduce((s, t) => s + t.amount, 0) / Math.max(1, txns.length),
        confidence: c.confidence,
        occurrences: c.occurrenceCount,
      };
    })
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  // `category_spike` fica de fora de propósito: o domínio ainda compara com uma média histórica
  // APROXIMADA (docs/MEDUSA_DOMAIN_UI_CONTRACTS.md, "Futuro: média histórica real por categoria"),
  // então mostrar isso como alerta afirmaria uma comparação que não foi medida.
  const allInsights = FinanceApi.getInsights(repo, from, to, today);
  const usable = allInsights.filter((i) => i.type !== 'category_spike' && i.type !== 'insufficient_evidence');
  const attention = usable.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  return {
    scenario,
    monthLabel: `${monthName(m)} de ${y}`,
    daysInMonth: dim,
    daysLeft,
    available,
    saved,
    income,
    spent,
    billsTotal,
    bills,
    free,
    dailyMargin: free / daysLeft,
    budgets,
    goals,
    subscriptions,
    subscriptionsTotal: subscriptions.reduce((s, x) => s + x.monthlyAmount, 0),
    attention,
    hiddenInsightCount: allInsights.length - usable.length,
  };
}
