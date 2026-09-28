/**
 * MEDUSA — Finance ↔ Hoje resolver (seção 8)
 *
 * Saída compacta e contextual — nunca uma lista de métricas. No máximo 1-2
 * frases por chamada; quem decide quantas mostrar é o consumidor (Hoje).
 */

import type { DomainInsight } from '../../shared/insight';
import type { FinanceInsightType } from '../services/insightsEngine';

export interface FinanceTodayContext {
  headline: string;
  detail?: string;
  insightId: string;
}

/**
 * Escolhe o insight financeiro mais relevante para o momento e resume numa
 * frase curta — nunca "inunda o Hoje com métricas" (seção 8).
 */
export function resolveFinanceTodayContext(insights: Array<DomainInsight<FinanceInsightType>>): FinanceTodayContext | null {
  const actionable = insights.filter((i) => i.type !== 'insufficient_evidence');
  if (actionable.length === 0) return null;

  const severityRank = { alta: 2, moderada: 1, baixa: 0 } as const;
  const top = [...actionable].sort((a, b) => severityRank[b.severity] - severityRank[a.severity])[0];

  switch (top.type) {
    case 'recurring_commitment_due':
      return { headline: top.observation, insightId: top.id };
    case 'cashflow_negative':
      return { headline: '1 alerta de fluxo de caixa requer atenção.', detail: top.observation, insightId: top.id };
    case 'budget_near_limit':
      return { headline: top.observation, insightId: top.id };
    default:
      return { headline: top.observation, insightId: top.id };
  }
}
