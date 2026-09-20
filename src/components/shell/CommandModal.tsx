'use client';

import React, { useEffect, useRef } from 'react';
import { useShell } from '@/context/ShellContext';

export function CommandModal() {
  const { isCommandOpen, closeCommand, setMode, setTheme } = useShell();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isCommandOpen]);

  if (!isCommandOpen) return null;

  return (
    <div
      id="command-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Central de Comandos"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCommand();
      }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-24 px-4 transition-all duration-200"
    >
      <div
        id="command-card"
        className="bg-surface-elevated border border-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all duration-200 scale-100 opacity-100"
      >
        {/* Input Header */}
        <div className="p-4 border-b border-border flex items-center gap-3 bg-surface-elevated">
          <span className="material-symbols-outlined text-text-muted text-[22px]">search</span>
          <input
            ref={inputRef}
            type="text"
            id="command-input"
            placeholder="O que deseja executar ou buscar? (Hoje, Estudo, Nota, Tema, Foco...)"
            className="w-full bg-transparent border-none text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-0"
          />
          <kbd
            onClick={closeCommand}
            className="cursor-pointer font-mono text-[11px] text-text-muted bg-surface-secondary px-2 py-0.5 rounded border border-border hover:text-text-primary"
          >
            ESC
          </kbd>
        </div>

        {/* Action List */}
        <div className="p-2 max-h-80 overflow-y-auto flex flex-col gap-1 text-[13px]">
          <div className="px-3 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-text-muted">
            Ações Operacionais Rápidas
          </div>

          <button
            type="button"
            onClick={() => {
              setMode('foco');
              closeCommand();
            }}
            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-secondary text-text-primary transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[18px] text-medusa-primary">
                center_focus_strong
              </span>
              <span>Alternar para Modo Foco (Zen Total · 0px Sidebar)</span>
            </div>
            <span className="text-[10px] font-mono bg-medusa-primary/30 text-text-primary px-1.5 py-0.5 rounded">
              Layout
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('sepia');
              closeCommand();
            }}
            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-secondary text-text-primary transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[18px] text-medusa-accent">
                auto_stories
              </span>
              <span>Ativar Tema Sépia (Paper Mode / Conforto Térmico)</span>
            </div>
            <span className="text-[10px] font-mono bg-medusa-accent/30 text-text-primary px-1.5 py-0.5 rounded">
              Tema
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              closeCommand();
            }}
            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-secondary text-text-primary transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[18px] text-text-muted">
                dark_mode
              </span>
              <span>Ativar Tema Escuro (Crepúsculo &amp; Foco)</span>
            </div>
            <span className="text-[10px] font-mono text-text-muted">
              Tema
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('light');
              closeCommand();
            }}
            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-secondary text-text-primary transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[18px] text-medusa-primary">
                wb_sunny
              </span>
              <span>Ativar Tema Claro (Aurora Límpida)</span>
            </div>
            <span className="text-[10px] font-mono text-text-muted">
              Tema
            </span>
          </button>
        </div>

        {/* Footer Info */}
        <div className="px-4 py-2 bg-surface-secondary border-t border-border flex items-center justify-between text-[11px] text-text-muted font-mono">
          <span>Quiet State ativado no Island (opacity 0.38, mantém âncora)</span>
          <span>ESC para fechar</span>
        </div>
      </div>
    </div>
  );
}
