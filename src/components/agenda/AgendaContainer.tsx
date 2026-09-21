/**
 * Medusa — Agenda Container
 *
 * Orquestrador principal da camada temporal (Temporal OS).
 * Conecta as visualizações (Dia, Semana, Mês, Lista), filtros por domínio,
 * seleção, painel de detalhes, drawer de criação/edição e modal de categorias.
 */

'use client';

import React, { useCallback, useMemo } from 'react';
import { AgendaItem } from '@/types/agenda';
import { useAgenda } from '@/context/AgendaContext';
import { useShell } from '@/context/ShellContext';
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
    saveCategory,
    deleteCategory,
    goToToday,
    goToPrevDate,
    goToNextDate,
    openAddDrawerWithSlot,
  } = useAgenda();

  const { setIslandState } = useShell();

  // Pulso transiente do Dynamic Island (idêntico ao padrão já usado em EducationContainer:
  // 'processing' por 320ms, retornando a 'idle' — nunca um estado persistente, já que o
  // catálogo fechado de fixtures do Island tem texto específico de Educação por design,
  // não deve ser adotado como se fosse conteúdo real da Agenda).
  const pulseIslandProcessing = useCallback(() => {
    setIslandState('processing');
    window.setTimeout(() => setIslandState('idle'), 320);
  }, [setIslandState]);

  const handleChangeViewMode = useCallback(
    (mode: typeof viewMode) => {
      if (mode === viewMode) return;
      setViewMode(mode);
      pulseIslandProcessing();
    },
    [viewMode, setViewMode, pulseIslandProcessing]
  );

  const handleSaveItem = useCallback(
    (itemData: Parameters<typeof createOrUpdateItem>[0]) => {
      createOrUpdateItem(itemData);
      pulseIslandProcessing();
    },
    [createOrUpdateItem, pulseIslandProcessing]
  );

  const handleDeleteItem = useCallback(
    (itemId: string) => {
      deleteItem(itemId);
      pulseIslandProcessing();
    },
    [deleteItem, pulseIslandProcessing]
  );

  const handleDeleteRecurringOccurrence = useCallback(
    (item: AgendaItem, scope: 'this' | 'following' | 'series') => {
      deleteRecurringOccurrence(item, scope);
      pulseIslandProcessing();
    },
    [deleteRecurringOccurrence, pulseIslandProcessing]
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
      pulseIslandProcessing();
    },
    [createOrUpdateItem, pulseIslandProcessing]
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
    </main>
  );
}
