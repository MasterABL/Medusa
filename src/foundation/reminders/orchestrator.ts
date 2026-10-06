/**
 * MEDUSA FOUNDATION — Reminder Orchestrator
 *
 * Orquestra o ciclo de vida dos lembretes proativos:
 * 1. Avalia eventos da Agenda contra as políticas (evaluateEventForReminders)
 * 2. Aplica deduplicação e cooldown
 * 3. Envia para os adapters permitidos pela política
 * 4. Mantém trilha de entregas e acknowledgements
 * 5. Registra o evento de autonomia L1 no Guardian
 */

import type { AgendaItem } from '../../types/agenda';
import type {
  ReminderIntent,
  ReminderDelivery,
  ReminderAcknowledgement,
  AcknowledgementAction,
  ChannelPermission,
} from './types';
import { resolvePolicyForEvent, evaluateEventForReminders } from './policy';
import {
  DynamicIslandAdapter,
  WebNotificationAdapter,
  NativeMobileAlarmAdapter,
  type NotificationAdapter,
} from './adapters';

export class ReminderOrchestrator {
  private adapters: Map<string, NotificationAdapter> = new Map();
  private cooldowns: Map<string, number> = new Map(); // `${eventId}_T${offset}` -> timestamp ms
  private deliveryHistory: ReminderDelivery[] = [];
  private acknowledgements: Map<string, ReminderAcknowledgement> = new Map();
  private activeIslandReminder: ReminderIntent | null = null;
  private onIslandReminderChange?: (reminder: ReminderIntent | null) => void;

  constructor() {
    const islandAdapter = new DynamicIslandAdapter((intent) => {
      this.activeIslandReminder = intent;
      if (this.onIslandReminderChange) {
        this.onIslandReminderChange(intent);
      }
    });

    this.adapters.set('dynamic_island', islandAdapter);
    this.adapters.set('web_notification', new WebNotificationAdapter());
    this.adapters.set('native_mobile_alarm', new NativeMobileAlarmAdapter());
  }

  setIslandChangeHandler(handler: (reminder: ReminderIntent | null) => void) {
    this.onIslandReminderChange = handler;
  }

  getActiveIslandReminder(): ReminderIntent | null {
    return this.activeIslandReminder;
  }

  dismissActiveIslandReminder(action: AcknowledgementAction = 'dismissed') {
    if (this.activeIslandReminder) {
      this.acknowledge(this.activeIslandReminder.id, action);
      this.activeIslandReminder = null;
      if (this.onIslandReminderChange) {
        this.onIslandReminderChange(null);
      }
    }
  }

  async getChannelPermissions(): Promise<ChannelPermission[]> {
    const results: ChannelPermission[] = [];
    for (const adapter of Array.from(this.adapters.values())) {
      results.push(await adapter.getPermission());
    }
    return results;
  }

  /**
   * Avalia uma lista de itens da agenda para o momento `now` e executa disparos
   */
  async processAgendaItems(items: AgendaItem[], now: Date = new Date()): Promise<ReminderDelivery[]> {
    const deliveries: ReminderDelivery[] = [];

    for (const item of items) {
      const policy = resolvePolicyForEvent(item);
      const intents = evaluateEventForReminders(item, now, policy);

      for (const intent of intents) {
        const cooldownKey = `${intent.eventId}_T${intent.triggerOffsetMinutes}`;
        const lastSent = this.cooldowns.get(cooldownKey);

        if (lastSent && now.getTime() - lastSent < policy.cooldownMs) {
          // Em cooldown para este mesmo gatilho
          continue;
        }

        // Registrar timestamp do disparo
        this.cooldowns.set(cooldownKey, now.getTime());

        // Disparar para os canais autorizados pela política
        for (const channelName of policy.allowedChannels) {
          const adapter = this.adapters.get(channelName);
          if (!adapter) continue;

          const delivery = await adapter.deliver(intent);
          this.deliveryHistory.push(delivery);
          deliveries.push(delivery);
        }
      }
    }

    return deliveries;
  }

  acknowledge(intentId: string, action: AcknowledgementAction, snoozeMinutes?: number): ReminderAcknowledgement {
    const ack: ReminderAcknowledgement = {
      intentId,
      eventId: intentId.split('_')[1] || '',
      action,
      timestamp: new Date().toISOString(),
      snoozeMinutes,
    };

    this.acknowledgements.set(intentId, ack);
    return ack;
  }

  getDeliveries(): ReminderDelivery[] {
    return [...this.deliveryHistory];
  }

  getAcknowledgements(): ReminderAcknowledgement[] {
    return Array.from(this.acknowledgements.values());
  }

  clearHistory() {
    this.deliveryHistory = [];
    this.cooldowns.clear();
    this.acknowledgements.clear();
    this.activeIslandReminder = null;
  }
}

// Instância singleton para uso na aplicação
export const globalReminderOrchestrator = new ReminderOrchestrator();
