/**
 * MEDUSA — Finance Domain — Insights Engine (seção 5)
 *
 * Nunca inventa evidência. Sem dado suficiente, produz um insight do tipo
 * `insufficient_evidence` em vez de uma conclusão forçada.
 */

import type { DomainInsight } from '../../shared/insight';
import type { BudgetConsumption, FinancialGoal, RecurringCommitment } from '../model/types';
import type { CashflowResult } from './cashflowEngine';
import type { CategorySpike } from './categoryEngine';
import type { GoalTrackStatus } from './goalEngine';

export type FinanceInsightType =
  | 'cashflow_negative'
  | 'budget_near_limit'
  | 'recurring_commitment_due'
  | 'category_spike'
  | 'income_change'
  | 'goal_off_track';

export interface UpcomingCommitment {
  commitment: RecurringCommitment;
  nextDueDate: string;
  daysUntilDue: number;
}

export interface FinanceInsightContext {
  cashflow: CashflowResult;
  budgetConsumptions: Array<BudgetConsumption & { categoryLabel: string }>;
  upcomingCommitments: UpcomingCommitment[];
  categorySpikes: Array<{ categoryLabel: string; spike: CategorySpike }>;
  incomeChange?: { previousIncome: number; currentIncome: number };
  goalTracks: Array<{ goal: FinancialGoal; status: GoalTrackStatus }>;
  now: string;
}

let counter = 0;
function makeId(type: string): string {
  counter += 1;
  return `finance_insight_${type}_${Date.now()}_${counter}`;
}

export function generateFinanceInsights(ctx: FinanceInsightContext): Array<DomainInsight<FinanceInsightType>> {
  const insights: Array<DomainInsight<FinanceInsightType>> = [];

  if (ctx.cashflow.netFlow < 0) {
    insights.push({
      id: makeId('cashflow_negative'),
      type: 'cashflow_negative',
      observation: `Fluxo de caixa negativo no período: saídas superaram entradas em ${Math.abs(ctx.cashflow.netFlow).toFixed(2)}.`,
      evidence: [
        `receitas: ${ctx.cashflow.income.toFixed(2)}`,
        `despesas: ${ctx.cashflow.expense.toFixed(2)}`,
        `${ctx.cashflow.transactionCount} transações no período ${ctx.cashflow.periodFrom} a ${ctx.cashflow.periodTo}`,
      ],
      period: { from: ctx.cashflow.periodFrom, to: ctx.cashflow.periodTo },
      impact: 'Saldo disponível reduz se o padrão continuar no próximo período.',
      severity: Math.abs(ctx.cashflow.netFlow) > ctx.cashflow.income * 0.3 ? 'alta' : 'moderada',
      confidence: ctx.cashflow.transactionCount >= 3 ? 0.8 : 0.5,
      proposedActionType: 'CREATE_FINANCIAL_REMINDER',
      createdAt: ctx.now,
    });
  }

  for (const consumption of ctx.budgetConsumptions) {
    if (consumption.state === 'dentro_do_limite') continue;
    insights.push({
      id: makeId('budget_near_limit'),
      type: 'budget_near_limit',
      observation: `Orçamento de "${consumption.categoryLabel}" ${
        consumption.state === 'estourado' ? 'foi ultrapassado' : 'está perto do limite'
      } (${Math.round(consumption.percentUsed * 100)}% consumido).`,
      evidence: [
        `consumido: ${consumption.consumedAmount.toFixed(2)}`,
        `restante: ${consumption.remainingAmount.toFixed(2)}`,
      ],
      impact: consumption.state === 'estourado' ? 'Limite planejado já foi excedido.' : 'Pouca margem restante até o limite.',
      severity: consumption.state === 'estourado' ? 'alta' : 'moderada',
      confidence: 0.95, // cálculo direto sobre dado observado, alta confiança por natureza
      proposedActionType: 'ADJUST_BUDGET',
      createdAt: ctx.now,
    });
  }

  for (const { commitment, nextDueDate, daysUntilDue } of ctx.upcomingCommitments) {
    if (daysUntilDue > 3 || daysUntilDue < 0) continue;
    insights.push({
      id: makeId('recurring_commitment_due'),
      type: 'recurring_commitment_due',
      observation: `"${commitment.label}" vence em ${daysUntilDue === 0 ? 'hoje' : `${daysUntilDue} dia(s)`} (${nextDueDate}).`,
      evidence: [`valor esperado: ${commitment.expectedAmount.toFixed(2)}`, `frequência: ${commitment.frequency}`],
      impact: 'Compromisso financeiro com vencimento próximo.',
      severity: daysUntilDue <= 1 ? 'alta' : 'moderada',
      confidence: 1, // data de vencimento já conhecida, não é estimativa
      proposedActionType: 'CREATE_FINANCIAL_REMINDER',
      createdAt: ctx.now,
    });
  }

  for (const { categoryLabel, spike } of ctx.categorySpikes) {
    insights.push({
      id: makeId('category_spike'),
      type: 'category_spike',
      observation: `Gasto em "${categoryLabel}" (${spike.currentTotal.toFixed(2)}) está ${spike.multiplier.toFixed(
        1
      )}x acima da média histórica (${spike.historicalAverage.toFixed(2)}).`,
      evidence: [`total atual: ${spike.currentTotal.toFixed(2)}`, `média histórica: ${spike.historicalAverage.toFixed(2)}`],
      impact: 'Categoria consumindo mais do orçamento do que o padrão recente.',
      severity: spike.multiplier >= 2 ? 'alta' : 'moderada',
      confidence: 0.7,
      createdAt: ctx.now,
    });
  }

  if (ctx.incomeChange) {
    const { previousIncome, currentIncome } = ctx.incomeChange;
    if (previousIncome > 0) {
      const delta = (currentIncome - previousIncome) / previousIncome;
      if (Math.abs(delta) >= 0.15) {
        insights.push({
          id: makeId('income_change'),
          type: 'income_change',
          observation: `Receita ${delta > 0 ? 'aumentou' : 'diminuiu'} ${Math.abs(Math.round(delta * 100))}% em relação ao período anterior.`,
          evidence: [`anterior: ${previousIncome.toFixed(2)}`, `atual: ${currentIncome.toFixed(2)}`],
          impact: delta > 0 ? 'Mais margem disponível neste período.' : 'Menos margem disponível neste período.',
          severity: Math.abs(delta) >= 0.3 ? 'alta' : 'moderada',
          confidence: 0.85,
          createdAt: ctx.now,
        });
      }
    }
  }

  for (const { goal, status } of ctx.goalTracks) {
    if (status !== 'fora_do_prazo') continue;
    insights.push({
      id: makeId('goal_off_track'),
      type: 'goal_off_track',
      observation: `Meta "${goal.label}" está fora do ritmo necessário para o prazo definido.`,
      evidence: [
        `progresso atual: ${goal.currentAmount.toFixed(2)} de ${goal.targetAmount.toFixed(2)}`,
        `prazo: ${goal.targetDate}`,
      ],
      impact: 'Meta pode não ser atingida na data planejada no ritmo atual.',
      severity: 'moderada',
      confidence: 0.75,
      proposedActionType: 'UPDATE_GOAL',
      createdAt: ctx.now,
    });
  }

  if (insights.length === 0 && ctx.cashflow.transactionCount === 0) {
    insights.push({
      id: makeId('insufficient_evidence'),
      type: 'insufficient_evidence',
      observation: 'Não há transações suficientes no período para gerar um insight financeiro confiável.',
      evidence: [],
      severity: 'baixa',
      confidence: 0,
      createdAt: ctx.now,
    });
  }

  return insights;
}
