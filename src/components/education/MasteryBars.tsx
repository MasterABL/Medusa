'use client';

import React from 'react';
import { MasteryDomain } from './types';

interface MasteryBarsProps {
  domains: MasteryDomain[];
}

/**
 * Visualização de domínio/mastery compartilhada pelas 3 trilhas (ver DESIGN.md §2/§12): barras
 * horizontais coloridas por faixa de percentual, nunca só o número em texto. Cores semânticas —
 * `support` para domínio consolidado, `accent` para faixa intermediária (pede atenção/revisão),
 * nunca vermelho aqui (não é um alerta, é progresso).
 */
export function MasteryBars({ domains }: MasteryBarsProps) {
  if (domains.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {domains.map((domain) => {
        const barColorClass = domain.percent >= 70 ? 'bg-medusa-support' : 'bg-medusa-accent';
        return (
          <div key={domain.id} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-medium text-text-primary">{domain.label}</span>
              <span className="text-[11px] font-mono text-text-muted tabular-nums">{domain.percent}%</span>
            </div>
            <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
              <div
                className={`${barColorClass} h-full rounded-full transition-all duration-500`}
                style={{ width: `${domain.percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
