/**
 * Medusa — Day View
 *
 * Visão operacional principal da Agenda (06:00 às 23:00).
 * Grid vertical proporcional com marcadores de hora, faixa all-day e deadlines,
 * blocos de evento/foco/rotina, indicador temporal Now, cálculo de tempo livre
 * e alertas visuais de conflito com duração real.
 */

'use client';

import React from 'react';
import { AgendaCategory, AgendaItem, TimeConflict } from '@/types/agenda';
import { EventBlock } from './EventBlock';
import { FreeTimeSlot } from './FreeTimeSlot';
import { NowIndicator } from './NowIndicator';
import {
  calculateFreeTimeSlots,
  detectTimeConflicts,
  parseTimeToMinutes,
} from './agendaHelpers';
import { formatDateISO } from './agendaFixtures';
import { useShell } from '@/context/ShellContext';
import { getPastelThemeStyle } from './palette';

interface DayViewProps {
  currentDate: Date;
  items: AgendaItem[];
  categories: AgendaCategory[];
  selectedItemId?: string | null;
  onSelectItem: (item: AgendaItem) => void;
  onSelectSlot?: (startTime: string, endTime: string) => void;
}

export function DayView({
  currentDate,
  items,
  categories,
  selectedItemId,
  onSelectItem,
  onSelectSlot,
}: DayViewProps) {
  const { theme } = useShell();
  const dateStr = formatDateISO(currentDate);
  const isToday = dateStr === formatDateISO(new Date());

  // Horários operacionais: 06:00 às 23:00 (17 horas total = 1020 minutos)
  const START_HOUR = 6;
  const END_HOUR = 23;
  const TOTAL_HOURS = END_HOUR - START_HOUR;
  const TOTAL_MINUTES = TOTAL_HOURS * 60;

  // Filtrar itens do dia
  const dayItems = items.filter((it) => it.date === dateStr);

  // Separar All-Day / Deadlines dos itens agendados na timeline
  const allDayAndDeadlines = dayItems.filter(
    (it) => it.allDay || it.kind === 'deadline' || !it.startTime
  );

  const timedItems = dayItems.filter(
    (it) => !it.allDay && it.kind !== 'deadline' && it.startTime && it.endTime
  );

  // Detecção de conflitos no dia
  const conflicts = detectTimeConflicts(dayItems);

  // Cálculo de intervalos livres (>= 30 min)
  const freeSlots = calculateFreeTimeSlots(dayItems, START_HOUR, END_HOUR);

  // Lista de horas para as linhas do grid
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

  // Encontra o conflito associado a um item específico (se houver)
  const getItemConflict = (item: AgendaItem): TimeConflict | undefined => {
    return conflicts.find(
      (c) => c.itemA.id === item.id || c.itemB.id === item.id
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Faixa Superior: All-Day & Deadlines (Nunca ocupa horário arbitrário na timeline) */}
      {allDayAndDeadlines.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border/70 p-3.5 sm:p-4 shadow-subtle flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">flag</span>
              <span>Prazos &amp; Dia Todo ({allDayAndDeadlines.length})</span>
            </span>
            <span className="text-[10px] font-mono text-text-muted">
              Não ocupam horários rígidos na timeline
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-1">
            {allDayAndDeadlines.map((item) => {
              const cat = categories.find((c) => c.id === item.categoryId);
              const colorStyle = getPastelThemeStyle(item.colorId, theme);
              const isSelected = selectedItemId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectItem(item)}
                  style={{
                    backgroundColor: colorStyle.bg,
                    borderColor: isSelected ? colorStyle.accent : colorStyle.border,
                    color: colorStyle.text,
                  }}
                  className={`btn-interactive px-3 py-1.5 rounded-xl border text-[11px] sm:text-[12px] font-medium flex items-center gap-2 shadow-subtle transition-all ${
                    isSelected ? 'ring-2 ring-medusa-primary shadow-calm scale-[1.02]' : 'hover:scale-[1.01]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {item.kind === 'deadline' ? 'flag' : 'event'}
                  </span>
                  <span className="font-semibold">{item.title}</span>
                  <span
                    className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded border"
                    style={{ backgroundColor: colorStyle.subtle }}
                  >
                    {item.kind === 'deadline' ? 'Deadline' : 'Dia Todo'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid Principal da Timeline Operacional */}
      <div className="bg-surface rounded-2xl border border-border/70 shadow-calm p-3 sm:p-6 overflow-x-hidden">
        <div className="relative min-h-[920px] sm:min-h-[1020px] flex">
          {/* Coluna Esquerda: Rótulos de Horário */}
          <div className="w-12 sm:w-16 flex-shrink-0 flex flex-col justify-between py-1 select-none pointer-events-none pr-2">
            {hours.map((hour) => (
              <div
                key={hour}
                className="text-[11px] font-mono text-text-muted/80 text-right tabular-nums h-0 -translate-y-2"
              >
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Coluna Direita: Área da Timeline e Grid Horário */}
          <div className="relative flex-1 border-l border-border/60 ml-1 sm:ml-2">
            {/* Linhas Horizontais de Cada Hora */}
            {hours.map((hour, idx) => {
              const topPercent = (idx / TOTAL_HOURS) * 100;
              return (
                <div
                  key={hour}
                  style={{ top: `${topPercent}%` }}
                  className="absolute left-0 right-0 border-t border-border/40 pointer-events-none"
                />
              );
            })}

            {/* Linhas intermediárias de meia hora */}
            {hours.slice(0, -1).map((hour, idx) => {
              const topPercent = ((idx + 0.5) / TOTAL_HOURS) * 100;
              return (
                <div
                  key={`half-${hour}`}
                  style={{ top: `${topPercent}%` }}
                  className="absolute left-0 right-0 border-t border-dashed border-border/20 pointer-events-none"
                />
              );
            })}

            {/* Indicadores Discretos de Tempo Livre (>= 30 min) */}
            {freeSlots.map((slot) => {
              const slotStart = parseTimeToMinutes(slot.start);
              const slotEnd = parseTimeToMinutes(slot.end);
              const topPercent =
                ((slotStart - START_HOUR * 60) / TOTAL_MINUTES) * 100;
              const heightPercent = (slot.durationMinutes / TOTAL_MINUTES) * 100;

              return (
                <FreeTimeSlot
                  key={`free-${slot.start}-${slot.end}`}
                  slot={slot}
                  topPercent={topPercent}
                  heightPercent={heightPercent}
                  onSelectSlot={onSelectSlot}
                />
              );
            })}

            {/* Eventos e Blocos Posicionados Proporcionalmente */}
            {timedItems.map((item, idx) => {
              const startMin = parseTimeToMinutes(item.startTime!);
              const duration =
                item.durationMinutes ||
                parseTimeToMinutes(item.endTime!) - startMin;

              const topPercent =
                ((startMin - START_HOUR * 60) / TOTAL_MINUTES) * 100;
              const heightPercent = Math.max(3.5, (duration / TOTAL_MINUTES) * 100);

              const cat = categories.find((c) => c.id === item.categoryId);
              const conflict = getItemConflict(item);
              const isSelected = selectedItemId === item.id;

              // Se houver conflito, desloca levemente o bloco para evitar sobreposição total ilegível
              const hasConflict = !!conflict;
              const isSecondInConflict =
                hasConflict && conflict?.itemB.id === item.id;

              const leftOffset = hasConflict
                ? isSecondInConflict
                  ? 'left-24 sm:left-44 right-2'
                  : 'left-14 sm:left-20 right-12 sm:right-28'
                : 'left-14 sm:left-20 right-2';

              return (
                <div
                  key={item.id}
                  style={{
                    top: `${topPercent}%`,
                    height: `${heightPercent}%`,
                  }}
                  className={`absolute ${leftOffset} transition-all duration-200`}
                >
                  <EventBlock
                    item={item}
                    category={cat}
                    conflict={conflict}
                    isSelected={isSelected}
                    onClick={() => onSelectItem(item)}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              );
            })}

            {/* Now Indicator Dinâmico (somente visível se a data for hoje) */}
            {isToday && (
              <NowIndicator
                dayStartHour={START_HOUR}
                totalHours={TOTAL_HOURS}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
