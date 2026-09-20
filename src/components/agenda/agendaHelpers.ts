/**
 * Medusa — Agenda Temporal Helpers
 *
 * Algoritmos para navegação temporal, cálculo de conflitos com duração,
 * identificação de tempo livre (>= 30min), agrupamento em lista (Agora, Próximo, Depois, Mais tarde)
 * e projeção virtual de rotinas recorrentes.
 */

import {
  AgendaItem,
  AgendaViewMode,
  FreeTimeSlot,
  ListBucket,
  TimeConflict,
} from '@/types/agenda';
import { formatDateISO } from './agendaFixtures';

/**
 * Converte "HH:mm" em minutos a partir de 00:00
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Converte minutos a partir de 00:00 em "HH:mm"
 */
export function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calcula a duração em minutos entre dois horários
 */
export function calculateDurationMinutes(start: string, end: string): number {
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);
  return Math.max(0, endMin - startMin);
}

/**
 * Formata duração legível: "30 min", "1h", "1h 30min", "2h"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h ${m}min`;
}

/**
 * Nomes dos meses em português
 */
const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/**
 * Nomes dos dias da semana em português (0 = Domingo)
 */
export const WEEK_DAY_NAMES = [
  { short: 'Dom', full: 'Domingo' },
  { short: 'Seg', full: 'Segunda-feira' },
  { short: 'Ter', full: 'Terça-feira' },
  { short: 'Qua', full: 'Quarta-feira' },
  { short: 'Qui', full: 'Quinta-feira' },
  { short: 'Sex', full: 'Sexta-feira' },
  { short: 'Sáb', full: 'Sábado' },
];

/**
 * Formata rótulo do período para o header da Agenda:
 * - Dia: "23 de setembro de 2026"
 * - Semana: "21–27 de setembro de 2026"
 * - Mês: "Setembro de 2026"
 * - Lista: "23 de setembro de 2026"
 */
