/**
 * Medusa — List View
 *
 * Visualização auxiliar para consumo rápido e direto.
 * Organizada obrigatoriamente nos quatro blocos temporais canônicos do Medusa:
 * - Agora (em andamento)
 * - Próximo (próxima transição imediata)
 * - Depois (compromissos subsequentes)
 * - Mais tarde (itens noturnos, prazos e fechamento)
 */

'use client';

import React, { useState } from 'react';
import { AgendaCategory, AgendaItem, TimeConflict } from '@/types/agenda';
import { EventListItem } from './EventListItem';
import {
  detectTimeConflicts,
  groupItemsForListView,
} from './agendaHelpers';
import { formatDateISO } from './agendaFixtures';

interface ListViewProps {
  currentDate: Date;
  items: AgendaItem[];
  categories: AgendaCategory[];
  selectedItemId?: string | null;
  onSelectItem: (item: AgendaItem) => void;
  onEditItem?: (item: AgendaItem) => void;
  onDeleteItem?: (itemId: string) => void;
  onDeleteMultiple?: (itemIds: string[]) => void;
}

export function ListView({
  currentDate,
  items,
  categories,
  selectedItemId,
  onSelectItem,
  onEditItem,
  onDeleteItem,
  onDeleteMultiple,
}: ListViewProps) {
  const dateStr = formatDateISO(currentDate);
  const dayItems = items.filter((it) => it.date === dateStr);
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());

  // Detecção de conflitos para enriquecer os itens da lista
  const conflicts = detectTimeConflicts(dayItems);

  // Agrupamento canônico nos 4 buckets temporais
  const buckets = groupItemsForListView(dayItems, new Date());

  const getBucketIcon = (kind: string) => {
    switch (kind) {
      case 'agora':
        return 'play_circle';
      case 'proximo':
        return 'update';
      case 'depois':
        return 'timelapse';
      case 'mais_tarde':
        return 'nightlight';
      default:
        return 'schedule';
    }
  };

  const getItemConflict = (item: AgendaItem): TimeConflict | undefined => {
    return conflicts.find(
      (c) => c.itemA.id === item.id || c.itemB.id === item.id
    );
  };

  const toggleSelectBatch = (id: string) => {
    setSelectedBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedBatchIds.size === dayItems.length) {
      setSelectedBatchIds(new Set());
    } else {
      setSelectedBatchIds(new Set(dayItems.map((it) => it.id)));
    }
  };

  const handleBatchDelete = () => {
    if (selectedBatchIds.size === 0 || !onDeleteMultiple) return;
    onDeleteMultiple(Array.from(selectedBatchIds));
    setSelectedBatchIds(new Set());
  };

  if (dayItems.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-border/70 p-12 text-center shadow-subtle space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-surface-secondary flex items-center justify-center mx-auto text-text-muted">
          <span className="material-symbols-outlined text-[24px]">event_available</span>
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-text-primary">
            Nenhum compromisso agendado para este dia
          </h3>
          <p className="text-[13px] text-text-secondary max-w-sm mx-auto">
            O dia está completamente livre. Use o botão Adicionar para agendar blocos de foco, eventos ou prazos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Barra de Ações em Lote (Fase 5 §Exclusão em massa) */}
      <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface border border-border/60 text-[12px]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="btn-interactive text-[11px] font-mono text-text-secondary hover:text-text-primary px-2.5 py-1 rounded-lg border border-border/70 bg-surface-secondary/40 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[15px]">
              {selectedBatchIds.size === dayItems.length ? 'check_box' : selectedBatchIds.size > 0 ? 'indeterminate_check_box' : 'check_box_outline_blank'}
            </span>
            <span>{selectedBatchIds.size === dayItems.length ? 'Desmarcar todos' : 'Selecionar todos'}</span>
          </button>
          {selectedBatchIds.size > 0 && (
            <span className="text-[11px] font-mono text-medusa-primary font-semibold">
              {selectedBatchIds.size} selecionado{selectedBatchIds.size > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {selectedBatchIds.size > 0 && onDeleteMultiple && (
          <button
            type="button"
            id="btn-batch-delete"
            onClick={handleBatchDelete}
            className="btn-interactive px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-mono font-medium flex items-center gap-1 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[14px]">delete</span>
            <span>Excluir selecionados</span>
          </button>
        )}
      </div>

      {buckets.map((bucket) => {
        if (bucket.items.length === 0) return null;

        return (
          <section
            key={bucket.kind}
            aria-label={`Bloco ${bucket.title}`}
            className="bg-surface rounded-2xl border border-border/70 p-4 sm:p-5 shadow-subtle space-y-3"
          >
            {/* Cabeçalho do Bloco Temporal */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-[16px] shadow-subtle ${
                    bucket.kind === 'agora'
                      ? 'bg-medusa-primary text-[#1C2420]'
                      : 'bg-surface-secondary text-text-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {getBucketIcon(bucket.kind)}
                  </span>
                </span>

                <div>
                  <h3 className="text-[14px] font-bold text-text-primary tracking-tight flex items-center gap-2">
                    <span>{bucket.title}</span>
                    <span className="text-[11px] font-mono font-normal text-text-muted">
                      ({bucket.items.length})
                    </span>
                  </h3>
                  <p className="text-[11px] text-text-muted">{bucket.description}</p>
                </div>
              </div>

              {bucket.kind === 'agora' && (
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-medusa-primary bg-medusa-primary/15 border border-medusa-primary/30 px-2.5 py-0.5 rounded-full shadow-subtle flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary" />
                  <span>Em Curso</span>
                </span>
              )}
            </div>

            {/* Lista de Itens do Bloco */}
            <div className="space-y-2 pt-1">
              {bucket.items.map((item) => {
                const cat = categories.find((c) => c.id === item.categoryId);
                const conflict = getItemConflict(item);
                const isSelected = selectedItemId === item.id;
                const isSelectedForBatch = selectedBatchIds.has(item.id);

                return (
                  <EventListItem
                    key={item.id}
                    item={item}
                    category={cat}
                    conflict={conflict}
                    isSelected={isSelected}
                    selectable={true}
                    isSelectedForBatch={isSelectedForBatch}
                    onToggleSelectBatch={() => toggleSelectBatch(item.id)}
                    onClick={() => onSelectItem(item)}
                    onEdit={onEditItem ? () => onEditItem(item) : undefined}
                    onDelete={onDeleteItem ? () => onDeleteItem(item.id) : undefined}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
