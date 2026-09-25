'use client';

import React, { useState } from 'react';

export type IconSemanticType =
  | 'play'
  | 'pause'
  | 'check'
  | 'check_circle'
  | 'close'
  | 'error'
  | 'upload'
  | 'logout'
  | 'mic'
  | 'volume'
  | 'volume_off'
  | 'refresh'
  | 'settings'
  | 'tutor'
  | 'calendar'
  | 'calendar_month'
  | 'search'
  | 'bookmark'
  | 'school'
  | 'science'
  | 'auto_stories'
  | 'psychology'
  | 'flag'
  | 'functions'
  | 'analytics'
  | 'bolt'
  | 'info'
  | 'motion_mode'
  | 'speed'
  | 'layers'
  | 'tune'
  | 'arrow_forward'
  | 'arrow_back'
  | 'waves'
  | 'record_voice_over'
  | 'verified';

export type IconSemanticState =
  | 'idle'
  | 'hover'
  | 'pressed'
  | 'active'
  | 'success'
  | 'error'
  | 'loading';

export interface AnimatedIconProps {
  name: IconSemanticType;
  state?: IconSemanticState;
  size?: number;
  className?: string;
  interactive?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  ariaLabel?: string;
}

const GLYPH_MAP: Record<IconSemanticType, string> = {
  play: 'play_arrow',
  pause: 'pause',
  check: 'check',
  check_circle: 'check_circle',
  close: 'close',
  error: 'error',
  upload: 'upload_file',
  logout: 'logout',
  mic: 'mic',
  volume: 'volume_up',
  volume_off: 'volume_off',
  refresh: 'refresh',
  settings: 'settings',
  tutor: 'neurology',
  calendar: 'calendar_month',
  calendar_month: 'calendar_month',
  search: 'search',
  bookmark: 'bookmark',
  school: 'school',
  science: 'science',
  auto_stories: 'auto_stories',
  psychology: 'psychology',
  flag: 'flag',
  functions: 'functions',
  analytics: 'analytics',
  bolt: 'bolt',
  info: 'info',
  motion_mode: 'motion_mode',
  speed: 'speed',
  layers: 'layers',
  tune: 'tune',
  arrow_forward: 'arrow_forward',
  arrow_back: 'arrow_back',
  waves: 'waves',
  record_voice_over: 'record_voice_over',
  verified: 'verified',
};

/**
 * AnimatedIcon — Sistema de Icon Motion Semântico do Medusa (Human Visual Gate 2)
 *
 * Cada glifo possui comportamento físico e semântico próprio:
 * - Play/Pause: morphing direcional e elastic settle
 * - Check: desenho vetorial dinâmico e spring settle
 * - Error/Close: micro-shake horizontal balístico
 * - Upload: impulso vertical balístico
 * - Logout: nudge de recuo horizontal
 * - Mic: expansão de onda acústica com brilho luminescente
 * - Refresh/Settings: rotação elástica rápida
 * - Tutor: luminescência cognitiva pulsante
 * - Calendar: micro-tilt de página
 * - Volume: expansão acústica
 * - Arrow: avanço direcional
 */
export function AnimatedIcon({
  name,
  state = 'idle',
  size = 20,
  className = '',
  interactive = false,
  onClick,
  title,
  ariaLabel,
}: AnimatedIconProps) {
  const [internalState, setInternalState] = useState<IconSemanticState>(state);
  const effectiveState = state !== 'idle' ? state : internalState;

  // Resolução de classes de animação semântica baseada no par (name, state)
  const getMotionClass = (): string => {
    if (effectiveState === 'error' || name === 'error') {
      return 'shake-error text-medusa-alert';
    }
    if (effectiveState === 'success' || name === 'check' || name === 'check_circle' || name === 'verified') {
      return 'icon-motion-check text-medusa-support';
    }

    switch (name) {
      case 'play':
        if (effectiveState === 'active' || effectiveState === 'pressed') return 'icon-motion-play';
        return 'icon-animate-on-hover';
      case 'pause':
        if (effectiveState === 'active' || effectiveState === 'pressed') return 'icon-motion-pause';
        return 'icon-animate-on-hover';
      case 'upload':
        if (effectiveState === 'hover' || effectiveState === 'active') return 'icon-motion-upload';
        return 'icon-animate-on-hover';
      case 'logout':
        if (effectiveState === 'hover' || effectiveState === 'active') return 'icon-motion-logout';
        return 'icon-animate-nudge-left';
      case 'mic':
        if (effectiveState === 'active') return 'icon-motion-mic text-medusa-primary';
        return 'icon-animate-on-hover';
      case 'refresh':
        if (effectiveState === 'active' || effectiveState === 'pressed') return 'icon-motion-rotate';
        return 'icon-animate-rotate';
      case 'settings':
        if (effectiveState === 'hover' || effectiveState === 'active') return 'icon-motion-settings';
        return 'icon-animate-rotate';
      case 'tutor':
        if (effectiveState === 'active') return 'icon-motion-tutor text-medusa-primary';
        return 'icon-animate-on-hover';
      case 'calendar':
      case 'calendar_month':
        if (effectiveState === 'hover' || effectiveState === 'active') return 'icon-motion-calendar';
        return 'icon-animate-on-hover';
      case 'volume':
      case 'volume_off':
        if (effectiveState === 'hover' || effectiveState === 'active') return 'icon-motion-volume';
        return 'icon-animate-on-hover';
      case 'arrow_forward':
        if (effectiveState === 'hover' || effectiveState === 'active') return 'icon-motion-arrow';
        return 'icon-animate-advance';
      case 'arrow_back':
        return 'icon-animate-nudge-left';
      default:
        return 'icon-animate-on-hover';
    }
  };

  const glyph = GLYPH_MAP[name] || name;

  return (
    <span
      className={`inline-flex items-center justify-center select-none transition-all duration-200 ${
        interactive ? 'cursor-pointer active:scale-95' : ''
      } ${getMotionClass()} ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => interactive && setInternalState('hover')}
      onMouseLeave={() => interactive && setInternalState('idle')}
      onMouseDown={() => interactive && setInternalState('pressed')}
      onMouseUp={() => interactive && setInternalState('hover')}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <span
        className="material-symbols-outlined leading-none"
        style={{ fontSize: `${size}px` }}
      >
        {glyph}
      </span>
    </span>
  );
}
