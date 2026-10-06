/**
 * MEDUSA FOUNDATION — Proactive Reminders & Event Importance Engine
 *
 * Contratos de domínio para lembretes proativos:
 * evento -> importância/contexto -> policy -> intent -> delivery -> acknowledgement
 *
 * REGRA ABSOLUTA DO MEDUSA:
 * Integrações externas inexistentes (ex: alarme nativo do celular em Web)
 * são explicitamente marcadas como 'BLOCKED' com motivo técnico real.
 * Nenhuma feature ou sucesso falso.
 */

export type EventImportance = 'high' | 'medium' | 'low';

export type EventContextCategory =
  | 'telemedicine'          // Telemedicina / consulta online
  | 'medical_consultation'  // Consulta presencial / exame
  | 'exam'                  // Prova / avaliação
  | 'critical_meeting'      // Reunião com horário rígido
  | 'strict_appointment'    // Compromisso inadiável
  | 'workout'               // Treino / atividade física
  | 'study'                 // Estudo / sessão de aprendizado
  | 'practice'              // Prática espiritual / hábito
  | 'task'                  // Tarefa operacional
  | 'optional_reminder'     // Lembrete flexível
  | 'flexible_block';       // Bloco de tempo opcional

export type ReminderChannel =
  | 'dynamic_island'        // In-app Dynamic Island prioritária e acionável
  | 'web_notification'     // Web Notification API (quando suportada e permitida)
  | 'native_mobile_alarm';  // Alarme nativo do sistema operacional do celular (BLOQUEADO na Web)

export type ChannelStatus =
  | 'AVAILABLE'             // Canal disponível e operacional
  | 'PERMISSION_REQUIRED'   // Canal suportado, mas requer permissão do usuário
  | 'BLOCKED'               // Canal bloqueado por limitação de plataforma
  | 'NOT_IMPLEMENTED';      // Canal planejado mas ainda não implementado

export interface ReminderPolicy {
  id: string;
  importance: EventImportance;
  contextCategory: EventContextCategory;
  /** Gatilhos em minutos antes do início do evento (ex: [5] para T-5, [15, 5] para T-15 e T-5) */
  triggerOffsetsMinutes: number[];
  allowedChannels: ReminderChannel[];
  /** Cooldown em milissegundos para evitar reenvio/spam do mesmo evento */
  cooldownMs: number;
  /** Nível de autonomia do Guardian (lembretes de rotina são L1 - autônomo sem burocracia) */
  autonomyLevel: 'L1' | 'L2' | 'L3';
  requiresAcknowledgement: boolean;
}

export interface ReminderIntent {
  id: string;
  eventId: string;
  eventTitle: string;
  eventStartTime: string; // ISO ou HH:mm
  eventDate: string;      // YYYY-MM-DD
  importance: EventImportance;
  contextCategory: EventContextCategory;
  triggerOffsetMinutes: number; // ex: 5 (T-5)
  scheduledTriggerTime: string; // ISO timestamp
  urgency: 'critical' | 'urgent' | 'normal' | 'low';
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  actionPayload?: Record<string, unknown>;
  createdAt: string;
}

export type DeliveryStatus = 'delivered' | 'failed' | 'blocked' | 'queued' | 'suppressed_by_cooldown';

export interface ReminderDelivery {
  id: string;
  intentId: string;
  eventId: string;
  channel: ReminderChannel;
  channelStatus: ChannelStatus;
  status: DeliveryStatus;
  attemptedAt: string;
  deliveredAt?: string;
  blockReason?: string;
  errorMessage?: string;
}

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'blocked';

export interface ChannelPermission {
  channel: ReminderChannel;
  state: PermissionState;
  explanation: string;
}

export type AcknowledgementAction =
  | 'unacknowledged'
  | 'viewed'
  | 'opened'
  | 'dismissed'
  | 'snoozed';

export interface ReminderAcknowledgement {
  intentId: string;
  eventId: string;
  action: AcknowledgementAction;
  timestamp: string;
  snoozeMinutes?: number;
}
