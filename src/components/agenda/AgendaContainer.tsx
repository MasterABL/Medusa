/**
 * Medusa — Agenda Container
 *
 * Orquestrador principal da camada temporal (Temporal OS).
 * Conecta as visualizações (Dia, Semana, Mês, Lista), filtros por domínio,
 * seleção, painel de detalhes, drawer de criação/edição e modal de categorias.
 */

'use client';

import React, { useCallback, useMemo, useEffect } from 'react';
import { AgendaItem } from '@/types/agenda';
import { useAgenda } from '@/context/AgendaContext';
import { useShell } from '@/context/ShellContext';
import { IslandState } from '@/types/shell';
import { playFeedback } from '@/lib/audioFeedback';
import { AgendaHeader } from './AgendaHeader';
import { AgendaFilters } from './AgendaFilters';
import { DayView } from './DayView';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { ListView } from './ListView';
import { EventDetailPanel } from './EventDetailPanel';
import { EventFormDrawer } from './EventFormDrawer';
import { CategoryModal } from './CategoryModal';
import {
  calculateDurationMinutes,
  detectTimeConflicts,
  expandRecurringItems,
  findCompatibleTimeSlots,
  getWeekDays,
} from './agendaHelpers';
import { formatDateISO } from './agendaFixtures';

