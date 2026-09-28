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
import { playFeedback } from '@/lib/audioFeedback';

interface WeekViewProps {
  currentDate: Date;
  items: AgendaItem[];
  categories: AgendaCategory[];
  selectedItemId?: string | null;
  onSelectItem: (item: AgendaItem) => void;
  onDoubleClickItem?: (item: AgendaItem) => void;
  onContextMenu?: (item: AgendaItem) => void;
  onRescheduleItem?: (itemId: string, newDate: string, newStartTime: string, newEndTime: string) => void;
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
  onContextMenu,
  onRescheduleItem,
  onSelectSlot,
  onSelectDayDate,
}: WeekViewProps) {
  const { theme, triggerIslandNotification } = useShell();
  const weekDays = getWeekDays(currentDate);

  const START_HOUR = 7;
  const END_HOUR = 22;
  const TOTAL_HOURS = END_HOUR - START_HOUR;
  const TOTAL_MINUTES = TOTAL_HOURS * 60;
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

  // Estado de Arrastar e Soltar (Drag & Drop)
  const [dragState, setDragState] = React.useState<{
    item: AgendaItem;
    colIndex: number;
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    clampedMin: number;
    hasConflict: boolean;
    conflictTitle?: string;
  } | null>(null);

  const dragRef = React.useRef<{
    item: AgendaItem;
    startX: number;
    startY: number;
    duration: number;
    isDragging: boolean;
  } | null>(null);

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent, item: AgendaItem) => {
      // Ignora botão direito ou itens sem horário definido
      if (e.button !== 0 || item.allDay || !item.startTime || !item.endTime) return;
      const startMin = parseTimeToMinutes(item.startTime);
      const endMin = parseTimeToMinutes(item.endTime);
      const duration = item.durationMinutes || (endMin - startMin);

      dragRef.current = {
        item,
        startX: e.clientX,
        startY: e.clientY,
        duration,
        isDragging: false,
      };

      const handlePointerMove = (moveEv: PointerEvent) => {
        if (!dragRef.current) return;
        const dist = Math.hypot(moveEv.clientX - dragRef.current.startX, moveEv.clientY - dragRef.current.startY);
        if (dist <= 6 && !dragRef.current.isDragging) return;

        dragRef.current.isDragging = true;

        const colsEl = document.getElementById('week-view-columns');
        if (!colsEl) return;
        const rect = colsEl.getBoundingClientRect();
        const colWidth = rect.width / 7;
        const colIdx = Math.min(6, Math.max(0, Math.floor((moveEv.clientX - rect.left) / colWidth)));
        const targetDate = formatDateISO(weekDays[colIdx]);

        const relY = Math.min(rect.height, Math.max(0, moveEv.clientY - rect.top));
        const minuteFromStart = (relY / rect.height) * TOTAL_MINUTES;
        const snappedMin = Math.round(minuteFromStart / 15) * 15;
        const maxStart = TOTAL_MINUTES - dragRef.current.duration;
        const clampedMin = Math.max(0, Math.min(maxStart, snappedMin));

        const startHourMin = START_HOUR * 60 + clampedMin;
        const endHourMin = startHourMin + dragRef.current.duration;
        const targetStartTime = `${String(Math.floor(startHourMin / 60)).padStart(2, '0')}:${String(startHourMin % 60).padStart(2, '0')}`;
        const targetEndTime = `${String(Math.floor(endHourMin / 60)).padStart(2, '0')}:${String(endHourMin % 60).padStart(2, '0')}`;

        // Verifica conflitos no dia de destino
        const dayItems = items.filter(
          (it) => it.date === targetDate && it.id !== item.id && !it.id.startsWith(item.id) && it.startTime && it.endTime
        );
        const overlap = dayItems.find(
          (it) => it.startTime! < targetEndTime && targetStartTime < it.endTime!
        );

        setDragState({
          item,
          colIndex: colIdx,
          date: targetDate,
          startTime: targetStartTime,
          endTime: targetEndTime,
          duration: dragRef.current.duration,
          clampedMin,
          hasConflict: Boolean(overlap),
          conflictTitle: overlap?.title,
        });
      };

      const handlePointerUp = (upEv: PointerEvent) => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);

        if (dragRef.current?.isDragging && onRescheduleItem) {
          const colsEl = document.getElementById('week-view-columns');
          if (colsEl) {
            const rect = colsEl.getBoundingClientRect();
            const colWidth = rect.width / 7;
            const colIdx = Math.min(6, Math.max(0, Math.floor((upEv.clientX - rect.left) / colWidth)));
            const targetDate = formatDateISO(weekDays[colIdx]);

            const relY = Math.min(rect.height, Math.max(0, upEv.clientY - rect.top));
            const minuteFromStart = (relY / rect.height) * TOTAL_MINUTES;
            const snappedMin = Math.round(minuteFromStart / 15) * 15;
            const maxStart = TOTAL_MINUTES - dragRef.current.duration;
            const clampedMin = Math.max(0, Math.min(maxStart, snappedMin));

            const startHourMin = START_HOUR * 60 + clampedMin;
            const endHourMin = startHourMin + dragRef.current.duration;
            const targetStartTime = `${String(Math.floor(startHourMin / 60)).padStart(2, '0')}:${String(startHourMin % 60).padStart(2, '0')}`;
            const targetEndTime = `${String(Math.floor(endHourMin / 60)).padStart(2, '0')}:${String(endHourMin % 60).padStart(2, '0')}`;

            onRescheduleItem(dragRef.current.item.id, targetDate, targetStartTime, targetEndTime);
            const dayName = WEEK_DAY_NAMES[weekDays[colIdx].getDay()].full;
            triggerIslandNotification({
              title: 'Evento Movido',
              desc: `${dayName} · ${targetStartTime}–${targetEndTime}`,
              badge: 'Agenda',
              state: 'success',
              durationMs: 2000,
            });
            playFeedback('ready');
          }
        }
        dragRef.current = null;
        setDragState(null);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [items, onRescheduleItem, triggerIslandNotification, weekDays, TOTAL_MINUTES, START_HOUR]
  );

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

                  {/* Indicador Fantasma de Arrastar (Ghost Candidate) */}
                  {dragState && dragState.colIndex === colIdx && (
                    <div
                      id="week-drag-ghost"
                      style={{
                        top: `${(dragState.clampedMin / TOTAL_MINUTES) * 100}%`,
                        height: `${Math.max(3.8, (dragState.duration / TOTAL_MINUTES) * 100)}%`,
                        minHeight: '34px',
                      }}
                      className={`absolute left-0.5 right-0.5 z-40 rounded-xl border-2 border-dashed p-1.5 flex flex-col justify-between shadow-calm pointer-events-none transition-all duration-75 animate-in fade-in ${
                        dragState.hasConflict
                          ? 'bg-rose-500/25 border-rose-500 text-rose-900 dark:text-rose-100 ring-2 ring-rose-400/40'
                          : 'bg-medusa-primary/25 border-medusa-primary text-text-primary ring-2 ring-medusa-primary/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 leading-none">
                        <span className="text-[10px] font-mono font-bold tracking-tight">
                          {WEEK_DAY_NAMES[weekDays[colIdx].getDay()].full} · {dragState.startTime}–{dragState.endTime}
                        </span>
                        {dragState.hasConflict && (
                          <span className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-rose-600 text-white text-[8px] font-mono font-semibold">
                            <span className="material-symbols-outlined !text-[9px]">warning</span>
                            Conflito
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold truncate leading-tight">
                        {dragState.item.title}
                      </span>
                      {dragState.hasConflict && dragState.conflictTitle && (
                        <span className="text-[8.5px] font-mono text-rose-700 dark:text-rose-300 truncate">
                          Sobrepõe: {dragState.conflictTitle}
                        </span>
                      )}
                    </div>
                  )}

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
                    const isConcurrent = colInfo.colCount > 1;
                    const isShort = duration <= 60;
                    const expandUpward = topPercent > 82;
                    const isBeingDragged = dragState?.item.id === item.id;

                    let leftPercent = 0;
                    let widthPercent = 100;

                    if (colInfo.colCount === 2) {
                      widthPercent = 49;
                      leftPercent = colInfo.colIndex === 0 ? 0 : 51;
                    } else if (colInfo.colCount === 3) {
                      widthPercent = 32;
                      leftPercent = colInfo.colIndex * 34;
                    } else if (colInfo.colCount > 3) {
                      const gap = 1;
                      widthPercent = (100 - gap * (colInfo.colCount - 1)) / colInfo.colCount;
                      leftPercent = colInfo.colIndex * (widthPercent + gap);
                    }

                    const zIndex = isSelected ? 40 : isBeingDragged ? 5 : 10 + colInfo.colIndex;

                    return (
                      <div
                        key={item.id}
                        style={{
                          top: `${topPercent}%`,
                          height: `${heightPercent}%`,
                        }}
                        className="absolute left-0.5 right-0.5 transition-all duration-160 pointer-events-none"
                      >
                        <div
                          style={{
                            position: 'absolute',
                            ...(expandUpward ? { bottom: 0 } : { top: 0 }),
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            height: '100%',
                            zIndex,
                          }}
                          className={`pointer-events-auto transition-all duration-160 group ${
                            isConcurrent
                              ? 'hover:z-35 hover:!w-[98%] hover:!left-[1%] focus-within:z-35 focus-within:!w-[98%] focus-within:!left-[1%] hover:shadow-calm'
                              : ''
                          } ${
                            isShort
                              ? 'hover:z-35 hover:!h-auto hover:!min-h-[68px] sm:hover:!min-h-[74px] focus-within:z-35 focus-within:!h-auto focus-within:!min-h-[68px] hover:shadow-calm'
                              : ''
                          }`}
                        >
                          <EventBlock
                            item={item}
                            category={cat}
                            conflict={conflict}
                            isSelected={isSelected}
                            isDragging={isBeingDragged}
                            onClick={() => onSelectItem(item)}
                            onDoubleClick={() => onDoubleClickItem?.(item)}
                            onContextMenu={() => (onContextMenu ? onContextMenu(item) : onSelectItem(item))}
                            onPointerDown={(e) => handlePointerDown(e, item)}
                            compact
                            isNarrow={isConcurrent}
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
