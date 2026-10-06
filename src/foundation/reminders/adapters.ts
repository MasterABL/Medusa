/**
 * MEDUSA FOUNDATION — Notification Adapters
 *
 * Implementa os adapters para entrega de lembretes nos canais suportados:
 * 1. Dynamic Island (In-app, prioritário e acionável)
 * 2. Web Notification (Web API padrão do navegador)
 * 3. Alarme Nativo do Celular (MARCADO EXPLICITAMENTE COMO BLOQUEADO NA WEB)
 *
 * REGRA ABSOLUTA DO MEDUSA:
 * Nunca simular sucesso de alarme nativo de celular quando rodando em ambiente Web.
 */

import type {
  ReminderChannel,
  ChannelStatus,
  ChannelPermission,
  ReminderDelivery,
  ReminderIntent,
} from './types';

export interface NotificationAdapter {
  channel: ReminderChannel;
  getStatus(): ChannelStatus;
  getPermission(): Promise<ChannelPermission>;
  requestPermission?(): Promise<ChannelPermission>;
  deliver(intent: ReminderIntent): Promise<ReminderDelivery>;
}

/**
 * Adapter 1: In-App Dynamic Island
 * Sempre disponível na aplicação web / desktop / mobile.
 */
export class DynamicIslandAdapter implements NotificationAdapter {
  channel: ReminderChannel = 'dynamic_island';

  private onDeliverCallback?: (intent: ReminderIntent) => void;

  constructor(onDeliver?: (intent: ReminderIntent) => void) {
    this.onDeliverCallback = onDeliver;
  }

  setCallback(cb: (intent: ReminderIntent) => void) {
    this.onDeliverCallback = cb;
  }

  getStatus(): ChannelStatus {
    return 'AVAILABLE';
  }

  async getPermission(): Promise<ChannelPermission> {
    return {
      channel: this.channel,
      state: 'granted',
      explanation: 'Dynamic Island é componente interno do Medusa e tem permissão concedida por padrão.',
    };
  }

  async deliver(intent: ReminderIntent): Promise<ReminderDelivery> {
    const now = new Date().toISOString();
    try {
      if (this.onDeliverCallback) {
        this.onDeliverCallback(intent);
      }

      return {
        id: `del_island_${intent.id}`,
        intentId: intent.id,
        eventId: intent.eventId,
        channel: this.channel,
        channelStatus: 'AVAILABLE',
        status: 'delivered',
        attemptedAt: now,
        deliveredAt: now,
      };
    } catch (err: unknown) {
      return {
        id: `del_island_${intent.id}`,
        intentId: intent.id,
        eventId: intent.eventId,
        channel: this.channel,
        channelStatus: 'AVAILABLE',
        status: 'failed',
        attemptedAt: now,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

/**
 * Adapter 2: Web Notification API (Navegador)
 * Suportado em navegadores modernos quando o usuário autoriza.
 */
export class WebNotificationAdapter implements NotificationAdapter {
  channel: ReminderChannel = 'web_notification';

  getStatus(): ChannelStatus {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'BLOCKED';
    }
    if (Notification.permission === 'granted') {
      return 'AVAILABLE';
    }
    return 'PERMISSION_REQUIRED';
  }

  async getPermission(): Promise<ChannelPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return {
        channel: this.channel,
        state: 'unsupported',
        explanation: 'Web Notification API não é suportada neste ambiente de execução.',
      };
    }

    const state = Notification.permission as 'granted' | 'denied' | 'default';
    return {
      channel: this.channel,
      state: state === 'default' ? 'prompt' : state,
      explanation:
        state === 'granted'
          ? 'Notificações web autorizadas pelo usuário.'
          : state === 'denied'
          ? 'Notificações web bloqueadas pelo usuário nas configurações do navegador.'
          : 'Notificações web aguardando solicitação de permissão.',
    };
  }

  async requestPermission(): Promise<ChannelPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return this.getPermission();
    }

    try {
      const result = await Notification.requestPermission();
      return {
        channel: this.channel,
        state: result === 'default' ? 'prompt' : result,
        explanation: `Permissão de notificação web: ${result}`,
      };
    } catch {
      return this.getPermission();
    }
  }

  async deliver(intent: ReminderIntent): Promise<ReminderDelivery> {
    const now = new Date().toISOString();
    const status = this.getStatus();

    if (status !== 'AVAILABLE') {
      return {
        id: `del_web_${intent.id}`,
        intentId: intent.id,
        eventId: intent.eventId,
        channel: this.channel,
        channelStatus: status,
        status: 'blocked',
        attemptedAt: now,
        blockReason:
          status === 'PERMISSION_REQUIRED'
            ? 'Permissão de notificação web necessária antes do envio.'
            : 'Web Notification não suportada neste navegador.',
      };
    }

    try {
      new Notification(`Medusa · ${intent.importance.toUpperCase()}`, {
        body: intent.message,
        icon: '/favicon.ico',
        tag: `medusa_event_${intent.eventId}`,
        data: intent.actionPayload,
      });

      return {
        id: `del_web_${intent.id}`,
        intentId: intent.id,
        eventId: intent.eventId,
        channel: this.channel,
        channelStatus: 'AVAILABLE',
        status: 'delivered',
        attemptedAt: now,
        deliveredAt: now,
      };
    } catch (err: unknown) {
      return {
        id: `del_web_${intent.id}`,
        intentId: intent.id,
        eventId: intent.eventId,
        channel: this.channel,
        channelStatus: 'AVAILABLE',
        status: 'failed',
        attemptedAt: now,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

/**
 * Adapter 3: Alarme Nativo do Celular (Mobile AlarmManager / EventKit / Clock)
 *
 * CONTRATO HONESTO DO MEDUSA:
 * Na plataforma Web SPA atual, uma aplicação não tem acesso de hardware
 * ao subsistema de alarme nativo de relógio do iOS/Android.
 * Este adapter declara explicitamente o status 'BLOCKED' e registra a tentativa.
 * NÃO SIMULA ALARME FALSO.
 */
export class NativeMobileAlarmAdapter implements NotificationAdapter {
  channel: ReminderChannel = 'native_mobile_alarm';

  getStatus(): ChannelStatus {
    // Declarado como BLOQUEADO no ambiente Web SPA atual
    return 'BLOCKED';
  }

  async getPermission(): Promise<ChannelPermission> {
    return {
      channel: this.channel,
      state: 'blocked',
      explanation:
        'BLOQUEADO: Acesso ao aplicativo de alarmes nativo do celular requer wrapper móvel (React Native / Capacitor / Swift / Kotlin) com permissões SCHEDULE_EXACT_ALARM / EventKit.',
    };
  }

  async deliver(intent: ReminderIntent): Promise<ReminderDelivery> {
    const now = new Date().toISOString();
    return {
      id: `del_native_alarm_${intent.id}`,
      intentId: intent.id,
      eventId: intent.eventId,
      channel: this.channel,
      channelStatus: 'BLOCKED',
      status: 'blocked',
      attemptedAt: now,
      blockReason:
        'BLOQUEADO: integração nativa necessária (Mobile / AlarmManager / EventKit não disponível em ambiente Web SPA). Nenhuma feature simulada.',
    };
  }
}
