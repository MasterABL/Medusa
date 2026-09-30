/**
 * MEDUSA — Agenda — Tempo livre que não mente
 *
 * Livre = janela do dia (padrão 06:00–23:00) menos TUDO que ocupa: evento,
 * rotina, deslocamento e buffer. Deslocamento não é tempo livre — quem está no
 * ônibus não está disponível — e buffer não some: é respiro planejado.
 *
 * Sem deslocamento/rotina/buffer na entrada, o resultado é idêntico ao de
 * `calculateFreeTimeSlots` da Agenda do Medusa (teste de paridade).
 */

import type { FreeSlot, SlotSuggestion, TimelineEntry } from '../model/temporal';
import type { BuiltDay, DayInput } from './timeline';
import { buildDay } from './timeline';
import { addDaysISO } from './time';

export interface FreeTimeOptions {
  dayStartMin?: number;
  dayEndMin?: number;
  minMinutes?: number;
  /** false = ignora buffers (modo comparação com o cálculo antigo). Padrão true. */
  respectBuffers?: boolean;
}

export function computeFreeSlots(entries: TimelineEntry[], opts: FreeTimeOptions = {}): FreeSlot[] {
  const start = opts.dayStartMin ?? 6 * 60;
  const end = opts.dayEndMin ?? 23 * 60;
  const min = opts.minMinutes ?? 30;
  const respectBuffers = opts.respectBuffers ?? true;

  const busy = entries
    .filter((e) => respectBuffers || e.kind !== 'buffer')
    .filter((e) => e.endMin > start && e.startMin < end)
    .map((e) => ({ s: Math.max(start, e.startMin), e: Math.min(end, e.endMin) }))
    .sort((a, b) => a.s - b.s);

  const merged: Array<{ s: number; e: number }> = [];
  for (const b of busy) {
    const last = merged[merged.length - 1];
    if (last && b.s <= last.e) last.e = Math.max(last.e, b.e);
    else merged.push({ ...b });
  }

  const slots: FreeSlot[] = [];
  let cursor = start;
  for (const m of merged) {
    if (m.s - cursor >= min) slots.push({ startMin: cursor, endMin: m.s, durationMinutes: m.s - cursor });
    cursor = Math.max(cursor, m.e);
  }
  if (end - cursor >= min) slots.push({ startMin: cursor, endMin: end, durationMinutes: end - cursor });
  return slots;
}

export interface SuggestOptions extends FreeTimeOptions {
  maxSuggestions?: number;
  daysToScan?: number;
  /** Só sugere a partir deste minuto no primeiro dia (ex.: agora). */
  fromMin?: number;
}

/**
 * Próximos horários REALMENTE livres (deslocamento e buffer descontados) que
 * comportam `durationMinutes`. `dayInput` monta cada dia a partir da mesma
 * fonte — a função nunca inventa um dia vazio sem perguntar.
 */
export function suggestSlots(
  durationMinutes: number,
  fromDate: string,
  dayInput: (date: string) => DayInput,
  opts: SuggestOptions = {}
): SlotSuggestion[] {
  const max = opts.maxSuggestions ?? 3;
  const days = opts.daysToScan ?? 6;
  const out: SlotSuggestion[] = [];
  for (let i = 0; i < days && out.length < max; i += 1) {
    const date = addDaysISO(fromDate, i);
    const built: BuiltDay = buildDay(dayInput(date));
    for (const slot of computeFreeSlots(built.entries, opts)) {
      if (out.length >= max) break;
      const start = i === 0 && opts.fromMin !== undefined ? Math.max(slot.startMin, opts.fromMin) : slot.startMin;
      if (slot.endMin - start < durationMinutes) continue;
      out.push({ date, startMin: start, endMin: start + durationMinutes });
    }
  }
  return out;
}
