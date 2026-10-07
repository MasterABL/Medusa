/**
 * Itens de EXEMPLO da Agenda (as fixtures que a Agenda semeava no primeiro acesso).
 *
 * Fora do modo demonstração eles não podem virar "compromisso de verdade" em lugar
 * nenhum: nem na Hoje, nem nos lembretes (T-30/T-15...), nem nos contadores. Quem já
 * tinha esses itens salvos de uma visita anterior continua vendo-os na Agenda
 * (camada congelada, não reescrita aqui), mas a fundação os ignora.
 */
import type { AgendaItem } from '@/types/agenda';
import { getInitialAgendaItems } from '@/components/agenda/agendaFixtures';

let cache: Set<string> | null = null;

export function agendaExampleIds(): Set<string> {
  if (!cache) cache = new Set(getInitialAgendaItems().map((i) => i.id));
  return cache;
}

/** Ocorrência virtual de rotina recorrente carrega a série em `seriesId`. */
export function isAgendaExample(item: Pick<AgendaItem, 'id'> & { seriesId?: string }): boolean {
  const ids = agendaExampleIds();
  return ids.has(item.id) || (!!item.seriesId && ids.has(item.seriesId));
}

export function withoutAgendaExamples<T extends Pick<AgendaItem, 'id'> & { seriesId?: string }>(items: T[], demo: boolean): T[] {
  return demo ? items : items.filter((i) => !isAgendaExample(i));
}
