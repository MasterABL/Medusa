/**
 * MEDUSA FOUNDATION — Metrics com progressive disclosure (seção 26/49)
 */

import type { MetricDefinition, MetricTrend, MetricValue } from '../types/metrics';
import type { DomainId } from '../types/domain';

const definitions = new Map<string, MetricDefinition>();
const valueHistory = new Map<string, MetricValue[]>();

export function defineMetric(definition: MetricDefinition): void {
  definitions.set(definition.id, definition);
}

export function getMetricDefinition(id: string): MetricDefinition | undefined {
  return definitions.get(id);
}

export function listMetrics(filter?: { domain?: DomainId }): MetricDefinition[] {
  return Array.from(definitions.values()).filter((m) => !filter?.domain || m.domain === filter.domain);
}

export function recordValue(value: MetricValue): void {
  const history = valueHistory.get(value.metricId) ?? [];
  history.push(value);
  valueHistory.set(value.metricId, history);
}

export function getValueHistory(metricId: string): MetricValue[] {
  return valueHistory.get(metricId) ?? [];
}

/** Deriva a tendência a partir do histórico — nunca digitada à mão pela UI. */
export function computeTrend(metricId: string): MetricTrend | undefined {
  const history = getValueHistory(metricId);
  if (history.length < 2) return undefined;
  const [previous, current] = history.slice(-2);
  if (previous.value === 0) return { direction: 'estavel' };
  const delta = (current.value - previous.value) / Math.abs(previous.value);
  const direction = delta > 0.01 ? 'subindo' : delta < -0.01 ? 'descendo' : 'estavel';
  return { direction, delta };
}

/** Só para testes de contrato. */
export function __resetMetricsForTests(): void {
  definitions.clear();
  valueHistory.clear();
}
