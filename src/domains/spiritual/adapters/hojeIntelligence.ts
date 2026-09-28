/**
 * MEDUSA — Spiritual → Hoje
 *
 * Compacto (no máximo 3 itens), só metadado, linguagem de convite. Nunca inclui
 * intenção, reflexão, oração ou texto de estudo do usuário.
 */

import { publish as publishMessage } from '../../../foundation/messaging/proactiveMessage';
import { formatReference } from '../model/bible';
import type { DailyVerse } from '../model/purpose';
import type { SpiritualSuggestion } from '../services/suggestionEngine';

export interface SpiritualTodayItem {
  kind: 'resume' | 'practice' | 'reading' | 'study' | 'daily_verse';
  headline: string;
  detail?: string;
  refId?: string;
  priority: 'alta' | 'normal';
}

export interface SpiritualTodayView {
  date: string;
  items: SpiritualTodayItem[];
}

const MAX_ITEMS = 3;

export function resolveSpiritualToday(input: { date: string; suggestions: SpiritualSuggestion[]; dailyVerse?: DailyVerse | null }): SpiritualTodayView {
  const items: SpiritualTodayItem[] = input.suggestions.map((s) => ({ kind: s.kind, headline: s.text, refId: s.refId, priority: s.priority }));
  if (input.dailyVerse) {
    items.push({
      kind: 'daily_verse',
      headline: `Versículo do dia: ${formatReference(input.dailyVerse.reference, { names: true })}`,
      detail: input.dailyVerse.text?.value,
      refId: input.dailyVerse.date,
      priority: 'normal',
    });
  }
  return { date: input.date, items: items.slice(0, MAX_ITEMS) };
}

/** Publica na fila de mensagens proativas (cooldown por item/dia evita repetição). */
export function publishSpiritualHojeMessages(view: SpiritualTodayView): number {
  let published = 0;
  for (const item of view.items) {
    const message = publishMessage({
      domain: 'spiritual',
      message: item.headline,
      evidence: { reason: 'Sugestão do domínio Espiritual a partir de propósito, prática ou plano de leitura.', evidence: [`tipo: ${item.kind}`, `data: ${view.date}`] },
      priority: item.priority === 'alta' ? 2 : 1,
      urgency: 'normal',
      surfaceTargets: ['hoje'],
      cooldownKey: `spiritual-${item.kind}-${item.refId ?? 'x'}-${view.date}`,
      cooldownMs: 20 * 60 * 60 * 1000,
    });
    if (message) published += 1;
  }
  return published;
}
