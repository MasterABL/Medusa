'use client';

import React from 'react';
import type { DataProvenance } from '@/lib/dataMode';

/**
 * Selo de procedência. Existe por um motivo só: o usuário nunca pode confundir
 * dado de exemplo, integração bloqueada ou estado parcial com dado dele.
 * Usa apenas tokens existentes (sem cor nova, sem variante nova do design system).
 */
const LABEL: Record<DataProvenance, string> = {
  real: 'Seus dados',
  fixture: 'Dados de exemplo',
  empty: 'Sem dados',
  partial: 'Parcial',
  blocked: 'Requer conexão',
};

const ICON: Record<DataProvenance, string> = {
  real: 'verified',
  fixture: 'science',
  empty: 'inbox',
  partial: 'contrast',
  blocked: 'link_off',
};

export function ProvenanceBadge({ kind, detail, className = '' }: { kind: DataProvenance; detail?: string; className?: string }) {
  return (
    <span
      data-provenance={kind}
      title={detail}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border/70 bg-surface-secondary/60 text-[10px] font-mono font-semibold uppercase tracking-wider text-text-secondary ${className}`}
    >
      <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
        {ICON[kind]}
      </span>
      <span>{LABEL[kind]}</span>
      {detail && <span className="normal-case font-normal tracking-normal text-text-muted hidden sm:inline">· {detail}</span>}
    </span>
  );
}
