/**
 * Medusa — Event Detail Panel
 *
 * Painel de inspeção aprofundada de um item selecionado.
 * Exibe metadados de domínio, duração, conflitos e origem informativa.
 * Inclui confirmação de exclusão em dois passos.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { AgendaCategory, AgendaItem, TimeConflict } from '@/types/agenda';
import { useShell } from '@/context/ShellContext';
import { getPastelThemeStyle } from './palette';
import { formatDuration } from './agendaHelpers';

type RecurringDeleteScope = 'this' | 'following' | 'series';

interface ConflictSuggestion {
  date: string;
  start: string;
  end: string;
  dayLabel: string;
}

interface EventDetailPanelProps {
  item: AgendaItem | null;
  category?: AgendaCategory;
  conflict?: TimeConflict;
  onClose: () => void;
  onEdit: (item: AgendaItem) => void;
  onDelete: (itemId: string) => void;
  onDeleteRecurring?: (item: AgendaItem, scope: RecurringDeleteScope) => void;
  suggestions?: ConflictSuggestion[];
  onApplySuggestion?: (item: AgendaItem, suggestion: ConflictSuggestion) => void;
}

export function EventDetailPanel({
  item,
  category,
  conflict,
  onClose,
  onEdit,
  onDelete,
  onDeleteRecurring,
  suggestions = [],
  onApplySuggestion,
}: EventDetailPanelProps) {
  const { theme } = useShell();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteScope, setDeleteScope] = useState<RecurringDeleteScope>('this');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fechar com tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const colorStyle = getPastelThemeStyle(item.colorId, theme);

  const getDomainLabel = (domain: string) => {
    switch (domain) {
      case 'education':
        return 'Educação';
      case 'body':
        return 'Corpo';
      case 'finance':
        return 'Finanças';
      case 'work':
        return 'Trabalho';
      case 'personal':
        return 'Pessoal';
      default:
        return 'Geral';
    }
  };

  const getKindLabel = (kind: string) => {
    switch (kind) {
      case 'time_block':
        return item.isFlexible ? 'Bloco Flexível' : 'Bloco de Foco';
      case 'routine':
        return 'Rotina Recorrente';
      case 'deadline':
        return 'Prazo Final (Deadline)';
      default:
        return 'Compromisso Fixo';
    }
  };

  return (
    <aside
      aria-label="Detalhes do compromisso"
      className="bg-surface rounded-2xl border border-border/80 p-5 sm:p-6 shadow-calm flex flex-col gap-5 relative transition-all duration-200 animate-in fade-in slide-in-from-right-2"
    >
      {/* Topo: Categoria e Botão Fechar */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: colorStyle.accent }}
          />
          <span
            className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border"
            style={{
              backgroundColor: colorStyle.bg,
              borderColor: colorStyle.border,
              color: colorStyle.text,
            }}
          >
            {category?.name || getDomainLabel(item.domain)}
          </span>
          <span className="text-[11px] font-mono text-text-muted">
            · {getKindLabel(item.kind)}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar detalhes"
          title="Fechar painel de detalhes"
          className="btn-interactive p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      {/* Título & Horário */}
      <div className="space-y-1.5">
        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary">
          {item.title}
        </h3>

        <div className="flex items-center gap-2 text-[12px] font-mono text-text-secondary tabular-nums">
          <span className="material-symbols-outlined text-[16px] text-text-muted">schedule</span>
          {item.allDay ? (
            <span>Dia todo ({item.date})</span>
          ) : (
            <span>
              {item.startTime} — {item.endTime}
              {item.durationMinutes && (
                <span className="text-text-muted ml-1.5">
                  ({formatDuration(item.durationMinutes)})
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Alerta de Conflito com Duração Exata */}
      {conflict && (
        <div
          role="alert"
          className="bg-rose-500/10 border border-rose-400/30 rounded-xl p-3.5 flex items-start gap-3 text-rose-800 dark:text-rose-200"
        >
          <span className="material-symbols-outlined text-[18px] text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5">
            warning
          </span>
          <div className="space-y-0.5 text-[12px]">
            <div className="font-semibold font-mono tracking-tight">
              {conflict.durationLabel}
            </div>
            <p className="text-rose-700 dark:text-rose-300/80 leading-relaxed text-[11px]">
              Sobreposição detectada com outro compromisso na faixa de {conflict.start} às {conflict.end}.
              A decisão sobre ajuste temporal permanece com você.
            </p>

            {/* Sugestões de próximo horário compatível (seções 5/6) — busca real de lacunas
                livres (findCompatibleTimeSlots), não um motor de otimização definitivo. */}
            {suggestions.length > 0 && onApplySuggestion && (
              <div className="pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowSuggestions((prev) => !prev)}
                  className="btn-interactive text-[11px] font-mono font-medium text-rose-700 dark:text-rose-300 hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {showSuggestions ? 'expand_less' : 'expand_more'}
                  </span>
                  <span>{showSuggestions ? 'Ocultar sugestões' : 'Ver horários compatíveis'}</span>
                </button>

                {showSuggestions && (
                  <div className="mt-2 space-y-1.5 animate-in fade-in">
                    {suggestions.map((s, idx) => (
                      <div
                        key={`${s.date}-${s.start}`}
                        className="flex items-center justify-between gap-2 bg-surface rounded-lg border border-border/60 px-2.5 py-1.5"
                      >
                        <div className="text-[11px] text-text-primary">
                          <span className={idx === 0 ? 'font-semibold' : ''}>{s.dayLabel}</span>
                          <span className="text-text-muted"> — {s.start} a {s.end}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onApplySuggestion(item, s)}
                          className="btn-interactive px-2 py-1 rounded-md text-[10px] font-mono font-medium bg-medusa-primary text-[#1C2420] hover:brightness-105 flex-shrink-0"
                        >
                          Usar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metadados Adicionais */}
      <div className="space-y-3 text-[12px] border-y border-border/60 py-4">
        {item.location && (
          <div className="flex items-center gap-2.5 text-text-secondary">
            <span className="material-symbols-outlined text-[16px] text-text-muted">
              location_on
            </span>
            <span>{item.location}</span>
          </div>
        )}

        {item.recurrence && (
          <div className="flex items-center gap-2.5 text-text-secondary font-mono text-[11px]">
            <span className="material-symbols-outlined text-[16px] text-text-muted">repeat</span>
            <span>
              Recorrência: {item.recurrence.frequency === 'weekly' ? 'Semanal' : item.recurrence.frequency}
            </span>
          </div>
        )}

        {item.description && (
          <div className="space-y-1 pt-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-text-muted">
              Descrição
            </span>
            <p className="text-text-secondary leading-relaxed text-[12px] bg-surface-secondary/40 p-3 rounded-lg border border-border/40">
              {item.description}
            </p>
          </div>
        )}
      </div>

      {/* Bloco de Origem / Regra de Propriedade dos Dados */}
      {item.source && (
        <div className="bg-surface-secondary/60 rounded-xl p-3 border border-border/60 flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[16px] text-medusa-primary flex-shrink-0 mt-0.5">
            hub
          </span>
          <div className="space-y-0.5 text-[11px]">
            <span className="font-semibold text-text-primary block">
              {item.source.sourceLabel || 'Item Local da Agenda'}
            </span>
            <span className="text-text-muted leading-relaxed block">
              {item.source.sourceType !== 'manual'
                ? 'A Agenda conhece e gerencia o tempo; a conclusão e as regras pedagógicas/operacionais pertencem ao módulo original.'
                : 'Criado diretamente na Agenda como compromisso desta sessão.'}
            </span>
          </div>
        </div>
      )}

      {/* Ações de Edição e Exclusão */}
      <div className="pt-2 flex flex-col gap-2">
        {confirmDelete ? (
          <div className="bg-rose-500/10 border border-rose-400/40 rounded-xl p-3 space-y-2.5 animate-in fade-in">
            <p className="text-[12px] font-medium text-rose-800 dark:text-rose-200 text-center">
              Excluir compromisso
            </p>

            {/* Distinção de escopo para itens de série recorrente (seção 9) — sem isto,
                excluir uma ocorrência de rotina removia a série inteira sem aviso. */}
            {item.kind === 'routine' && onDeleteRecurring ? (
              <div className="space-y-1.5">
                {(
                  [
                    { value: 'this', label: 'Somente este evento' },
                    { value: 'following', label: 'Este e os próximos' },
                    { value: 'series', label: 'Toda a série' },
                  ] as { value: RecurringDeleteScope; label: string }[]
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 text-[12px] text-rose-800 dark:text-rose-200 cursor-pointer select-none"
                  >
                    <input
                      type="radio"
                      name="delete-scope"
                      checked={deleteScope === opt.value}
                      onChange={() => setDeleteScope(opt.value)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-rose-800 dark:text-rose-200 text-center">
                Confirmar exclusão deste compromisso?
              </p>
            )}

            <div className="flex items-center justify-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="btn-interactive px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium text-text-secondary hover:text-text-primary hover:bg-surface border border-border"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (item.kind === 'routine' && onDeleteRecurring) {
                    onDeleteRecurring(item, deleteScope);
                  } else {
                    onDelete(item.id);
                  }
                }}
                className="btn-interactive px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
              >
                {item.kind === 'routine' && onDeleteRecurring ? 'Excluir' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="btn-interactive flex-1 py-2 px-3 rounded-xl bg-surface-elevated hover:bg-surface-secondary text-text-primary font-medium text-[12px] border border-border/80 shadow-subtle flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Editar</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="btn-interactive py-2 px-3 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-[12px] font-medium border border-rose-400/30 flex items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              <span>Excluir</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
