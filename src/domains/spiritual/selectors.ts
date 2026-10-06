/**
 * MEDUSA — Spiritual — Seletores de leitura
 *
 * UI -> seletor -> repositório -> fonte. Conteúdo privado (reflexão, oração,
 * gratidão) nunca sai daqui: o histórico devolve rótulos seguros.
 */

import type { SpiritualRepository } from './repository/types';
import type { SpiritualMemoryRepository } from './repository/memory';
import type { PresenceSummary, SpiritualDayFlow, SpiritualHistoryItem } from './model/memory';
import type { DueCard } from './services/memorySrs';
import type { DataState } from '../../foundation/types/dataState';
import * as DS from '../../foundation/dataState';
import { dueCards, upcomingCount } from './services/memorySrs';
import { buildDayFlow, buildHistory, presenceDatesFrom, summarizePresence } from './services/presence';
import type { HistorySources } from './services/presence';
import { computeReadingState } from './services/readingPlanEngine';

export function collectSources(spiritual: SpiritualRepository, memory: SpiritualMemoryRepository): HistorySources {
  const plans = spiritual.listReadingPlans();
  return {
    practices: spiritual.listPractices(),
    reflections: spiritual.listReflections(),
    prayers: spiritual.listPrayerIntentions(),
    gratitude: memory.listGratitude(),
    studies: spiritual.listStudies(),
    plans,
    progresses: plans.map((p) => spiritual.getReadingProgress(p.id)).filter((p): p is NonNullable<typeof p> => p !== undefined),
    memoryCards: memory.listCards(),
    memoryReviews: memory.listReviews(),
  };
}

export function selectMemoryQueue(memory: SpiritualMemoryRepository, today: string, limit = 10): DataState<{ due: DueCard[]; upcomingWeek: number; activeCards: number }> {
  const active = memory.listCards({ status: 'active' });
  if (active.length === 0) return DS.empty('Nenhum versículo em memorização ainda.');
  return DS.ready({ due: dueCards(active, today, limit), upcomingWeek: upcomingCount(active, today, 7), activeCards: active.length }, memory.origin, today);
}

export function selectHistory(spiritual: SpiritualRepository, memory: SpiritualMemoryRepository, limit = 100): DataState<SpiritualHistoryItem[]> {
  const items = buildHistory(collectSources(spiritual, memory), limit);
  return items.length === 0 ? DS.empty('Nenhum registro espiritual ainda.') : DS.ready(items, 'derived');
}

export function selectPresence(spiritual: SpiritualRepository, memory: SpiritualMemoryRepository, today: string, windowDays = 14): DataState<PresenceSummary> {
  const summary = summarizePresence(presenceDatesFrom(collectSources(spiritual, memory)), today, windowDays);
  // "Nunca houve presença" é um estado legítimo e acolhedor, não uma lacuna: ready.
  return DS.ready(summary, 'derived', today);
}

export function selectDayFlow(spiritual: SpiritualRepository, memory: SpiritualMemoryRepository, today: string): DataState<SpiritualDayFlow> {
  const sources = collectSources(spiritual, memory);
  const presence = summarizePresence(presenceDatesFrom(sources), today);

  const planId = spiritual.listReadingPlans()[0]?.id;
  const plan = planId ? spiritual.getReadingPlan(planId) : undefined;
  const progress = planId ? spiritual.getReadingProgress(planId) : undefined;
  const reading = plan && progress
    ? { state: computeReadingState(plan, progress, today), completedToday: progress.completed.some((c) => c.completedAt.slice(0, 10) === today) }
    : undefined;

  const active = memory.listCards({ status: 'active' });
  const flow = buildDayFlow({
    today,
    presence,
    dailyVerse: spiritual.getDailyVerse(today),
    reading,
    hasActivePracticeDefinitions: spiritual.listPracticeDefinitions({ status: 'active' }).length > 0,
    practicesToday: spiritual.listPractices().filter((p) => p.completedAt.slice(0, 10) === today).length,
    activeMemoryCards: active.length,
    dueMemoryCards: dueCards(active, today, Number.MAX_SAFE_INTEGER).length,
    memoryReviewedToday: memory.listReviews().filter((r) => r.reviewedAt.slice(0, 10) === today).length,
  });

  // Versículo indisponível é uma lacuna real do dia: sinaliza como parcial em vez de esconder o passo.
  const missing = flow.steps.filter((s) => s.status === 'indisponivel').map((s) => s.id as string);
  return DS.partial(flow, missing, 'fonte_indisponivel', 'derived', today);
}
