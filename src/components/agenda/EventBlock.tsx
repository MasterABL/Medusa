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
  onDoubleClick?: () => void;
  style?: React.CSSProperties;
  compact?: boolean;
}

export function EventBlock({
  item,
  category,
  conflict,
  isSelected,
  onClick,
  onDoubleClick,
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
      id={`agenda-item-${item.id}`}
      data-agenda-item="true"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
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
      title={`${item.title} (${item.startTime || 'Dia todo'}${item.endTime ? ` — ${item.endTime}` : ''})`}
      className={`absolute inset-0 w-full h-full z-10 text-left rounded-xl border transition-all duration-160 select-none overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
        compact ? 'p-1.5 sm:p-2' : 'p-2 sm:p-2.5'
      } ${
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

      <div className="flex flex-col h-full justify-between pl-1 min-w-0">
        {/* Topo do Bloco: Título, Horário e Ícone */}
        <div className="flex items-start justify-between gap-1 overflow-hidden min-w-0">
          <div className="flex flex-col min-w-0 flex-1">
            {/* Horário no topo em compact para hierarquia imediata */}
            {compact && item.startTime && (
              <span className="font-mono text-[9px] sm:text-[9.5px] opacity-75 tabular-nums leading-none tracking-tight block pb-0.5">
                {item.startTime}{item.endTime ? ` — ${item.endTime}` : ''}
              </span>
            )}

            <div className="flex items-center gap-1 min-w-0">
              <span
                className={`font-semibold tracking-tight ${
                  compact
                    ? 'text-[11px] sm:text-[11.5px] leading-tight line-clamp-2'
                    : 'text-[12px] sm:text-[13px] leading-snug truncate max-w-full block'
                }`}
                style={{ color: colorStyle.text }}
              >
                {item.title}
              </span>
              {item.isFlexible && (
                <span
                  title="Bloco flexível"
                  className="material-symbols-outlined text-[11px] text-text-muted opacity-70 flex-shrink-0"
                >
                  swap_vert
                </span>
              )}
              {item.kind === 'routine' && (
                <span
                  title="Rotina recorrente"
                  className="material-symbols-outlined text-[11px] text-text-muted opacity-70 flex-shrink-0"
                >
                  repeat
                </span>
              )}
            </div>

            {/* Horário & Duração quando NÃO compact */}
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
            className={`material-symbols-outlined flex-shrink-0 opacity-70 ${
              compact ? 'text-[12px] sm:text-[13px]' : 'text-[14px] sm:text-[16px]'
            }`}
            title={item.domain}
          >
            {getDomainIcon(item.domain)}
          </span>
        </div>

        {/* Rodapé do Bloco: Categoria e Alerta de Conflito */}
        {(!compact || conflict || (item.durationMinutes && item.durationMinutes >= 75)) && (
          <div className="flex items-center justify-between gap-1 mt-0.5 overflow-hidden flex-shrink-0">
            {!compact && (
              <span
                className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded-full border border-current/20 truncate"
                style={{ backgroundColor: colorStyle.subtle }}
              >
                {category?.name || item.domain}
              </span>
            )}

            {/* Destaque e Duração Real do Conflito */}
            {conflict && (
              <span
                className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/15 border border-rose-400/30 px-1.5 py-0.5 rounded-full shadow-subtle flex-shrink-0 animate-pulse"
                title={`Sobreposição de ${conflict.durationLabel} com outro compromisso`}
              >
                <span className="material-symbols-outlined text-[11px]">warning</span>
                <span className="truncate">{conflict.durationLabel}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
