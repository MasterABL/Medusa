'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Theme, ShellMode, IslandState, Breakpoint, ShellGeometry, IslandNotification, calculateShellGeometry } from '@/types/shell';
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
  islandNotification: IslandNotification | null;
  triggerIslandNotification: (notification: IslandNotification) => void;
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
  const [islandNotification, setIslandNotification] = useState<IslandNotification | null>(null);
  const notificationTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const notificationQueueRef = React.useRef<IslandNotification[]>([]);
  const currentNotificationPriorityRef = React.useRef<number>(0);
  const currentNotificationStartTimeRef = React.useRef<number>(0);
  const [mounted, setMounted] = useState(false);

  // Inicialização e persistência de tema, rotas e do painel regional
  useEffect(() => {
    setMounted(true);
    // Recuperação de rota persistida via URL hash ou localStorage
    const validRoutes = ['hoje', 'agenda', 'educacao', 'corpo', 'financas', 'progresso'];
    const hash = window.location.hash.replace('#', '').toLowerCase();
    const savedRoute = localStorage.getItem('medusa-active-route');
    if (hash && validRoutes.includes(hash)) {
      setActiveRouteState(hash);
    } else if (savedRoute && validRoutes.includes(savedRoute)) {
      setActiveRouteState(savedRoute);
    }

    // Round 7 §4: Sépia foi removido da UI — quem tinha 'sepia' salvo de uma visita anterior
    // (valor válido até esta rodada) migra silenciosamente para 'light' em vez de ficar preso a
    // um tema que não existe mais em nenhum seletor.
    const rawSavedTheme = localStorage.getItem('medusa-theme-v2');
    const savedTheme: Theme = rawSavedTheme === 'dark' ? 'dark' : 'light';
    if (rawSavedTheme && rawSavedTheme !== savedTheme) {
      try {
        localStorage.setItem('medusa-theme-v2', savedTheme);
      } catch {
        // Fallback para storage restrito
      }
    }
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
    doc.classList.remove('light', 'dark');
    doc.classList.add(t === 'dark' ? 'dark' : 'light');

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

  const getNotificationPriority = (notif: IslandNotification): number => {
    if (notif.state === 'attention' || notif.state === 'error') return 3;
    if (notif.state === 'success') return 2;
    return 1;
  };

  const processNextInQueue = useCallback(() => {
    if (notificationQueueRef.current.length === 0) {
      setIslandNotification(null);
      setIslandState('active');
      currentNotificationPriorityRef.current = 0;
      currentNotificationStartTimeRef.current = 0;
      return;
    }

    const nextNotification = notificationQueueRef.current.shift()!;
    currentNotificationPriorityRef.current = getNotificationPriority(nextNotification);
    currentNotificationStartTimeRef.current = Date.now();
    setIslandNotification(nextNotification);
    if (nextNotification.state) {
      setIslandState(nextNotification.state);
    }

    const duration = Math.max(1400, nextNotification.durationMs || 1800);
    notificationTimerRef.current = setTimeout(() => {
      processNextInQueue();
    }, duration);
  }, []);

  const triggerIslandNotification = useCallback(
    (notification: IslandNotification) => {
      const newPriority = getNotificationPriority(notification);
      const now = Date.now();
      const elapsedTime = now - currentNotificationStartTimeRef.current;
      const MIN_DISPLAY_TIME = 1000;

      // Se não há notificação ativa ou a notificação anterior já durou o tempo mínimo
      if (!currentNotificationStartTimeRef.current || elapsedTime >= MIN_DISPLAY_TIME) {
        if (newPriority >= currentNotificationPriorityRef.current || !currentNotificationStartTimeRef.current) {
          if (notificationTimerRef.current) {
            clearTimeout(notificationTimerRef.current);
          }
          currentNotificationPriorityRef.current = newPriority;
          currentNotificationStartTimeRef.current = now;
          setIslandNotification(notification);
          if (notification.state) {
            setIslandState(notification.state);
          }
          const duration = Math.max(1400, notification.durationMs || 1800);
          notificationTimerRef.current = setTimeout(() => {
            processNextInQueue();
          }, duration);
          return;
        }
      }

      // Se a nova notificação é de alta prioridade (ex: alerta/atenção) e a atual é de baixo contexto
      if (newPriority > currentNotificationPriorityRef.current && currentNotificationPriorityRef.current === 1) {
        if (notificationTimerRef.current) {
          clearTimeout(notificationTimerRef.current);
        }
        currentNotificationPriorityRef.current = newPriority;
        currentNotificationStartTimeRef.current = now;
        setIslandNotification(notification);
        if (notification.state) {
          setIslandState(notification.state);
        }
        const duration = Math.max(1400, notification.durationMs || 1800);
        notificationTimerRef.current = setTimeout(() => {
          processNextInQueue();
        }, duration);
        return;
      }

      // Caso contrário, enfileira com limite para evitar acúmulo desnecessário
      if (notificationQueueRef.current.length < 3) {
        notificationQueueRef.current.push(notification);
      }
    },
    [processNextInQueue]
  );

  const setActiveRoute = useCallback((route: string) => {
    setActiveRouteState(route);
    setDrawerOpenState(false);
    try {
      localStorage.setItem('medusa-active-route', route);
      if (typeof window !== 'undefined') {
        window.location.hash = route;
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const validRoutes = ['hoje', 'agenda', 'educacao', 'corpo', 'financas', 'progresso'];
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash && validRoutes.includes(hash)) {
        setActiveRouteState(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
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
        islandNotification,
        triggerIslandNotification,
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
