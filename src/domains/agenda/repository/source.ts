/**
 * MEDUSA — Agenda — Fronteira de dados
 *
 * A UI/seletores nunca sabem de onde vêm os itens (estado local do React,
 * Google Calendar, fixtures). Quem implementa esta interface decide.
 */

import type { AgendaItem } from '../../../types/agenda';
import type { BufferRule, RoutineBlock, TravelLeg } from '../model/temporal';
import type { DataOrigin } from '../../../foundation/types/dataState';

export interface AgendaSource {
  readonly origin: DataOrigin;
  listItems(filter?: { from?: string; to?: string }): AgendaItem[];
  listRoutine(): RoutineBlock[];
  listTravel(filter?: { from?: string; to?: string }): TravelLeg[];
  listBuffers(): BufferRule[];
}

export function createInMemoryAgendaSource(
  origin: DataOrigin,
  data: { items?: AgendaItem[]; routine?: RoutineBlock[]; travel?: TravelLeg[]; buffers?: BufferRule[] } = {}
): AgendaSource {
  const inRange = (date: string, f?: { from?: string; to?: string }) => (!f?.from || date >= f.from) && (!f?.to || date <= f.to);
  return {
    origin,
    listItems: (f) => (data.items ?? []).filter((i) => inRange(i.date, f)),
    listRoutine: () => data.routine ?? [],
    listTravel: (f) => (data.travel ?? []).filter((t) => inRange(t.date, f)),
    listBuffers: () => data.buffers ?? [],
  };
}
