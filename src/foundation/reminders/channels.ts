/**
 * MEDUSA FOUNDATION — Canais de notificação padronizados
 *
 *   DynamicIsland · WebNotification · NativeMobileNotification · Email · (futuros)
 *
 * Cada canal responde, sem fingir: está disponível? precisa de permissão?
 * está bloqueado pela plataforma? não foi implementado? — e cada entrega
 * volta como delivered / failed / blocked / permission_required / not_implemented.
 *
 * Só DynamicIsland e WebNotification entregam de verdade. Notificação nativa de
 * celular exige app nativo (não existe no Medusa web) → BLOQUEADO. E-mail não
 * tem infraestrutura de envio no Medusa → NÃO IMPLEMENTADO. Nenhum dos dois
 * devolve "delivered".
 */

export type NotificationChannelId = 'dynamic_island' | 'web_notification' | 'native_mobile_notification' | 'email';

export type ChannelCapabilityStatus = 'available' | 'permission-required' | 'blocked' | 'not-implemented';

export interface ChannelCapability {
  channel: NotificationChannelId;
  status: ChannelCapabilityStatus;
  reason: string;
}

export type ChannelDeliveryStatus = 'delivered' | 'failed' | 'blocked' | 'permission_required' | 'not_implemented' | 'skipped';

export interface ChannelDeliveryResult {
  channel: NotificationChannelId;
  status: ChannelDeliveryStatus;
  at: string;
  reason?: string;
}

/** O que um canal recebe. Texto de UI é responsabilidade de quem renderiza; aqui vai o mínimo. */
export interface NotificationPayload {
  reminderId: string;
  eventId: string;
  title: string;
  /** Mensagem curta factual (ex.: "começa em 5 min"). */
  body: string;
  tier: 'critical' | 'high' | 'medium' | 'low';
  offsetMinutes: number;
  /** Para abrir o compromisso. */
  target: { tab: 'agenda'; eventId: string; date: string };
}

export interface NotificationChannel {
  id: NotificationChannelId;
  capability(): ChannelCapability;
  deliver(payload: NotificationPayload, now: string): ChannelDeliveryResult;
}

/** Dynamic Island: canal interno. Entrega = entregar a intenção a quem renderiza a ilha. */
export function createDynamicIslandChannel(sink: (payload: NotificationPayload) => void): NotificationChannel {
  return {
    id: 'dynamic_island',
    capability: () => ({ channel: 'dynamic_island', status: 'available', reason: 'Componente interno do Medusa.' }),
    deliver(payload, now) {
      try {
        sink(payload);
        return { channel: 'dynamic_island', status: 'delivered', at: now };
      } catch (err) {
        return { channel: 'dynamic_island', status: 'failed', at: now, reason: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}

/** Ambiente da Web Notification API — injetável para teste; o padrão lê `window`. */
export interface WebNotificationEnv {
  supported: boolean;
  permission: 'granted' | 'denied' | 'default';
  show(title: string, options: { body: string; tag: string; data?: unknown }): void;
}

export function browserWebNotificationEnv(): WebNotificationEnv {
  const w = typeof window !== 'undefined' ? (window as unknown as { Notification?: { permission: 'granted' | 'denied' | 'default'; new (t: string, o: unknown): unknown } }) : undefined;
  const N = w?.Notification;
  return {
    supported: !!N,
    permission: N?.permission ?? 'default',
    show: (title, options) => {
      if (!N) throw new Error('Web Notification indisponível');
      new N(title, options);
    },
  };
}

export function createWebNotificationChannel(env: () => WebNotificationEnv = browserWebNotificationEnv): NotificationChannel {
  const capability = (): ChannelCapability => {
    const e = env();
    if (!e.supported) return { channel: 'web_notification', status: 'blocked', reason: 'Web Notification API não suportada neste ambiente.' };
    if (e.permission === 'denied') return { channel: 'web_notification', status: 'blocked', reason: 'Notificações bloqueadas pelo usuário no navegador.' };
    if (e.permission === 'default') return { channel: 'web_notification', status: 'permission-required', reason: 'Permissão de notificação ainda não concedida.' };
    return { channel: 'web_notification', status: 'available', reason: 'Permissão concedida.' };
  };
  return {
    id: 'web_notification',
    capability,
    deliver(payload, now) {
      const cap = capability();
      if (cap.status === 'permission-required') return { channel: 'web_notification', status: 'permission_required', at: now, reason: cap.reason };
      if (cap.status !== 'available') return { channel: 'web_notification', status: 'blocked', at: now, reason: cap.reason };
      try {
        env().show(payload.title, { body: payload.body, tag: `medusa:${payload.eventId}:${payload.offsetMinutes}`, data: payload.target });
        return { channel: 'web_notification', status: 'delivered', at: now };
      } catch (err) {
        return { channel: 'web_notification', status: 'failed', at: now, reason: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}

/** Notificação/alarme nativo do celular: o adapter existe, o canal não (app nativo inexistente). */
export function createNativeMobileChannel(): NotificationChannel {
  const reason = 'BLOQUEADO: exige app nativo (Capacitor/React Native/Kotlin/Swift) com permissão de notificação/alarme exato. O Medusa roda como web app.';
  return {
    id: 'native_mobile_notification',
    capability: () => ({ channel: 'native_mobile_notification', status: 'blocked', reason }),
    deliver: (_payload, now) => ({ channel: 'native_mobile_notification', status: 'blocked', at: now, reason }),
  };
}

export function createEmailChannel(): NotificationChannel {
  const reason = 'NÃO IMPLEMENTADO: o Medusa não tem serviço de envio de e-mail configurado.';
  return {
    id: 'email',
    capability: () => ({ channel: 'email', status: 'not-implemented', reason }),
    deliver: (_payload, now) => ({ channel: 'email', status: 'not_implemented', at: now, reason }),
  };
}

export type ChannelRegistry = Map<NotificationChannelId, NotificationChannel>;

export function createChannelRegistry(channels: NotificationChannel[]): ChannelRegistry {
  return new Map(channels.map((c) => [c.id, c]));
}

export function channelCapabilities(registry: ChannelRegistry): ChannelCapability[] {
  return Array.from(registry.values()).map((c) => c.capability());
}
