/**
 * Medusa — Event List Item
 *
 * Linha tabular e rica para a visualização em Lista (List View).
 * Apresenta domínio, horário, categoria, duração e indicação de conflito.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { AgendaCategory, AgendaItem, TimeConflict } from '@/types/agenda';
import { useShell } from '@/context/ShellContext';
import { getPastelThemeStyle } from './palette';

interface EventListItemProps {
  item: AgendaItem;
  category?: AgendaCategory;
  conflict?: TimeConflict;
  isSelected?: boolean;
  selectable?: boolean;
  isSelectedForBatch?: boolean;
  onToggleSelectBatch?: () => void;
  onClick: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export function EventListItem({
  item,
  category,
  conflict,
  isSelected,
  selectable,
  isSelectedForBatch,
  onToggleSelectBatch,
  onClick,
  onEdit,
  onDelete,
}: EventListItemProps) {
  const { theme } = useShell();
  const colorStyle = getPastelThemeStyle(item.colorId, theme);
  const [pendingDelete, setPendingDelete] = useState(false);

  // Confirmação de exclusão em 2 passos, consistente com EventDetailPanel — evita que a
  // ação rápida de exclusão na Lista seja irreversível e instantânea (achado de auditoria:
  // antes desta mudança, este botão excluía sem nenhuma confirmação).
  useEffect(() => {
    if (!pendingDelete) return;
    const timeout = window.setTimeout(() => setPendingDelete(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [pendingDelete]);

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
        return 'calendar_today';
    }
  };

  const getKindBadge = () => {
    switch (item.kind) {
      case 'time_block':
        return { label: item.isFlexible ? 'Flexível' : 'Bloco', icon: 'schedule' };
      case 'routine':
        return { label: 'Rotina', icon: 'repeat' };
      case 'deadline':
        return { label: 'Deadline', icon: 'flag' };
      default:
        return { label: 'Evento', icon: 'event' };
    }
  };

  const kindInfo = getKindBadge();

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-pressed={isSelected}
      aria-label={`${item.title}, ${item.startTime || 'Dia todo'} às ${item.endTime || ''}`}
      className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border transition-all duration-160 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
        isSelected
          ? 'bg-surface-elevated border-medusa-primary/50 shadow-calm ring-1 ring-medusa-primary/30'
          : 'bg-surface border-border/70 hover:border-border hover:bg-surface-secondary hover:shadow-subtle'
      } ${isSelectedForBatch ? 'ring-2 ring-medusa-primary/60 bg-medusa-primary/5' : ''}`}
    >
      {/* Indicador de cor à esquerda */}
      <div
        className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md transition-all"
        style={{ backgroundColor: colorStyle.accent }}
      />

      <div className="flex items-start sm:items-center gap-3 pl-1 min-w-0">
        {/* Checkbox para seleção em lote (Fase 5) */}
        {selectable && (
          <button
            type="button"
            role="checkbox"
            aria-checked={isSelectedForBatch}
            aria-label={`Selecionar ${item.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelectBatch?.();
            }}
            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0 mt-2 sm:mt-0 ${
              isSelectedForBatch
                ? 'bg-medusa-primary border-medusa-primary text-[#1C2420]'
                : 'border-border/80 bg-surface/90 hover:border-medusa-primary'
            }`}
          >
            {isSelectedForBatch && (
              <span className="material-symbols-outlined text-[14px] font-bold">check</span>
            )}
          </button>
        )}

        {/* Ícone de Domínio */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-subtle"
          style={{ backgroundColor: colorStyle.bg, color: colorStyle.text }}
        >
          <span className="material-symbols-outlined text-[18px]">
            {getDomainIcon(item.domain)}
          </span>
        </div>

        {/* Informações Principais */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-[13px] sm:text-[14px] font-semibold text-text-primary tracking-tight truncate">
              {item.title}
            </h4>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-border/50 text-text-muted flex items-center gap-1 bg-surface-subtle/50"
            >
              <span className="material-symbols-outlined text-[11px]">
                {kindInfo.icon}
              </span>
              <span>{kindInfo.label}</span>
            </span>

            {/* Alerta de Conflito com Duração */}
            {conflict && (
              <span
                className="text-[10px] font-mono font-medium text-rose-700 dark:text-rose-300 bg-rose-500/15 border border-rose-400/30 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-subtle"
                title={`Conflito de ${conflict.durationLabel}`}
              >
                <span className="material-symbols-outlined text-[12px]">warning</span>
                <span>{conflict.durationLabel}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-text-secondary font-mono flex-wrap tabular-nums">
            {item.allDay ? (
              <span className="text-text-muted">Dia Todo</span>
            ) : (
              <span>
                {item.startTime} — {item.endTime}
                {item.durationMinutes && (
                  <span className="text-text-muted ml-1">({item.durationMinutes}m)</span>
                )}
              </span>
            )}

            <span className="text-text-muted/40">•</span>

            <span
              className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: colorStyle.bg,
                borderColor: colorStyle.border,
                color: colorStyle.text,
              }}
            >
              {category?.name || item.domain}
            </span>

            {item.source?.sourceLabel && (
              <>
                <span className="text-text-muted/40 hidden sm:inline">•</span>
                <span className="text-text-muted text-[10px] truncate max-w-[200px] hidden sm:inline">
                  {item.source.sourceLabel}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Ações Rápidas à Direita */}
      <div className="flex items-center gap-1.5 self-end sm:self-center pl-1 sm:pl-0">
        {onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(e);
            }}
            aria-label={`Editar ${item.title}`}
            title="Editar compromisso"
            className="btn-interactive p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-subtle transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
          >
            <span className="material-symbols-outlined text-[17px]">edit</span>
          </button>
        )}

        {onDelete && !pendingDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPendingDelete(true);
            }}
            aria-label={`Excluir ${item.title}`}
            title="Excluir compromisso"
            className="btn-interactive p-1.5 rounded-lg text-text-muted hover:text-rose-600 hover:bg-rose-500/10 transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
          >
            <span className="material-symbols-outlined text-[17px]">delete</span>
          </button>
        )}

        {onDelete && pendingDelete && (
          <div
            className="flex items-center gap-1 animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPendingDelete(false)}
              aria-label="Cancelar exclusão"
              title="Cancelar"
              className="btn-interactive px-2 py-1 rounded-lg text-[10px] font-mono font-medium text-text-secondary hover:text-text-primary hover:bg-surface border border-border"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={(e) => {
                setPendingDelete(false);
                onDelete(e);
              }}
              aria-label={`Confirmar exclusão de ${item.title}`}
              title="Confirmar exclusão"
              className="btn-interactive px-2 py-1 rounded-lg text-[10px] font-mono font-medium bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
            >
              Confirmar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
