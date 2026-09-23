'use client';

import React, { useState } from 'react';
import { useShell } from '@/context/ShellContext';
import { useAgenda } from '@/context/AgendaContext';
import { AgendaContextSummary } from '@/components/agenda/AgendaContextSummary';
import { TrackContextPanel } from '@/components/education/TrackContextPanel';
import { TodayContextPanel } from '@/components/hoje/TodayContextPanel';

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

          {/* Corpo do painel: cada área tem seu próprio conteúdo contextual — Educação e Hoje
              têm painéis dedicados; as demais rotas (ainda sem painel próprio) mantêm o
              resumo operacional padrão. */}
          {activeRoute === 'educacao' ? (
            <TrackContextPanel />
          ) : activeRoute === 'hoje' ? (
            <TodayContextPanel />
          ) : (
            <>
              <div className="space-y-2.5 pb-6 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                    Guardian &amp; Bio-Estado
                  </span>
                  <span className="text-[11px] font-mono text-[#18534B] dark:text-medusa-primary font-semibold tabular-nums">
                    99.8% Estável
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold tracking-tight text-text-primary tabular-nums">
                    88<span className="text-xs font-normal text-text-muted ml-1">/ 100</span>
                  </span>
                  <span className="text-[11px] text-text-secondary">Fluxo contínuo</span>
                </div>
                <div className="w-full bg-surface-subtle h-1 rounded-full overflow-hidden">
                  <div className="bg-medusa-primary h-full w-[88%] rounded-full" />
                </div>
                <div className="text-[10px] text-text-muted font-mono pt-0.5">
                  Sync ativo há 2m · Nuvem Pessoal
                </div>
              </div>

              <div className="space-y-2 pb-6 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                    Próxima Transição
                  </span>
                  <span className="text-[10px] font-mono text-text-muted tabular-nums">14:30</span>
                </div>
                <h4 className="text-[13px] font-semibold tracking-tight text-text-primary">
                  Revisão Estratégica do Sistema
                </h4>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-secondary">Bloco de 45m</span>
                  <span className="text-text-muted font-mono tabular-nums">Em 2h 15m</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                    Marcos da Sessão
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">Hoje</span>
                </div>
                <div className="space-y-2 text-[12px]">
                  <div className="flex items-baseline justify-between text-text-primary">
                    <span className="font-medium">Alinhamento Arquitetural</span>
                    <span className="text-text-muted font-mono text-[11px] tabular-nums">11:00</span>
                  </div>
                  <div className="flex items-baseline justify-between text-text-secondary">
                    <span>Sessão de Leitura &amp; Síntese</span>
                    <span className="text-text-muted font-mono text-[11px] tabular-nums">16:00</span>
                  </div>
                  <div className="flex items-baseline justify-between text-text-secondary">
                    <span>Caminhada Restaurativa</span>
                    <span className="text-text-muted font-mono text-[11px] tabular-nums">18:00</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function ContextPanel() {
  const { geometry, setContextOpen, breakpoint, activeRoute } = useShell();
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  // No mobile/tablet, o Context Panel vira um bottom sheet próprio (ver seção 24 do produto) —
  // nunca a sidebar/painel de desktop comprimida. Continua fora da árvore quando fechado (mesmo
  // princípio de "0% render quando invisível" do desktop), só que a reabertura é uma folha, não
  // uma coluna fixa lateral (que não cabe em 360–412px de largura).
  if (breakpoint !== 'desktop') {
    return (
      <>
        <button
          type="button"
          id="btn-open-context-sheet"
          onClick={() => setIsMobileSheetOpen(true)}
          title="Abrir Painel de Contexto"
          aria-label="Abrir Painel de Contexto"
          className="btn-interactive fixed right-4 bottom-20 z-30 bg-surface border border-border p-3 rounded-full shadow-lg text-text-secondary hover:text-text-primary flex items-center justify-center focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
        >
          <span className="material-symbols-outlined text-[20px]">dock_to_left</span>
        </button>

        <div
          id="context-sheet-backdrop"
          aria-hidden="true"
          onClick={() => setIsMobileSheetOpen(false)}
          className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-200 ${
            isMobileSheetOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        />

        <aside
          id="context-panel-mobile-sheet"
          aria-label="Painel de Contexto Regional"
          aria-hidden={!isMobileSheetOpen}
          className={`fixed left-0 right-0 bottom-0 z-40 bg-surface rounded-t-2xl shadow-island max-h-[80vh] flex flex-col pt-2 pb-6 panel-transition border-t border-border/70 ${
            isMobileSheetOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
          }`}
        >
          {/* Handle — sinaliza "isto é uma folha que se puxa", mesmo sem gesto de arrastar implementado */}
          <div className="flex justify-center pb-3 flex-shrink-0">
            <div className="w-10 h-1.5 rounded-full bg-border/80" />
          </div>
          <div className="overflow-y-auto">
            <ContextPanelBody onRequestClose={() => setIsMobileSheetOpen(false)} closeIcon="close" />
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
