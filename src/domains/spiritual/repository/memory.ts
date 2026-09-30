/**
 * MEDUSA — Spiritual — Repositório de memorização e gratidão
 *
 * Interface separada de `SpiritualRepository` (não a altera). Qualquer fonte
 * real (Supabase do MINHA-VIDA via adapter, storage local) implementa esta
 * mesma interface sem o domínio mudar.
 */

import type { GratitudeEntry, GratitudeMetadata, MemoryReviewLog, ScriptureMemoryCard } from '../model/memory';
import type { DataOrigin } from '../../../foundation/types/dataState';
import { toGratitudeMetadata } from '../services/presence';

export interface SpiritualMemoryRepository {
  readonly origin: DataOrigin;
  listCards(filter?: { status?: ScriptureMemoryCard['status'] }): ScriptureMemoryCard[];
  getCard(id: string): ScriptureMemoryCard | undefined;
  saveCard(card: ScriptureMemoryCard): void;
  appendReview(log: MemoryReviewLog): void;
  listReviews(): MemoryReviewLog[];
  listGratitude(): GratitudeEntry[];
  listGratitudeMetadata(): GratitudeMetadata[];
  saveGratitude(entry: GratitudeEntry): void;
}

export function createInMemorySpiritualMemoryRepository(origin: DataOrigin = 'manual'): SpiritualMemoryRepository {
  const cards = new Map<string, ScriptureMemoryCard>();
  const reviews: MemoryReviewLog[] = [];
  const gratitude = new Map<string, GratitudeEntry>();
  return {
    origin,
    listCards: (f) => Array.from(cards.values()).filter((c) => !f?.status || c.status === f.status),
    getCard: (id) => cards.get(id),
    saveCard: (c) => void cards.set(c.id, c),
    appendReview: (l) => void reviews.push(l),
    listReviews: () => [...reviews],
    listGratitude: () => Array.from(gratitude.values()),
    listGratitudeMetadata: () => Array.from(gratitude.values()).map(toGratitudeMetadata),
    saveGratitude: (g) => void gratitude.set(g.id, g),
  };
}
