export type Theme = 'light' | 'sepia' | 'dark';

export type ShellMode = 'amplo' | 'compacto' | 'foco';

export type IslandState =
  | 'idle'
  | 'context'
  | 'active'
  | 'processing'
  | 'success'
  | 'attention'
  | 'error'
  | 'summary'
  | 'focus'
  | 'collapsed';

export interface IslandFixture {
  state: IslandState;
  num: number;
  label: string;
  signature: string;
  tag: string;
  desc: string;
  timerBadge?: string;
  badgeType?: 'primary' | 'secondary' | 'accent' | 'support' | 'tertiary' | 'muted';
  primaryAction?: {
    label: string;
    icon?: string;
    variant: 'primary' | 'accent' | 'tertiary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    variant: 'ghost' | 'secondary';
  };
  returnBehavior: string;
}

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export const SHELL_DIMENSIONS = {
  SIDEBAR_WIDE: 240,
  SIDEBAR_COMPACT: 68,
  SIDEBAR_CLOSED: 0,
  CONTEXT_WIDE: 320,
  CONTEXT_COMPACT: 260,
  CONTEXT_CLOSED: 0,
} as const;

export interface ShellGeometry {
  sidebarWidth: number;
  contextWidth: number;
  effectiveContextWidth: number;
  isContextOpen: boolean;
  isContextAvailable: boolean;
  isContextVisible: boolean;
  contentPaddingLeft: string;
  contentPaddingRight: string;
  headerStyle: { left: string; right: string };
  mainPaddingStyle: { paddingLeft: string; paddingRight: string };
}

export function calculateShellGeometry(
  mode: ShellMode,
  breakpoint: Breakpoint,
  isContextOpen: boolean
): ShellGeometry {
  const isDesktop = breakpoint === 'desktop';
  const isTablet = breakpoint === 'tablet';
  const isMobile = breakpoint === 'mobile';
  const isFocus = mode === 'foco';
  const isCompact = mode === 'compacto';

  // 1. Largura calculada da sidebar permanente
  let sidebarWidth: number = SHELL_DIMENSIONS.SIDEBAR_WIDE;
  if (isFocus || isMobile) {
    sidebarWidth = SHELL_DIMENSIONS.SIDEBAR_CLOSED;
  } else if (isTablet || isCompact) {
    sidebarWidth = SHELL_DIMENSIONS.SIDEBAR_COMPACT;
  }

  // 2. Largura nominal do painel regional de acordo com o modo
  const contextWidth = isCompact
    ? SHELL_DIMENSIONS.CONTEXT_COMPACT
    : SHELL_DIMENSIONS.CONTEXT_WIDE;

  // 3. Disponibilidade e Visibilidade do Context Panel
  // No Foco, Tablet ou Mobile, o Context Panel permanece 100% fora da composição
  const isContextAvailable = isDesktop && !isFocus;
  const isContextVisible = isContextAvailable && isContextOpen;

  // 4. Largura efetiva ocupada no layout (refluxo real do conteúdo)
  const effectiveContextWidth = isContextVisible
    ? contextWidth
    : SHELL_DIMENSIONS.CONTEXT_CLOSED;

  const contentPaddingLeft = `${sidebarWidth}px`;
  const contentPaddingRight = `${effectiveContextWidth}px`;

  return {
    sidebarWidth,
    contextWidth,
    effectiveContextWidth,
    isContextOpen,
    isContextAvailable,
    isContextVisible,
    contentPaddingLeft,
    contentPaddingRight,
    headerStyle: {
      left: contentPaddingLeft,
      right: contentPaddingRight,
    },
    mainPaddingStyle: {
      paddingLeft: contentPaddingLeft,
      paddingRight: contentPaddingRight,
    },
  };
}
