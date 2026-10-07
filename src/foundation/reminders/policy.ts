/**
 * MEDUSA FOUNDATION — Reminder Policy & Event Importance Classifier
 *
 * Classifica a importância e contexto dos eventos da Agenda e resolve a política
 * de lembretes proativos adequada para cada perfil de compromisso.
 */

import type { AgendaItem } from '../../types/agenda';
import { classifyEvent, toLegacyImportance } from '../context/importance';
import type { ImportanceTier, ImportanceClassification } from '../context/importance';
import type {
  EventImportance,
  EventContextCategory,
  ReminderPolicy,
  ReminderIntent,
} from './types';

export interface ExtendedAgendaItemProps {
  importance?: EventImportance;
  contextCategory?: EventContextCategory;
}

/**
 * Classifica a importância e categoria contextual do evento.
 *
 * Desde o Personal OS Core, delega para a tabela de regras configurável
 * (`foundation/context/importance.ts`). O retorno mantém o formato antigo
 * (`importance` high/medium/low + `category`) para quem já consome isto, e
 * acrescenta `tier` (com `critical`), `rigid` e a procedência da decisão.
 */
export function classifyEventImportance(item: AgendaItem & ExtendedAgendaItemProps): {
  importance: EventImportance;
  category: EventContextCategory;
  tier: ImportanceTier;
  rigid: boolean;
  source: ImportanceClassification['source'];
} {
  const c = classifyEvent(item);
  return { importance: toLegacyImportance(c.tier), category: c.category, tier: c.tier, rigid: c.rigid, source: c.source };
}

/**
 * Resolve a ReminderPolicy para um determinado evento.
 * Alto impacto: T-5 (crítico) e T-15 (preparação).
 * Médio impacto: T-15 e T-5.
 * Baixo impacto: T-5.
 */
export function resolvePolicyForEvent(item: AgendaItem): ReminderPolicy {
  const { importance, category } = classifyEventImportance(item);

  if (importance === 'high') {
    return {
      id: `policy_high_${category}`,
      importance: 'high',
      contextCategory: category,
      triggerOffsetsMinutes: [15, 5], // T-15 e T-5 principal
      allowedChannels: ['dynamic_island', 'web_notification', 'native_mobile_alarm'],
      cooldownMs: 120_000, // 2 minutos para evitar disparo duplicado
      autonomyLevel: 'L1', // Autônomo para lembrar — não gera burocracia de aprovação
      requiresAcknowledgement: true,
    };
  }

  if (importance === 'medium') {
    return {
      id: `policy_medium_${category}`,
      importance: 'medium',
      contextCategory: category,
      triggerOffsetsMinutes: [15, 5],
      allowedChannels: ['dynamic_island', 'web_notification'],
      cooldownMs: 180_000,
      autonomyLevel: 'L1',
      requiresAcknowledgement: false,
    };
  }

  return {
    id: `policy_low_${category}`,
    importance: 'low',
    contextCategory: category,
    triggerOffsetsMinutes: [5],
    allowedChannels: ['dynamic_island'],
    cooldownMs: 300_000,
    autonomyLevel: 'L1',
    requiresAcknowledgement: false,
  };
}

/**
 * Avalia se um item gera ReminderIntents no instante `now`.
 * Respeita janela temporal até o evento e gatilhos da política (ex: T-5).
 */
export function evaluateEventForReminders(
  item: AgendaItem,
  now: Date,
  policy?: ReminderPolicy
): ReminderIntent[] {
  // Se evento foi cancelado ou completado, não gera lembretes
  if (item.status === 'cancelled' || item.status === 'completed') {
    return [];
  }

  // Evento precisa ter data e startTime
  if (!item.date || !item.startTime) {
    return [];
  }

  const activePolicy = policy || resolvePolicyForEvent(item);
  const [startHour, startMin] = item.startTime.split(':').map(Number);
  if (isNaN(startHour) || isNaN(startMin)) {
    return [];
  }

  // Monta data de início do evento em UTC local
  const eventStartDate = new Date(`${item.date}T${item.startTime.padStart(5, '0')}:00`);
  if (isNaN(eventStartDate.getTime())) {
    return [];
  }

  const deltaMinutes = (eventStartDate.getTime() - now.getTime()) / (1000 * 60);

  // Se o evento já começou há mais de 2 minutos, já passou da janela de lembrete pré-evento
  if (deltaMinutes < -2) {
    return [];
  }

  const intents: ReminderIntent[] = [];

  for (const offset of activePolicy.triggerOffsetsMinutes) {
    // Tolerância de janela de disparo: entre (offset - 0.5) e (offset + 1.5) minutos antes
    // Ou se estiver entre 0 e offset no momento da avaliação
    const isWithinWindow = deltaMinutes <= offset + 1.0 && deltaMinutes >= offset - 1.5;

    if (isWithinWindow) {
      const minutesRemaining = Math.max(1, Math.round(deltaMinutes));
      const isCritical = activePolicy.importance === 'high' && offset <= 5;

      intents.push({
        id: `intent_${item.id}_T${offset}_${now.getTime()}`,
        eventId: item.id,
        eventTitle: item.title,
        eventStartTime: item.startTime,
        eventDate: item.date,
        importance: activePolicy.importance,
        contextCategory: activePolicy.contextCategory,
        triggerOffsetMinutes: offset,
        scheduledTriggerTime: new Date(eventStartDate.getTime() - offset * 60_000).toISOString(),
        urgency: isCritical ? 'critical' : activePolicy.importance === 'high' ? 'urgent' : 'normal',
        message: `${item.title} começa em ${minutesRemaining} min`,
        actionLabel: 'Abrir compromisso',
        actionUrl: `#agenda`,
        actionPayload: {
          eventId: item.id,
          date: item.date,
          category: activePolicy.contextCategory,
        },
        createdAt: now.toISOString(),
      });
    }
  }

  return intents;
}
