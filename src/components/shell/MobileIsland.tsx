'use client';

import React, { useState, useEffect } from 'react';
import { useShell } from '@/context/ShellContext';
import { ISLAND_FIXTURES } from '@/fixtures/islandFixtures';

export function MobileIsland() {
  const { islandState, setIslandState, isQuiet } = useShell();
  const fixture = ISLAND_FIXTURES[islandState] || ISLAND_FIXTURES.active;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  // Monitorar foco de inputs globalmente para contração sob teclado virtual
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        setIsKeyboardActive(true);
        setIsExpanded(false);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        setIsKeyboardActive(false);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Animação dinâmica por estado
  const getStateAnimationClass = () => {
    switch (islandState) {
      case 'processing':
        return 'island-processing-active';
      case 'attention':
        return 'island-attention-active';
      case 'error':
        return 'island-error-shake';
      case 'success':
        return 'island-success-settle';
      case 'idle':
        return 'living-pulse';
      default:
        return '';
    }
  };

  const getBadgeStyle = () => {
    switch (fixture.badgeType) {
      case 'primary':
        return 'text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 border border-[#71DBD2]/30';
      case 'secondary':
        return 'text-[#343A36] dark:text-[#EEFFDB] bg-[#EEFFDB]/60 dark:bg-[#EEFFDB]/15 border border-[#ADE4B5]/40';
      case 'accent':
        return 'text-[#614E00] dark:text-[#FFF18C] bg-[#FFF18C]/20 border border-[#FFF18C]/35';
      case 'support':
        return 'text-[#1B502C] dark:text-[#ADE4B5] bg-[#ADE4B5]/20 border border-[#ADE4B5]/35';
      case 'tertiary':
        return 'text-[#3D4C1D] dark:text-[#D0EAA3] bg-[#D0EAA3]/20 border border-[#D0EAA3]/35';
      default:
        return 'text-text-muted bg-surface-secondary border border-border/60';
    }
  };

  const renderIndicator = () => {
    if (islandState === 'processing') {
      return (
        <span className="relative flex items-center justify-center h-2.5 w-2.5 flex-shrink-0" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-medusa-accent living-pulse" />
        </span>
      );
    }
    if (islandState === 'attention') {
      return (
        <span className="relative flex h-2 w-2 flex-shrink-0" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-medusa-accent" />
        </span>
      );
    }
    if (islandState === 'error') {
      return (
        <span className="relative flex h-2 w-2 flex-shrink-0" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-medusa-tertiary" />
        </span>
      );
    }
    if (islandState === 'success') {
      return (
        <span className="relative flex h-2 w-2 flex-shrink-0" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-medusa-support" />
        </span>
      );
    }
    return (
      <span className="relative flex h-2 w-2 flex-shrink-0" aria-hidden="true">
        <span className="inline-flex rounded-full h-2 w-2 bg-medusa-primary living-pulse" />
      </span>
    );
  };

  const handleToggle = () => {
    if (isKeyboardActive) return;
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className="w-full flex flex-col items-center select-none" id="mobile-island-container">
      <div
        id="mobile-dynamic-island"
        role="region"
        aria-label="Mobile Dynamic Island"
        aria-expanded={isExpanded}
        onClick={handleToggle}
        style={{
          minWidth: isKeyboardActive ? '68px' : isExpanded ? '300px' : '136px',
          minHeight: '44px',
          transition: 'all var(--duration-mobile) var(--ease-snappy)',
        }}
        className={`bg-surface/95 dark:bg-surface/90 backdrop-blur-md text-text-primary px-3.5 py-2 border border-border/70 dark:border-border/60 shadow-island dark:shadow-island-dark flex items-center justify-center cursor-pointer active:scale-[0.99] ${
          isExpanded ? 'rounded-2xl' : 'rounded-full'
        } ${isQuiet ? 'island-quiet' : ''} ${getStateAnimationClass()}`}
      >
        {isKeyboardActive ? (
          /* Estado Contraído sob Teclado Virtual: 68px de assinatura mínima */
          <div className="flex items-center gap-1.5 py-0.5">
            {renderIndicator()}
            <span className="text-[11px] font-mono text-medusa-primary font-bold tabular-nums">
              {fixture.timerBadge || fixture.tag}
            </span>
          </div>
        ) : isExpanded ? (
          /* Estado Expandido: Ações táteis completas com touch targets ≥ 44px */
          <div className="flex flex-col gap-2.5 w-full py-1 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {renderIndicator()}
                <span className="text-[13px] font-semibold text-text-primary tracking-tight">
                  {fixture.tag}
                </span>
              </div>
              {fixture.timerBadge && (
                <span className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${getBadgeStyle()}`}>
                  {fixture.timerBadge}
                </span>
              )}
            </div>

            {fixture.desc && (
              <p className="text-[12px] text-text-secondary leading-snug">
                {fixture.desc}
              </p>
            )}

            {/* Ações com Touch Targets Mínimos de 44px */}
            <div className="flex items-center gap-2 mt-1">
              {fixture.secondaryAction && (
                <button
                  type="button"
                  className="btn-interactive flex-1 h-11 rounded-xl bg-surface-secondary hover:bg-surface-subtle text-[12px] font-medium text-text-secondary hover:text-text-primary border border-border/60 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                    setIslandState('idle');
                  }}
                >
                  {fixture.secondaryAction.label}
                </button>
              )}

              {fixture.primaryAction && (
                <button
                  type="button"
                  className="btn-interactive flex-1 h-11 rounded-xl bg-medusa-primary hover:opacity-90 active:scale-[0.985] text-[#1C2420] text-[12px] font-semibold flex items-center justify-center gap-1.5 shadow-sm focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                    if (islandState === 'active') {
                      setIslandState('success');
                    } else if (islandState === 'idle') {
                      setIslandState('active');
                    } else if (islandState === 'error') {
                      setIslandState('processing');
                    } else if (islandState === 'attention') {
                      setIslandState('context');
                    } else {
                      setIslandState('active');
                    }
                  }}
                >
                  {fixture.primaryAction.icon && (
                    <span className="material-symbols-outlined text-[15px]">
                      {fixture.primaryAction.icon}
                    </span>
                  )}
                  <span>{fixture.primaryAction.label}</span>
                </button>
              )}

              <button
                type="button"
                aria-label="Recolher Island"
                className="btn-interactive w-11 h-11 rounded-xl bg-surface-secondary text-text-muted hover:text-text-primary border border-border/60 flex items-center justify-center flex-shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>
        ) : (
          /* Estado Minimal de Repouso (Pill fluido) */
          <div className="flex items-center gap-2 py-0.5">
            {renderIndicator()}
            <span className="text-[12px] font-medium text-text-primary tracking-tight whitespace-nowrap">
              {fixture.tag}
            </span>
            {fixture.timerBadge && (
              <span className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums ${getBadgeStyle()}`}>
                {fixture.timerBadge}
              </span>
            )}
            <span className="material-symbols-outlined text-[14px] text-text-muted ml-0.5">
              expand_more
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
