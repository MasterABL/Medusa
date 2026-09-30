/**
 * MEDUSA — Spiritual — Presença (continuidade sem pontuação), histórico e fluxo do dia
 *
 * "Continuidade" aqui descreve O QUE ACONTECEU e oferece uma retomada
 * gentil. Não mede sequência, não guarda recorde, não cobra. Toda mensagem
 * passa pelo teste de linguagem (GUILT_WORDS) — sem culpa, sem "você perdeu".
 */

import type {
  FlowStep,
  GratitudeEntry,
  GratitudeMetadata,
  MemoryReviewLog,
  PresenceSummary,
  ScriptureMemoryCard,
  SpiritualDayFlow,
  SpiritualHistoryItem,
} from '../model/memory';
import type { SpiritualPractice, SpiritualReflection } from '../model/types';
import type { DailyVerse, PrayerIntention } from '../model/purpose';
import type { ReadingPlan, ReadingProgress, ReadingState } from '../model/reading';
import type { Study } from '../model/study';
import { formatReference } from '../model/bible';
import { dayDiff } from './dates';

export function toGratitudeMetadata(entry: GratitudeEntry): GratitudeMetadata {
  return { id: entry.id, date: entry.date, createdAt: entry.createdAt, contentLength: entry.content.length };
}

export function summarizePresence(presenceDates: string[], today: string, windowDays = 14): PresenceSummary {
  const distinct = Array.from(new Set(presenceDates.filter((d) => d <= today))).sort();
  const last = distinct[distinct.length - 1];
  const daysSincePresence = last === undefined ? null : dayDiff(last, today);
  const inWindow = distinct.filter((d) => dayDiff(d, today) < windowDays).length;

  let stance: PresenceSummary['stance'];
  let message: string;
  if (last === undefined) {
    stance = 'primeira_vez';
    message = 'Quando quiser, comece por onde estiver. Não há ponto de partida certo.';
  } else if (daysSincePresence! <= 2) {
    stance = 'seguindo';
    message = daysSincePresence === 0 ? 'Você esteve presente hoje.' : 'Você esteve presente recentemente.';
  } else if (daysSincePresence! <= 7) {
    stance = 'retomar_leve';
    message = `Faz ${daysSincePresence} dias desde a última vez. Um versículo já basta para retomar.`;
  } else {
    stance = 'retomar_com_calma';
    message = `Faz ${daysSincePresence} dias. Sem pressa: recomece pelo que for mais leve hoje.`;
  }
  return { today, lastPresenceDate: last, daysSincePresence, windowDays, presentDaysInWindow: inWindow, presentToday: last === today, stance, message };
}

export interface HistorySources {
  practices: SpiritualPractice[];
  reflections: SpiritualReflection[];
  prayers: PrayerIntention[];
  gratitude: GratitudeEntry[];
  studies: Study[];
  plans: ReadingPlan[];
  progresses: ReadingProgress[];
  memoryCards: ScriptureMemoryCard[];
  memoryReviews: MemoryReviewLog[];
}

