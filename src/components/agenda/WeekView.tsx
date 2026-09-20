/**
 * Medusa — Week View
 *
 * Visão semanal de planejamento.
 * - Desktop (>= 1024px): Grid de 7 colunas completas com cabeçalhos e timeline.
 * - Tablet (820px) e Mobile (390px): Seletor horizontal elegante de dias (Seg, Ter, Qua, Qui, Sex, Sáb, Dom)
 *   com badges de contagem + visão diária completa (DayView) do dia selecionado.
 *
 * Corrige o bug do protótipo que comprimia 7 colunas ilegíveis em 820px.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { AgendaCategory, AgendaItem, TimeConflict } from '@/types/agenda';
import { useShell } from '@/context/ShellContext';
import { DayView } from './DayView';
import {
  detectTimeConflicts,
  getWeekDays,
  parseTimeToMinutes,
  WEEK_DAY_NAMES,
} from './agendaHelpers';
import { formatDateISO } from './agendaFixtures';
import { EventBlock } from './EventBlock';
import { getPastelThemeStyle } from './palette';

interface WeekViewProps {
  currentDate: Date;
  items: AgendaItem[];
  categories: AgendaCategory[];
  selectedItemId?: string | null;
  onSelectItem: (item: AgendaItem) => void;
  onSelectSlot?: (startTime: string, endTime: string) => void;
  onSelectDayDate?: (date: Date) => void;
}

export function WeekView({
  currentDate,
  items,
  categories,
  selectedItemId,
  onSelectItem,
  onSelectSlot,
  onSelectDayDate,
}: WeekViewProps) {
  const { breakpoint, theme } = useShell();
  const weekDays = getWeekDays(currentDate);

  // Dia ativo no modo responsivo (Tablet/Mobile)
  const [activeTabDate, setActiveTabDate] = useState<Date>(currentDate);

  useEffect(() => {
    setActiveTabDate(currentDate);
  }, [currentDate]);

  const isDesktop = breakpoint === 'desktop';

  // =========================================================================
  // MODO RESPONSIVO: TABLET (820px) & MOBILE (390px)
  // Seletor horizontal deslizante de dias + DayView integral do dia selecionado
  // =========================================================================
  if (!isDesktop) {
    return (
      <div className="flex flex-col gap-4 w-full">
        {/* Seletor Horizontal de Dias da Semana (Seg a Dom) */}
        <div
          role="tablist"
          aria-label="Dias da semana"
          className="bg-surface rounded-2xl border border-border/70 p-2 sm:p-2.5 shadow-subtle flex items-center justify-between gap-1 overflow-x-auto scrollbar-none"
        >
          {weekDays.map((day) => {
            const dateStr = formatDateISO(day);
            const isSelected = dateStr === formatDateISO(activeTabDate);
            const isToday = dateStr === formatDateISO(new Date());
            const dayItems = items.filter((it) => it.date === dateStr);
            const dayName = WEEK_DAY_NAMES[day.getDay()].short;

            return (
              <button
                key={dateStr}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  setActiveTabDate(day);
                  if (onSelectDayDate) onSelectDayDate(day);
                }}
                className={`btn-interactive flex-1 min-w-[44px] sm:min-w-[56px] py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none ${
                  isSelected
                    ? 'bg-surface-elevated text-text-primary border border-border shadow-calm font-semibold ring-1 ring-border'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary/60'
                }`}
              >
                <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider">
                  {dayName}
                </span>

                <div className="flex items-center justify-center">
                  <span
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[12px] sm:text-[13px] font-mono font-bold tabular-nums ${
                      isToday
                        ? 'bg-medusa-primary text-[#1C2420]'
                        : isSelected
                        ? 'bg-surface-subtle text-text-primary'
                        : 'text-text-secondary'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>

                {/* Badge de Contagem de Itens */}
                {dayItems.length > 0 ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
                )}
              </button>
            );
          })}
        </div>

        {/* Renderização do DayView integral do dia ativo (espaço confortável e legível) */}
        <DayView
          currentDate={activeTabDate}
          items={items}
          categories={categories}
          selectedItemId={selectedItemId}
          onSelectItem={onSelectItem}
          onSelectSlot={onSelectSlot}
        />
      </div>
    );
  }

  // =========================================================================
  // MODO DESKTOP (>= 1024px): GRID DE 7 COLUNAS UNIFICADAS
  // =========================================================================
  const START_HOUR = 7;
  const END_HOUR = 22;
  const TOTAL_HOURS = END_HOUR - START_HOUR;
  const TOTAL_MINUTES = TOTAL_HOURS * 60;
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

  return (
    <div className="bg-surface rounded-2xl border border-border/70 shadow-calm p-4 sm:p-6 overflow-x-auto">
      {/* Cabeçalho das 7 Colunas */}
      <div className="grid grid-cols-8 gap-2 border-b border-border/70 pb-3 mb-2 min-w-[760px]">
        {/* Espaçador da Coluna de Horas */}
        <div className="w-12 text-[10px] font-mono text-text-muted uppercase text-right pr-2">
          Hora
        </div>

        {/* 7 Colunas de Dias */}
        {weekDays.map((day) => {
          const dateStr = formatDateISO(day);
          const isToday = dateStr === formatDateISO(new Date());
          const dayName = WEEK_DAY_NAMES[day.getDay()].short;

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDayDate && onSelectDayDate(day)}
              className="flex flex-col items-center justify-center p-1 rounded-lg cursor-pointer hover:bg-surface-secondary transition-colors"
            >
              <span className="text-[10px] font-mono uppercase text-text-muted">
                {dayName}
              </span>
              <span
                className={`text-[13px] font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center tabular-nums ${
                  isToday ? 'bg-medusa-primary text-[#1C2420]' : 'text-text-primary'
                }`}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Grid Horário e Colunas de Eventos */}
      <div className="relative flex min-w-[760px] min-h-[750px]">
        {/* Rótulos de Horário */}
        <div className="w-12 flex-shrink-0 flex flex-col justify-between py-1 select-none pointer-events-none pr-2">
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
        <div className="grid grid-cols-7 flex-1 border-l border-border/60 relative">
          {/* Linhas Horizontais de Fundo */}
          {hours.map((_, idx) => (
            <div
              key={idx}
              style={{ top: `${(idx / TOTAL_HOURS) * 100}%` }}
              className="absolute left-0 right-0 border-t border-border/30 pointer-events-none"
            />
          ))}

          {/* Renderização de Cada Coluna de Dia */}
          {weekDays.map((day, colIdx) => {
            const dateStr = formatDateISO(day);
            const dayItems = items.filter((it) => it.date === dateStr);
            const conflicts = detectTimeConflicts(dayItems);

            const timedItems = dayItems.filter(
              (it) => !it.allDay && it.kind !== 'deadline' && it.startTime && it.endTime
            );

            return (
              <div
                key={dateStr}
                className={`relative h-full ${
                  colIdx > 0 ? 'border-l border-border/40' : ''
                }`}
              >
                {timedItems.map((item) => {
                  const startMin = parseTimeToMinutes(item.startTime!);
                  const duration =
                    item.durationMinutes ||
                    parseTimeToMinutes(item.endTime!) - startMin;

                  const topPercent =
                    ((startMin - START_HOUR * 60) / TOTAL_MINUTES) * 100;
                  const heightPercent = Math.max(
                    4,
                    (duration / TOTAL_MINUTES) * 100
                  );

                  const cat = categories.find((c) => c.id === item.categoryId);
                  const conflict = conflicts.find(
                    (c) => c.itemA.id === item.id || c.itemB.id === item.id
                  );
                  const isSelected = selectedItemId === item.id;

                  // Se fora da faixa visível, ignorar
                  if (topPercent < 0 || topPercent > 100) return null;

                  return (
                    <div
                      key={item.id}
                      style={{
                        top: `${topPercent}%`,
                        height: `${heightPercent}%`,
                      }}
                      className="absolute left-1 right-1"
                    >
                      <EventBlock
                        item={item}
                        category={cat}
                        conflict={conflict}
                        isSelected={isSelected}
                        onClick={() => onSelectItem(item)}
                        compact
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
