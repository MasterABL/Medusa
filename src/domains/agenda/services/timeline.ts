/**
 * MEDUSA — Agenda — Linha temporal de um dia
 *
 * Junta AgendaItem (já existente), rotina, deslocamento e buffer numa lista
 * única de intervalos ordenados. Regras:
 *  - só entra o que tem horário completo (mesma regra que a Agenda do Medusa
 *    usa pra conflito): dia inteiro e prazo não ocupam faixa de horário;
 *  - cancelado NÃO ocupa tempo (a Agenda do Medusa hoje não filtra isso em
 *    detectTimeConflicts — diferença registrada no relatório, não alterada);
 *  - um item com início + duração mas sem fim tem o fim calculado;
 *  - o que não puder entrar (fim antes do início, hora ilegível) vira `issue`
 *    com o motivo — nunca some em silêncio.
 */

import type { AgendaItem } from '../../../types/agenda';
import type { BufferRule, EntryPhase, PhasedEntry, RoutineBlock, TimelineEntry, TravelLeg } from '../model/temporal';
import { toMin, weekdayOf } from './time';

export interface DayInput {
  date: string;
  items: AgendaItem[];
  routine?: RoutineBlock[];
  travel?: TravelLeg[];
  buffers?: BufferRule[];
}

export interface BuiltDay {
  entries: TimelineEntry[];
  issues: string[];
}

function itemToEntry(item: AgendaItem, issues: string[]): TimelineEntry | undefined {
  if (item.status === 'cancelled') return undefined;
  if (item.allDay || item.kind === 'deadline') return undefined;
  if (!item.startTime) return undefined;

  const start = toMin(item.startTime);
  if (start === undefined) {
    issues.push(`"${item.title}": horário de início ilegível (${item.startTime}).`);
    return undefined;
  }
  let end: number | undefined;
  if (item.endTime) end = toMin(item.endTime);
  else if (item.durationMinutes && item.durationMinutes > 0) end = start + item.durationMinutes;
  if (end === undefined) {
    issues.push(`"${item.title}": sem horário de fim nem duração — não ocupa faixa na linha do tempo.`);
    return undefined;
  }
  if (end <= start) {
    issues.push(`"${item.title}": o fim (${item.endTime}) não é depois do início (${item.startTime}).`);
    return undefined;
  }
  return {
    id: `item:${item.id}`,
    kind: 'evento',
    title: item.title,
    domain: item.domain,
    date: item.date,
    startMin: start,
    endMin: end,
    itemId: item.id,
    itemKind: item.kind,
    fixed: item.isFlexible !== true,
  };
}

export function buildDay(input: DayInput): BuiltDay {
  const issues: string[] = [];
  const entries: TimelineEntry[] = [];

  for (const item of input.items) {
    if (item.date !== input.date) continue;
    const entry = itemToEntry(item, issues);
    if (entry) entries.push(entry);
  }

  const weekday = weekdayOf(input.date);
  for (const block of input.routine ?? []) {
    if (!block.daysOfWeek.includes(weekday)) continue;
    const start = toMin(block.startTime);
    const end = toMin(block.endTime);
    if (start === undefined || end === undefined || end <= start) {
      issues.push(`Rotina "${block.label}": horário inválido (${block.startTime}–${block.endTime}).`);
      continue;
    }
    entries.push({ id: `routine:${block.id}`, kind: block.kind, title: block.label, domain: block.domain, date: input.date, startMin: start, endMin: end, fixed: true });
  }

  for (const leg of input.travel ?? []) {
    if (leg.date !== input.date) continue;
    const start = toMin(leg.startTime);
    const end = toMin(leg.endTime);
    if (start === undefined || end === undefined || end <= start) {
      issues.push(`Deslocamento "${leg.label ?? leg.id}": horário inválido.`);
      continue;
    }
    entries.push({ id: `travel:${leg.id}`, kind: 'deslocamento', title: leg.label ?? 'Deslocamento', date: input.date, startMin: start, endMin: end, itemId: leg.forItemId, fixed: true });
  }

  // Buffers nascem dos eventos (nunca de rotina/deslocamento) e ficam grudados neles.
  const base = entries.filter((e) => e.kind === 'evento');
  for (const ev of base) {
    const rules = (input.buffers ?? []).filter((r) => (r.appliesTo.itemId && r.appliesTo.itemId === ev.itemId) || (!r.appliesTo.itemId && r.appliesTo.domain && r.appliesTo.domain === ev.domain));
    // Regra por item vence regra por domínio.
    const rule = rules.find((r) => r.appliesTo.itemId) ?? rules[0];
    if (!rule) continue;
    if (rule.beforeMinutes > 0) {
      entries.push({ id: `buffer:${ev.id}:antes`, kind: 'buffer', title: `Respiro antes de ${ev.title}`, date: input.date, startMin: Math.max(0, ev.startMin - rule.beforeMinutes), endMin: ev.startMin, itemId: ev.itemId, fixed: true });
    }
    if (rule.afterMinutes > 0) {
      entries.push({ id: `buffer:${ev.id}:depois`, kind: 'buffer', title: `Respiro depois de ${ev.title}`, date: input.date, startMin: ev.endMin, endMin: Math.min(24 * 60, ev.endMin + rule.afterMinutes), itemId: ev.itemId, fixed: true });
    }
  }

  entries.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin || a.id.localeCompare(b.id));
  return { entries, issues };
}

export function phaseEntries(entries: TimelineEntry[], nowMin: number): PhasedEntry[] {
  const next = entries.find((e) => e.kind !== 'buffer' && e.startMin > nowMin);
  return entries.map((entry): PhasedEntry => {
    let phase: EntryPhase;
    if (entry.endMin <= nowMin) phase = 'passado';
    else if (entry.startMin <= nowMin) phase = 'agora';
    else if (next && entry.id === next.id) phase = 'proximo';
    else phase = 'futuro';
    return { entry, phase };
  });
}