export function AgendaContainer() {
  const {
    items,
    categories,
    currentDate,
    viewMode,
    selectedDomainFilter,
    selectedItemId,
    isDrawerOpen,
    editingItem,
    isCategoryModalOpen,
    activeSlotTime,
    lastDeletedItems,
    setCurrentDate,
    setViewMode,
    setSelectedDomainFilter,
    setSelectedItemId,
    setDrawerOpen,
    setEditingItem,
    setCategoryModalOpen,
    createOrUpdateItem,
    deleteItem,
    deleteRecurringOccurrence,
    deleteMultipleItems,
    undoLastDelete,
    clearUndoToast,
    rescheduleItem,
    saveCategory,
    deleteCategory,
    goToToday,
    goToPrevDate,
    goToNextDate,
    openAddDrawerWithSlot,
  } = useAgenda();

  const { setIslandState } = useShell();

  // Pulso transiente e intencional do Dynamic Island (Fase 6)
  const pulseIsland = useCallback((state: IslandState = 'context', durationMs: number = 380) => {
    setIslandState(state);
    window.setTimeout(() => setIslandState('idle'), durationMs);
  }, [setIslandState]);

  // Auto-dismiss do Toast de Desfazer após 6 segundos
  useEffect(() => {
    if (!lastDeletedItems || lastDeletedItems.length === 0) return;
    const timer = setTimeout(() => {
      clearUndoToast();
    }, 6000);
    return () => clearTimeout(timer);
  }, [lastDeletedItems, clearUndoToast]);

  const handleChangeViewMode = useCallback(
    (mode: typeof viewMode) => {
      if (mode === viewMode) return;
      setViewMode(mode);
      pulseIsland('context', 320);
    },
    [viewMode, setViewMode, pulseIsland]
  );

  const handleSaveItem = useCallback(
    (itemData: Parameters<typeof createOrUpdateItem>[0]) => {
      createOrUpdateItem(itemData);
      pulseIsland('success', 420);
      playFeedback('success');
    },
    [createOrUpdateItem, pulseIsland]
  );

  const handleDeleteItem = useCallback(
    (itemId: string) => {
      deleteItem(itemId);
      pulseIsland('attention', 420);
      playFeedback('delete');
    },
    [deleteItem, pulseIsland]
  );

  const handleDeleteMultipleItems = useCallback(
    (itemIds: string[]) => {
      deleteMultipleItems(itemIds);
      pulseIsland('attention', 450);
      playFeedback('delete');
    },
    [deleteMultipleItems, pulseIsland]
  );

  const handleDeleteRecurringOccurrence = useCallback(
    (item: AgendaItem, scope: 'this' | 'following' | 'series') => {
      deleteRecurringOccurrence(item, scope);
      pulseIsland('attention', 420);
      playFeedback('delete');
    },
    [deleteRecurringOccurrence, pulseIsland]
  );

  const handleUndo = useCallback(() => {
    undoLastDelete();
    pulseIsland('success', 400);
    playFeedback('ready');
  }, [undoLastDelete, pulseIsland]);

  const handleReschedule = useCallback(
    (itemId: string, date: string, startTime: string, endTime: string) => {
      rescheduleItem(itemId, date, startTime, endTime);
      pulseIsland('success', 380);
      playFeedback('action');
    },
    [rescheduleItem, pulseIsland]
  );

  // Expansão virtual de rotinas recorrentes para o horizonte visual atual
  const expandedItems = useMemo(() => {
    const week = getWeekDays(currentDate);
    const startDate = new Date(week[0]);
    startDate.setDate(startDate.getDate() - 14); // 2 semanas antes
    const endDate = new Date(week[6]);
    endDate.setDate(endDate.getDate() + 35); // 5 semanas depois
    return expandRecurringItems(items, startDate, endDate);
  }, [items, currentDate]);

  // Contagem de itens por domínio para os filtros
  const countsByDomain = useMemo(() => {
    const counts: Record<string, number> = { all: expandedItems.length };
    expandedItems.forEach((it) => {
      counts[it.domain] = (counts[it.domain] || 0) + 1;
    });
    return counts;
  }, [expandedItems]);

  // Itens filtrados pelo domínio selecionado
  const filteredItems = useMemo(() => {
    if (selectedDomainFilter === 'all') return expandedItems;
    return expandedItems.filter((it) => it.domain === selectedDomainFilter);
  }, [expandedItems, selectedDomainFilter]);

  // Item selecionado para o painel de detalhes
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return expandedItems.find((it) => it.id === selectedItemId) || null;
  }, [selectedItemId, expandedItems]);

  const selectedCategory = useMemo(() => {
    if (!selectedItem) return undefined;
    return categories.find((c) => c.id === selectedItem.categoryId);
  }, [selectedItem, categories]);

  // Detecção de conflito para o item selecionado
  const selectedItemConflict = useMemo(() => {
    if (!selectedItem) return undefined;
    const dayItems = expandedItems.filter((it) => it.date === selectedItem.date);
    const conflicts = detectTimeConflicts(dayItems);
    return conflicts.find(
      (c) => c.itemA.id === selectedItem.id || c.itemB.id === selectedItem.id
    );
  }, [selectedItem, expandedItems]);

  const handleOpenEdit = (itemToEdit: typeof selectedItem) => {
    if (!itemToEdit) return;
    setEditingItem(itemToEdit);
    setDrawerOpen(true);
  };

  // Sugestões de "próximo horário compatível" (seções 5/6) — busca lacunas REALMENTE livres
  // (reaproveita calculateFreeTimeSlots via findCompatibleTimeSlots), não um motor de
  // otimização definitivo. Só calculado quando o item selecionado tem um conflito real.
  const conflictSuggestions = useMemo(() => {
    if (!selectedItem || !selectedItemConflict || !selectedItem.startTime || !selectedItem.endTime) {
      return [];
    }
    // Reagendar uma ocorrência de rotina exigiria o mesmo modelo de exceção por data usado em
    // deleteRecurringOccurrence — fora de escopo desta função; sugestões só para itens simples.
    if (selectedItem.kind === 'routine') return [];
    const duration =
      selectedItem.durationMinutes || calculateDurationMinutes(selectedItem.startTime, selectedItem.endTime);
    return findCompatibleTimeSlots(expandedItems, duration, new Date(`${selectedItem.date}T00:00:00`), 3);
  }, [selectedItem, selectedItemConflict, expandedItems]);

  const handleApplySuggestion = useCallback(
    (item: AgendaItem, suggestion: { date: string; start: string; end: string }) => {
      createOrUpdateItem({
        id: item.id,
        date: suggestion.date,
        startTime: suggestion.start,
        endTime: suggestion.end,
      });
      pulseIsland('success', 380);
      playFeedback('success');
    },
    [createOrUpdateItem, pulseIsland]
  );

  return (
    <main
      id="agenda-main"
      className="w-full pb-20 px-3 sm:px-8 max-w-6xl mx-auto flex flex-col gap-6 pt-4 flex-1 animate-in fade-in duration-200"
    >
      {/* 1. Cabeçalho de Navegação e Modos */}
      <AgendaHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onChangeViewMode={handleChangeViewMode}
        onPrevDate={goToPrevDate}
        onNextDate={goToNextDate}
        onToday={goToToday}
        onOpenAddDrawer={() => {
          setEditingItem(null);
          setDrawerOpen(true);
        }}
        onOpenCategoryModal={() => setCategoryModalOpen(true)}
      />

      {/* 2. Barra de Filtros por Domínio */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <AgendaFilters
          selectedDomain={selectedDomainFilter}
          onSelectDomain={setSelectedDomainFilter}
          countsByDomain={countsByDomain}
        />
      </div>

      {/* 3. Área Principal de Visualização + Painel Lateral de Detalhes */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* Core View Selecionada — região com chave por viewMode para retrigerar a
            animação de entrada já existente (.study-stage-enter) a cada troca de modo,
            em vez de um swap instantâneo sem transição (mesmo padrão do track-switch
            de Educação, nenhum token/motion novo). */}
        <div key={viewMode} className="flex-1 w-full min-w-0 study-stage-enter">
          {viewMode === 'dia' && (
            <DayView
              currentDate={currentDate}
              items={filteredItems}
              categories={categories}
              selectedItemId={selectedItemId}
              onSelectItem={(it) => setSelectedItemId(it.id)}
              onSelectSlot={openAddDrawerWithSlot}
            />
          )}

          {viewMode === 'semana' && (
            <WeekView
              currentDate={currentDate}
              items={filteredItems}
              categories={categories}
              selectedItemId={selectedItemId}
              onSelectItem={(it) => setSelectedItemId(it.id)}
              onSelectSlot={openAddDrawerWithSlot}
              onSelectDayDate={(date) => setCurrentDate(date)}
            />
          )}

          {viewMode === 'mes' && (
            <MonthView
              currentDate={currentDate}
              items={filteredItems}
              categories={categories}
              onSelectDate={(date) => {
                setCurrentDate(date);
                setViewMode('dia');
              }}
              onSelectItem={(it) => setSelectedItemId(it.id)}
            />
          )}

          {viewMode === 'lista' && (
            <ListView
              currentDate={currentDate}
              items={filteredItems}
              categories={categories}
              selectedItemId={selectedItemId}
              onSelectItem={(it) => setSelectedItemId(it.id)}
              onEditItem={handleOpenEdit}
              onDeleteItem={handleDeleteItem}
              onDeleteMultiple={handleDeleteMultipleItems}
            />
          )}
        </div>

        {/* Painel de Detalhes do Item Selecionado (Desktop Lateral, Mobile abaixo) */}
        {selectedItem && (
          <div className="w-full lg:w-80 flex-shrink-0">
            <EventDetailPanel
              item={selectedItem}
              category={selectedCategory}
              conflict={selectedItemConflict}
              onClose={() => setSelectedItemId(null)}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteItem}
              onDeleteRecurring={handleDeleteRecurringOccurrence}
              onReschedule={handleReschedule}
              suggestions={conflictSuggestions}
              onApplySuggestion={handleApplySuggestion}
            />
          </div>
        )}
      </div>

      {/* 4. Drawer de Criação e Edição */}
      <EventFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        initialItem={editingItem}
        categories={categories}
        defaultDate={formatDateISO(currentDate)}
        defaultStartTime={activeSlotTime?.start || '10:00'}
        defaultEndTime={activeSlotTime?.end || '11:00'}
      />

      {/* 5. Modal de Gerenciamento de Categorias & 24 Cores */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={categories}
        onSaveCategory={saveCategory}
        onDeleteCategory={deleteCategory}
      />

      {/* 6. Toast Flutuante de Desfazer Exclusão (Fase 5 §Recuperação / Undo) */}
      {lastDeletedItems && lastDeletedItems.length > 0 && (
        <aside
          role="status"
          aria-live="polite"
          id="agenda-undo-toast"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface border border-medusa-primary/40 shadow-calm animate-in slide-in-from-bottom-4 duration-200"
        >
          <span className="w-2 h-2 rounded-full bg-medusa-primary living-pulse" />
          <span className="text-[12px] font-medium text-text-primary">
            {lastDeletedItems.length === 1
              ? `"${lastDeletedItems[0].title}" removido`
              : `${lastDeletedItems.length} itens removidos`}
          </span>
          <button
            type="button"
            id="btn-agenda-undo"
            onClick={handleUndo}
            className="btn-interactive ml-2 px-3 py-1 rounded-lg bg-medusa-primary hover:opacity-95 text-[#1C2420] text-[11px] font-semibold flex items-center gap-1 shadow-subtle transition-all"
          >
            <span className="material-symbols-outlined text-[14px]">undo</span>
            <span>Desfazer</span>
          </button>
          <button
            type="button"
            id="btn-agenda-dismiss-undo"
            onClick={clearUndoToast}
            aria-label="Dispensar aviso"
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-secondary text-[14px]"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </aside>
      )}
    </main>
  );
}
