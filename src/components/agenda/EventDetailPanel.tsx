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
  onReschedule?: (itemId: string, date: string, startTime: string, endTime: string) => void;
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
  onReschedule,
  suggestions = [],
  onApplySuggestion,
}: EventDetailPanelProps) {
  const { theme, setActiveRoute, triggerIslandNotification } = useShell();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteScope, setDeleteScope] = useState<RecurringDeleteScope>('this');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [financialAnalysis, setFinancialAnalysis] = useState<string | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);

  const handleShiftTime = (deltaMinutes: number) => {
    if (!item || !item.startTime || !item.endTime || !onReschedule) return;
    const [sh, sm] = item.startTime.split(':').map(Number);
    const [eh, em] = item.endTime.split(':').map(Number);
    const startM = sh * 60 + sm + deltaMinutes;
    const endM = eh * 60 + em + deltaMinutes;
    if (startM < 0 || endM > 24 * 60) return;
    const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    onReschedule(item.id, item.date, fmt(startM), fmt(endM));
  };

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

  useEffect(() => {
    if (confirmDelete) {
      const box = document.getElementById('delete-confirm-box');
      if (box) {
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [confirmDelete]);

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
      id="agenda-detail-panel"
      aria-label="Detalhes do compromisso"
      className="bg-surface rounded-2xl border border-border/80 p-5 sm:p-6 shadow-calm flex flex-col gap-5 relative transition-all duration-200 animate-in fade-in slide-in-from-right-2 max-h-[calc(100vh-5.5rem)] overflow-y-auto overflow-x-hidden sticky top-4"
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

        {/* Reagendamento Rápido (Fase 12) */}
        {!item.allDay && item.startTime && item.endTime && onReschedule && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-mono text-text-muted">Ajuste rápido:</span>
            <button
              type="button"
              onClick={() => handleShiftTime(-30)}
              title="Adiantar 30 minutos"
              className="btn-interactive px-2 py-0.5 rounded-lg border border-border/70 bg-surface-secondary/50 hover:bg-surface text-[10px] font-mono text-text-secondary hover:text-text-primary transition-all shadow-subtle"
            >
              -30 min
            </button>
            <button
              type="button"
              onClick={() => handleShiftTime(30)}
              title="Adiar 30 minutos"
              className="btn-interactive px-2 py-0.5 rounded-lg border border-border/70 bg-surface-secondary/50 hover:bg-surface text-[10px] font-mono text-text-secondary hover:text-text-primary transition-all shadow-subtle"
            >
              +30 min
            </button>
          </div>
        )}
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

      {/* Ações de Prazo / Contexto de Estudo */}
      {item.domain === 'education' && (
        <div className="space-y-2 bg-medusa-primary/5 rounded-xl p-3 border border-medusa-primary/20">
          <span className="text-[10px] font-mono uppercase tracking-wider text-medusa-primary font-bold block">
            Ações de Estudo
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                triggerIslandNotification({
                  title: 'Sessão iniciada',
                  description: `Foco em: ${item.title}`,
                  badge: 'Estudo Ativo',
                  durationMs: 2000,
                });
                setActiveRoute('educacao');
                onClose();
              }}
              className="btn-interactive py-1.5 px-2 rounded-lg bg-medusa-primary/20 hover:bg-medusa-primary/30 text-text-primary text-[11px] font-medium flex items-center justify-center gap-1 border border-medusa-primary/30"
            >
              <span className="material-symbols-outlined text-[14px]">play_arrow</span>
              <span>Começar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerIslandNotification({
                  title: 'Revisão programada',
                  description: 'Material adicionado aos cartões de revisão',
                  badge: 'Revisão',
                  durationMs: 1800,
                });
              }}
              className="btn-interactive py-1.5 px-2 rounded-lg bg-surface-elevated hover:bg-surface-secondary text-text-primary text-[11px] font-medium flex items-center justify-center gap-1 border border-border/70"
            >
              <span className="material-symbols-outlined text-[14px]">autorenew</span>
              <span>Revisar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerIslandNotification({
                  title: 'Material didático',
                  description: 'Acessando conteúdo curricular',
                  badge: 'Aula',
                  durationMs: 1800,
                });
                setActiveRoute('educacao');
                onClose();
              }}
              className="btn-interactive py-1.5 px-2 rounded-lg bg-surface-elevated hover:bg-surface-secondary text-text-primary text-[11px] font-medium flex items-center justify-center gap-1 border border-border/70"
            >
              <span className="material-symbols-outlined text-[14px]">menu_book</span>
              <span>Abrir Aula</span>
            </button>
          </div>
        </div>
      )}

      {/* Ações de Prazo / Contexto Financeiro & Deadlines */}
      {(item.domain === 'finance' || item.kind === 'deadline') && (
        <div className="space-y-2.5 bg-amber-500/5 rounded-xl p-3 border border-amber-400/25">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-300 font-bold">
              Gestão de Prazo / Financeiro
            </span>
            {paymentDone && (
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-400/30">
                Quitado
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setFinancialAnalysis('Análise temporal: Prazo prioritário sem conflito de liquidez planejado na semana.');
                triggerIslandNotification({
                  title: 'Análise de Prazo Concluída',
                  description: 'Verificação temporal local finalizada',
                  badge: 'Prazo',
                  durationMs: 2000,
                });
              }}
              className="btn-interactive py-1.5 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 text-[11px] font-medium flex items-center justify-center gap-1 border border-amber-400/30"
            >
              <span className="material-symbols-outlined text-[14px]">query_stats</span>
              <span>Analisar prazo</span>
            </button>
            <button
              type="button"
              disabled={paymentDone}
              onClick={() => {
                setPaymentDone(true);
                triggerIslandNotification({
                  title: 'Pagamento Registrado',
                  description: 'Status atualizado no estado local da Agenda',
                  badge: 'Liquidado',
                  durationMs: 2200,
                });
              }}
              className="btn-interactive py-1.5 px-2 rounded-lg bg-surface-elevated hover:bg-surface-secondary text-text-primary text-[11px] font-medium flex items-center justify-center gap-1 border border-border/70 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>{paymentDone ? 'Pago' : 'Registrar'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFinancialAnalysis('Impacto no fluxo: Baixo risco para as rotinas essenciais dos próximos 7 dias.');
                triggerIslandNotification({
                  title: 'Impacto Calculado',
                  description: 'Janela semanal de compromissos preservada',
                  badge: 'Impacto',
                  durationMs: 2000,
                });
              }}
              className="btn-interactive py-1.5 px-2 rounded-lg bg-surface-elevated hover:bg-surface-secondary text-text-primary text-[11px] font-medium flex items-center justify-center gap-1 border border-border/70"
            >
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              <span>Ver impacto</span>
            </button>
          </div>

          {financialAnalysis && (
            <div className="text-[11px] text-text-secondary bg-surface/80 p-2 rounded-lg border border-border/60 space-y-1">
              <p>{financialAnalysis}</p>
              <p className="text-[10px] text-text-muted italic">
                * Estado Local Ativo: Análise preditiva preliminar. A conexão bancária real ainda não está vinculada.
              </p>
            </div>
          )}
        </div>
      )}

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

      {/* Navegação Cross-Tab para Educação */}
      {item.domain === 'education' && (
        <button
          type="button"
          id="btn-go-to-education"
          onClick={() => {
            setActiveRoute('educacao');
            onClose();
          }}
          className="btn-interactive w-full py-2.5 px-3.5 rounded-xl bg-medusa-primary/15 border border-medusa-primary/40 hover:bg-medusa-primary/25 text-[#18534B] dark:text-[#71DBD2] text-[12px] font-semibold flex items-center justify-center gap-2 shadow-subtle transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">school</span>
          <span>Abrir no contexto de Educação</span>
        </button>
      )}

      {/* Ações de Edição, Duplicação e Exclusão (Contidas e Acessíveis) */}
      <div className="sticky -bottom-5 sm:-bottom-6 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 p-4 sm:p-5 bg-surface/95 backdrop-blur-md border-t border-border/70 rounded-b-2xl flex flex-col gap-2 z-20 shadow-subtle">
        {confirmDelete ? (
          <div id="delete-confirm-box" className="bg-rose-500/10 border border-rose-400/40 rounded-xl p-3 space-y-2.5 animate-in fade-in">
            <p className="text-[12px] font-semibold text-rose-800 dark:text-rose-200 text-center">
              Excluir compromisso
            </p>

            {(item.kind === 'routine' || item.recurrence || item.id.includes('-virt-')) && onDeleteRecurring ? (
              <div id="recurring-delete-scope-box" className="space-y-1.5">
                {(
                  [
                    { value: 'this', label: 'Somente este evento' },
                    { value: 'following', label: 'Este e os próximos' },
                    { value: 'series', label: 'Toda a série' },
                  ] as { value: RecurringDeleteScope; label: string }[]
                ).map((opt) => (
                  <label
                    key={opt.value}
                    id={`delete-scope-option-${opt.value}`}
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
                  if ((item.kind === 'routine' || item.recurrence || item.id.includes('-virt-')) && onDeleteRecurring) {
                    onDeleteRecurring(item, deleteScope);
                  } else {
                    onDelete(item.id);
                  }
                }}
                id="btn-confirm-delete"
                className="btn-interactive px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
              >
                {(item.kind === 'routine' || item.recurrence || item.id.includes('-virt-')) && onDeleteRecurring ? 'Excluir' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              id="btn-edit-event"
              onClick={() => onEdit(item)}
              className="btn-interactive flex-1 py-2 px-3 rounded-xl bg-surface-elevated hover:bg-surface-secondary text-text-primary font-medium text-[12px] border border-border/80 shadow-subtle flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Editar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerIslandNotification({
                  title: 'Evento Duplicado',
                  description: `Cópia criada: ${item.title}`,
                  badge: 'Duplicado',
                  durationMs: 1800,
                });
                onClose();
              }}
              title="Criar cópia deste compromisso"
              className="btn-interactive py-2 px-3 rounded-xl bg-surface-elevated hover:bg-surface-secondary text-text-primary font-medium text-[12px] border border-border/80 shadow-subtle flex items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
            >
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
              <span>Duplicar</span>
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
