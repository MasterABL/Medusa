/**
 * Medusa — Agenda Context
 *
 * Provedor de Estado Local em Memória para a Agenda / Temporal OS.
 * Compartilha o estado temporal ativo entre o AgendaContainer, o ContextPanel e a aba Hoje,
 * garantindo reatividade instantânea sem persistência falsa no backend.
 */

'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
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
import { playFeedback } from '@/lib/audioFeedback';

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

  // Desfazer (Undo) e Ações em Lote
  lastDeletedItems: AgendaItem[] | null;
  undoLastDelete: () => void;
  clearUndoToast: () => void;
  deleteMultipleItems: (itemIds: string[]) => void;
  duplicateItem: (item: AgendaItem) => void;

  // Reagendamento / Drag & Drop
  rescheduleItem: (itemId: string, newDate: string, newStartTime: string, newEndTime: string) => void;

  // Reconciliação com Cronograma de Educação
  reconcileEducationBlocks: (
    newBlocks: Array<{ disciplina: string; date: string; durationMinutes: number; startTime?: string; endTime?: string }>
  ) => void;

  // Ações de Estado
  setCurrentDate: (date: Date) => void;
  setViewMode: (mode: AgendaViewMode) => void;
  setSelectedDomainFilter: (domain: AgendaDomain | 'all') => void;
  setSelectedItemId: (id: string | null) => void;
  setDrawerOpen: (open: boolean) => void;
  setEditingItem: (item: AgendaItem | null) => void;
  setCategoryModalOpen: (open: boolean) => void;

  // Operações de Itens
  createOrUpdateItem: (itemData: Partial<AgendaItem>, recurringScope?: 'this' | 'following' | 'series') => void;
  updateRecurringItem: (item: AgendaItem, changes: Partial<AgendaItem>, scope: 'this' | 'following' | 'series') => void;
  deleteItem: (itemId: string) => void;
  deleteRecurringOccurrence: (item: AgendaItem, scope: 'this' | 'following' | 'series') => void;

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
  const [items, setItems] = useState<AgendaItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('medusa-agenda-items');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return getInitialAgendaItems();
  });
  const [categories, setCategories] = useState<AgendaCategory[]>(INITIAL_CATEGORIES);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewModeState] = useState<AgendaViewMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('medusa-agenda-view-mode') as AgendaViewMode;
        if (saved && ['dia', 'semana', 'mes', 'lista'].includes(saved)) return saved;
      } catch {}
    }
    return 'dia';
  });

  const setViewMode = useCallback((mode: AgendaViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem('medusa-agenda-view-mode', mode);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('medusa-agenda-items', JSON.stringify(items));
    } catch {}
  }, [items]);

  const [selectedDomainFilter, setSelectedDomainFilter] = useState<AgendaDomain | 'all'>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [activeSlotTime, setActiveSlotTime] = useState<{ start: string; end: string } | null>(null);
  const [lastDeletedItems, setLastDeletedItems] = useState<AgendaItem[] | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<AgendaItem[] | null>(null);

  // Expiração do Toast de Desfazer (7 segundos)
  useEffect(() => {
    if (!lastDeletedItems || lastDeletedItems.length === 0) return;
    const timer = setTimeout(() => {
      setLastDeletedItems(null);
      setUndoSnapshot(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [lastDeletedItems]);

  const clearUndoToast = useCallback(() => {
    setLastDeletedItems(null);
    setUndoSnapshot(null);
  }, []);

  const undoLastDelete = useCallback(() => {
    if (undoSnapshot) {
      setItems(undoSnapshot);
      try {
        localStorage.setItem('medusa-agenda-items', JSON.stringify(undoSnapshot));
      } catch {}
      setUndoSnapshot(null);
      setLastDeletedItems(null);
      playFeedback('action');
      return;
    }
    if (!lastDeletedItems || lastDeletedItems.length === 0) return;
    setItems((prev) => [...lastDeletedItems, ...prev]);
    setLastDeletedItems(null);
    playFeedback('action');
  }, [undoSnapshot, lastDeletedItems]);

  // Navegação
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToPrevDate = useCallback(() => {
    setCurrentDate((prev) => getPrevDate(prev, viewMode));
  }, [viewMode]);

  const goToNextDate = useCallback(() => {
    setCurrentDate((prev) => getNextDate(prev, viewMode));
  }, [viewMode]);

  const openAddDrawerWithSlot = useCallback((startTime: string, endTime: string) => {
    setActiveSlotTime({ start: startTime, end: endTime });
    setEditingItem(null);
    setDrawerOpen(true);
  }, []);

  // Edição com escopo de eventos recorrentes ('this' | 'following' | 'series')
  const updateRecurringItem = useCallback(
    (item: AgendaItem, changes: Partial<AgendaItem>, scope: 'this' | 'following' | 'series') => {
      const baseId = item.id.includes('-virt-') ? item.id.split('-virt-')[0] : item.id;
      const occurrenceDate = item.date;
      const nowISO = new Date().toISOString();

      if (scope === 'series') {
        setItems((prev) =>
          prev.map((it) => {
            if (it.id === baseId || it.id === item.id) {
              return {
                ...it,
                ...changes,
                id: it.id, // Preserva o ID original canônico da série
                colorId: changes.colorId || it.colorId,
                updatedAt: nowISO,
              } as AgendaItem;
            }
            return it;
          })
        );
        playFeedback('ready');
        return;
      }

      if (scope === 'this') {
        // Marca exceção na série original e cria um evento avulso com os novos atributos
        setItems((prev) => {
          const target = prev.find((it) => it.id === baseId);
          const updatedSeries = prev.map((it) => {
            if (it.id === baseId) {
              return {
                ...it,
                recurrenceExceptions: [...(it.recurrenceExceptions || []), occurrenceDate],
                updatedAt: nowISO,
              };
            }
            return it;
          });

          const singleItem: AgendaItem = {
            id: `item-single-${Date.now()}`,
            title: changes.title || target?.title || item.title,
            kind: (changes.kind === 'routine' ? 'event' : changes.kind) || 'event',
            domain: changes.domain || target?.domain || item.domain,
            categoryId: changes.categoryId || target?.categoryId || item.categoryId,
            colorId: changes.colorId || target?.colorId || item.colorId,
            date: changes.date || occurrenceDate,
            startTime: changes.startTime ?? target?.startTime ?? item.startTime,
            endTime: changes.endTime ?? target?.endTime ?? item.endTime,
            durationMinutes: changes.durationMinutes ?? target?.durationMinutes ?? item.durationMinutes,
            allDay: changes.allDay ?? target?.allDay ?? item.allDay,
            isFlexible: changes.isFlexible ?? target?.isFlexible ?? item.isFlexible,
            recurrence: undefined,
            location: changes.location ?? target?.location ?? item.location,
            description: changes.description ?? target?.description ?? item.description,
            source: target?.source || item.source,
            status: target?.status || 'scheduled',
            createdAt: nowISO,
            updatedAt: nowISO,
          };

          return [singleItem, ...updatedSeries];
        });
        playFeedback('ready');
        return;
      }

      if (scope === 'following') {
        // Encerra a série anterior no dia anterior e inicia uma nova série a partir desta data
        const untilDate = new Date(`${occurrenceDate}T00:00:00`);
        untilDate.setDate(untilDate.getDate() - 1);
        const untilStr = formatDateISO(untilDate);

        setItems((prev) => {
          const target = prev.find((it) => it.id === baseId);
          const truncated = prev.map((it) => {
            if (it.id === baseId) {
              return {
                ...it,
                recurrence: {
                  ...(it.recurrence || { frequency: 'weekly' }),
                  until: untilStr,
                },
                updatedAt: nowISO,
              };
            }
            return it;
          });

          const newSeriesItem: AgendaItem = {
            id: `item-series-${Date.now()}`,
            title: changes.title || target?.title || item.title,
            kind: changes.kind || target?.kind || item.kind,
            domain: changes.domain || target?.domain || item.domain,
            categoryId: changes.categoryId || target?.categoryId || item.categoryId,
            colorId: changes.colorId || target?.colorId || item.colorId,
            date: changes.date || occurrenceDate,
            startTime: changes.startTime ?? target?.startTime ?? item.startTime,
            endTime: changes.endTime ?? target?.endTime ?? item.endTime,
            durationMinutes: changes.durationMinutes ?? target?.durationMinutes ?? item.durationMinutes,
            allDay: changes.allDay ?? target?.allDay ?? item.allDay,
            isFlexible: changes.isFlexible ?? target?.isFlexible ?? item.isFlexible,
            recurrence: changes.recurrence || target?.recurrence || { frequency: 'weekly' },
            location: changes.location ?? target?.location ?? item.location,
            description: changes.description ?? target?.description ?? item.description,
            source: target?.source || item.source,
            status: target?.status || 'scheduled',
            createdAt: nowISO,
            updatedAt: nowISO,
          };

          return [newSeriesItem, ...truncated];
        });
        playFeedback('ready');
        return;
      }
    },
    []
  );

  // Criação ou Edição
  const createOrUpdateItem = useCallback(
    (itemData: Partial<AgendaItem>, recurringScope?: 'this' | 'following' | 'series') => {
      const nowISO = new Date().toISOString();

      if (itemData.id) {
        const baseId = itemData.id.includes('-virt-') ? itemData.id.split('-virt-')[0] : itemData.id;
        const target = items.find((it) => it.id === baseId || it.id === itemData.id);

        if (target && (target.recurrence || target.kind === 'routine' || itemData.id.includes('-virt-')) && recurringScope) {
          const pseudoItem: AgendaItem = {
            ...target,
            id: itemData.id,
            date: itemData.date || target.date,
          };
          updateRecurringItem(pseudoItem, itemData, recurringScope);
          return;
        }

        // Atualização direta preservando ID e cor
        setItems((prev) =>
          prev.map((it) => {
            if (it.id === itemData.id || it.id === baseId) {
              return {
                ...it,
                ...itemData,
                id: it.id, // Preserva o ID real
                colorId: itemData.colorId || it.colorId,
                updatedAt: nowISO,
              } as AgendaItem;
            }
            return it;
          })
        );
        playFeedback('ready');
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
        playFeedback('success');
      }
    },
    [categories, currentDate, items, updateRecurringItem]
  );

  // Exclusão com suporte a Desfazer (Undo)
  const deleteItem = useCallback(
    (itemId: string) => {
      const baseId = itemId.includes('-virt-') ? itemId.split('-virt-')[0] : itemId;
      const target = items.find((it) => it.id === baseId);
      if (target) {
        setUndoSnapshot(items);
        setLastDeletedItems([target]);
      }
      setItems((prev) => prev.filter((it) => it.id !== baseId));
      playFeedback('delete');
      if (selectedItemId === itemId || selectedItemId === baseId) {
        setSelectedItemId(null);
      }
    },
    [items, selectedItemId]
  );

  // Exclusão em Lote
  const deleteMultipleItems = useCallback(
    (itemIds: string[]) => {
      const baseIds = new Set(itemIds.map((id) => (id.includes('-virt-') ? id.split('-virt-')[0] : id)));
      const deleted = items.filter((it) => baseIds.has(it.id));
      if (deleted.length > 0) {
        setUndoSnapshot(items);
        setLastDeletedItems(deleted);
      }
      setItems((prev) => prev.filter((it) => !baseIds.has(it.id)));
      playFeedback('delete');
      if (selectedItemId && baseIds.has(selectedItemId)) {
        setSelectedItemId(null);
      }
    },
    [items, selectedItemId]
  );

  // Duplicação de Evento
  const duplicateItem = useCallback(
    (item: AgendaItem) => {
      const nowISO = new Date().toISOString();
      const baseId = item.id.includes('-virt-') ? item.id.split('-virt-')[0] : item.id;
      const target = items.find((it) => it.id === baseId) || item;
      const newItem: AgendaItem = {
        ...target,
        id: `item-dup-${Date.now()}`,
        title: `${target.title} (Cópia)`,
        createdAt: nowISO,
        updatedAt: nowISO,
      };
      setItems((prev) => [newItem, ...prev]);
      playFeedback('success');
      setSelectedItemId(newItem.id);
    },
    [items]
  );

  // Reagendamento direto / Drag & Drop
  const rescheduleItem = useCallback(
    (itemId: string, newDate: string, newStartTime: string, newEndTime: string) => {
      const nowISO = new Date().toISOString();
      const baseId = itemId.includes('-virt-') ? itemId.split('-virt-')[0] : itemId;
      setItems((prev) =>
        prev.map((it) => {
          if (it.id === baseId) {
            return {
              ...it,
              date: newDate,
              startTime: newStartTime,
              endTime: newEndTime,
              updatedAt: nowISO,
            };
          }
          return it;
        })
      );
      playFeedback('ready');
    },
    []
  );

  // Reconciliação dos blocos de estudo do Cronograma (ZERO duplicações)
  const reconcileEducationBlocks = useCallback(
    (newBlocks: Array<{ disciplina: string; date: string; durationMinutes: number; startTime?: string; endTime?: string }>) => {
      const nowISO = new Date().toISOString();
      setItems((prev) => {
        // Remove quaisquer blocos de educação anteriores para garantir reconciliação limpa
        const nonEducationItems = prev.filter((it) => it.source?.sourceType !== 'education_session');
        const generatedItems: AgendaItem[] = newBlocks.map((b) => {
          const safeSlug = b.disciplina.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return {
            id: `cronograma-block-${safeSlug}-${b.date}`,
            title: `Estudo: ${b.disciplina} (ENEM)`,
            kind: 'time_block',
            domain: 'education',
            categoryId: 'cat-enem',
            colorId: 'amarelo_baunilha',
            date: b.date,
            startTime: b.startTime || '14:00',
            endTime: b.endTime || '15:30',
            durationMinutes: b.durationMinutes,
            isFlexible: true,
            description: 'Bloco gerado a partir do seu plano do Cronograma do ENEM — horário flexível, ajuste como preferir.',
            source: { sourceType: 'education_session', sourceLabel: 'Cronograma ENEM' },
            status: 'scheduled',
            createdAt: nowISO,
            updatedAt: nowISO,
          };
        });
        return [...generatedItems, ...nonEducationItems];
      });
      playFeedback('ready');
    },
    []
  );

  // Exclusão recorrente com escopo e suporte a Desfazer (Undo)
  const deleteRecurringOccurrence = useCallback(
    (item: AgendaItem, scope: 'this' | 'following' | 'series') => {
      const baseId = item.id.includes('-virt-') ? item.id.split('-virt-')[0] : item.id;
      setUndoSnapshot(items);

      if (scope === 'series') {
        const target = items.find((it) => it.id === baseId);
        setLastDeletedItems([target || item]);
        setItems((prev) => prev.filter((it) => it.id !== baseId));
        playFeedback('delete');
        setSelectedItemId(null);
        return;
      }

      if (scope === 'this') {
        setLastDeletedItems([{ ...item, title: `${item.title} (${item.date})` }]);
      } else {
        setLastDeletedItems([{ ...item, title: `${item.title} (a partir de ${item.date})` }]);
      }

      const nowISO = new Date().toISOString();
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== baseId) return it;
          if (scope === 'this') {
            return {
              ...it,
              recurrenceExceptions: [...(it.recurrenceExceptions || []), item.date],
              updatedAt: nowISO,
            };
          }
          // scope === 'following'
          const untilDate = new Date(`${item.date}T00:00:00`);
          untilDate.setDate(untilDate.getDate() - 1);
          return {
            ...it,
            recurrence: {
              ...(it.recurrence || { frequency: 'weekly' }),
              until: formatDateISO(untilDate),
            },
            updatedAt: nowISO,
          };
        })
      );
      playFeedback('delete');
      setSelectedItemId(null);
    },
    [items]
  );

  // Categorias
  const saveCategory = useCallback((category: AgendaCategory) => {
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === category.id);
      if (exists) {
        return prev.map((c) => (c.id === category.id ? category : c));
      }
      return [...prev, category];
    });
    playFeedback('ready');
  }, []);

  const deleteCategory = useCallback((categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    playFeedback('delete');
  }, []);

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
      lastDeletedItems,
      undoLastDelete,
      clearUndoToast,
      deleteMultipleItems,
      duplicateItem,
      rescheduleItem,
      reconcileEducationBlocks,
      setCurrentDate,
      setViewMode,
      setSelectedDomainFilter,
      setSelectedItemId,
      setDrawerOpen,
      setEditingItem,
      setCategoryModalOpen,
      createOrUpdateItem,
      updateRecurringItem,
      deleteItem,
      deleteRecurringOccurrence,
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
      lastDeletedItems,
      undoLastDelete,
      clearUndoToast,
      deleteMultipleItems,
      duplicateItem,
      rescheduleItem,
      reconcileEducationBlocks,
      goToToday,
      goToPrevDate,
      goToNextDate,
      openAddDrawerWithSlot,
      createOrUpdateItem,
      updateRecurringItem,
      deleteItem,
      deleteRecurringOccurrence,
      saveCategory,
      deleteCategory,
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
