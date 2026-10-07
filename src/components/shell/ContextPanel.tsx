'use client';

import React, { useState } from 'react';
import { useShell } from '@/context/ShellContext';
import { useAgenda } from '@/context/AgendaContext';
import { AgendaContextSummary } from '@/components/agenda/AgendaContextSummary';
import { TrackContextPanel } from '@/components/education/TrackContextPanel';
import { TodayContextPanel } from '@/components/hoje/TodayContextPanel';
import { FinanceContextPanel } from '@/components/financas/FinanceContextPanel';
import { BodyContextPanel } from '@/components/corpo/BodyContextPanel';
import { GuardianContextPanel } from '@/components/guardian/GuardianContextPanel';
import { SpiritualContextPanel } from '@/components/espiritual/SpiritualContextPanel';
import { EmailContextPanel } from '@/components/email/EmailContextPanel';

/**
 * Corpo do painel — compartilhado entre o `<aside>` fixo do desktop e o bottom sheet de
 * mobile/tablet, para as duas superfícies nunca divergirem em conteúdo (só na moldura visual em
 * volta). `onRequestClose` é o botão de fechar do cabeçalho: no desktop recolhe o Context Panel;
 * no bottom sheet fecha a folha.
 */
function ContextPanelBody({ onRequestClose, closeIcon }: { onRequestClose: () => void; closeIcon: string }) {
  const { activeRoute } = useShell();
  const agenda = useAgenda();

  return (
    <div className="px-6 flex flex-col space-y-6">
      {activeRoute === 'agenda' ? (
        <AgendaContextSummary
          currentDate={agenda.currentDate}
          items={agenda.items}
          onGoToToday={agenda.goToToday}
        />
      ) : (
        <>
          {/* Topo do Painel Padrão */}
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary living-pulse" />
              <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-text-muted">
                Painel Regional
              </span>
            </div>
            <button
              type="button"
              id="btn-close-context"
              onClick={onRequestClose}
              title="Recolher Context Panel"
              aria-label="Recolher Painel de Contexto"
              className="btn-interactive p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
            >
              <span className="material-symbols-outlined text-[16px]">{closeIcon}</span>
            </button>
          </div>

          {/* Corpo do painel com extensão contextual dedicada por domínio */}
          {activeRoute === 'educacao' ? (
            <TrackContextPanel />
          ) : activeRoute === 'hoje' ? (
            <TodayContextPanel />
          ) : activeRoute === 'financas' ? (
            <FinanceContextPanel />
          ) : activeRoute === 'corpo' ? (
            <BodyContextPanel />
          ) : activeRoute === 'guardian' ? (
            <GuardianContextPanel />
          ) : activeRoute === 'espiritual' ? (
            <SpiritualContextPanel />
          ) : activeRoute === 'email' ? (
            <EmailContextPanel />
          ) : (
            // Rotas sem painel próprio (Progresso, rota desconhecida): o painel do Hoje, com dados reais.
            // Antes: texto fixo "99.8% Estável · Sync ativo há 2m · Nuvem Pessoal" e marcos inventados.
            <TodayContextPanel />
          )}
        </>
      )}
    </div>
  );
}

export function ContextPanel() {
  const { geometry, isContextOpen, setContextOpen, breakpoint, activeRoute } = useShell();

  // No mobile estreito (<768px), o Context Panel funciona como bottom sheet acionado pelo botão do Header,
  // eliminando o botão flutuante sobreposto ao conteúdo (correção P0 de mobile).
  if (breakpoint === 'mobile') {
    return (
      <>
        <div
          id="context-sheet-backdrop"
          aria-hidden="true"
          onClick={() => setContextOpen(false)}
          className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-200 ${
            isContextOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        />

        <aside
          id="context-panel-mobile-sheet"
          aria-label="Painel de Contexto Regional"
          aria-hidden={!isContextOpen}
          className={`fixed left-0 right-0 bottom-0 z-40 bg-surface rounded-t-2xl shadow-island max-h-[80vh] flex flex-col pt-2 pb-6 panel-transition border-t border-border/70 ${
            isContextOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
          }`}
        >
          {/* Handle — sinaliza a folha que desliza suavemente */}
          <div className="flex justify-center pb-3 flex-shrink-0">
            <div className="w-10 h-1.5 rounded-full bg-border/80" />
          </div>
          <div className="overflow-y-auto">
            <ContextPanelBody onRequestClose={() => setContextOpen(false)} closeIcon="close" />
          </div>
        </aside>
      </>
    );
  }

  // No Modo Foco, o Context Panel desliza continuamente para fora (translate-x-full) sem remount
  const isOpen = geometry.isContextVisible;

  return (
    <>
      {/* Painel Estrutural Regional */}
      <aside
        id="context-panel"
        aria-label="Painel de Contexto Regional"
        aria-hidden={!isOpen}
        style={{
          width: `${geometry.effectiveContextWidth}px`,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        className={`fixed right-0 top-0 h-full bg-surface z-30 flex flex-col pt-16 pb-6 overflow-y-auto panel-transition shadow-sm ${
          isOpen
            ? 'translate-x-0 border-l border-border opacity-100'
            : 'translate-x-full border-l-0 border-transparent opacity-0'
        }`}
      >
        <ContextPanelBody onRequestClose={() => setContextOpen(false)} closeIcon="chevron_right" />
      </aside>

      {/* Botão Flutuante de Reabertura (quando recolhido no Desktop, exceto no Foco) */}
      {geometry.isContextAvailable && !isOpen && (
        <button
          type="button"
          id="btn-reopen-context"
          onClick={() => setContextOpen(true)}
          title="Reabrir Painel de Contexto"
          aria-label="Reabrir Painel de Contexto"
          className="btn-interactive fixed right-4 bottom-6 z-30 bg-surface border border-border p-2.5 rounded-full shadow-lg text-text-secondary hover:text-text-primary flex items-center justify-center focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
        >
          <span className="material-symbols-outlined text-[20px]">dock_to_left</span>
        </button>
      )}
    </>
  );
}
