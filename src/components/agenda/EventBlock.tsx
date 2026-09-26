/**
 * Medusa — Event Block
 *
 * Renderiza um item na timeline proporcional da Agenda (Dia ou Semana).
 * Aplica os tokens da paleta de 24 cores pastel nos 3 temas.
 * Exibe metadados de domínio, tipo, flexibilidade e tags de conflito com duração calculada.
 */

'use client';

import React from 'react';
import { AgendaCategory, AgendaItem, TimeConflict } from '@/types/agenda';
import { useShell } from '@/context/ShellContext';
import { getPastelThemeStyle } from './palette';

interface EventBlockProps {
  item: AgendaItem;
  category?: AgendaCategory;
  conflict?: TimeConflict;
  isSelected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  compact?: boolean;
}

export function EventBlock({
  item,
  category,
  conflict,
  isSelected,
  onClick,
  style,
  compact = false,
}: EventBlockProps) {
  const { theme } = useShell();
  const colorStyle = getPastelThemeStyle(item.colorId, theme);

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'education':
        return 'menu_book';
      case 'body':
        return 'fitness_center';
      case 'finance':
        return 'account_balance_wallet';
      case 'work':
        return 'business_center';
      case 'personal':
        return 'person';
      default:
        return 'event';
    }
  };

  const getKindLabel = () => {
    switch (item.kind) {
      case 'time_block':
        return item.isFlexible ? 'Bloco Flexível' : 'Bloco de Foco';
      case 'routine':
        return 'Rotina';
      case 'deadline':
        return 'Prazo Final';
      default:
        return 'Compromisso';
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...style,
        backgroundColor: colorStyle.bg,
        borderColor: isSelected ? colorStyle.accent : colorStyle.border,
        color: colorStyle.text,
      }}
      aria-pressed={isSelected}
      aria-label={`${item.title}, ${item.startTime || 'Dia todo'} às ${
        item.endTime || ''
      }, Categoria ${category?.name || 'Geral'}${
        conflict ? `, Conflito de horário: ${conflict.durationLabel}` : ''
      }`}
      className={`absolute z-10 text-left rounded-xl border p-2 sm:p-2.5 transition-all duration-160 select-none overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
        isSelected
          ? 'ring-2 ring-medusa-primary shadow-calm scale-[1.008] z-30'
          : 'shadow-subtle hover:shadow-calm hover:scale-[1.003] hover:z-20'
      }`}
    >
      {/* Barra de destaque lateral */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all"
        style={{ backgroundColor: colorStyle.accent }}
      />

      <div className="flex flex-col h-full justify-between pl-1">
        {/* Topo do Bloco: Título e Ícone de Domínio */}
        <div className="flex items-start justify-between gap-1.5 overflow-hidden">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-[12px] sm:text-[13px] leading-snug truncate">
                {item.title}
              </span>
              {item.isFlexible && (
                <span
                  title="Bloco flexível"
                  className="material-symbols-outlined text-[12px] text-text-muted opacity-70"
                >
                  swap_vert
                </span>
              )}
              {item.kind === 'routine' && (
                <span
                  title="Rotina recorrente"
                  className="material-symbols-outlined text-[12px] text-text-muted opacity-70"
                >
                  repeat
                </span>
              )}
            </div>

            {/* Horário & Duração */}
            {!compact && (
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] opacity-85 font-mono tracking-tight pt-0.5 tabular-nums">
                {item.allDay ? (
                  <span>Dia todo</span>
                ) : (
                  <>
                    <span>
                      {item.startTime} — {item.endTime}
                    </span>
                    {item.durationMinutes && (
                      <span className="opacity-60">
                        · {Math.floor(item.durationMinutes / 60) > 0 ? `${Math.floor(item.durationMinutes / 60)}h` : ''}
                        {item.durationMinutes % 60 > 0 ? ` ${item.durationMinutes % 60}m` : ''}
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <span
            className="material-symbols-outlined text-[14px] sm:text-[16px] flex-shrink-0 opacity-80"
            title={item.domain}
          >
            {getDomainIcon(item.domain)}
          </span>
        </div>

        {/* Rodapé do Bloco: Categoria e Alerta de Conflito */}
        <div className="flex items-center justify-between gap-1 mt-1 overflow-hidden">
          <span
            className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded-full border border-current/20 truncate"
            style={{ backgroundColor: colorStyle.subtle }}
          >
            {category?.name || item.domain}
          </span>

          {/* Destaque e Duração Real do Conflito */}
          {conflict && (
            <span
              className="flex items-center gap-1 text-[10px] font-mono font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/15 border border-rose-400/30 px-1.5 py-0.5 rounded-full shadow-subtle flex-shrink-0 animate-pulse"
              title={`Sobreposição de ${conflict.durationLabel} com outro compromisso`}
            >
              <span className="material-symbols-outlined text-[12px]">warning</span>
              <span className="truncate">{conflict.durationLabel}</span>
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
