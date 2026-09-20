/**
 * Medusa — Agenda Filters
 *
 * Filtros de domínio para a Agenda: Todos, Educação, Corpo, Trabalho, Pessoal, Finanças.
 * Não duplica nem altera os dados de fundo, apenas restringe a visualização.
 */

'use client';

import React from 'react';
import { AgendaDomain } from '@/types/agenda';

interface AgendaFiltersProps {
  selectedDomain: AgendaDomain | 'all';
  onSelectDomain: (domain: AgendaDomain | 'all') => void;
  countsByDomain?: Record<string, number>;
}

export function AgendaFilters({
  selectedDomain,
  onSelectDomain,
  countsByDomain,
}: AgendaFiltersProps) {
  const filterOptions: { id: AgendaDomain | 'all'; label: string; icon: string }[] = [
    { id: 'all', label: 'Todos', icon: 'grid_view' },
    { id: 'education', label: 'Educação', icon: 'menu_book' },
    { id: 'body', label: 'Corpo', icon: 'fitness_center' },
    { id: 'work', label: 'Trabalho', icon: 'business_center' },
    { id: 'personal', label: 'Pessoal', icon: 'person' },
    { id: 'finance', label: 'Finanças', icon: 'account_balance_wallet' },
  ];

  return (
    <nav
      aria-label="Filtros por domínio"
      className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none"
    >
      {filterOptions.map((opt) => {
        const isActive = selectedDomain === opt.id;
        const count = countsByDomain ? countsByDomain[opt.id] : undefined;

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelectDomain(opt.id)}
            aria-pressed={isActive}
            className={`btn-interactive px-3 py-1.5 rounded-full text-[11px] sm:text-[12px] font-medium flex items-center gap-1.5 flex-shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
              isActive
                ? 'bg-surface-elevated text-text-primary border border-border shadow-subtle font-semibold ring-1 ring-border'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary/70 border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-[15px] opacity-80">
              {opt.icon}
            </span>
            <span>{opt.label}</span>
            {count !== undefined && count > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-surface-subtle text-text-muted">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