/** Linha do tempo unificada, mais recente primeiro. NUNCA inclui conteúdo privado. */
export function buildHistory(src: HistorySources, limit = 100): SpiritualHistoryItem[] {
  const items: SpiritualHistoryItem[] = [];
  const push = (i: Omit<SpiritualHistoryItem, 'date'>) => items.push({ ...i, date: i.at.slice(0, 10) });

  for (const p of src.practices) push({ id: `pratica:${p.id}`, kind: 'pratica', at: p.completedAt, label: p.label, hasPrivateContent: p.intentionId !== undefined });
  for (const r of src.reflections) push({ id: `reflexao:${r.id}`, kind: 'reflexao', at: r.createdAt, label: 'Reflexão registrada', hasPrivateContent: true });
  for (const p of src.prayers) push({ id: `oracao:${p.id}`, kind: 'oracao', at: p.createdAt, label: 'Intenção de oração registrada', hasPrivateContent: true });
  for (const g of src.gratitude) push({ id: `gratidao:${g.id}`, kind: 'gratidao', at: g.createdAt, label: 'Gratidão registrada', hasPrivateContent: true });
  for (const s of src.studies) {
    push({ id: `estudo:${s.id}`, kind: 'estudo', at: s.concludedAt ?? s.createdAt, label: `Estudo: ${formatReference(s.reference, { names: true })}`, hasPrivateContent: s.items.some((i) => i.private) });
  }
  for (const progress of src.progresses) {
    const plan = src.plans.find((p) => p.id === progress.planId);
    for (const done of progress.completed) {
      const entry = plan?.entries.find((e) => e.id === done.entryId);
      const refs = entry?.references.map((r) => formatReference(r, { names: true })).join(', ');
      push({ id: `leitura:${progress.planId}:${done.entryId}`, kind: 'leitura', at: done.completedAt, label: `Leitura: ${entry?.label ?? refs ?? 'entrada do plano'}`, hasPrivateContent: false });
    }
  }
  for (const log of src.memoryReviews) {
    const card = src.memoryCards.find((c) => c.id === log.cardId);
    push({ id: `memorizacao:${log.cardId}:${log.reviewedAt}`, kind: 'memorizacao', at: log.reviewedAt, label: `Memorização: ${card ? formatReference(card.reference, { names: true }) : 'versículo'}`, hasPrivateContent: false });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id)).slice(0, Math.max(0, limit));
}

export function presenceDatesFrom(src: HistorySources): string[] {
  return buildHistory(src, Number.MAX_SAFE_INTEGER).map((i) => i.date);
}

export interface DayFlowInput {
  today: string;
  presence: PresenceSummary;
  dailyVerse?: DailyVerse;
  reading?: { state: ReadingState; completedToday: boolean };
  hasActivePracticeDefinitions: boolean;
  practicesToday: number;
  activeMemoryCards: number;
  dueMemoryCards: number;
  memoryReviewedToday: number;
}

/** presença → versículo → leitura → prática → memória → continuidade. Estados derivados, nunca pontuados. */
export function buildDayFlow(input: DayFlowInput): SpiritualDayFlow {
  const steps: FlowStep[] = [];

  steps.push({ id: 'presenca', status: input.presence.presentToday ? 'feito' : 'disponivel' });

  steps.push(
    input.dailyVerse
      ? { id: 'versiculo', status: 'disponivel', detail: { reference: formatReference(input.dailyVerse.reference, { names: true }), hasText: input.dailyVerse.text !== undefined, source: input.dailyVerse.source } }
      : { id: 'versiculo', status: 'indisponivel' }
  );

  const r = input.reading;
  if (!r || r.state.status === 'pausado' || r.state.status === 'concluido' || r.state.status === 'nao_iniciado') {
    steps.push({ id: 'leitura', status: 'nao_aplicavel', detail: { planStatus: r?.state.status } });
  } else if (r.completedToday) {
    steps.push({ id: 'leitura', status: 'feito', detail: { planStatus: r.state.status } });
  } else {
    steps.push({ id: 'leitura', status: 'disponivel', detail: { planStatus: r.state.status, behindBy: r.state.behindBy } });
  }

  steps.push(
    !input.hasActivePracticeDefinitions
      ? { id: 'pratica', status: 'nao_aplicavel' }
      : { id: 'pratica', status: input.practicesToday > 0 ? 'feito' : 'disponivel', detail: { practicesToday: input.practicesToday } }
  );

  steps.push(
    input.activeMemoryCards === 0
      ? { id: 'memoria', status: 'nao_aplicavel' }
      : input.dueMemoryCards > 0
        ? { id: 'memoria', status: 'disponivel', detail: { due: input.dueMemoryCards } }
        : input.memoryReviewedToday > 0
          ? { id: 'memoria', status: 'feito', detail: { reviewedToday: input.memoryReviewedToday } }
          : { id: 'memoria', status: 'nao_aplicavel', detail: { due: 0 } }
  );

  steps.push({ id: 'continuidade', status: 'disponivel', detail: { stance: input.presence.stance, daysSincePresence: input.presence.daysSincePresence ?? undefined } });

  return { date: input.today, steps };
}