export function formatPeriodLabel(date: Date, viewMode: AgendaViewMode): string {
  const year = date.getFullYear();
  const month = MONTH_NAMES[date.getMonth()];
  const day = date.getDate();

  if (viewMode === 'dia' || viewMode === 'lista') {
    return `${day} de ${month} de ${year}`;
  }

  if (viewMode === 'mes') {
    return `${month.charAt(0).toUpperCase() + month.slice(1)} de ${year}`;
  }

  // Semana: Segunda a Domingo
  const week = getWeekDays(date);
  const first = week[0];
  const last = week[6];

  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()}–${last.getDate()} de ${MONTH_NAMES[first.getMonth()]} de ${year}`;
  }

  return `${first.getDate()} de ${MONTH_NAMES[first.getMonth()]} – ${last.getDate()} de ${MONTH_NAMES[last.getMonth()]} de ${year}`;
}

/**
 * Retorna os 7 dias da semana (Segunda a Domingo) contendo a data informada
 */
export function getWeekDays(referenceDate: Date): Date[] {
  const d = new Date(referenceDate);
  const dayOfWeek = d.getDay(); // 0 = Dom, 1 = Seg, ...
  // Queremos Segunda como primeiro dia da semana (offset = 1)
  const diffToMonday = (dayOfWeek + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const next = new Date(d);
    next.setDate(d.getDate() + i);
    days.push(next);
  }
  return days;
}

/**
 * Retorna as células do grid mensal (42 células: 6 semanas de 7 dias, começando na Segunda)
 */
export function getMonthDays(referenceDate: Date): { date: Date; isCurrentMonth: boolean }[] {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Offset para Segunda-feira
  const diffToMonday = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - diffToMonday);

  const cells: { date: Date; isCurrentMonth: boolean }[] = [];
  const current = new Date(startDate);

  for (let i = 0; i < 42; i++) {
    cells.push({
      date: new Date(current),
      isCurrentMonth: current.getMonth() === month,
    });
    current.setDate(current.getDate() + 1);
  }

  return cells;
}

/**
 * Navegação temporal anterior
 */
export function getPrevDate(currentDate: Date, viewMode: AgendaViewMode): Date {
  const d = new Date(currentDate);
  if (viewMode === 'dia' || viewMode === 'lista') {
    d.setDate(d.getDate() - 1);
  } else if (viewMode === 'semana') {
    d.setDate(d.getDate() - 7);
  } else if (viewMode === 'mes') {
    d.setMonth(d.getMonth() - 1);
  }
  return d;
}

/**
 * Navegação temporal próxima
 */
export function getNextDate(currentDate: Date, viewMode: AgendaViewMode): Date {
  const d = new Date(currentDate);
  if (viewMode === 'dia' || viewMode === 'lista') {
    d.setDate(d.getDate() + 1);
  } else if (viewMode === 'semana') {
    d.setDate(d.getDate() + 7);
  } else if (viewMode === 'mes') {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

/**
 * Detecta conflitos temporais entre itens agendados no mesmo dia.
 * Retorna os pares sobrepostos e a duração exata do conflito ("Conflito · 30 min").
 */
export function detectTimeConflicts(items: AgendaItem[]): TimeConflict[] {
  // Apenas itens com horários definidos participam de colisão na timeline
  const timedItems = items.filter(
    (it) => !it.allDay && it.kind !== 'deadline' && it.startTime && it.endTime
  );

  const conflicts: TimeConflict[] = [];

  for (let i = 0; i < timedItems.length; i++) {
    for (let j = i + 1; j < timedItems.length; j++) {
      const a = timedItems[i];
      const b = timedItems[j];

      if (a.date !== b.date) continue;

      const startA = parseTimeToMinutes(a.startTime!);
      const endA = parseTimeToMinutes(a.endTime!);
      const startB = parseTimeToMinutes(b.startTime!);
      const endB = parseTimeToMinutes(b.endTime!);

      // Verificação de interseção
      if (startA < endB && startB < endA) {
        const overlapStart = Math.max(startA, startB);
        const overlapEnd = Math.min(endA, endB);
        const overlapMinutes = overlapEnd - overlapStart;

        if (overlapMinutes > 0) {
          conflicts.push({
            itemA: a,
            itemB: b,
            overlapMinutes,
            start: formatMinutesToTime(overlapStart),
            end: formatMinutesToTime(overlapEnd),
            durationLabel: `Conflito · ${formatDuration(overlapMinutes)}`,
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Identifica intervalos de tempo livre >= 30 minutos entre horários de operação (padrão 06:00 às 23:00)
 */
export function calculateFreeTimeSlots(
  items: AgendaItem[],
  dayStartHour = 6,
  dayEndHour = 23
): FreeTimeSlot[] {
  const startLimit = dayStartHour * 60;
  const endLimit = dayEndHour * 60;

  // Filtrar itens temporais do dia que ocupam horário
  const timed = items
    .filter((it) => !it.allDay && it.kind !== 'deadline' && it.startTime && it.endTime)
    .map((it) => ({
      start: parseTimeToMinutes(it.startTime!),
      end: parseTimeToMinutes(it.endTime!),
    }))
    .filter((it) => it.end > startLimit && it.start < endLimit)
    .sort((a, b) => a.start - b.start);

  // Unir intervalos sobrepostos para encontrar buracos reais
  const merged: { start: number; end: number }[] = [];
  for (const interval of timed) {
    const clampedStart = Math.max(startLimit, interval.start);
    const clampedEnd = Math.min(endLimit, interval.end);

    if (merged.length === 0) {
      merged.push({ start: clampedStart, end: clampedEnd });
    } else {
      const last = merged[merged.length - 1];
      if (clampedStart <= last.end) {
        last.end = Math.max(last.end, clampedEnd);
      } else {
        merged.push({ start: clampedStart, end: clampedEnd });
      }
    }
  }

  const freeSlots: FreeTimeSlot[] = [];
  let currentCursor = startLimit;

  for (const interval of merged) {
    const gap = interval.start - currentCursor;
    if (gap >= 30) {
      freeSlots.push({
        start: formatMinutesToTime(currentCursor),
        end: formatMinutesToTime(interval.start),
        durationMinutes: gap,
        label: `${formatDuration(gap)} livres`,
      });
    }
    currentCursor = Math.max(currentCursor, interval.end);
  }

  // Intervalo final até o fim da jornada
  const finalGap = endLimit - currentCursor;
  if (finalGap >= 30) {
    freeSlots.push({
      start: formatMinutesToTime(currentCursor),
      end: formatMinutesToTime(endLimit),
      durationMinutes: finalGap,
      label: `${formatDuration(finalGap)} livres`,
    });
  }

  return freeSlots;
}

/**
 * Agrupa itens para a List View nos 4 blocos canônicos:
 * - Agora (em andamento)
 * - Próximo (próximo compromisso imediato)
 * - Depois (itens seguintes)
 * - Mais tarde (itens posteriores / noite / encerramento)
 */
export function groupItemsForListView(
  items: AgendaItem[],
  referenceDate: Date = new Date()
): ListBucket[] {
  const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();

  const sorted = [...items].sort((a, b) => {
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    const aStart = a.startTime ? parseTimeToMinutes(a.startTime) : 0;
    const bStart = b.startTime ? parseTimeToMinutes(b.startTime) : 0;
    return aStart - bStart;
  });

  const agora: AgendaItem[] = [];
  const proximo: AgendaItem[] = [];
  const depois: AgendaItem[] = [];
  const maisTarde: AgendaItem[] = [];

  for (const item of sorted) {
    if (item.allDay || item.kind === 'deadline' || !item.startTime || !item.endTime) {
      // Prazos e eventos all-day aparecem em Mais tarde ou Depois conforme contexto
      maisTarde.push(item);
      continue;
    }

    const start = parseTimeToMinutes(item.startTime);
    const end = parseTimeToMinutes(item.endTime);

    if (currentMinutes >= start && currentMinutes < end) {
      agora.push(item);
    } else if (start > currentMinutes && start <= currentMinutes + 120) {
      if (proximo.length === 0) {
        proximo.push(item);
      } else {
        depois.push(item);
      }
    } else if (start > currentMinutes + 120 && start <= currentMinutes + 360) {
      depois.push(item);
    } else {
      maisTarde.push(item);
    }
  }

  // Fallback seguro: se "Agora" ou "Próximo" ficarem vazios, reequilibrar proporcionalmente
  if (agora.length === 0 && proximo.length === 0 && sorted.length > 0) {
    const firstTimed = sorted.find((it) => it.startTime);
    if (firstTimed) {
      proximo.push(firstTimed);
      const idx = maisTarde.indexOf(firstTimed);
      if (idx >= 0) maisTarde.splice(idx, 1);
    }
  }

  return [
    {
      kind: 'agora',
      title: 'Agora',
      description: 'Atividade em andamento no horário atual',
      items: agora,
    },
    {
      kind: 'proximo',
      title: 'Próximo',
      description: 'Próxima transição programada',
      items: proximo,
    },
    {
      kind: 'depois',
      title: 'Depois',
      description: 'Compromissos e blocos subsequentes',
      items: depois,
    },
    {
      kind: 'mais_tarde',
      title: 'Mais tarde',
      description: 'Deadlines, eventos noturnos e fechamento do dia',
      items: maisTarde,
    },
  ];
}

/**
 * Expande virtualmente rotinas recorrentes para o intervalo de datas especificado,
 * garantindo que a rotina apareça nos dias corretos sem criar registros duplicados.
 */
export function expandRecurringItems(
  items: AgendaItem[],
  startDate: Date,
  endDate: Date
): AgendaItem[] {
  const result: AgendaItem[] = [];
  const routines = items.filter((it) => it.kind === 'routine' && it.recurrence);
  const nonRoutines = items.filter((it) => it.kind !== 'routine');

  // Adiciona os itens normais
  result.push(...nonRoutines);

  // Projeta as rotinas para cada dia do intervalo solicitado
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const dateStr = formatDateISO(cursor);
    const dayOfWeek = cursor.getDay();

    for (const routine of routines) {
      const days = routine.recurrence?.daysOfWeek;
      if (days && days.includes(dayOfWeek)) {
        // Verifica se já existe um item estático para esse dia
        const existing = nonRoutines.some(
          (it) => it.seriesId === routine.id && it.date === dateStr
        );
        if (!existing) {
          result.push({
            ...routine,
            id: `${routine.id}-virt-${dateStr}`,
            date: dateStr,
            seriesId: routine.id,
          });
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}
