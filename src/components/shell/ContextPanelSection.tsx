'use client';

import React from 'react';

interface ContextPanelSectionProps {
  label: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  noBorder?: boolean;
}

/**
 * Bloco de seção padrão do Context Panel — rótulo mono uppercase + divisor + conteúdo.
 * Extraído para ser reaproveitado pelos painéis específicos por trilha/área (Inglês/ENEM/
 * Faculdade/Hoje), em vez de cada um reimplementar o mesmo cabeçalho de seção.
 */
export function ContextPanelSection({ label, rightSlot, children, noBorder }: ContextPanelSectionProps) {
  return (
    <div className={`space-y-2 ${noBorder ? '' : 'pb-6 border-b border-border/60'}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">{label}</span>
        {rightSlot}
      </div>
      {children}
    </div>
  );
}
