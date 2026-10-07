import type { AgendaItem } from '@/types/agenda';
import type { IntervaloOcupado } from '@/components/education/cronogramaPlanner';
import { expandRecurringItems } from '@/components/agenda/agendaHelpers';

/**
 * Intervalos já ocupados na Agenda nos próximos `dias` dias (recorrência expandida),
 * para quem gera blocos novos não colocar nada por cima de um compromisso real.
 * Blocos que vão ser substituídos (ex.: os do próprio cronograma) entram em `ignorar`.
 */
export function intervalosOcupados(items: AgendaItem[], hoje: Date = new Date(), dias = 8, ignorar: (it: AgendaItem) => boolean = () => false): IntervaloOcupado[] {
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + dias);
  return expandRecurringItems(items, new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()), fim)
    .filter((it) => !ignorar(it) && it.status !== 'cancelled' && !it.allDay && it.startTime && it.endTime)
    .map((it) => ({ date: it.date, startTime: it.startTime!, endTime: it.endTime! }));
}
