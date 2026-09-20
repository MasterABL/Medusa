'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useShell } from '@/context/ShellContext';
import { DynamicIsland } from './DynamicIsland';
import { Theme, ShellMode } from '@/types/shell';

export function Header() {
  const {
    mode,
    setMode,
    theme,
    setTheme,
    toggleContext,
    openDrawer,
    openCommand,
    breakpoint,
    activeRoute,
    geometry,
  } = useShell();

  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

  const modeRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeRef.current && !modeRef.current.contains(event.target as Node)) {
        setModeDropdownOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getThemeLabel = (t: Theme) => {
    switch (t) {
      case 'sepia':
        return 'Sépia';
      case 'dark':
        return 'Escuro';
      default:
        return 'Claro';
    }
  };

  const getThemeIcon = (t: Theme) => {
    switch (t) {
      case 'sepia':
        return 'auto_stories';
      case 'dark':
        return 'dark_mode';
      default:
        return 'wb_sunny';
    }
  };

  const formatRoute = (route: string) => {
    switch (route) {
      case 'agenda':
        return 'Agenda';
      case 'educacao':
        return 'Educação';
      case 'corpo':
        return 'Corpo';
      case 'financas':
        return 'Finanças';
      case 'progresso':
        return 'Progresso';
      default:
        return 'Hoje';
    }
  };

  return (
    <header
      id="top-header"
      role="banner"
      style={geometry.headerStyle}
      className="fixed top-0 h-14 bg-background/90 backdrop-blur-md border-b border-border/70 dark:border-border/50 z-30 panel-transition"
    >
      <div className="w-full h-full px-4 sm:px-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
        {/* ================= ZONA 1 (ESQUERDA): Breadcrumb & Trigger do Drawer no Foco ================= */}
        <div className="flex items-center gap-2.5 justify-self-start overflow-hidden min-w-0">
          {/* Trigger do Drawer no Modo Foco ou viewports menores */}
          {(mode === 'foco' || breakpoint !== 'desktop') && (
            <button
              type="button"
              id="btn-focus-drawer-trigger"
              onClick={openDrawer}
              aria-label="Abrir Navegação (Drawer)"
              title="Abrir Navegação"
              className="btn-interactive p-1.5 rounded-full border border-border/60 bg-surface/80 text-text-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none shadow-subtle flex items-center justify-center flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">menu</span>
            </button>
          )}

          <nav aria-label="Trilha de navegação" className="flex items-center gap-1.5 text-[12px] font-medium text-text-secondary whitespace-nowrap overflow-hidden min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary living-pulse flex-shrink-0" aria-hidden="true" />
            <span className="text-text-muted hidden 2xl:inline">Life OS</span>
            <span className="text-text-muted hidden 2xl:inline">/</span>
            <span className="text-text-primary font-semibold truncate">{formatRoute(activeRoute)}</span>
          </nav>
        </div>

        {/* ================= ZONA 2 (CENTRAL): DYNAMIC ISLAND NO CENTRO MATEMÁTICO DA MAIN SHELL AREA ================= */}
        <div className="justify-self-center hidden md:flex">
          <DynamicIsland />
        </div>

        {/* ================= ZONA 3 (DIREITA): Comandos, Modos, Temas e Painel ================= */}
        <div className="flex items-center gap-1 justify-self-end">
          {/* Quick Command ⌘K */}
          <button
            type="button"
            id="btn-quick-command"
            onClick={openCommand}
            title="Abrir Command Center (⌘K)"
            className="btn-interactive w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface/80 border border-border/60 text-text-secondary hover:text-text-primary hover:border-medusa-primary/40 text-[12px] shadow-subtle focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex items-center justify-center flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[15px]">search</span>
          </button>

          {/* Seletor de Modo do Shell (Amplo / Compacto / Foco) */}
          <div className="relative flex-shrink-0" ref={modeRef}>
            <button
              type="button"
              id="btn-shell-mode-dropdown"
              onClick={() => setModeDropdownOpen((prev) => !prev)}
              aria-expanded={modeDropdownOpen}
              aria-haspopup="true"
              title={`Modo Atual: ${mode}`}
              className="btn-interactive w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface/80 border border-border/60 text-[12px] font-medium text-text-primary hover:border-medusa-primary/40 shadow-subtle focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex items-center justify-center"
            >
              <span className="w-2 h-2 rounded-full bg-medusa-primary" aria-hidden="true" />
              <span id="current-shell-mode-label" className="sr-only">{mode}</span>
            </button>

            {modeDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-surface-elevated/95 backdrop-blur-md border border-border/70 rounded-2xl shadow-calm p-1.5 flex flex-col gap-0.5 z-50 text-[12px]">
                <button
                  type="button"
                  id="view-desktop-wide"
                  onClick={() => {
                    setMode('amplo');
                    setModeDropdownOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    mode === 'amplo' ? 'bg-surface-secondary text-text-primary font-medium' : 'hover:bg-surface-secondary text-text-secondary'
                  }`}
                >
                  <div>
                    <span className="block">Amplo</span>
                    <span className="text-[10px] font-mono text-text-muted">240px + 320px</span>
                  </div>
                  {mode === 'amplo' && (
                    <span className="material-symbols-outlined text-[14px] text-[#2c6956] dark:text-medusa-primary">check</span>
                  )}
                </button>

                <button
                  type="button"
                  id="view-desktop-compact"
                  onClick={() => {
                    setMode('compacto');
                    setModeDropdownOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    mode === 'compacto' ? 'bg-surface-secondary text-text-primary font-medium' : 'hover:bg-surface-secondary text-text-secondary'
                  }`}
                >
                  <div>
                    <span className="block">Compacto</span>
                    <span className="text-[10px] font-mono text-text-muted">68px + 260px</span>
                  </div>
                  {mode === 'compacto' && (
                    <span className="material-symbols-outlined text-[14px] text-[#2c6956] dark:text-medusa-primary">check</span>
                  )}
                </button>

                <button
                  type="button"
                  id="view-foco"
                  onClick={() => {
                    setMode('foco');
                    setModeDropdownOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    mode === 'foco' ? 'bg-surface-secondary text-text-primary font-medium' : 'hover:bg-surface-secondary text-text-secondary'
                  }`}
                >
                  <div>
                    <span className="block">Foco (Zen)</span>
                    <span className="text-[10px] font-mono text-text-muted">0px + Drawer</span>
                  </div>
                  {mode === 'foco' && (
                    <span className="material-symbols-outlined text-[14px] text-[#2c6956] dark:text-medusa-primary">check</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Seletor dos 3 Temas Permanentes [Claro | Sépia | Escuro] */}
          <div className="relative flex-shrink-0" ref={themeRef}>
            <button
              type="button"
              id="btn-theme-dropdown"
              onClick={() => setThemeDropdownOpen((prev) => !prev)}
              aria-expanded={themeDropdownOpen}
              aria-haspopup="true"
              title={`Tema Atual: ${getThemeLabel(theme)}`}
              className="btn-interactive w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface/80 border border-border/60 text-[12px] font-medium text-text-primary hover:border-medusa-primary/40 shadow-subtle focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[15px] text-[#2c6956] dark:text-medusa-primary" id="theme-active-icon">
                {getThemeIcon(theme)}
              </span>
              <span id="current-theme-label" className="sr-only">{getThemeLabel(theme)}</span>
            </button>

            {themeDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-surface-elevated/95 backdrop-blur-md border border-border/70 rounded-2xl shadow-calm p-1.5 flex flex-col gap-0.5 z-50 text-[12px]">
                <button
                  type="button"
                  data-theme="light"
                  onClick={() => {
                    setTheme('light');
                    setThemeDropdownOpen(false);
                  }}
                  className={`theme-select-btn flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    theme === 'light' ? 'bg-surface-secondary text-text-primary font-medium' : 'hover:bg-surface-secondary text-text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#ECF1ED] border border-[#CFDCD2] inline-block" />
                    <span>Claro (Aurora)</span>
                  </div>
                  {theme === 'light' && (
                    <span className="material-symbols-outlined text-[14px] text-[#2c6956] dark:text-medusa-primary" id="theme-check-light">check</span>
                  )}
                </button>

                <button
                  type="button"
                  data-theme="sepia"
                  onClick={() => {
                    setTheme('sepia');
                    setThemeDropdownOpen(false);
                  }}
                  className={`theme-select-btn flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    theme === 'sepia' ? 'bg-surface-secondary text-text-primary font-medium' : 'hover:bg-surface-secondary text-text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#F8F7F0] border border-[#E4E5DA] inline-block" />
                    <span>Sépia (Paper Mode)</span>
                  </div>
                  {theme === 'sepia' && (
                    <span className="material-symbols-outlined text-[14px] text-[#2c6956] dark:text-medusa-primary" id="theme-check-sepia">check</span>
                  )}
                </button>

                <button
                  type="button"
                  data-theme="dark"
                  onClick={() => {
                    setTheme('dark');
                    setThemeDropdownOpen(false);
                  }}
                  className={`theme-select-btn flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    theme === 'dark' ? 'bg-surface-secondary text-text-primary font-medium' : 'hover:bg-surface-secondary text-text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#111614] border border-[#24312B] inline-block" />
                    <span>Escuro (Crepúsculo)</span>
                  </div>
                  {theme === 'dark' && (
                    <span className="material-symbols-outlined text-[14px] text-medusa-primary" id="theme-check-dark">check</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Toggle Context Panel (Apenas quando o painel regional for suportado no layout atual) */}
          {geometry.isContextAvailable && (
            <button
              type="button"
              id="toggle-context-panel"
              onClick={toggleContext}
              title="Alternar Context Panel Regional"
              aria-label="Alternar Painel de Contexto"
              className="btn-interactive w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface/80 border border-border/60 text-text-secondary hover:text-text-primary flex items-center justify-center shadow-subtle focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">dock_to_left</span>
            </button>
          )}

          {/* Avatar discreto */}
          <div className="w-7 h-7 rounded-full bg-surface-secondary border border-border/60 flex items-center justify-center text-[#1C2420] dark:text-[#E5EDE8] font-medium text-[10px] select-none flex-shrink-0 shadow-subtle">
            MV
          </div>
        </div>
      </div>
    </header>
  );
}
