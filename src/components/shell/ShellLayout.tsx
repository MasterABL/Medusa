'use client';

import React from 'react';
import { useShell } from '@/context/ShellContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ContextPanel } from './ContextPanel';
import { CommandModal } from './CommandModal';

export function ShellLayout({ children }: { children: React.ReactNode }) {
  const { mode, isContextOpen, breakpoint } = useShell();

  // Cálculo rigoroso do espaçamento da Main Shell Area (240px Amplo | 68px Compacto | 0px Foco)
  const getMainPaddingStyle = () => {
    if (breakpoint === 'mobile') {
      return { paddingLeft: '0px', paddingRight: '0px' };
    }
    if (breakpoint === 'tablet') {
      return {
        paddingLeft: mode === 'foco' ? '0px' : '68px',
        paddingRight: '0px',
      };
    }

    // Desktop
    if (mode === 'foco') {
      return { paddingLeft: '0px', paddingRight: '0px' };
    }
    if (mode === 'compacto') {
      return {
        paddingLeft: '68px',
        paddingRight: isContextOpen ? '260px' : '0px',
      };
    }
    // Amplo
    return {
      paddingLeft: '240px',
      paddingRight: isContextOpen ? '320px' : '0px',
    };
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col transition-colors duration-300 overflow-x-hidden">
      {/* 1. Sidebar Estrutural e Drawer */}
      <Sidebar />

      {/* 2. Main Shell Area (Fluida e Centralizada entre os Painéis) */}
      <div
        id="content-layout"
        style={getMainPaddingStyle()}
        className="min-h-screen flex flex-col panel-transition"
      >
        {/* Header com 3-Zone Grid [1fr auto 1fr] */}
        <Header />

        {/* Conteúdo Principal do Shell */}
        <div className="w-full flex-1 flex flex-col pt-14">
          {children}
        </div>
      </div>

      {/* 3. Context Panel Regional */}
      <ContextPanel />

      {/* 4. Command Modal ⌘K */}
      <CommandModal />
    </div>
  );
}
