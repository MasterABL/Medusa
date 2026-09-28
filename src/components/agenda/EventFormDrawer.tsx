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
import { MedusaTimePicker } from './MedusaTimePicker';
import { PASTEL_PALETTE } from './palette';

interface EventFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Partial<AgendaItem>, scope?: 'this' | 'following' | 'series') => void;
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
  const [colorId, setColorId] = useState('');
  const [editScope, setEditScope] = useState<'this' | 'following' | 'series'>('series');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [isFlexible, setIsFlexible] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceEnd, setRecurrenceEnd] = useState<'never' | 'date' | 'count'>('never');
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  const [recurrenceCount, setRecurrenceCount] = useState(10);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Inicializa o formulário com o item existente ou defaults limpos
  useEffect(() => {
    if (initialItem) {
      setEditScope('series');
      setTitle(initialItem.title);
      setKind(initialItem.kind);
      setDomain(initialItem.domain);
      setCategoryId(initialItem.categoryId);
      setColorId(initialItem.colorId || '');
      setDate(initialItem.date);
      setStartTime(initialItem.startTime || '09:00');
      setEndTime(initialItem.endTime || '10:00');
      setAllDay(!!initialItem.allDay);
      setIsFlexible(!!initialItem.isFlexible);
      setRecurrenceFreq(initialItem.recurrence?.frequency || 'weekly');
      setRecurrenceInterval(initialItem.recurrence?.interval || 1);
      setRecurrenceDays(initialItem.recurrence?.daysOfWeek || []);
      setRecurrenceEnd(
        initialItem.recurrence?.until ? 'date' : initialItem.recurrence?.count ? 'count' : 'never'
      );
      setRecurrenceUntil(initialItem.recurrence?.until || '');
      setRecurrenceCount(initialItem.recurrence?.count || 10);
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
      setRecurrenceFreq('weekly');
      setRecurrenceInterval(1);
      setRecurrenceDays([]);
      setRecurrenceEnd('never');
      setRecurrenceUntil('');
      setRecurrenceCount(10);
      setLocation('');
      setDescription('');
      if (categories.length > 0) {
        setCategoryId(categories[0].id);
        setColorId(categories[0].colorId || 'amarelo_baunilha');
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
      setColorId(matchingCat.colorId);
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
    const finalColorId = colorId || (selectedCat ? selectedCat.colorId : 'azul_lavanda');

    const duration = isFullDay ? undefined : calculateDurationMinutes(startTime, endTime);

    const isRecurring = Boolean(
      initialItem &&
        (initialItem.recurrence ||
          initialItem.kind === 'routine' ||
          initialItem.id.includes('-virt-'))
    );

    onSave(
      {
        id: initialItem?.id,
        title: title.trim(),
        kind,
        domain,
        categoryId,
        colorId: finalColorId,
        date,
        startTime: isFullDay ? undefined : startTime,
        endTime: isFullDay ? undefined : endTime,
        durationMinutes: duration,
        allDay: isFullDay,
        isFlexible: kind === 'time_block' ? isFlexible : false,
        recurrence:
          kind === 'routine'
            ? {
                frequency: recurrenceFreq,
                interval: recurrenceInterval > 1 ? recurrenceInterval : undefined,
                daysOfWeek:
                  recurrenceFreq === 'weekly' && recurrenceDays.length > 0
                    ? recurrenceDays
                    : undefined,
                until: recurrenceEnd === 'date' && recurrenceUntil ? recurrenceUntil : undefined,
                count: recurrenceEnd === 'count' ? recurrenceCount : undefined,
              }
            : undefined,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        source: initialItem?.source || {
          sourceType: 'manual',
          sourceLabel: 'Entrada Manual',
        },
        status: initialItem?.status || 'scheduled',
      },
      isRecurring ? editScope : undefined
    );

    onClose();
  };

  return (
    <div
      id="event-form-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-form-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-surface h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-border/80 animate-in slide-in-from-right duration-400 ease-out"
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
              id="btn-close-event-drawer"
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

            {/* Seletor Explícito de Cor Pastel (24 cores) */}
            <div className="space-y-2">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-text-secondary">
                Cor Visual (Paleta Pastel Medusa)
              </label>
              <div
                id="event-color-swatches"
                className="flex items-center gap-1.5 flex-wrap p-2.5 bg-surface-secondary/50 rounded-xl border border-border/60"
              >
                {PASTEL_PALETTE.map((p) => {
                  const isSelected = colorId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setColorId(p.id)}
                      title={p.name}
                      style={{ backgroundColor: p.swatch }}
                      className={`w-5 h-5 rounded-full transition-transform border border-black/10 dark:border-white/10 ${
                        isSelected ? 'ring-2 ring-medusa-primary scale-125 z-10' : 'hover:scale-110'
                      }`}
                    />
                  );
                })}
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

            {/* Horários e Duração com MedusaTimePicker */}
            {!allDay && kind !== 'deadline' && (
              <div className="space-y-1.5">
                <span className="block text-[11px] font-mono uppercase tracking-wider text-text-secondary">
                  Horário e Duração
                </span>
                <MedusaTimePicker
                  startTime={startTime}
                  endTime={endTime}
                  onChange={(s, e) => {
                    setStartTime(s);
                    setEndTime(e);
                  }}
                />
                <div className="sr-only">
                  <input
                    id="form-start-time"
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                  <input
                    id="form-end-time"
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    aria-hidden="true"
                    tabIndex={-1}
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

            {/* Configurações de Recorrência — seção 8 do refinamento: além de Diário/Semanal/
                Mensal, expõe intervalo ("a cada N"), dias da semana e término, sem transformar
                isto num painel gigantesco (tudo cabe no mesmo card compacto). */}
            {kind === 'routine' && (
              <div className="space-y-3 p-3 bg-surface-secondary/50 rounded-xl border border-border/50">
                <span className="text-[11px] font-mono uppercase tracking-wider text-text-secondary block">
                  Padrão Recorrente
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    id="form-recurrence-freq"
                    value={recurrenceFreq}
                    onChange={(e) => setRecurrenceFreq(e.target.value as 'daily' | 'weekly' | 'monthly')}
                    className="w-full bg-surface border border-border/80 rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none"
                  >
                    <option value="weekly">Semanal</option>
                    <option value="daily">Diário</option>
                    <option value="monthly">Mensal</option>
                  </select>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-text-secondary whitespace-nowrap">A cada</span>
                    <input
                      type="number"
                      min={1}
                      max={52}
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value) || 1))}
                      className="w-14 bg-surface border border-border/80 rounded-lg px-2 py-2 text-[12px] text-text-primary focus:outline-none tabular-nums"
                    />
                    <span className="text-[11px] text-text-secondary whitespace-nowrap">
                      {recurrenceFreq === 'daily' ? 'dia(s)' : recurrenceFreq === 'monthly' ? 'mês(es)' : 'semana(s)'}
                    </span>
                  </div>
                </div>

                {recurrenceFreq === 'weekly' && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                      Dias (vazio = mesmo dia da data acima)
                    </span>
                    <div className="flex items-center gap-1">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((label, dayIdx) => {
                        const isChecked = recurrenceDays.includes(dayIdx);
                        return (
                          <button
                            key={dayIdx}
                            type="button"
                            onClick={() =>
                              setRecurrenceDays((prev) =>
                                isChecked ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx].sort()
                              )
                            }
                            aria-pressed={isChecked}
                            aria-label={
                              ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dayIdx]
                            }
                            className={`btn-interactive w-7 h-7 rounded-full text-[11px] font-medium flex items-center justify-center border transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none ${
                              isChecked
                                ? 'bg-medusa-primary/20 border-medusa-primary text-text-primary font-semibold'
                                : 'bg-surface border-border/70 text-text-muted hover:text-text-primary'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 border-t border-border/50 pt-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                    Termina
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 text-[12px] text-text-secondary cursor-pointer select-none">
                      <input
                        type="radio"
                        name="recurrence-end"
                        checked={recurrenceEnd === 'never'}
                        onChange={() => setRecurrenceEnd('never')}
                      />
                      <span>Nunca</span>
                    </label>
                    <label className="flex items-center gap-2 text-[12px] text-text-secondary cursor-pointer select-none">
                      <input
                        type="radio"
                        name="recurrence-end"
                        checked={recurrenceEnd === 'date'}
                        onChange={() => setRecurrenceEnd('date')}
                      />
                      <span>Em uma data</span>
                      {recurrenceEnd === 'date' && (
                        <input
                          type="date"
                          value={recurrenceUntil}
                          onChange={(e) => setRecurrenceUntil(e.target.value)}
                          className="bg-surface border border-border/80 rounded-lg px-2 py-1 text-[11px] text-text-primary focus:outline-none"
                        />
                      )}
                    </label>
                    <label className="flex items-center gap-2 text-[12px] text-text-secondary cursor-pointer select-none">
                      <input
                        type="radio"
                        name="recurrence-end"
                        checked={recurrenceEnd === 'count'}
                        onChange={() => setRecurrenceEnd('count')}
                      />
                      <span>Após</span>
                      {recurrenceEnd === 'count' && (
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={recurrenceCount}
                          onChange={(e) => setRecurrenceCount(Math.max(1, Number(e.target.value) || 1))}
                          className="w-14 bg-surface border border-border/80 rounded-lg px-2 py-1 text-[11px] text-text-primary focus:outline-none tabular-nums"
                        />
                      )}
                      <span>ocorrências</span>
                    </label>
                  </div>
                </div>
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

            {/* Decisão Explícita de Escopo para Eventos Recorrentes (Fase 4 / Requisito 3) */}
            {initialItem &&
              (initialItem.recurrence ||
                initialItem.kind === 'routine' ||
                initialItem.id.includes('-virt-')) && (
                <div
                  id="recurring-edit-scope-box"
                  className="p-4 rounded-xl bg-surface-secondary/80 border border-medusa-primary/40 space-y-3 animate-in fade-in duration-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-medusa-primary">repeat</span>
                    <span className="text-[12px] font-semibold text-text-primary">
                      Evento Recorrente — Escopo da Alteração
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Você está alterando uma série periódica. Selecione em quais ocorrências esta edição (título, horário, cor ou duração) deve surtir efeito:
                  </p>
                  <div className="space-y-2 pt-0.5">
                    {[
                      {
                        value: 'this',
                        label: 'Somente este evento',
                        desc: `Aplica exclusivamente na ocorrência de ${date}, preservando as demais ocorrências da série intactas`,
                      },
                      {
                        value: 'following',
                        label: 'Este e os próximos eventos',
                        desc: `Aplica a partir de ${date} em diante, mantendo as ocorrências anteriores inalteradas`,
                      },
                      {
                        value: 'series',
                        label: 'Toda a série de eventos',
                        desc: 'Aplica a todas as repetições passadas e futuras desta rotina',
                      },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        id={`scope-edit-option-${opt.value}`}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer select-none transition-all ${
                          editScope === opt.value
                            ? 'bg-medusa-primary/10 border-medusa-primary text-text-primary shadow-subtle ring-1 ring-medusa-primary/40'
                            : 'bg-surface border-border/70 hover:bg-surface-secondary text-text-secondary'
                        }`}
                      >
                        <input
                          type="radio"
                          name="recurrence-edit-scope"
                          value={opt.value}
                          checked={editScope === opt.value}
                          onChange={() => setEditScope(opt.value as 'this' | 'following' | 'series')}
                          className="mt-0.5 text-medusa-primary focus:ring-medusa-primary"
                        />
                        <div className="flex flex-col">
                          <span className="text-[12px] font-semibold leading-tight">{opt.label}</span>
                          <span className="text-[10px] text-text-muted mt-0.5">{opt.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

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
