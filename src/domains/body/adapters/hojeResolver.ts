/**
 * MEDUSA — Body ↔ Hoje resolver
 *
 * Mesmo princípio do resolver de Finanças (seção 8): saída compacta,
 * contextual, no máximo 1-2 frases — nunca inunda o Hoje com métricas de
 * rotina/carga.
 */

import type { DomainInsight } from '../../shared/insight';
import type { BodyInsightType } from '../services/insightsEngine';

export interface BodyTodayContext {
  headline: string;
  detail?: string;
  insightId: string;
}

export function resolveBodyTodayContext(insights: Array<DomainInsight<BodyInsightType>>): BodyTodayContext | null {
  const actionable = insights.filter((i) => i.type !== 'insufficient_evidence');
  if (actionable.length === 0) return null;

  const severityRank = { alta: 2, moderada: 1, baixa: 0 } as const;
  const top = [...actionable].sort((a, b) => severityRank[b.severity] - severityRank[a.severity])[0];

  return { headline: top.observation, detail: top.impact, insightId: top.id };
}
