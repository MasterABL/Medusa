/**
 * Medusa — Week View (Temporal OS)
 *
 * Visão semanal de planejamento real de 7 dias ([SEG] [TER] [QUA] [QUI] [SEX] [SÁB] [DOM]).
 * - Desktop (>= 1024px) e Split-screen/Tablet (>= 768px): Grid de 7 colunas completas com cabeçalhos e timeline.
 * - Suporta eventos concorrentes em colunas paralelas via layoutConflictColumns.
 * - Faixa superior destacada para eventos de dia inteiro (All-Day) e Deadlines, separada do eixo horário.
 * - Linhas de grade temporal com marcadores de hora e meia-hora.
 * - Suporta clique simples para detalhes e duplo clique para edição direta.
 * - Mantém rolagem horizontal fluida quando a largura do container for reduzida.
 */

'use client';

import React from 'react';
import { AgendaCategory, AgendaItem } from '@/types/agenda';
import { useShell } from '@/context/ShellContext';
import {
  calculateFreeTimeSlots,
  detectTimeConflicts,
  getWeekDays,
  layoutConflictColumns,
  parseTimeToMinutes,
  WEEK_DAY_NAMES,
} from './agendaHelpers';
import { formatDateISO } from './agendaFixtures';
import { EventBlock } from './EventBlock';
import { FreeTimeSlot } from './FreeTimeSlot';
import { getPastelThemeStyle } from './palette';

interface WeekViewProps {
  currentDate: Date;
  items: AgendaItem[];
  categories: AgendaCategory[];
  selectedItemId?: string | null;
  onSelectItem: (item: AgendaItem) => void;
  onDoubleClickItem?: (item: AgendaItem) => void;
  onSelectSlot?: (startTime: string, endTime: string) => void;
  onSelectDayDate?: (date: Date) => void;
}

