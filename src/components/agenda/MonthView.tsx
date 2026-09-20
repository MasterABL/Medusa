/**
 * Medusa — Month View
 *
 * Visão macro em grid mensal (7 colunas x 6 semanas).
 * Apresenta distribuição dos compromissos, prazos e rotinas com badges coloridas
 * e indicador de overflow (+N). Ao clicar em uma data, direciona para o Day View.
 */

'use client';

import React from 'react';
import { AgendaCategory, AgendaItem } from '@/types/agenda';
import { getMonthDays, WEEK_DAY_NAMES } from './agendaHelpers';
import { formatDateISO } from './agendaFixtures';
import { useShell } from '@/context/ShellContext';
import { getPastelThemeStyle } from './palette';

interface MonthViewProps {
  currentDate: Date;
  items: AgendaItem[];
  categories: AgendaCategory[];
  onSelectDate: (date: Date) => void;
  onSelectItem: (item: AgendaItem) => void;
}

export function MonthView({
  currentDate,
  items,
  categories,
  onSelectDate,
  onSelectItem,
}: MonthViewProps) {
  const { theme } = useShell();
  const monthCells = getMonthDays(currentDate);

  const daysHeader = [
    WEEK_DAY_NAMES[1], // Seg
    WEEK_DAY_NAMES[2], // Ter
    WEEK_DAY_NAMES[3], // Qua
    WEEK_DAY_NAMES[4], // Qui
    WEEK_DAY_NAMES[5], // Sex
    WEEK_DAY_NAMES[6], // Sáb
    WEEK_DAY_NAMES[0], // Dom
  ];

  const todayStr = formatDateISO(new Date());

  return (
    <div className="bg-surface rounded-2xl border border-border/70 p-3 sm:p-6 shadow-calm flex flex-col gap-3">
      {/* Cabeçalho dos Dias da Semana */}
      <div className="grid grid-cols-7 border-b border-border/70 pb-2.5 text-center">
        {daysHeader.map((d) => (
          <div
            key={d.short}
            className="text-[11px] sm:text-[12px] font-mono uppercase tracking-wider text-text-muted font-medium"
          >
            {d.short}
          </div>
        ))}
      </div>

      {/* Grid de 42 Células do Mês */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {monthCells.map((cell, idx) => {
          const cellDateStr = formatDateISO(cell.date);
          const isToday = cellDateStr === todayStr;
          const isCurrentMonth = cell.isCurrentMonth;
          const dayItems = items.filter((it) => it.date === cellDateStr);

          // Limitar a exibição inicial em 3 itens para não quebrar a célula
          const MAX_VISIBLE = 3;
          const visibleItems = dayItems.slice(0, MAX_VISIBLE);
          const overflowCount = Math.max(0, dayItems.length - MAX_VISIBLE);

          return (
            <div
              key={idx}
              onClick={() => onSelectDate(cell.date)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectDate(cell.date);
                }
              }}
              aria-label={`${cell.date.getDate()} de ${cell.date.toLocaleDateString('pt-BR', { month: 'long' })}, ${dayItems.length} itens`}
              className={`min-h-[85px] sm:min-h-[105px] p-1.5 sm:p-2 rounded-xl border text-left flex flex-col justify-between transition-all duration-160 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                isCurrentMonth
                  ? 'bg-surface border-border/60 hover:border-border hover:bg-surface-secondary/40 shadow-subtle'
                  : 'bg-surface-secondary/20 border-border/30 opacity-45 hover:opacity-75'
              }`}
            >
              {/* Topo da Célula: Número do Dia */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] sm:text-[12px] font-mono font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center tabular-nums ${
                    isToday
                      ? 'bg-medusa-primary text-[#1C2420] shadow-sm'
                      : 'text-text-secondary'
                  }`}
                >
                  {cell.date.getDate()}
                </span>

                {dayItems.length > 0 && (
                  <span className="text-[10px] font-mono text-text-muted hidden sm:inline tabular-nums">
                    {dayItems.length}
                  </span>
                )}
              </div>

              {/* Lista Compacta de Pílulas de Itens */}
              <div className="flex flex-col gap-1 overflow-hidden my-1 flex-1">
                {visibleItems.map((item) => {
                  const colorStyle = getPastelThemeStyle(item.colorId, theme);

                  return (
                    <div
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectItem(item);
                      }}
                      title={`${item.title} (${item.startTime || 'Dia todo'})`}
                      style={{
                        backgroundColor: colorStyle.bg,
                        borderColor: colorStyle.border,
                        color: colorStyle.text,
                      }}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded border truncate flex items-center gap-1 hover:brightness-95 transition-all shadow-subtle"
                    >
                      {item.kind === 'deadline' && (
                        <span className="material-symbols-outlined text-[10px] flex-shrink-0">
                          flag
                        </span>
                      )}
                      <span className="truncate">{item.title}</span>
                    </div>
                  );
                })}

                {/* Badge de Overflow (+N) */}
                {overflowCount > 0 && (
                  <span className="text-[9px] font-mono font-semibold text-text-muted px-1.5 py-0.2 rounded bg-surface-subtle self-start">
                    +{overflowCount} mais
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
