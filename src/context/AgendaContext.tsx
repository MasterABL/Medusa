/**
 * Medusa — Agenda Context
 *
 * Provedor de Estado Local em Memória para a Agenda / Temporal OS.
 * Compartilha o estado temporal ativo entre o AgendaContainer e o ContextPanel,
 * garantindo reatividade instantânea sem persistência falsa no backend.
 */

'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  AgendaCategory,
  AgendaDomain,
  AgendaItem,
  AgendaViewMode,
} from '@/types/agenda';
import {
  getInitialAgendaItems,
  INITIAL_CATEGORIES,
  formatDateISO,
} from '@/components/agenda/agendaFixtures';
import {
  getNextDate,
  getPrevDate,
} from '@/components/agenda/agendaHelpers';

interface AgendaContextType {
  items: AgendaItem[];
  categories: AgendaCategory[];
  currentDate: Date;
  viewMode: AgendaViewMode;
  selectedDomainFilter: AgendaDomain | 'all';
  selectedItemId: string | null;
  isDrawerOpen: boolean;
  editingItem: AgendaItem | null;
  isCategoryModalOpen: boolean;
  activeSlotTime: { start: string; end: string } | null;

  // Ações de Estado
  setCurrentDate: (date: Date) => void;
  setViewMode: (mode: AgendaViewMode) => void;
  setSelectedDomainFilter: (domain: AgendaDomain | 'all') => void;
  setSelectedItemId: (id: string | null) => void;
  setDrawerOpen: (open: boolean) => void;
  setEditingItem: (item: AgendaItem | null) => void;
  setCategoryModalOpen: (open: boolean) => void;

  // Operações de Itens
  createOrUpdateItem: (itemData: Partial<AgendaItem>) => void;
  deleteItem: (itemId: string) => void;

  // Operações de Categorias
  saveCategory: (category: AgendaCategory) => void;
  deleteCategory: (categoryId: string) => void;

  // Navegação Temporal
  goToToday: () => void;
  goToPrevDate: () => void;
  goToNextDate: () => void;
  openAddDrawerWithSlot: (startTime: string, endTime: string) => void;
}

const AgendaContext = createContext<AgendaContextType | undefined>(undefined);

export function AgendaProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<AgendaItem[]>(() => getInitialAgendaItems());
  const [categories, setCategories] = useState<AgendaCategory[]>(INITIAL_CATEGORIES);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<AgendaViewMode>('dia');
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<AgendaDomain | 'all'>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [activeSlotTime, setActiveSlotTime] = useState<{ start: string; end: string } | null>(null);

  // Navegação
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToPrevDate = () => {
    setCurrentDate((prev) => getPrevDate(prev, viewMode));
  };

  const goToNextDate = () => {
    setCurrentDate((prev) => getNextDate(prev, viewMode));
  };

  const openAddDrawerWithSlot = (startTime: string, endTime: string) => {
    setActiveSlotTime({ start: startTime, end: endTime });
    setEditingItem(null);
    setDrawerOpen(true);
  };

  // Criação ou Edição
  const createOrUpdateItem = (itemData: Partial<AgendaItem>) => {
    const nowISO = new Date().toISOString();

    if (itemData.id) {
      // Atualização
      setItems((prev) =>
        prev.map((it) => {
          if (it.id === itemData.id) {
            return {
              ...it,
              ...itemData,
              updatedAt: nowISO,
            } as AgendaItem;
          }
          return it;
        })
      );
    } else {
      // Criação de novo item
      const newItem: AgendaItem = {
        id: `item-local-${Date.now()}`,
        title: itemData.title || 'Sem Título',
        kind: itemData.kind || 'event',
        domain: itemData.domain || 'personal',
        categoryId: itemData.categoryId || categories[0]?.id || 'cat-pessoal',
        colorId: itemData.colorId || 'azul_lavanda',
        date: itemData.date || formatDateISO(currentDate),
        startTime: itemData.startTime,
        endTime: itemData.endTime,
        durationMinutes: itemData.durationMinutes,
        allDay: itemData.allDay,
        isFlexible: itemData.isFlexible,
        recurrence: itemData.recurrence,
        location: itemData.location,
        description: itemData.description,
        source: itemData.source || {
          sourceType: 'manual',
          sourceLabel: 'Entrada Manual',
        },
        status: 'scheduled',
        createdAt: nowISO,
        updatedAt: nowISO,
      };

      setItems((prev) => [newItem, ...prev]);
    }
  };

  // Exclusão
  // Ocorrências de rotina são expandidas virtualmente (id `${routine.id}-virt-${date}`,
  // ver expandRecurringItems em agendaHelpers.ts) e não existem em `items` com esse id —
  // achado de auditoria: excluir uma ocorrência de rotina resolvia para a série base para
  // que a ação de fato remova algo, em vez de falhar silenciosamente. Excluir uma única
  // ocorrência (mantendo as demais) exigiria um modelo de exceção por data e fica registrado
  // como refinamento futuro, não implementado nesta rodada.
  const deleteItem = (itemId: string) => {
    const baseId = itemId.includes('-virt-') ? itemId.split('-virt-')[0] : itemId;
    setItems((prev) => prev.filter((it) => it.id !== baseId));
    if (selectedItemId === itemId) {
      setSelectedItemId(null);
    }
  };

  // Categorias
  const saveCategory = (category: AgendaCategory) => {
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === category.id);
      if (exists) {
        return prev.map((c) => (c.id === category.id ? category : c));
      }
      return [...prev, category];
    });
  };

  const deleteCategory = (categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
  };

  const contextValue = useMemo(
    () => ({
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
      saveCategory,
      deleteCategory,
      goToToday,
      goToPrevDate,
      goToNextDate,
      openAddDrawerWithSlot,
    }),
    [
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
    ]
  );

  return (
    <AgendaContext.Provider value={contextValue}>
      {children}
    </AgendaContext.Provider>
  );
}

export function useAgenda() {
  const context = useContext(AgendaContext);
  if (!context) {
    throw new Error('useAgenda must be used within an AgendaProvider');
  }
  return context;
}
