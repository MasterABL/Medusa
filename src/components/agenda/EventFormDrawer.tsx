/**
 * Medusa — Event Form Drawer
 *
 * Drawer acessível para Criação e Edição de eventos, blocos de tempo, prazos e rotinas.
 * Gerencia validação de horários, alternância para All-Day/Deadline e metadados de domínio.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  AgendaCategory,
  AgendaDomain,
  AgendaItem,
  AgendaItemKind,
} from '@/types/agenda';
import { calculateDurationMinutes } from './agendaHelpers';
import { formatDateISO } from './agendaFixtures';

interface EventFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Partial<AgendaItem>) => void;
  initialItem?: AgendaItem | null;
  categories: AgendaCategory[];
  defaultDate?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
}

export function EventFormDrawer({
  isOpen,
  onClose,
  onSave,
  initialItem,
  categories,
  defaultDate,
  defaultStartTime = '10:00',
  defaultEndTime = '11:00',
}: EventFormDrawerProps) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<AgendaItemKind>('event');
  const [domain, setDomain] = useState<AgendaDomain>('personal');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [isFlexible, setIsFlexible] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Inicializa o formulário com o item existente ou defaults limpos
  useEffect(() => {
    if (initialItem) {
      setTitle(initialItem.title);
      setKind(initialItem.kind);
      setDomain(initialItem.domain);
      setCategoryId(initialItem.categoryId);
      setDate(initialItem.date);
      setStartTime(initialItem.startTime || '09:00');
      setEndTime(initialItem.endTime || '10:00');
      setAllDay(!!initialItem.allDay);
      setIsFlexible(!!initialItem.isFlexible);
      setIsRecurring(!!initialItem.recurrence);
      setRecurrenceFreq(initialItem.recurrence?.frequency || 'weekly');
      setLocation(initialItem.location || '');
      setDescription(initialItem.description || '');
    } else {
      setTitle('');
      setKind('event');
      setDomain('personal');
      setDate(defaultDate || formatDateISO(new Date()));
      setStartTime(defaultStartTime);
      setEndTime(defaultEndTime);
      setAllDay(false);
      setIsFlexible(false);
      setIsRecurring(false);
      setRecurrenceFreq('weekly');
      setLocation('');
      setDescription('');
      if (categories.length > 0) {
        setCategoryId(categories[0].id);
      }
    }
    setError(null);
  }, [initialItem, isOpen, defaultDate, defaultStartTime, defaultEndTime, categories]);

  // Atualiza a categoria quando o domínio muda
  const handleDomainChange = (newDomain: AgendaDomain) => {
    setDomain(newDomain);
    const matchingCat = categories.find((c) => c.domain === newDomain);
    if (matchingCat) {
      setCategoryId(matchingCat.id);
    }
  };

  // Suporte a fechar via tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Por favor, informe o título do compromisso.');
      return;
    }

    const isDeadline = kind === 'deadline';
    const isFullDay = allDay || isDeadline;

    if (!isFullDay) {
      if (!startTime || !endTime) {
        setError('Por favor, informe o horário de início e fim.');
        return;
      }
      const duration = calculateDurationMinutes(startTime, endTime);
      if (duration <= 0) {
        setError('O horário final deve ser posterior ao horário inicial.');
        return;
      }
    }

    const selectedCat = categories.find((c) => c.id === categoryId);
    const colorId = selectedCat ? selectedCat.colorId : 'azul_lavanda';

    const duration = isFullDay ? undefined : calculateDurationMinutes(startTime, endTime);

    onSave({
      id: initialItem?.id,
      title: title.trim(),
      kind,
      domain,
      categoryId,
      colorId,
      date,
      startTime: isFullDay ? undefined : startTime,
      endTime: isFullDay ? undefined : endTime,
      durationMinutes: duration,
      allDay: isFullDay,
      isFlexible: kind === 'time_block' ? isFlexible : false,
      recurrence: isRecurring ? { frequency: recurrenceFreq } : undefined,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
      source: initialItem?.source || {
        sourceType: 'manual',
        sourceLabel: 'Entrada Manual',
      },
      status: initialItem?.status || 'scheduled',
    });

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-form-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px] transition-opacity duration-200"
    >
      <div
        className="w-full max-w-lg bg-surface h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-border/80 animate-in slide-in-from-right duration-250 ease-out"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between">
          {/* Topo do Drawer */}
          <div className="p-6 border-b border-border/70 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
                {initialItem ? 'Editar Registro' : 'Novo Item Temporal'}
              </span>
              <h2 id="event-form-title" className="text-xl font-bold text-text-primary tracking-tight">
                {initialItem ? 'Editar Compromisso' : 'Adicionar à Agenda'}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar formulário"
              className="btn-interactive p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Corpo do Formulário */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {error && (
              <div
                role="alert"
                className="bg-rose-500/10 border border-rose-400/40 text-rose-700 dark:text-rose-300 p-3 rounded-xl text-[12px] flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Título */}
            <div className="space-y-1.5">
              <label htmlFor="form-title" className="block text-[11px] font-mono uppercase tracking-wider text-text-secondary">
                Título do Compromisso *
              </label>
              <input
                id="form-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Estudo — Teoria dos Conjuntos, Treino de Perna..."
                className="w-full bg-surface-secondary border border-border/80 rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />
            </div>

            {/* Tipo Conceitual */}
            <div className="space-y-1.5">
              <span className="block text-[11px] font-mono uppercase tracking-wider text-text-secondary">
                Natureza Temporal (Tipo)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'event', label: 'Evento', icon: 'event' },
                  { id: 'time_block', label: 'Bloco', icon: 'schedule' },
                  { id: 'deadline', label: 'Deadline', icon: 'flag' },
                  { id: 'routine', label: 'Rotina', icon: 'repeat' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setKind(t.id as AgendaItemKind)}
                    className={`btn-interactive p-2 rounded-xl border text-[11px] font-medium flex flex-col items-center gap-1 transition-all ${
                      kind === t.id
                        ? 'bg-medusa-primary/15 border-medusa-primary text-text-primary font-semibold shadow-subtle'
                        : 'bg-surface-secondary border-border/70 text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {t.icon}
                    </span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Domínio & Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="form-domain" className="block text-[11px] font-mono uppercase tracking-wider text-text-secondary">
                  Domínio
                </label>
                <select
                  id="form-domain"
                  value={domain}
                  onChange={(e) => handleDomainChange(e.target.value as AgendaDomain)}
                  className="w-full bg-surface-secondary border border-border/80 rounded-xl px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
                >
                  <option value="personal">Pessoal</option>
                  <option value="education">Educação</option>
                  <option value="body">Corpo</option>
                  <option value="finance">Finanças</option>
                  <option value="work">Trabalho</option>
                  <option value="external">Externo</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="form-category" className="block text-[11px] font-mono uppercase tracking-wider text-text-secondary">
                  Categoria
                </label>
                <select
                  id="form-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-surface-secondary border border-border/80 rounded-xl px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.domain})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data & All-day Toggle */}
            <div className="space-y-3 border-t border-border/60 pt-4">
              <div className="flex items-center justify-between">
                <label htmlFor="form-date" className="text-[11px] font-mono uppercase tracking-wider text-text-secondary">
                  Data
                </label>
                {kind !== 'deadline' && (
                  <label className="flex items-center gap-2 cursor-pointer text-[12px] text-text-secondary select-none">
                    <input
                      type="checkbox"
                      checked={allDay}
                      onChange={(e) => setAllDay(e.target.checked)}
                      className="rounded border-border text-medusa-primary focus:ring-medusa-primary"
                    />
                    <span>Dia todo</span>
                  </label>
                )}
              </div>

              <input
                id="form-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-surface-secondary border border-border/80 rounded-xl px-3.5 py-2 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />
            </div>

            {/* Horários (se não for all-day nem deadline) */}
            {!allDay && kind !== 'deadline' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="form-start-time" className="block text-[11px] font-mono uppercase tracking-wider text-text-secondary">
                    Início
                  </label>
                  <input
                    id="form-start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-surface-secondary border border-border/80 rounded-xl px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring tabular-nums"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="form-end-time" className="block text-[11px] font-mono uppercase tracking-wider text-text-secondary">
                    Fim
                  </label>
                  <input
                    id="form-end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-surface-secondary border border-border/80 rounded-xl px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring tabular-nums"
                  />
                </div>
              </div>
            )}

            {/* Configurações específicas de Bloco Flexível */}
            {kind === 'time_block' && (
              <div className="flex items-center gap-2 p-3 bg-surface-secondary/50 rounded-xl border border-border/50">
                <input
                  id="form-flexible"
                  type="checkbox"
                  checked={isFlexible}
                  onChange={(e) => setIsFlexible(e.target.checked)}
                  className="rounded border-border text-medusa-primary focus:ring-medusa-primary"
                />
                <label htmlFor="form-flexible" className="text-[12px] text-text-secondary cursor-pointer select-none">
                  <span className="font-medium text-text-primary block">Bloco Flexível</span>
                  <span className="text-[11px] text-text-muted">
                    Pode ser remanejado automaticamente pelo motor temporal se houver encaixe mais favorável.
                  </span>
                </label>
              </div>
            )}

            {/* Configurações de Recorrência */}
            {kind === 'routine' && (
              <div className="space-y-2 p-3 bg-surface-secondary/50 rounded-xl border border-border/50">
                <span className="text-[11px] font-mono uppercase tracking-wider text-text-secondary block">
                  Padrão Recorrente
                </span>
                <select
                  value={recurrenceFreq}
                  onChange={(e) => setRecurrenceFreq(e.target.value as any)}
                  className="w-full bg-surface border border-border/80 rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none"
                >
                  <option value="weekly">Semanal (dias úteis ou fixos)</option>
                  <option value="daily">Diário (todos os dias)</option>
                  <option value="monthly">Mensal (mesmo dia do mês)</option>
                </select>
              </div>
            )}

            {/* Localização & Descrição */}
            <div className="space-y-4 border-t border-border/60 pt-4">
              <div className="space-y-1.5">
                <label htmlFor="form-location" className="block text-[11px] font-mono uppercase tracking-wider text-text-secondary">
                  Localização / Link (Opcional)
                </label>
                <input
                  id="form-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Google Meet, Sala 402, Mesa..."
                  className="w-full bg-surface-secondary border border-border/80 rounded-xl px-3.5 py-2 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="form-description" className="block text-[11px] font-mono uppercase tracking-wider text-text-secondary">
                  Descrição ou Anotações
                </label>
                <textarea
                  id="form-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes ou lembretes relevantes para este bloco..."
                  className="w-full bg-surface-secondary border border-border/80 rounded-xl px-3.5 py-2 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring resize-none"
                />
              </div>
            </div>

            {/* Aviso Informativo de Origem */}
            {initialItem?.source && initialItem.source.sourceType !== 'manual' && (
              <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-xl text-[11px] text-amber-800 dark:text-amber-200">
                <span className="font-semibold block">Item Sincronizado</span>
                <span>
                  Origem: {initialItem.source.sourceLabel}. As edições aqui ajustam o posicionamento temporal na Agenda nesta sessão.
                </span>
              </div>
            )}
          </div>

          {/* Rodapé de Ações */}
          <div className="p-5 border-t border-border/70 flex items-center justify-end gap-3 bg-surface">
            <button
              type="button"
              onClick={onClose}
              className="btn-interactive px-4 py-2.5 rounded-xl border border-border text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-interactive px-5 py-2.5 rounded-xl bg-medusa-primary text-[#1C2420] font-semibold text-[13px] hover:brightness-105 shadow-calm transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
            >
              {initialItem ? 'Salvar Alterações' : 'Criar Compromisso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
