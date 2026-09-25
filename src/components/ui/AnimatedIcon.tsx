'use client';

import React, { useState } from 'react';

export type IconSemanticType =
  | 'play'
  | 'pause'
  | 'check'
  | 'check_circle'
  | 'close'
  | 'upload'
  | 'mic'
  | 'volume'
  | 'volume_off'
  | 'refresh'
  | 'tutor'
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
  | 'tune';

export type IconSemanticState =
  | 'idle'
  | 'hover'
  | 'pressed'
  | 'active'
  | 'success'
  | 'error'
  | 'loading';

interface AnimatedIconProps {
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
  upload: 'upload_file',
  mic: 'mic',
  volume: 'volume_up',
  volume_off: 'volume_off',
  refresh: 'refresh',
  tutor: 'neurology',
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
};

/**
 * AnimatedIcon — Sistema de Icon Motion Semântico do Medusa (Round Expansão de Experiência)
 *
 * Em vez de animações arbitrárias de scale, cada ícone responde de acordo com sua função física:
 * - Play/Pause: expansão elástica direcional
 * - Check: desenho vetorial e settle suave
 * - Error/Close: micro-shake horizontal de precisão
 * - Upload: pulso vertical direcional
 * - Mic: pulso acústico contínuo quando ativo
 * - Refresh: rotação elástica rápida
 * - Tutor: luminescência sutil
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
    if (effectiveState === 'error') return 'shake-error text-medusa-alert';
    if (effectiveState === 'success' || name === 'check') return 'icon-motion-check text-medusa-support';

    switch (name) {
      case 'play':
        return effectiveState === 'active' || effectiveState === 'pressed' ? 'icon-motion-play' : '';
      case 'upload':
        return effectiveState === 'hover' || effectiveState === 'active' ? 'icon-motion-upload' : '';
      case 'mic':
        return effectiveState === 'active' ? 'icon-motion-mic text-medusa-primary' : '';
      case 'refresh':
        return effectiveState === 'active' || effectiveState === 'pressed' ? 'icon-motion-rotate' : '';
      case 'tutor':
        return effectiveState === 'active' ? 'icon-motion-tutor text-medusa-primary' : '';
      default:
        return '';
    }
  };

  const glyph = GLYPH_MAP[name] || name;

  return (
    <span
      className={`inline-flex items-center justify-center select-none transition-transform duration-200 ${
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
