/**
 * MEDUSA — Finance Domain — Recurrence Heuristic (seção 4)
 *
 * NOME IMPORTA: isto é uma HEURÍSTICA determinística (agrupamento por
 * descrição normalizada + intervalo entre ocorrências), não "IA". Produz
 * evidência explícita (frequência, intervalo observado, consistência) e uma
 * confiança interpretável — nunca uma alegação de certeza.
 */

import type { Transaction } from '../model/types';

export type RecurrenceConfidence = 'baixa' | 'moderada' | 'alta';

export interface RecurrenceCandidate {
  descriptionPattern: string;
  occurrenceCount: number;
  averageIntervalDays: number;
  intervalConsistency: number; // 0-1, quanto mais perto de 1 mais regular
  confidence: RecurrenceConfidence;
  transactionIds: string[];
  evidence: string[];
}

function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/\d+([/.-]\d+)*/g, '') // remove números soltos e padrões tipo 12/24
    .replace(/\s+/g, ' ')
    .trim();
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / msPerDay;
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  if (values.length <= 1) return 0;
  const variance = mean(values.map((v) => (v - avg) ** 2));
  return Math.sqrt(variance);
}

/**
 * Agrupa transações de DESPESA por descrição normalizada + valor semelhante
 * (tolerância de 10%, cobre pequenas variações de preço num mesmo serviço),
 * e infere candidatos de recorrência a partir dos intervalos observados.
 */
export function detectRecurringCandidates(transactions: Transaction[]): RecurrenceCandidate[] {
  const expenses = transactions.filter((t) => t.type === 'expense' && t.status !== 'cancelled');
  const groups = new Map<string, Transaction[]>();

  for (const t of expenses) {
    const normalized = normalizeDescription(t.description);
    if (!normalized) continue;
    // Chave inclui uma faixa de valor arredondada — evita juntar "Uber 12" com "Uber 200".
    const amountBucket = Math.round(t.amount / Math.max(t.amount * 0.1, 1));
    const key = `${normalized}::${amountBucket}`;
    const group = groups.get(key) ?? [];
    group.push(t);
    groups.set(key, group);
  }

  const candidates: RecurrenceCandidate[] = [];

  for (const [key, group] of Array.from(groups.entries())) {
    if (group.length < 2) continue; // precisa de pelo menos 2 ocorrências pra sugerir qualquer coisa

    const sorted = [...group].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i += 1) {
      intervals.push(daysBetween(sorted[i - 1].occurredAt, sorted[i].occurredAt));
    }

    const averageIntervalDays = mean(intervals);
    const deviation = stdDev(intervals, averageIntervalDays);
    const intervalConsistency = averageIntervalDays > 0 ? Math.max(0, 1 - deviation / averageIntervalDays) : 0;

    let confidence: RecurrenceConfidence;
    if (sorted.length === 2) {
      confidence = 'baixa'; // amostra pequena demais pra afirmar mais que isso
    } else if (intervalConsistency >= 0.85) {
      confidence = 'alta';
    } else if (intervalConsistency >= 0.6) {
      confidence = 'moderada';
    } else {
      confidence = 'baixa';
    }

    candidates.push({
      descriptionPattern: key.split('::')[0],
      occurrenceCount: sorted.length,
      averageIntervalDays: Math.round(averageIntervalDays * 10) / 10,
      intervalConsistency: Math.round(intervalConsistency * 100) / 100,
      confidence,
      transactionIds: sorted.map((t) => t.id),
      evidence: [
        `${sorted.length} ocorrências com descrição semelhante a "${sorted[0].description}"`,
        `intervalo médio observado: ${Math.round(averageIntervalDays)} dias`,
        `consistência do intervalo: ${Math.round(intervalConsistency * 100)}%`,
      ],
    });
  }

  return candidates.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
}
