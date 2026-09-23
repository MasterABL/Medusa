'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Theme, ShellMode, IslandState, Breakpoint, ShellGeometry, calculateShellGeometry } from '@/types/shell';
import { unlockAudioOnFirstGesture } from '@/lib/audioFeedback';

interface ShellContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  mode: ShellMode;
  setMode: (mode: ShellMode) => void;
  isContextOpen: boolean;
  toggleContext: () => void;
  setContextOpen: (open: boolean) => void;
  geometry: ShellGeometry;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  isCommandOpen: boolean;
  openCommand: () => void;
  closeCommand: () => void;
  islandState: IslandState;
  setIslandState: (state: IslandState) => void;
  isVoiceActive: boolean;
  setVoiceActive: (active: boolean) => void;
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
  // Sobreposição do modo Voz sobre o catálogo canônico (fechado) do Island — não é um 11º
  // estado do catálogo, é um overlay ortogonal (ver DynamicIsland.tsx).
  const [isVoiceActive, setVoiceActive] = useState<boolean>(false);
  const [isQuietManual, setIsQuietManual] = useState<boolean>(false);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
  const [activeRoute, setActiveRouteState] = useState<string>('hoje');
  const [mounted, setMounted] = useState(false);

  // Inicialização e persistência de tema e do painel regional
  useEffect(() => {
    setMounted(true);
    const savedTheme = (localStorage.getItem('medusa-theme-v2') as Theme) || 'light';
    setThemeState(savedTheme);
    applyThemeToDOM(savedTheme);

    // Feedback sonoro (Round 5 §10): o AudioContext nasce suspenso até um gesto real do
    // usuário — registrado aqui, no provedor raiz, porque é o único lugar que garante cobrir
    // o app inteiro desde o primeiro clique/tecla, não só uma tela específica.
    unlockAudioOnFirstGesture();

    // Persistência local do Context Panel (sobrevive a reload sem persistência no servidor)
    const savedContext = localStorage.getItem('medusa-context-panel-open');
    if (savedContext !== null) {
      setContextOpenState(savedContext === 'true');
    }

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
    setContextOpenState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('medusa-context-panel-open', String(next));
      } catch {
        // Fallback para storage restrito
      }
      return next;
    });
  }, []);

  const setContextOpen = useCallback((open: boolean) => {
    setContextOpenState(open);
    try {
      localStorage.setItem('medusa-context-panel-open', String(open));
    } catch {
      // Fallback para storage restrito
    }
  }, []);

  // Cálculo da Geometria Unificada (Fonte Única da Verdade — ver src/types/shell.ts)
  const geometry = useMemo(() => {
    return calculateShellGeometry(mode, breakpoint, isContextOpen);
  }, [mode, breakpoint, isContextOpen]);

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
        geometry,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        isCommandOpen,
        openCommand,
        closeCommand,
        islandState,
        setIslandState,
        isVoiceActive,
        setVoiceActive,
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
