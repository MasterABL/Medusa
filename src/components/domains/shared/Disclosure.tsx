'use client';

import React, { useId, useState } from 'react';

interface DisclosureProps {
  /** Conteúdo do botão que abre/fecha (sempre visível). */
  summary: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  buttonClassName?: string;
  regionClassName?: string;
  /** Rótulo acessível do botão quando o summary não é texto legível sozinho. */
  ariaLabel?: string;
  /** Mostra o chevron à direita do summary. */
  chevron?: boolean;
}

/**
 * Expansão progressiva acessível: botão com `aria-expanded`/`aria-controls`, região rotulada e —
 * fechada — fora da árvore de foco (`inert`), para o Tab nunca cair em conteúdo invisível.
 * A altura anima por `grid-template-rows` (0fr → 1fr), sem medir DOM; com movimento reduzido a
 * regra global zera a transição.
 */
export function Disclosure({
  summary,
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  className = '',
  buttonClassName = '',
  regionClassName = '',
  ariaLabel,
  chevron = true,
}: DisclosureProps) {
  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;
  const uid = useId();
  const regionId = `${uid}-region`;

  const toggle = () => {
    const next = !isOpen;
    if (open === undefined) setInner(next);
    onOpenChange?.(next);
  };

  return (
    <div className={className} data-open={isOpen ? 'true' : 'false'}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={regionId}
        aria-label={ariaLabel}
        onClick={toggle}
        className={`dm-disclosure-btn ${buttonClassName}`}
      >
        <span className="min-w-0 flex-1 text-left">{summary}</span>
        {chevron && (
          <span className={`material-symbols-outlined dm-chevron ${isOpen ? 'is-open' : ''}`} aria-hidden="true">
            expand_more
          </span>
        )}
      </button>
      <div id={regionId} role="region" className="dm-region" data-open={isOpen ? 'true' : 'false'} {...(isOpen ? {} : ({ inert: '' } as object))}>
        <div className="dm-region-inner">
          <div className={regionClassName}>{children}</div>
        </div>
      </div>
    </div>
  );
}
