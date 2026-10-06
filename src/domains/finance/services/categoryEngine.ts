/**
 * MEDUSA — Finance Domain — Category Engine (seção 4)
 */

import type { Category, Transaction } from '../model/types';

export interface CategoryTotal {
  categoryId: string;
  categoryLabel: string;
  total: number;
  transactionCount: number;
  percentOfTotal: number;
}

export function computeCategoryTotals(transactions: Transaction[], categories: Category[]): CategoryTotal[] {
  const expenses = transactions.filter((t) => t.type === 'expense' && t.status !== 'cancelled');
  const grandTotal = expenses.reduce((sum, t) => sum + t.amount, 0);

  const byCategory = new Map<string, { total: number; count: number }>();
  for (const t of expenses) {
    const key = t.categoryId ?? 'sem_categoria';
    const existing = byCategory.get(key) ?? { total: 0, count: 0 };
    byCategory.set(key, { total: existing.total + t.amount, count: existing.count + 1 });
  }

  return Array.from(byCategory.entries())
    .map(([categoryId, { total, count }]) => ({
      categoryId,
      categoryLabel: categories.find((c) => c.id === categoryId)?.name ?? 'Sem categoria',
      total,
      transactionCount: count,
      percentOfTotal: grandTotal > 0 ? total / grandTotal : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export interface CategorySpike {
  categoryId: string;
  currentTotal: number;
  historicalAverage: number;
  multiplier: number;
}

/**
 * Detecta um gasto muito acima da média histórica da MESMA categoria.
 * `thresholdMultiplier` default 1.5x — se o histórico for zero, nunca aciona
 * (não existe "spike" contra uma base inexistente).
 */
export function detectCategorySpike(
  currentTotal: number,
  historicalAverage: number,
  thresholdMultiplier = 1.5
): boolean {
  if (historicalAverage <= 0) return false;
  return currentTotal >= historicalAverage * thresholdMultiplier;
}
