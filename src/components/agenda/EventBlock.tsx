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
  isNarrow?: boolean;
}

// Inteligência de título para visualização compacta / estreita:
// Remove ruído de prefixos redundantes para evidenciar o núcleo da atividade
// e evitar que títulos de eventos virem ruído cortado em colunas com sobreposição.
function formatAdaptiveTitle(title: string, compact?: boolean, isNarrow?: boolean, isShort?: boolean): string {
  if (!title) return '';
  if (!compact && !isNarrow && !isShort) return title;

  let clean = title.trim();

  // Limpeza de prefixos categóricos comuns que consomem largura preciosa
  if (clean.startsWith('Estudo: ')) clean = clean.slice(8);
  else if (clean.startsWith('Estudo — ')) clean = clean.slice(9);
  else if (clean.startsWith('Revisão — ')) clean = clean.replace('Revisão — ', 'Rev. ');
  else if (clean.startsWith('Trabalho — ')) clean = clean.replace('Trabalho — ', '');
  else if (clean.startsWith('Seminário de Pesquisa Acadêmica e Extensão Universitária')) {
    clean = 'Seminário Pesquisa';
  } else if (clean.startsWith('Trabalho de Direito Constitucional')) {
    clean = 'Dir. Constitucional';
  } else if (clean.startsWith('Mentoria de Redação e Argumentação ENEM')) {
    clean = 'Mentoria Redação';
  } else if (clean.startsWith('Plantão de Dúvidas ENEM')) {
    clean = 'Plantão Dúvidas';
  } else if (clean.startsWith('Alinhamento Arquitetural Medusa')) {
    clean = 'Alinhamento Medusa';
  } else if (clean.startsWith('Sessão de Leitura & Síntese')) {
    clean = 'Leitura & Síntese';
  }

  return clean;
}

function formatAdaptiveTime(startTime?: string, endTime?: string, compact?: boolean, isNarrow?: boolean, isShort?: boolean): string {
  if (!startTime) return '';
  if (compact || isNarrow || isShort) {
    if (endTime) {
      const sH = startTime.split(':')[0];
      const eH = endTime.split(':')[0];
      if (startTime.endsWith(':00') && endTime.endsWith(':00')) {
        return `${Number(sH)}h–${Number(eH)}h`;
      }
      return `${startTime}–${endTime}`;
    }
    return startTime;
  }
  return `${startTime}${endTime ? ` — ${endTime}` : ''}`;
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
  isNarrow = false,
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

  const isShort = compact && Boolean(item.durationMinutes && item.durationMinutes <= 35);

  return (
    <button
      type="button"
      id={`agenda-item-${item.id}`}
      data-agenda-item="true"
      data-event-id={item.id}
      data-color-id={item.colorId}
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
        isShort || isNarrow ? 'p-1 sm:p-1.5' : compact ? 'p-1.5 sm:p-2' : 'p-2 sm:p-2.5'
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
        {/* Topo do Bloco: Horário, Alerta e Título */}
        <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
          {/* Linha de Horário e Status */}
          {compact && item.startTime && (
            <div className="flex items-center justify-between gap-1 pb-0.5 min-w-0">
              <span
                className={`font-mono tabular-nums leading-none tracking-tight block ${
                  isNarrow || isShort
                    ? 'text-[8.5px] sm:text-[9px] opacity-80'
                    : 'text-[9px] sm:text-[9.5px] opacity-80'
                }`}
              >
                {formatAdaptiveTime(item.startTime, item.endTime, compact, isNarrow, isShort)}
              </span>

              {/* Tag de conflito discreta no topo direito */}
              {conflict && (
                <span
                  className="flex items-center gap-0.5 text-[8.5px] font-mono font-bold text-rose-700 dark:text-rose-300 bg-rose-500/15 border border-rose-400/30 px-1 py-0.2 rounded shadow-subtle flex-shrink-0 animate-pulse"
                  title={`Conflito: ${conflict.durationLabel}`}
                >
                  <span className="material-symbols-outlined !text-[10px] leading-none" style={{ fontSize: '10px' }}>
                    warning
                  </span>
                  {!isNarrow && <span className="text-[8px] leading-none">{conflict.durationLabel}</span>}
                </span>
              )}
            </div>
          )}

          {/* Título do Evento */}
          <div className="flex items-start justify-between gap-1 min-w-0">
            <span
              className={`font-semibold tracking-tight transition-colors break-words ${
                isShort
                  ? 'text-[10px] sm:text-[10.5px] leading-tight truncate'
                  : isNarrow
                  ? 'text-[10px] sm:text-[10.5px] leading-snug line-clamp-2 max-w-full'
                  : compact
                  ? 'text-[10.5px] sm:text-[11px] leading-snug line-clamp-2 max-w-full'
                  : 'text-[12px] sm:text-[13px] leading-snug truncate max-w-full block'
              }`}
              style={{ color: colorStyle.text }}
            >
              {formatAdaptiveTitle(item.title, compact, isNarrow, isShort)}
            </span>

            {/* Ícone de Domínio APENAS quando NÃO for compact (ex: Day View) */}
            {!compact && (
              <span
                className="material-symbols-outlined flex-shrink-0 opacity-70 text-[14px] sm:text-[16px]"
                title={item.domain}
              >
                {getDomainIcon(item.domain)}
              </span>
            )}
          </div>

          {/* Horário & Duração quando NÃO compact (Day View) */}
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

        {/* Rodapé do Bloco: Categoria e Alerta de Conflito APENAS para Day View (não compact) */}
        {!compact && (
          <div className="flex items-center justify-between gap-1 mt-0.5 overflow-hidden flex-shrink-0">
            <span
              className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded-full border border-current/20 truncate"
              style={{ backgroundColor: colorStyle.subtle }}
            >
              {category?.name || item.domain}
            </span>

            {conflict && (
              <span
                className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/15 border border-rose-400/30 px-1.5 py-0.5 rounded-full shadow-subtle flex-shrink-0 animate-pulse"
                title={`Sobreposição de ${conflict.durationLabel} com outro compromisso`}
              >
                <span className="material-symbols-outlined text-[11px]">warning</span>
                <span>{conflict.durationLabel}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
