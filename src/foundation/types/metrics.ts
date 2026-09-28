/**
 * MEDUSA FOUNDATION — Metrics com progressive disclosure (seção 26/49)
 *
 * Finanças e Corpo terão métricas, mas a interface não pode virar um mar de
 * números. `visibility` é o que permite um componente decidir entre mostrar
 * um resumo compacto ("Hoje está estável") e um detalhamento expandido.
 */

import type { DomainId } from './domain';

export type MetricTrendDirection = 'subindo' | 'descendo' | 'estavel';

export interface MetricTrend {
  direction: MetricTrendDirection;
  /** Variação relativa ao período anterior, quando aplicável (ex.: 0.12 = +12%). */
  delta?: number;
  periodLabel?: string;
}

export interface MetricValue {
  metricId: string;
  value: number;
  unit?: string;
  timestamp: string;
}

export interface MetricInsight {
  summary: string;
  detail?: string;
}

export type MetricVisibility = 'compact' | 'expanded';

export interface MetricDefinition {
  id: string;
  domain: DomainId;
  label: string;
  unit?: string;
  /** Resumo em linguagem natural, sempre disponível mesmo antes de expandir. */
  contextualSummary: string;
  expandable: boolean;
  defaultVisibility: MetricVisibility;
  trend?: MetricTrend;
  insight?: MetricInsight;
}
