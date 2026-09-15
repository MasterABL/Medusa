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
