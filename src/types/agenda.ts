/**
 * Medusa — Agenda / Temporal OS Types
 *
 * Princípio Arquitetural Central:
 * "A Agenda conhece o tempo; cada domínio conhece o significado."
 */

export type AgendaItemKind = 'event' | 'time_block' | 'deadline' | 'routine';

export type AgendaDomain =
  | 'personal'
  | 'education'
  | 'body'
  | 'finance'
  | 'work'
  | 'external';

export type AgendaSourceType =
  | 'manual'
  | 'education_session'
  | 'review'
  | 'task'
  | 'workout'
  | 'finance_deadline'
  | 'routine'
  | 'external';

export interface AgendaSourceRef {
  sourceType: AgendaSourceType;
  sourceId?: string;
  sourceLabel?: string;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval?: number;
  daysOfWeek?: number[]; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  until?: string; // YYYY-MM-DD
  count?: number;
}

export interface AgendaCategory {
  id: string;
  name: string;
  colorId: string;
  domain: AgendaDomain;
  isCustom?: boolean;
}

export interface AgendaItem {
  id: string;
  title: string;
  kind: AgendaItemKind;
  domain: AgendaDomain;
  categoryId: string;
  colorId: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  durationMinutes?: number;
  allDay?: boolean;
  isFlexible?: boolean; // Para time_block: flexível vs fixo
  recurrence?: RecurrenceRule;
  seriesId?: string;
  isException?: boolean;
  description?: string;
  location?: string;
  source: AgendaSourceRef;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface TimeConflict {
  itemA: AgendaItem;
  itemB: AgendaItem;
  overlapMinutes: number;
  start: string;
  end: string;
  durationLabel: string;
}

export interface FreeTimeSlot {
  start: string;
  end: string;
  durationMinutes: number;
  label: string;
}

export type AgendaViewMode = 'dia' | 'semana' | 'mes' | 'lista';

export type ListBucketKind = 'agora' | 'proximo' | 'depois' | 'mais_tarde';

export interface ListBucket {
  kind: ListBucketKind;
  title: string;
  description: string;
  items: AgendaItem[];
}
