'use client';

import React from 'react';
import { useShell } from '@/context/ShellContext';

export function ContextPanel() {
  const { geometry, setContextOpen, breakpoint } = useShell();

  // No mobile e tablet, o Context Panel permanece 100% fora da árvore de renderização
  if (breakpoint !== 'desktop') {
    return null;
  }

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
            : 'translate-x-full border-l-0 border-transparent opacity-0 pointer-events-none'
        }`}
      >
          <div className="px-6 flex flex-col space-y-6">
            {/* Topo do Painel */}
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
                onClick={() => setContextOpen(false)}
                title="Recolher Context Panel"
                aria-label="Recolher Painel de Contexto"
                className="btn-interactive p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>

            {/* Seção 1: Guardian & Saúde do Sistema (Fluxo Contínuo & Tabular) */}
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

            {/* Seção 2: Próxima Transição (Metadados Marginais) */}
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

            {/* Seção 3: Marcos da Agenda (Lista Marginalia com Alinhamento Tabular) */}
            <div className="space-y-3 pb-6 border-b border-border/60">
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

            {/* Seção 4: Papel Arquitetural (Marginalia Contextual Discreta) */}
            <div className="space-y-1.5 text-[11px] text-text-muted font-mono">
              <span className="uppercase tracking-wider text-text-muted text-[10px]">
                Papel Arquitetural
              </span>
              <p className="leading-relaxed text-text-secondary font-sans text-[11px]">
                Região lateral de suporte contínuo. Não compete com o eixo do Island e permanece 100% oculta no Modo Foco.
              </p>
            </div>
          </div>
        </aside>

      {/* Botão Flutuante de Reabertura (quando recolhido no Desktop, exceto no Foco) */}
      {geometry.isContextAvailable && !isOpen && (
        <button
          type="button"
          id="btn-reopen-context"
          onClick={() => setContextOpen(true)}
          title="Reabrir Painel de Contexto"
          aria-label="Reabrir Painel de Contexto"
          className="btn-interactive fixed right-4 bottom-6 z-30 bg-surface-elevated border border-border/80 p-2.5 rounded-full shadow-calm hover:shadow-lg text-text-secondary hover:text-text-primary flex items-center justify-center focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">dock_to_left</span>
        </button>
      )}
    </>
  );
}
