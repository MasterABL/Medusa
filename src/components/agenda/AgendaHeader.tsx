/**
 * Medusa — Agenda Header
 *
 * Cabeçalho de navegação temporal e controle de visualizações.
 * Suporta Dia, Semana, Mês e Lista, botão Hoje, adição rápida, atalhos de teclado
 * e badge explícita de honestidade do estado local.
 */

'use client';

import React, { useEffect } from 'react';
import { AgendaViewMode } from '@/types/agenda';
import { formatPeriodLabel } from './agendaHelpers';

interface AgendaHeaderProps {
  currentDate: Date;
  viewMode: AgendaViewMode;
  onChangeViewMode: (mode: AgendaViewMode) => void;
  onPrevDate: () => void;
  onNextDate: () => void;
  onToday: () => void;
  onOpenAddDrawer: () => void;
  onOpenCategoryModal: () => void;
}

export function AgendaHeader({
  currentDate,
  viewMode,
  onChangeViewMode,
  onPrevDate,
  onNextDate,
  onToday,
  onOpenAddDrawer,
  onOpenCategoryModal,
}: AgendaHeaderProps) {
  const periodLabel = formatPeriodLabel(currentDate, viewMode);

  // Suporte a atalhos de teclado (t = hoje, setas = anterior/próximo, 1-4 = modos)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se o foco estiver em um input/textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        onToday();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrevDate();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNextDate();
      } else if (e.key === '1') {
        onChangeViewMode('dia');
      } else if (e.key === '2') {
        onChangeViewMode('semana');
      } else if (e.key === '3') {
        onChangeViewMode('mes');
      } else if (e.key === '4') {
        onChangeViewMode('lista');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToday, onPrevDate, onNextDate, onChangeViewMode]);

  return (
    <header className="flex flex-col gap-4 pb-4 border-b border-border/60">
      {/* Linha Superior: Rótulo do Período, Navegação e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Bloco de Navegação Temporal */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Controles de Setas e Botão Hoje com Nomes Acessíveis Explícitos */}
          <div className="flex items-center gap-1 bg-surface border border-border/70 rounded-xl p-1 shadow-subtle">
            <button
              type="button"
              onClick={onPrevDate}
              aria-label="Período anterior"
              title="Período anterior (Seta para a esquerda)"
              className="btn-interactive p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>

            <button
              type="button"
              onClick={onToday}
              aria-label="Ir para Hoje"
              title="Ir para o dia atual (Tecla T)"
              className="btn-interactive px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium text-text-primary hover:bg-surface-secondary transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
            >
              Hoje
            </button>

            <button
              type="button"
              onClick={onNextDate}
              aria-label="Próximo período"
              title="Próximo período (Seta para a direita)"
              className="btn-interactive p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          {/* Rótulo do Período Formatado */}
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-text-primary select-none capitalize">
            {periodLabel}
          </h1>
        </div>

        {/* Bloco de Ações e Modos de Visualização */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-center">
          {/* Seletor de Modo: Dia / Semana / Mês / Lista */}
          <div
            role="tablist"
            aria-label="Modo de visualização da agenda"
            className="flex items-center bg-surface border border-border/70 rounded-xl p-1 shadow-subtle"
          >
            {[
              { id: 'dia', label: 'Dia' },
              { id: 'semana', label: 'Semana' },
              { id: 'mes', label: 'Mês' },
              { id: 'lista', label: 'Lista' },
            ].map((v) => {
              const isActive = viewMode === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onChangeViewMode(v.id as AgendaViewMode)}
                  className={`btn-interactive px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-[12px] font-medium transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none ${
                    isActive
                      ? 'bg-surface-elevated text-text-primary font-semibold shadow-subtle ring-1 ring-border/50'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary/50'
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>

          {/* Botão de Categorias e Cores */}
          <button
            type="button"
            onClick={onOpenCategoryModal}
            title="Gerenciar categorias e paleta de cores"
            aria-label="Gerenciar categorias e cores"
            className="btn-interactive p-2 rounded-xl bg-surface border border-border/70 hover:border-border text-text-secondary hover:text-text-primary shadow-subtle flex items-center gap-1.5 text-[12px] font-medium focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
          >
            <span className="material-symbols-outlined text-[17px]">palette</span>
            <span className="hidden sm:inline">Cores</span>
          </button>

          {/* Botão Principal: Novo Compromisso */}
          <button
            type="button"
            onClick={onOpenAddDrawer}
            aria-label="Adicionar compromisso à agenda"
            className="btn-interactive px-3.5 py-2 rounded-xl bg-medusa-primary text-[#1C2420] text-[12px] sm:text-[13px] font-semibold hover:brightness-105 shadow-calm flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Adicionar</span>
          </button>
        </div>
      </div>

      {/* Linha de Honestidade de Estado Local */}
      <div className="flex items-center justify-between gap-2 text-[11px] text-text-muted font-mono">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary living-pulse" />
          <span>Agenda · Sincronizada</span>
        </div>

        <span
          title="Os dados desta sessão não persistem após recarregar a página"
          className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-subtle/80 border border-border/50 text-text-muted select-none"
        >
          Dados de exemplo · nada é salvo ainda
        </span>
      </div>
    </header>
  );
}
