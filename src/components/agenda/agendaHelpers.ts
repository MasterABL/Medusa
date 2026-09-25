/**
 * Medusa — Agenda Temporal Helpers
 *
 * Algoritmos para navegação temporal, cálculo de conflitos com duração,
 * identificação de tempo livre (>= 30min), agrupamento em lista (Agora, Próximo, Depois, Mais tarde)
 * e projeção virtual de rotinas recorrentes.
 */

import {
  AgendaDomain,
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

export interface ConflictColumnInfo {
  colIndex: number;
  colCount: number;
}

/**
 * Fase A — heurística de UX para decidir qual item ocupa a coluna mais à esquerda (mais
 * "em evidência") quando há conflito visual na timeline. NÃO é uma regra de negócio
 * definitiva — apenas a ordem usada para composição visual nesta rodada de experiência.
 * Uma Fase B real (motor de priorização, preferências do usuário, urgência) pode substituir
 * isto sem mudar o contrato de `layoutConflictColumns` (recebe itens, devolve colunas).
 */
const DOMAIN_PRIORITY_ORDER: AgendaDomain[] = [
  'work',
  'personal',
  'body',
  'finance',
  'education',
  'external',
];

function getDomainPriorityRank(domain: AgendaDomain): number {
  const idx = DOMAIN_PRIORITY_ORDER.indexOf(domain);
  return idx === -1 ? DOMAIN_PRIORITY_ORDER.length : idx;
}

/**
 * Calcula, para um conjunto de itens de um mesmo dia, em qual "coluna" cada item deve ser
 * renderizado quando há sobreposição de horário — suporta 1, 2, 3 ou N eventos concorrentes,
 * não apenas o caso binário.
 *
 * Algoritmo em duas passadas:
 * 1. Agrupa itens em clusters de sobreposição transitiva (varredura por ordem temporal,
 *    técnica padrão de "merge de intervalos sobrepostos" — um cluster fecha quando o próximo
 *    item começa depois do fim máximo já visto no cluster atual).
 * 2. Dentro de cada cluster, atribui colunas por ORDEM DE PRIORIDADE (não por horário) via
 *    alocação gulosa na primeira coluna livre — assim um item de prioridade mais alta (ex.:
 *    Trabalho) tende a ocupar a coluna 0 mesmo que outro item do cluster comece antes.
 */
export function layoutConflictColumns(items: AgendaItem[]): Map<string, ConflictColumnInfo> {
  const timedItems = items.filter(
    (it) => !it.allDay && it.kind !== 'deadline' && it.startTime && it.endTime
  );

  const getRange = (item: AgendaItem) => {
    const start = parseTimeToMinutes(item.startTime!);
    const end = start + (item.durationMinutes || parseTimeToMinutes(item.endTime!) - start);
    return { start, end };
  };

  const byTime = [...timedItems].sort((a, b) => getRange(a).start - getRange(b).start);

  const clusters: AgendaItem[][] = [];
  let current: AgendaItem[] = [];
  let currentEnd = -Infinity;
  for (const item of byTime) {
    const { start, end } = getRange(item);
    if (current.length > 0 && start >= currentEnd) {
      clusters.push(current);
      current = [];
      currentEnd = -Infinity;
    }
    current.push(item);
    currentEnd = Math.max(currentEnd, end);
  }
  if (current.length > 0) clusters.push(current);

  const result = new Map<string, ConflictColumnInfo>();

  for (const cluster of clusters) {
    if (cluster.length === 1) {
      result.set(cluster[0].id, { colIndex: 0, colCount: 1 });
      continue;
    }

    const byPriority = [...cluster].sort((a, b) => {
      const rankDiff = getDomainPriorityRank(a.domain) - getDomainPriorityRank(b.domain);
      if (rankDiff !== 0) return rankDiff;
      return getRange(a).start - getRange(b).start;
    });

    const columnEnds: number[] = [];
    for (const item of byPriority) {
      const { start, end } = getRange(item);
      let placedCol = -1;
      for (let i = 0; i < columnEnds.length; i++) {
        if (columnEnds[i] <= start) {
          columnEnds[i] = end;
          placedCol = i;
          break;
        }
      }
      if (placedCol === -1) {
        columnEnds.push(end);
        placedCol = columnEnds.length - 1;
      }
      result.set(item.id, { colIndex: placedCol, colCount: 0 });
    }

    const colCount = columnEnds.length;
    for (const item of cluster) {
      result.get(item.id)!.colCount = colCount;
    }
  }

  return result;
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

export interface CompatibleTimeSlotSuggestion {
  date: string;
  start: string;
  end: string;
  dayLabel: string;
}

/**
 * Busca horários alternativos REALMENTE livres (reaproveita `calculateFreeTimeSlots`, não um
 * motor de otimização) para resolver um conflito — seções 5/6 do refinamento: "próximo horário
 * compatível". Varre `daysToScan` dias a partir de `fromDate` e retorna até `maxSuggestions`
 * lacunas livres que comportam `durationMinutes`. Não considera deslocamento/trânsito (isso é
 * um ponto de integração futura registrado à parte, não implementado nesta função).
 */
export function findCompatibleTimeSlots(
  allItems: AgendaItem[],
  durationMinutes: number,
  fromDate: Date,
  maxSuggestions = 3,
  daysToScan = 6
): CompatibleTimeSlotSuggestion[] {
  const suggestions: CompatibleTimeSlotSuggestion[] = [];
  const cursor = new Date(fromDate);

  for (let dayOffset = 0; dayOffset < daysToScan && suggestions.length < maxSuggestions; dayOffset += 1) {
    const dateStr = formatDateISO(cursor);
    const dayItems = allItems.filter((it) => it.date === dateStr);
    const freeSlots = calculateFreeTimeSlots(dayItems, 6, 23);

    for (const slot of freeSlots) {
      if (suggestions.length >= maxSuggestions) break;
      if (slot.durationMinutes < durationMinutes) continue;
      const startMin = parseTimeToMinutes(slot.start);
      suggestions.push({
        date: dateStr,
        start: slot.start,
        end: formatMinutesToTime(startMin + durationMinutes),
        dayLabel:
          dayOffset === 0 ? 'Hoje' : dayOffset === 1 ? 'Amanhã' : WEEK_DAY_NAMES[cursor.getDay()].full,
      });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return suggestions;
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

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Verifica se `candidate` casa com o PADRÃO BASE da recorrência (frequência + intervalo +
 * dias da semana), sem considerar `until`/`count` — usado tanto para decidir se um dia deve
 * gerar uma ocorrência quanto para contar ocorrências anteriores (necessário para `count`).
 */
function matchesRecurrenceBasePattern(routine: AgendaItem, candidate: Date): boolean {
  const rule = routine.recurrence;
  if (!rule) return false;
  const anchor = new Date(`${routine.date}T00:00:00`);
  if (candidate < anchor) return false;
  const interval = rule.interval && rule.interval > 0 ? rule.interval : 1;

  if (rule.frequency === 'daily') {
    const diffDays = Math.round((candidate.getTime() - anchor.getTime()) / 86400000);
    return diffDays >= 0 && diffDays % interval === 0;
  }

  if (rule.frequency === 'monthly') {
    if (candidate.getDate() !== anchor.getDate()) return false;
    const diffMonths =
      (candidate.getFullYear() - anchor.getFullYear()) * 12 +
      (candidate.getMonth() - anchor.getMonth());
    return diffMonths >= 0 && diffMonths % interval === 0;
  }

  // weekly (padrão) — dias da semana explícitos, ou o próprio dia da âncora se nenhum for informado
  const days = rule.daysOfWeek && rule.daysOfWeek.length > 0 ? rule.daysOfWeek : [anchor.getDay()];
  if (!days.includes(candidate.getDay())) return false;
  const diffWeeks = Math.round(
    (startOfWeek(candidate).getTime() - startOfWeek(anchor).getTime()) / (7 * 86400000)
  );
  return diffWeeks >= 0 && diffWeeks % interval === 0;
}

/**
 * Expande virtualmente rotinas recorrentes para o intervalo de datas especificado,
 * garantindo que a rotina apareça nos dias corretos sem criar registros duplicados.
 *
 * Respeita `recurrence.interval` (a cada N dias/semanas/meses), `recurrence.until` (data
 * final, inclusive) e `recurrence.count` (número de ocorrências) — nenhum dos três era
 * verificado antes desta rodada (achado de auditoria: o formulário já expunha "Termina: Nunca/
 * Em uma data/Após X ocorrências" na intenção do modelo de dados, mas a expansão ignorava os
 * três campos). Também respeita `recurrenceExceptions` (datas de ocorrências individuais
 * excluídas — ver AgendaContext.deleteRecurringOccurrence, modelagem local de "excluir somente
 * este evento" sem exigir um backend de exceções real).
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

    for (const routine of routines) {
      const rule = routine.recurrence!;
      if (!matchesRecurrenceBasePattern(routine, cursor)) continue;
      if (rule.until && dateStr > rule.until) continue;
      if (routine.recurrenceExceptions?.includes(dateStr)) continue;

      if (rule.count) {
        // Conta quantas ocorrências do padrão base já caíram entre a âncora e esta data
        // (inclusive) para saber se esta é a N-ésima e ainda cabe no limite de `count`.
        let occurrenceIndex = 0;
        const probe = new Date(`${routine.date}T00:00:00`);
        while (probe <= cursor) {
          if (matchesRecurrenceBasePattern(routine, probe)) occurrenceIndex += 1;
          probe.setDate(probe.getDate() + 1);
        }
        if (occurrenceIndex > rule.count) continue;
      }

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
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}
