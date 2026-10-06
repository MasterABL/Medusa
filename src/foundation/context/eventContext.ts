/**
 * MEDUSA FOUNDATION — Contexto de evento
 *
 * Importância sozinha não basta para decidir. Um evento precisa carregar:
 * categoria, domínio, rigidez, horário, duração, antecedência necessária,
 * deslocamento, conflito, dependências e o projeto/tarefa a que se liga.
 *
 *   Telemedicina
 *     category: telemedicine · tier: critical · rigid: true · lead: 5 min
 *
 * Reaproveita a camada temporal da Agenda (`domains/agenda`) para conflito e
 * deslocamento — não recalcula tempo.
 */

import type { AgendaItem } from '../../types/agenda';
import type { BufferRule, RoutineBlock, TravelLeg } from '../../domains/agenda/model/temporal';
import type { EventContextCategory } from '../reminders/types';
import type { ImportanceClassification, ImportanceOverrides, ImportanceRule, ImportanceTier } from './importance';
import { classifyEvent, DEFAULT_IMPORTANCE_RULES } from './importance';
import { buildDay } from '../../domains/agenda/services/timeline';
import { detectConflicts } from '../../domains/agenda/services/conflicts';

export interface EventLinks {
  relatedProjectId?: string;
  relatedTaskId?: string;
  /** Eventos que precisam acontecer antes (ex.: exame antes da consulta de retorno). */
  dependsOnEventIds?: string[];
}

export interface EventContext {
  eventId: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  startMin: number;
  endMin: number;
  durationMinutes: number;
  domain: AgendaItem['domain'];
  category: EventContextCategory;
  tier: ImportanceTier;
  rigid: boolean;
  importanceSource: ImportanceClassification['source'];
  /** Antecedência mínima recomendada para preparar/sair (minutos). */
  leadTimeMinutes: number;
  /** Deslocamento ligado a este evento (minutos), quando a Agenda sabe. */
  travelMinutes?: number;
  /** Ids (AgendaItem) que conflitam em horário com este evento. */
  conflictsWith: string[];
  /** Este evento CEDE no conflito, pela política de prioridade da Agenda. */
  yieldsInConflict: boolean;
  dependsOnEventIds: string[];
  relatedProjectId?: string;
  relatedTaskId?: string;
}

/** Antecedência padrão por tier — preparar e chegar a tempo. Configurável via parâmetro. */
export const DEFAULT_LEAD_TIME: Record<ImportanceTier, number> = { critical: 5, high: 15, medium: 15, low: 5 };

export interface BuildEventContextInput {
  date: string;
  items: AgendaItem[];
  routine?: RoutineBlock[];
  travel?: TravelLeg[];
  buffers?: BufferRule[];
  links?: Record<string, EventLinks>;
  rules?: readonly ImportanceRule[];
  overrides?: ImportanceOverrides;
  leadTime?: Partial<Record<ImportanceTier, number>>;
}

export function buildEventContexts(input: BuildEventContextInput): EventContext[] {
  const day = buildDay({ date: input.date, items: input.items, routine: input.routine, travel: input.travel, buffers: input.buffers });
  const conflicts = detectConflicts(day.entries).filter((c) => c.severity === 'hard');
  const lead = { ...DEFAULT_LEAD_TIME, ...input.leadTime };

  return day.entries
    .filter((e) => e.kind === 'evento' && e.itemId)
    .map((entry): EventContext => {
      const item = input.items.find((i) => i.id === entry.itemId)!;
      const c = classifyEvent(item, input.rules ?? DEFAULT_IMPORTANCE_RULES, input.overrides);
      const mine = conflicts.filter((x) => x.a.id === entry.id || x.b.id === entry.id);
      const travel = day.entries.filter((t) => t.kind === 'deslocamento' && t.itemId === item.id).reduce((s, t) => s + (t.endMin - t.startMin), 0);
      const links = input.links?.[item.id] ?? {};
      return {
        eventId: item.id,
        title: item.title,
        date: item.date,
        startMin: entry.startMin,
        endMin: entry.endMin,
        durationMinutes: entry.endMin - entry.startMin,
        domain: item.domain,
        category: c.category,
        tier: c.tier,
        rigid: c.rigid,
        importanceSource: c.source,
        leadTimeMinutes: lead[c.tier] + travel,
        travelMinutes: travel > 0 ? travel : undefined,
        conflictsWith: mine.map((x) => (x.a.id === entry.id ? x.b : x.a).itemId).filter((id): id is string => !!id),
        yieldsInConflict: mine.some((x) => x.resolution.yieldId === entry.id),
        dependsOnEventIds: links.dependsOnEventIds ?? [],
        relatedProjectId: links.relatedProjectId,
        relatedTaskId: links.relatedTaskId,
      };
    });
}

/** Data-hora local ISO (sem fuso) do início do evento — mesma convenção da Agenda. */
export function startIso(ctx: Pick<EventContext, 'date' | 'startMin'>): string {
  const h = String(Math.floor(ctx.startMin / 60)).padStart(2, '0');
  const m = String(ctx.startMin % 60).padStart(2, '0');
  return `${ctx.date}T${h}:${m}:00`;
}