export function WeekView({
  currentDate,
  items,
  categories,
  selectedItemId,
  onSelectItem,
  onDoubleClickItem,
  onSelectSlot,
  onSelectDayDate,
}: WeekViewProps) {
  const { theme } = useShell();
  const weekDays = getWeekDays(currentDate);

  const START_HOUR = 7;
  const END_HOUR = 22;
  const TOTAL_HOURS = END_HOUR - START_HOUR;
  const TOTAL_MINUTES = TOTAL_HOURS * 60;
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

  // Verifica se há itens All-Day / Deadline em algum dia da semana
  const allDayByDay = weekDays.map((day) => {
    const dateStr = formatDateISO(day);
    return {
      day,
      dateStr,
      items: items.filter(
        (it) => it.date === dateStr && (it.allDay || it.kind === 'deadline' || !it.startTime)
      ),
    };
  });
  const hasAnyAllDay = allDayByDay.some((d) => d.items.length > 0);

  return (
    <div
      id="week-view-container"
      className="bg-surface rounded-2xl border border-border/70 shadow-calm p-3 sm:p-5 overflow-x-auto select-none"
    >
      <div className="min-w-[760px] flex flex-col">
        {/* Cabeçalho das 7 Colunas [SEG] [TER] [QUA] [QUI] [SEX] [SÁB] [DOM] */}
        <div role="tablist" aria-label="Dias da semana" className="grid grid-cols-8 gap-1.5 border-b border-border/70 pb-3 mb-2">
          {/* Espaçador da Coluna de Horas */}
          <div className="w-12 sm:w-14 text-[10px] font-mono text-text-muted uppercase text-right pr-2 self-center">
            Hora
          </div>

          {/* 7 Colunas de Dias */}
          {weekDays.map((day) => {
            const dateStr = formatDateISO(day);
            const isToday = dateStr === formatDateISO(new Date());
            const dayName = WEEK_DAY_NAMES[day.getDay()].short;
            const dayItems = items.filter((it) => it.date === dateStr);

            return (
              <button
                key={dateStr}
                type="button"
                role="tab"
                aria-label={`Ver dia ${dayName}`}
                onClick={() => onSelectDayDate && onSelectDayDate(day)}
                className={`btn-interactive flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all ${
                  isToday
                    ? 'bg-surface-elevated border-medusa-primary/50 shadow-subtle ring-1 ring-medusa-primary/40'
                    : 'border-transparent hover:bg-surface-secondary/70'
                }`}
              >
                <span className="text-[10px] font-mono uppercase font-semibold text-text-muted">
                  {dayName}
                </span>
                <span
                  className={`text-[13px] font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center tabular-nums mt-0.5 ${
                    isToday ? 'bg-medusa-primary text-[#1C2420]' : 'text-text-primary'
                  }`}
                >
                  {day.getDate()}
                </span>
                {dayItems.length > 0 && (
                  <span className="text-[9px] font-mono text-text-muted/60 mt-0.5">
                    {dayItems.length} {dayItems.length === 1 ? 'item' : 'itens'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Faixa All-Day / Deadlines Separada do Eixo Horário */}
        {hasAnyAllDay && (
          <div
            id="week-allday-row"
            className="grid grid-cols-8 gap-1.5 border-b border-border/60 pb-2 mb-2 bg-surface-secondary/30 rounded-xl p-1.5"
          >
            <div className="w-12 sm:w-14 text-[9px] font-mono text-text-muted uppercase text-right pr-2 self-start pt-1">
              Prazos
            </div>
            {allDayByDay.map(({ day, dateStr, items: dayAllDay }) => (
              <div key={`allday-${dateStr}`} className="flex flex-col gap-1 min-h-[26px]">
                {dayAllDay.map((item) => {
                  const cat = categories.find((c) => c.id === item.categoryId);
                  const colorStyle = getPastelThemeStyle(item.colorId, theme);
                  const isSelected = selectedItemId === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectItem(item)}
                      onDoubleClick={() => onDoubleClickItem?.(item)}
                      style={{
                        backgroundColor: colorStyle.bg,
                        borderColor: isSelected ? colorStyle.accent : colorStyle.border,
                        color: colorStyle.text,
                      }}
                      className={`btn-interactive px-1.5 py-0.5 rounded text-[10px] font-medium border truncate text-left flex items-center gap-1 shadow-subtle ${
                        isSelected ? 'ring-1 ring-medusa-primary' : ''
                      }`}
                      title={`${item.title} (${item.kind === 'deadline' ? 'Deadline' : 'Dia Todo'})`}
                    >
                      <span className="material-symbols-outlined text-[11px] flex-shrink-0">
                        {item.kind === 'deadline' ? 'flag' : 'event'}
                      </span>
                      <span className="truncate">{item.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Grid Horário e Colunas de Eventos */}
        <div className="relative flex min-h-[780px]">
          {/* Rótulos de Horário Verticais */}
          <div className="w-12 sm:w-14 flex-shrink-0 flex flex-col justify-between py-1 select-none pointer-events-none pr-2">
            {hours.map((h) => (
              <div
                key={h}
                className="text-[10px] font-mono text-text-muted/70 text-right tabular-nums h-0 -translate-y-2"
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Grid de 7 Colunas */}
          <div id="week-view-columns" className="grid grid-cols-7 flex-1 border-l border-border/60 relative">
            {/* Linhas Horizontais de Cada Hora */}
            {hours.map((_, idx) => (
              <div
                key={`line-${idx}`}
                style={{ top: `${(idx / TOTAL_HOURS) * 100}%` }}
                className="absolute left-0 right-0 border-t border-border/30 pointer-events-none"
              />
            ))}

            {/* Linhas Intermediárias de Meia Hora */}
            {hours.slice(0, -1).map((_, idx) => (
              <div
                key={`half-${idx}`}
                style={{ top: `${((idx + 0.5) / TOTAL_HOURS) * 100}%` }}
                className="absolute left-0 right-0 border-t border-dashed border-border/20 pointer-events-none"
              />
            ))}

            {/* Renderização de Cada Coluna de Dia */}
            {weekDays.map((day, colIdx) => {
              const dateStr = formatDateISO(day);
              const dayItems = items.filter((it) => it.date === dateStr);
              const conflicts = detectTimeConflicts(dayItems);
              const conflictColumns = layoutConflictColumns(dayItems);
              const freeSlots = calculateFreeTimeSlots(dayItems, START_HOUR, END_HOUR);

              const timedItems = dayItems.filter(
                (it) => !it.allDay && it.kind !== 'deadline' && it.startTime && it.endTime
              );

              return (
                <div
                  key={dateStr}
                  id={`week-col-${WEEK_DAY_NAMES[day.getDay()].short.toLowerCase()}`}
                  className={`relative h-full ${colIdx > 0 ? 'border-l border-border/40' : ''}`}
                >
                  {/* Slots Livres discretos na Semana */}
                  {freeSlots.map((slot) => {
                    const slotStart = parseTimeToMinutes(slot.start);
                    const topPercent = ((slotStart - START_HOUR * 60) / TOTAL_MINUTES) * 100;
                    const heightPercent = (slot.durationMinutes / TOTAL_MINUTES) * 100;

                    if (topPercent < 0 || topPercent > 100) return null;

                    return (
                      <div
                        key={`free-week-${dateStr}-${slot.start}`}
                        style={{
                          top: `${topPercent}%`,
                          height: `${heightPercent}%`,
                        }}
                        onClick={() => onSelectSlot?.(slot.usableStart || slot.start, slot.usableEnd || slot.end)}
                        className="absolute left-0.5 right-0.5 border border-dashed border-border/20 rounded hover:border-medusa-primary/40 hover:bg-medusa-primary/5 transition-colors cursor-pointer"
                        title={`Intervalo livre: ${slot.start} às ${slot.end} (${slot.label})`}
                      />
                    );
                  })}

                  {/* Eventos Posicionados */}
                  {timedItems.map((item) => {
                    const startMin = parseTimeToMinutes(item.startTime!);
                    const duration =
                      item.durationMinutes || parseTimeToMinutes(item.endTime!) - startMin;

                    const topPercent = ((startMin - START_HOUR * 60) / TOTAL_MINUTES) * 100;
                    const heightPercent = Math.max(3.8, (duration / TOTAL_MINUTES) * 100);

                    const cat = categories.find((c) => c.id === item.categoryId);
                    const conflict = conflicts.find(
                      (c) => c.itemA.id === item.id || c.itemB.id === item.id
                    );
                    const isSelected = selectedItemId === item.id;

                    if (topPercent < 0 || topPercent > 100) return null;

                    const colInfo = conflictColumns.get(item.id) || { colIndex: 0, colCount: 1 };
                    const gapPercent = colInfo.colCount > 1 ? 2 : 0;
                    const columnWidthPercent =
                      (100 - gapPercent * (colInfo.colCount - 1)) / colInfo.colCount;
                    const leftPercent = colInfo.colIndex * (columnWidthPercent + gapPercent);

                    return (
                      <div
                        key={item.id}
                        style={{
                          top: `${topPercent}%`,
                          height: `${heightPercent}%`,
                        }}
                        className="absolute left-0.5 right-0.5 transition-all duration-160"
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: `${leftPercent}%`,
                            width: `${columnWidthPercent}%`,
                          }}
                        >
                          <EventBlock
                            item={item}
                            category={cat}
                            conflict={conflict}
                            isSelected={isSelected}
                            onClick={() => onSelectItem(item)}
                            onDoubleClick={() => onDoubleClickItem?.(item)}
                            compact
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
