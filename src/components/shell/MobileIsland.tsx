'use client';

import React, { useState } from 'react';

export function MobileIsland() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  // Toggle do ciclo de expansão
  const handleToggle = () => {
    if (isKeyboardActive) return;
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className="w-full flex flex-col items-center z-20 my-2 px-4 safe-pt">
      {/* Dynamic Capsule com Reflow Orgânico (Sem Overlay Destrutivo) */}
      <div
        id="mobile-dynamic-island"
        role="region"
        aria-label="Mobile Dynamic Island"
        aria-expanded={isExpanded}
        onClick={handleToggle}
        style={{
          minWidth: isKeyboardActive ? '68px' : isExpanded ? '280px' : '124px',
          minHeight: '44px',
          transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`bg-[#18201D] text-[#ECF2EE] px-4 py-2 ${
          isExpanded ? 'rounded-2xl' : 'rounded-full'
        } shadow-island-dark flex items-center justify-center cursor-pointer select-none border border-white/10 hover:border-white/20 transition-all active:scale-[0.99]`}
      >
        {isKeyboardActive ? (
          /* Estado Contraído sob Teclado Virtual */
          <div className="flex items-center gap-1.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary living-pulse" />
            <span className="text-[10px] font-mono text-medusa-primary font-bold tabular-nums">32m</span>
          </div>
        ) : isExpanded ? (
          /* Estado Expandido: Interação Orgânica */
          <div className="flex flex-col gap-2.5 w-full py-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-medusa-primary living-pulse" />
                <span className="text-[12px] font-semibold text-white">Sessão: Foco Contínuo</span>
              </div>
              <span className="font-mono text-[11px] text-medusa-primary font-bold tabular-nums">32:00</span>
            </div>

            {/* Progress Bar Fina & Discreta */}
            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
              <div className="bg-medusa-primary h-full w-[65%] rounded-full" />
            </div>

            {/* Ações com Touch Targets Mínimos de 44px */}
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                className="btn-interactive flex-1 h-11 rounded-xl bg-white/10 hover:bg-white/15 text-[12px] font-medium text-white/90 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
              >
                Pausar
              </button>
              <button
                type="button"
                className="btn-interactive flex-1 h-11 rounded-xl bg-medusa-primary hover:opacity-90 active:scale-[0.985] text-[#1C2420] text-[12px] font-semibold flex items-center justify-center gap-1.5 shadow-sm focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
              >
                <span className="material-symbols-outlined text-[15px]">check</span>
                <span>Concluir</span>
              </button>
            </div>
          </div>
        ) : (
          /* Estado Minimal de Repouso */
          <div className="flex items-center gap-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary living-pulse flex-shrink-0" />
            <span className="text-[12px] font-medium tracking-tight whitespace-nowrap">
              Física · 32m
            </span>
            <span className="material-symbols-outlined text-[14px] text-medusa-primary/80 ml-0.5">
              touch_app
            </span>
          </div>
        )}
      </div>

      {/* Legenda de Feedback */}
      <span
        id="mobile-island-mode-hint"
        className="text-[11px] text-text-muted mt-2 font-mono text-center"
      >
        {isKeyboardActive
          ? 'Teclado ativo: Island contraído para assinatura mínima'
          : isExpanded
          ? 'Expansão orgânica (180-260ms · Sem overlay destrutivo)'
          : 'Toque para expandir organicamente (Targets ≥ 44×44px)'}
      </span>

      {/* Simulador de Foco de Entrada (Demonstrar Contração Imediata com Teclado) */}
      <div className="w-full max-w-sm mt-3">
        <div className="bg-surface p-2.5 rounded-xl border border-border-subtle flex items-center gap-2 shadow-sm">
          <span className="material-symbols-outlined text-[18px] text-text-muted">keyboard</span>
          <input
            id="demo-mobile-input"
            type="text"
            placeholder="Foque aqui p/ simular teclado virtual..."
            onFocus={() => {
              setIsExpanded(false);
              setIsKeyboardActive(true);
            }}
            onBlur={() => {
              setIsKeyboardActive(false);
            }}
            className="w-full bg-transparent border-none text-[12px] text-text-primary placeholder:text-text-muted p-0 focus:outline-none focus:ring-0"
          />
        </div>
        <span className="text-[10px] text-text-muted font-mono block mt-1 px-1">
          Ao focar: Island contrai para mínimo liberando visão total dos campos.
        </span>
      </div>
    </div>
  );
}
