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
  layoutConflictColumns,
  parseTimeToMinutes,
} from './agendaHelpers';
import { formatDateISO } from './agendaFixtures';
import { useShell } from '@/context/ShellContext';
import { getPastelThemeStyle } from './palette';
import { playFeedback } from '@/lib/audioFeedback';

interface DayViewProps {
  currentDate: Date;
  items: AgendaItem[];
  categories: AgendaCategory[];
  selectedItemId?: string | null;
  onSelectItem: (item: AgendaItem) => void;
  onDoubleClickItem?: (item: AgendaItem) => void;
  onContextMenu?: (item: AgendaItem) => void;
  onRescheduleItem?: (itemId: string, newDate: string, newStartTime: string, newEndTime: string) => void;
  onSelectSlot?: (startTime: string, endTime: string) => void;
}

export function DayView({
  currentDate,
  items,
  categories,
  selectedItemId,
  onSelectItem,
  onDoubleClickItem,
  onContextMenu,
  onRescheduleItem,
  onSelectSlot,
}: DayViewProps) {
  const { theme, triggerIslandNotification } = useShell();
  const dateStr = formatDateISO(currentDate);
  const isToday = dateStr === formatDateISO(new Date());

  // Horários operacionais: 06:00 às 23:00 (17 horas total = 1020 minutos)
  const START_HOUR = 6;
  const END_HOUR = 23;
  const TOTAL_HOURS = END_HOUR - START_HOUR;
  const TOTAL_MINUTES = TOTAL_HOURS * 60;

  // Estado de Arrastar e Soltar no Dia (Drag & Drop)
  const [dragState, setDragState] = React.useState<{
    item: AgendaItem;
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

        const timelineEl = document.getElementById('day-view-timeline-area');
        if (!timelineEl) return;
        const rect = timelineEl.getBoundingClientRect();

        const relY = Math.min(rect.height, Math.max(0, moveEv.clientY - rect.top));
        const minuteFromStart = (relY / rect.height) * TOTAL_MINUTES;
        const snappedMin = Math.round(minuteFromStart / 15) * 15;
        const maxStart = TOTAL_MINUTES - dragRef.current.duration;
        const clampedMin = Math.max(0, Math.min(maxStart, snappedMin));

        const startHourMin = START_HOUR * 60 + clampedMin;
        const endHourMin = startHourMin + dragRef.current.duration;
        const targetStartTime = `${String(Math.floor(startHourMin / 60)).padStart(2, '0')}:${String(startHourMin % 60).padStart(2, '0')}`;
        const targetEndTime = `${String(Math.floor(endHourMin / 60)).padStart(2, '0')}:${String(endHourMin % 60).padStart(2, '0')}`;

        const dayItems = items.filter(
          (it) => it.date === dateStr && it.id !== item.id && !it.id.startsWith(item.id) && it.startTime && it.endTime
        );
        const overlap = dayItems.find(
          (it) => it.startTime! < targetEndTime && targetStartTime < it.endTime!
        );

        setDragState({
          item,
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
          const timelineEl = document.getElementById('day-view-timeline-area');
          if (timelineEl) {
            const rect = timelineEl.getBoundingClientRect();
            const relY = Math.min(rect.height, Math.max(0, upEv.clientY - rect.top));
            const minuteFromStart = (relY / rect.height) * TOTAL_MINUTES;
            const snappedMin = Math.round(minuteFromStart / 15) * 15;
            const maxStart = TOTAL_MINUTES - dragRef.current.duration;
            const clampedMin = Math.max(0, Math.min(maxStart, snappedMin));

            const startHourMin = START_HOUR * 60 + clampedMin;
            const endHourMin = startHourMin + dragRef.current.duration;
            const targetStartTime = `${String(Math.floor(startHourMin / 60)).padStart(2, '0')}:${String(startHourMin % 60).padStart(2, '0')}`;
            const targetEndTime = `${String(Math.floor(endHourMin / 60)).padStart(2, '0')}:${String(endHourMin % 60).padStart(2, '0')}`;

            onRescheduleItem(dragRef.current.item.id, dateStr, targetStartTime, targetEndTime);
            triggerIslandNotification({
              title: 'Evento Movido',
              desc: `${targetStartTime}–${targetEndTime}`,
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
    [dateStr, items, onRescheduleItem, triggerIslandNotification, TOTAL_MINUTES, START_HOUR]
  );

  // Filtrar itens do dia
  const dayItems = items.filter((it) => it.date === dateStr);

  // Separar All-Day / Deadlines dos itens agendados na timeline
  const allDayAndDeadlines = dayItems.filter(
    (it) => it.allDay || it.kind === 'deadline' || !it.startTime
  );

  const timedItems = dayItems.filter(
    (it) => !it.allDay && it.kind !== 'deadline' && it.startTime && it.endTime
  );

  // Detecção de conflitos no dia (para badges/tooltip de duração)
  const conflicts = detectTimeConflicts(dayItems);

  // Colunas de composição para 1..N eventos concorrentes (ver agendaHelpers.ts —
  // achado de auditoria: a versão anterior só tratava o caso binário de 2 eventos com
  // deslocamentos fixos em px, quebrando legibilidade com 3+ eventos concorrentes).
  const conflictColumns = layoutConflictColumns(dayItems);

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
                  onDoubleClick={() => onDoubleClickItem?.(item)}
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

            {/* Indicador Fantasma de Arrastar (Ghost Candidate) no Dia */}
            {dragState && (
              <div
                id="day-drag-ghost"
                style={{
                  top: `${(dragState.clampedMin / TOTAL_MINUTES) * 100}%`,
                  height: `${Math.max(3.5, (dragState.duration / TOTAL_MINUTES) * 100)}%`,
                  minHeight: '34px',
                }}
                className={`absolute left-2 right-2 z-40 rounded-xl border-2 border-dashed p-2 flex items-center justify-between shadow-calm pointer-events-none transition-all duration-75 animate-in fade-in ${
                  dragState.hasConflict
                    ? 'bg-rose-500/25 border-rose-500 text-rose-900 dark:text-rose-100 ring-2 ring-rose-400/40'
                    : 'bg-medusa-primary/25 border-medusa-primary text-text-primary ring-2 ring-medusa-primary/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-mono font-bold">
                    {dragState.startTime}–{dragState.endTime}
                  </span>
                  <span className="text-[12px] font-semibold truncate">
                    {dragState.item.title}
                  </span>
                </div>
                {dragState.hasConflict && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9.5px] font-mono font-semibold flex-shrink-0">
                    <span className="material-symbols-outlined !text-[11px]">warning</span>
                    <span>Conflito{dragState.conflictTitle ? `: ${dragState.conflictTitle}` : ''}</span>
                  </span>
                )}
              </div>
            )}

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
              const isBeingDragged = dragState?.item.id === item.id;

              const colInfo = conflictColumns.get(item.id) || { colIndex: 0, colCount: 1 };
              const { colIndex, colCount } = colInfo;
              const gapPercent = colCount > 1 ? 1.5 : 0;
              const columnWidthPercent = (100 - gapPercent * (colCount - 1)) / colCount;
              const leftPercent = colIndex * (columnWidthPercent + gapPercent);
              const isNarrowColumn = colCount >= 3;

              return (
                <div
                  key={item.id}
                  style={{
                    top: `${topPercent}%`,
                    height: `${heightPercent}%`,
                  }}
                  className="absolute left-1 sm:left-2 right-1 sm:right-2 transition-all duration-200"
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: `${leftPercent}%`,
                      width: `${columnWidthPercent}%`,
                      zIndex: isSelected ? 40 : isBeingDragged ? 5 : 10 + colIndex,
                    }}
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
                      compact={isNarrowColumn}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
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
