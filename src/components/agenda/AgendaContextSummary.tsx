/**
 * Medusa — Agenda Context Summary
 *
 * Conteúdo de síntese temporal renderizado dentro do Context Panel
 * quando activeRoute === 'agenda'.
 * Não duplica a timeline e não cria uma mini-agenda: funciona como síntese rápida de status.
 */

'use client';

import React from 'react';
import { AgendaItem } from '@/types/agenda';
import { useShell } from '@/context/ShellContext';
import {
  calculateDurationMinutes,
  calculateFreeTimeSlots,
  formatDuration,
  formatPeriodLabel,
  parseTimeToMinutes,
} from './agendaHelpers';
import { formatDateISO } from './agendaFixtures';

interface AgendaContextSummaryProps {
  currentDate: Date;
  items: AgendaItem[];
  onGoToToday: () => void;
}

export function AgendaContextSummary({
  currentDate,
  items,
  onGoToToday,
}: AgendaContextSummaryProps) {
  const { setContextOpen } = useShell();

  const todayStr = formatDateISO(new Date());
  const activeDateStr = formatDateISO(currentDate);
  const isToday = activeDateStr === todayStr;

  // Itens do dia selecionado
  const dayItems = items.filter((it) => it.date === activeDateStr);

  // Cálculo de ocupação temporal (em minutos ocupados de uma jornada típica de 1020m = 17h das 06 às 23)
  const TOTAL_DAY_MINUTES = 17 * 60; // 1020 min
  const timedItems = dayItems.filter(
    (it) => !it.allDay && it.kind !== 'deadline' && it.startTime && it.endTime
  );

  const totalOccupiedMinutes = timedItems.reduce((acc, it) => {
    return acc + (it.durationMinutes || calculateDurationMinutes(it.startTime!, it.endTime!));
  }, 0);

  const occupancyPercent = Math.min(
    100,
    Math.round((totalOccupiedMinutes / TOTAL_DAY_MINUTES) * 100)
  );

  // Cálculo do total de tempo livre disponível
  const freeSlots = calculateFreeTimeSlots(dayItems, 6, 23);
  const totalFreeMinutes = freeSlots.reduce((acc, s) => acc + s.durationMinutes, 0);

  // Próximo compromisso relevante
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const nextItem = timedItems
    .filter((it) => {
      if (!isToday) return true;
      return parseTimeToMinutes(it.startTime!) >= currentMinutes;
    })
    .sort((a, b) => parseTimeToMinutes(a.startTime!) - parseTimeToMinutes(b.startTime!))[0];

  return (
    <div className="space-y-6">
      {/* Topo do Painel de Contexto */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary living-pulse" />
          <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-text-muted">
            Síntese Temporal
          </span>
        </div>
        <button
          type="button"
          id="btn-close-context"
          onClick={() => setContextOpen(false)}
          title="Recolher Context Panel"
          aria-label="Recolher Painel de Contexto"
          className="btn-interactive p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
        >
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>

      {/* Seção 1: Indicador do Dia e Contagem de Compromissos */}
      <div className="space-y-2 pb-5 border-b border-border/60">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            {isToday ? 'Hoje' : 'Dia Selecionado'}
          </span>
          <span className="text-[11px] font-mono text-[#18534B] dark:text-medusa-primary font-semibold tabular-nums">
            {dayItems.length} {dayItems.length === 1 ? 'item' : 'itens'}
          </span>
        </div>

        <div className="text-xl font-bold tracking-tight text-text-primary capitalize">
          {formatPeriodLabel(currentDate, 'dia')}
        </div>

        {!isToday && (
          <button
            type="button"
            onClick={onGoToToday}
            className="btn-interactive text-[11px] font-mono font-medium text-medusa-primary hover:underline flex items-center gap-1 pt-1"
          >
            <span className="material-symbols-outlined text-[14px]">today</span>
            <span>Voltar para Hoje</span>
          </button>
        )}
      </div>

      {/* Seção 2: Próximo Compromisso Relevante */}
      <div className="space-y-2 pb-5 border-b border-border/60">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Próximo Compromisso
          </span>
          {nextItem?.startTime && (
            <span className="text-[10px] font-mono text-text-muted tabular-nums">
              {nextItem.startTime}
            </span>
          )}
        </div>

        {nextItem ? (
          <div className="space-y-1">
            <h4 className="text-[13px] font-semibold tracking-tight text-text-primary">
              {nextItem.title}
            </h4>
            <div className="flex items-center justify-between text-[11px] text-text-secondary">
              <span>
                {nextItem.startTime} — {nextItem.endTime}
              </span>
              <span className="capitalize text-text-muted font-mono text-[10px]">
                {nextItem.domain}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-text-muted">
            Nenhum compromisso pendente para as próximas horas.
          </p>
        )}
      </div>

      {/* Seção 3: Ocupação da Jornada & Tempo Livre */}
      <div className="space-y-3 pb-5 border-b border-border/60">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Ocupação Temporal
          </span>
          <span className="text-[11px] font-mono text-text-primary font-semibold tabular-nums">
            {occupancyPercent}%
          </span>
        </div>

        <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-medusa-primary h-full rounded-full transition-all duration-300"
            style={{ width: `${occupancyPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-text-secondary">
          <span>Tempo Livre:</span>
          <span className="font-mono text-text-primary font-medium tabular-nums">
            {formatDuration(totalFreeMinutes)}
          </span>
        </div>
      </div>

      {/* Seção 4: Papel Arquitetural da Camada Temporal */}
      <div className="space-y-1.5 text-[11px] text-text-muted font-mono">
        <span className="uppercase tracking-wider text-[10px]">
          Temporal OS
        </span>
        <p className="leading-relaxed text-text-secondary font-sans text-[11px]">
          A Agenda conhece o tempo; cada domínio conhece o significado. Síntese sincronizada diretamente com o estado ativo.
        </p>
      </div>
    </div>
  );
}
