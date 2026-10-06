/**
 * MEDUSA — Agenda — Seletores de leitura
 *
 * UI -> seletor -> AgendaSource. Devolvem DataState pra tela distinguir "dia
 * vazio" de "dia com problema nos dados".
 */

import type { AgendaContextSnapshot, DaySchedule, PhasedEntry, PriorityPolicy, SlotSuggestion } from './model/temporal';
import { DEFAULT_PRIORITY_POLICY } from './model/temporal';
import type { AgendaSource } from './repository/source';
import type { DataState } from '../../foundation/types/dataState';
import * as DS from '../../foundation/dataState';
import { buildDay, phaseEntries } from './services/timeline';
import type { DayInput } from './services/timeline';
import { detectConflicts } from './services/conflicts';
import { computeFreeSlots, suggestSlots } from './services/freeTime';
import type { SuggestOptions } from './services/freeTime';

export function dayInputFrom(source: AgendaSource, date: string): DayInput {
  return {
    date,
    items: source.listItems({ from: date, to: date }),
    routine: source.listRoutine(),
    travel: source.listTravel({ from: date, to: date }),
    buffers: source.listBuffers(),
  };
}

export function selectDay(source: AgendaSource, date: string, policy: PriorityPolicy = DEFAULT_PRIORITY_POLICY): DataState<DaySchedule> {
  const built = buildDay(dayInputFrom(source, date));
  const schedule: DaySchedule = {
    date,
    entries: built.entries,
    issues: built.issues,
    conflicts: detectConflicts(built.entries, policy),
    freeSlots: computeFreeSlots(built.entries),
  };
  if (built.entries.length === 0 && built.issues.length === 0) return DS.empty('Nada agendado para este dia.');
  // Itens que não puderam entrar na linha do tempo tornam o dia PARCIAL: o dado existe, mas não está completo.
  return DS.partial(schedule, built.issues, 'fonte_incompleta', source.origin, date);
}

export function selectTimeline(source: AgendaSource, date: string, nowMin: number): DataState<PhasedEntry[]> {
  const built = buildDay(dayInputFrom(source, date));
  if (built.entries.length === 0 && built.issues.length === 0) return DS.empty('Nada agendado para este dia.');
  return DS.partial(phaseEntries(built.entries, nowMin), built.issues, 'fonte_incompleta', source.origin, date);
}

/** O que Hoje/Guardian precisam saber "agora": atual, próximo, folga real até o próximo e conflitos. */
export function selectContext(source: AgendaSource, date: string, nowMin: number, policy: PriorityPolicy = DEFAULT_PRIORITY_POLICY): DataState<AgendaContextSnapshot> {
  const built = buildDay(dayInputFrom(source, date));
  if (built.entries.length === 0 && built.issues.length === 0) return DS.empty('Nada agendado para este dia.');

  const occupying = built.entries.filter((e) => e.kind !== 'buffer');
  const current = occupying.find((e) => e.startMin <= nowMin && e.endMin > nowMin);
  const next = occupying.find((e) => e.startMin > nowMin);
  const conflicts = detectConflicts(built.entries, policy);
  const free = computeFreeSlots(built.entries, { minMinutes: 1 });

  // Folga até o próximo = soma dos vãos livres (já descontados deslocamento e buffer) entre agora e o início dele.
  let freeUntilNextMinutes: number | undefined;
  if (next) {
    freeUntilNextMinutes = free.reduce((sum, s) => {
      const from = Math.max(s.startMin, nowMin);
      const to = Math.min(s.endMin, next.startMin);
      return to > from ? sum + (to - from) : sum;
    }, 0);
  }
  const snapshot: AgendaContextSnapshot = {
    date,
    nowMin,
    current,
    next,
    freeUntilNextMinutes,
    conflictCount: conflicts.length,
    hardConflictCount: conflicts.filter((c) => c.severity === 'hard').length,
    freeMinutesRemaining: free.reduce((sum, s) => (s.endMin > nowMin ? sum + (s.endMin - Math.max(s.startMin, nowMin)) : sum), 0),
  };
  return DS.partial(snapshot, built.issues, 'fonte_incompleta', source.origin, date);
}

export function selectSlotSuggestions(source: AgendaSource, fromDate: string, durationMinutes: number, opts: SuggestOptions = {}): DataState<SlotSuggestion[]> {
  const out = suggestSlots(durationMinutes, fromDate, (d) => dayInputFrom(source, d), opts);
  return out.length === 0 ? DS.empty('Nenhum horário livre que comporte essa duração na janela pesquisada.') : DS.ready(out, 'derived', fromDate);
}
