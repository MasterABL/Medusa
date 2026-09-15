'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Theme, ShellMode, IslandState, Breakpoint } from '@/types/shell';

interface ShellContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  mode: ShellMode;
  setMode: (mode: ShellMode) => void;
  isContextOpen: boolean;
  toggleContext: () => void;
  setContextOpen: (open: boolean) => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  isCommandOpen: boolean;
  openCommand: () => void;
  closeCommand: () => void;
  islandState: IslandState;
  setIslandState: (state: IslandState) => void;
  isQuiet: boolean;
  toggleQuiet: (forced?: boolean) => void;
  breakpoint: Breakpoint;
  activeRoute: string;
  setActiveRoute: (route: string) => void;
}

const ShellContext = createContext<ShellContextValue | undefined>(undefined);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mode, setModeState] = useState<ShellMode>('amplo');
  const [isContextOpen, setContextOpenState] = useState<boolean>(true);
  const [isDrawerOpen, setDrawerOpenState] = useState<boolean>(false);
  const [isCommandOpen, setCommandOpenState] = useState<boolean>(false);
  const [islandState, setIslandState] = useState<IslandState>('active');
  const [isQuietManual, setIsQuietManual] = useState<boolean>(false);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
  const [activeRoute, setActiveRouteState] = useState<string>('hoje');
  const [mounted, setMounted] = useState(false);

  // Inicialização e persistência de tema
  useEffect(() => {
    setMounted(true);
    const savedTheme = (localStorage.getItem('medusa-theme-v2') as Theme) || 'light';
    setThemeState(savedTheme);
    applyThemeToDOM(savedTheme);

    // Detecção de Breakpoint (Desktop >= 1024, Tablet 768-1023, Mobile < 768)
    const updateBreakpoint = () => {
      const w = window.innerWidth;
      if (w >= 1024) {
        setBreakpoint('desktop');
      } else if (w >= 768) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('mobile');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  const applyThemeToDOM = (t: Theme) => {
    const doc = document.documentElement;
    doc.classList.add('theme-transitioning');
    doc.classList.remove('light', 'sepia', 'dark');

    if (t === 'sepia') {
      doc.classList.add('sepia');
    } else if (t === 'dark') {
      doc.classList.add('dark');
    } else {
      doc.classList.add('light');
    }

    setTimeout(() => {
      doc.classList.remove('theme-transitioning');
    }, 380);
  };

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('medusa-theme-v2', newTheme);
    } catch {
      // Ignorar fallback de storage restrito
    }

    // Suporte nativo à View Transitions API com fallback gracioso
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
        applyThemeToDOM(newTheme);
      });
    } else {
      applyThemeToDOM(newTheme);
    }
  }, []);

  const setMode = useCallback((newMode: ShellMode) => {
    const update = () => {
      setModeState(newMode);
      if (newMode === 'foco') {
        setIslandState('focus');
      } else if (newMode === 'compacto') {
        setIslandState('context');
      } else {
        setIslandState('active');
      }
    };

    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(update);
    } else {
      update();
    }
  }, []);

  const toggleContext = useCallback(() => {
    setContextOpenState((prev) => !prev);
  }, []);

  const setContextOpen = useCallback((open: boolean) => {
    setContextOpenState(open);
  }, []);

  const openDrawer = useCallback(() => {
    setDrawerOpenState(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpenState(false);
  }, []);

  const openCommand = useCallback(() => {
    setCommandOpenState(true);
  }, []);

  const closeCommand = useCallback(() => {
    setCommandOpenState(false);
  }, []);

  const toggleQuiet = useCallback((forced?: boolean) => {
    setIsQuietManual((prev) => (forced !== undefined ? forced : !prev));
  }, []);

  const setActiveRoute = useCallback((route: string) => {
    setActiveRouteState(route);
    setDrawerOpenState(false);
  }, []);

  // Atalho de Teclado Global: ⌘K e ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpenState((prev) => !prev);
      }
      if (e.key === 'Escape') {
        if (isCommandOpen) {
          setCommandOpenState(false);
        } else if (isDrawerOpen) {
          setDrawerOpenState(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandOpen, isDrawerOpen]);

  // Quiet State é ativado se o Command Modal estiver aberto OU ativado manualmente
  const isQuiet = isCommandOpen || isQuietManual;

  return (
    <ShellContext.Provider
      value={{
        theme,
        setTheme,
        mode,
        setMode,
        isContextOpen,
        toggleContext,
        setContextOpen,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        isCommandOpen,
        openCommand,
        closeCommand,
        islandState,
        setIslandState,
        isQuiet,
        toggleQuiet,
        breakpoint,
        activeRoute,
        setActiveRoute,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error('useShell must be used within a ShellProvider');
  }
  return context;
}
