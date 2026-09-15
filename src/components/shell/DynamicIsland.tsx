'use client';

import React from 'react';
import { useShell } from '@/context/ShellContext';
import { ISLAND_FIXTURES } from '@/fixtures/islandFixtures';

export function DynamicIsland() {
  const { islandState, isQuiet, setIslandState, breakpoint } = useShell();
  const fixture = ISLAND_FIXTURES[islandState] || ISLAND_FIXTURES.active;

  const isExpanded = islandState !== 'collapsed';
  const isFocusMode = islandState === 'focus';
  const isCollapsed = islandState === 'collapsed';
  const isMobile = breakpoint === 'mobile';

  // Dynamic animation class based on semantic state
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

  // Badge color mapping according to canonical palette with strict 5% chromacity
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

  const getPrimaryActionStyle = (variant?: string) => {
    switch (variant) {
      case 'accent':
        return 'bg-medusa-accent text-[#1C2420] hover:opacity-90';
      case 'tertiary':
        return 'bg-medusa-tertiary text-[#1C2420] hover:opacity-90';
      case 'secondary':
        return 'bg-surface-secondary text-text-primary hover:bg-border/60 border border-border/60';
      case 'primary':
      default:
        return 'bg-medusa-primary text-[#1C2420] hover:opacity-90 active:scale-[0.985]';
    }
  };

  // Indicator dot with specific living motion per state
  const renderIndicator = () => {
    if (isCollapsed) {
      return (
        <span className="relative flex items-center justify-center h-2.5 w-2.5 flex-shrink-0" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-medusa-primary living-pulse" />
        </span>
      );
    }

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

  const showDesc = Boolean(fixture.desc && !isFocusMode && !isCollapsed && !isMobile);
  const showBadge = Boolean(fixture.timerBadge && !isFocusMode && !isCollapsed);
  const showActions = Boolean(!isMobile && !isFocusMode && !isCollapsed && (fixture.primaryAction || fixture.secondaryAction));
  const showDivider = showActions;
  const showTitle = !isCollapsed;

  return (
    <div className="justify-self-center z-10 max-w-full" id="island-wrapper">
      <section
        id="island-capsule"
        role="region"
        aria-label="Camada Contextual Island"
        aria-expanded={isExpanded}
        className={`island-fluid-capsule flex items-center bg-surface/95 dark:bg-surface/90 backdrop-blur-md border border-border/70 dark:border-border/60 rounded-full shadow-island dark:shadow-island-dark hover:border-medusa-primary/40 cursor-pointer select-none max-w-[92vw] overflow-hidden ${
          isCollapsed
            ? 'w-[34px] h-[34px] min-w-[34px] justify-center p-0 gap-0'
            : 'px-3.5 py-1.5 gap-2 sm:gap-2.5 min-w-[120px]'
        } ${isQuiet ? 'island-quiet' : ''} ${getStateAnimationClass()}`}
        onClick={() => {
          if (isCollapsed) setIslandState('active');
        }}
      >
        {/* Living OS: Micro-sinal de vida orgânico calibrado */}
        {renderIndicator()}

        {/* Title Group with Fluid Crossfade */}
        <div
          className={`island-collapsible flex items-center gap-1.5 sm:gap-2 text-[12px] sm:text-[13px] overflow-hidden ${
            showTitle ? 'island-item-in max-w-[320px]' : 'island-item-out max-w-0 pointer-events-none'
          }`}
          id="island-title-group"
        >
          <span
            key={fixture.tag}
            className="font-medium text-text-primary tracking-tight whitespace-nowrap island-content-swap"
            id="island-state-tag"
          >
            {isMobile && fixture.tag.length > 12 ? `${fixture.tag.slice(0, 12)}…` : fixture.tag}
          </span>
          {/* Subtitle / Descrição Marginal */}
          <div
            className={`island-collapsible flex items-center overflow-hidden whitespace-nowrap ${
              showDesc ? 'island-item-in max-w-[180px]' : 'island-item-out max-w-0 pointer-events-none'
            }`}
          >
            <span className="text-text-muted mr-1.5 hidden 2xl:inline" aria-hidden="true">·</span>
            <span className="text-text-secondary text-[12px] truncate max-w-[140px] hidden 2xl:inline" id="island-desc-text">
              {fixture.desc}
            </span>
          </div>
        </div>

        {/* Timer / Status Badge */}
        <div
          className={`island-collapsible flex items-center overflow-hidden flex-shrink-0 ${
            showBadge ? 'island-item-in max-w-[120px]' : 'island-item-out max-w-0 pointer-events-none'
          }`}
        >
          {fixture.timerBadge && (
            <span
              id="island-timer-badge"
              className={`font-mono text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums flex-shrink-0 ${getBadgeStyle()}`}
            >
              {fixture.timerBadge}
            </span>
          )}
        </div>

        {/* Divider */}
        <div
          id="island-divider"
          aria-hidden="true"
          className={`island-collapsible h-3.5 bg-border/60 overflow-hidden flex-shrink-0 ${
            showDivider ? 'island-item-in w-px mx-0.5' : 'island-item-out w-0 mx-0 pointer-events-none'
          }`}
        />

        {/* Inline Actions (em telas desktop/tablet) */}
        <div
          id="island-actions-group"
          className={`island-collapsible flex items-center gap-1.5 flex-shrink-0 overflow-hidden ${
            showActions ? 'island-item-in max-w-[240px]' : 'island-item-out max-w-0 pointer-events-none'
          }`}
        >
          {fixture.secondaryAction && (
            <button
              type="button"
              className="btn-interactive hidden 2xl:inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setIslandState('idle');
              }}
            >
              {fixture.secondaryAction.label}
            </button>
          )}

          {fixture.primaryAction && (
            <button
              type="button"
              className={`btn-interactive px-2 py-0.5 rounded-full text-[11px] font-medium transition-all flex items-center gap-1 shadow-sm focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex-shrink-0 ${getPrimaryActionStyle(
                fixture.primaryAction.variant
              )}`}
              onClick={(e) => {
                e.stopPropagation();
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
              {fixture.primaryAction.icon ? (
                <span className="material-symbols-outlined text-[13px]">
                  {fixture.primaryAction.icon}
                </span>
              ) : null}
              <span>{fixture.primaryAction.label}</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
