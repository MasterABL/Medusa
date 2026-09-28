'use client';

import React from 'react';
import { FinancasContextPanel } from './financas/FinancasContextPanel';
import { CorpoContextPanel } from './corpo/CorpoContextPanel';

/** Título do painel por domínio — também é o que diz ao Shell que a rota tem painel próprio. */
export const DOMAIN_PANEL_TITLE: Record<string, string> = {
  financas: 'Contexto financeiro',
  corpo: 'Contexto do corpo',
};

export function DomainContextPanel({ route }: { route: string }) {
  switch (route) {
    case 'financas':
      return <FinancasContextPanel />;
    case 'corpo':
      return <CorpoContextPanel />;
    default:
      return null;
  }
}
