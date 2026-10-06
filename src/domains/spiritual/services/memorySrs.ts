/**
 * MEDUSA — Spiritual — Memorização com repetição espaçada (SM-2)
 *
 * Fórmula SM-2 original:  EF' = EF + (0.1 − (5−q)(0.08 + (5−q)·0.02)), mínimo 1.3.
 * Qualidade q por botão: errei=0, dificil=3, bom=4, facil=5 (errei=0 reproduz o
 * comportamento do MINHA-VIDA: 2.6 → 1.8).
 *  - q < 3: zera repetições, volta pra AMANHÃ, conta uma falha; EF continua
 *    sendo atualizado pela fórmula (não é resetado — ele mede a dificuldade
 *    DESTE versículo pra esta pessoa).
 *  - q ≥ 3: 1ª repetição → 1 dia; 2ª → 6 dias; depois round(intervalo × EF').
 *
 * DIFERENÇA CONSCIENTE do MINHA-VIDA: aqui o intervalo usa o EF JÁ ATUALIZADO
 * (forma padrão do algoritmo); a trigger SQL de lá usa o EF de antes em parte
 * da sequência. Não há paridade bit-a-bit com aquela tabela — é decisão
 * registrada, não omissão.
 *
 * Nada aqui gera pontos, nível ou streak: memorizar é um ato de presença.
 */

import type { MemoryReviewLog, RecallGrade, ScriptureMemoryCard, SrsState } from '../model/memory';
import type { BibleReference } from '../model/bible';
import { dayDiff } from './dates';

export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;

const QUALITY: Record<RecallGrade, number> = { errei: 0, dificil: 3, bom: 4, facil: 5 };

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

export function newMemoryCard(input: { id: string; reference: BibleReference; translationId?: string; today: string; now: string }): ScriptureMemoryCard {
  return {
    id: input.id,
    reference: input.reference,
    translationId: input.translationId,
    addedAt: input.now,
    status: 'active',
    // Novo cartão já está disponível hoje: quem decidiu memorizar quer começar agora.
    srs: { ease: INITIAL_EASE, intervalDays: 0, repetitions: 0, lapses: 0, dueDate: input.today },
  };
}

export function nextSrsState(state: SrsState, grade: RecallGrade, today: string, now: string): SrsState {
  const q = QUALITY[grade];
  const ease = Math.max(MIN_EASE, round2(state.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))));

  if (q < 3) {
    return { ease, intervalDays: 1, repetitions: 0, lapses: state.lapses + 1, dueDate: addDays(today, 1), lastReviewedAt: now };
  }
  const repetitions = state.repetitions + 1;
  const intervalDays = repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.max(1, Math.round(state.intervalDays * ease));
  return { ease, intervalDays, repetitions, lapses: state.lapses, dueDate: addDays(today, intervalDays), lastReviewedAt: now };
}

export function reviewMemoryCard(card: ScriptureMemoryCard, grade: RecallGrade, today: string, now: string): { card: ScriptureMemoryCard; log: MemoryReviewLog } {
  if (card.status === 'archived') throw new Error('Cartão arquivado não pode ser revisado.');
  const srs = nextSrsState(card.srs, grade, today, now);
  return {
    card: { ...card, srs },
    log: { cardId: card.id, reviewedAt: now, grade, intervalBefore: card.srs.intervalDays, intervalAfter: srs.intervalDays },
  };
}

export interface DueCard {
  card: ScriptureMemoryCard;
  overdueDays: number;
}

/** Cartões vencidos, os mais atrasados primeiro. `limit` evita montar uma fila que vira cobrança. */
export function dueCards(cards: ScriptureMemoryCard[], today: string, limit = 10): DueCard[] {
  return cards
    .filter((c) => c.status === 'active' && c.srs.dueDate <= today)
    .map((card) => ({ card, overdueDays: Math.max(0, dayDiff(card.srs.dueDate, today)) }))
    .sort((a, b) => b.overdueDays - a.overdueDays || a.card.addedAt.localeCompare(b.card.addedAt))
    .slice(0, Math.max(0, limit));
}

export function upcomingCount(cards: ScriptureMemoryCard[], today: string, withinDays: number): number {
  const end = addDays(today, withinDays);
  return cards.filter((c) => c.status === 'active' && c.srs.dueDate > today && c.srs.dueDate <= end).length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
