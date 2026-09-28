'use client';

import React from 'react';
import { FinancasContextPanel } from './financas/FinancasContextPanel';
import { CorpoContextPanel } from './corpo/CorpoContextPanel';
import { GuardianContextPanel } from './guardian/GuardianContextPanel';

/** Título do painel por domínio — também é o que diz ao Shell que a rota tem painel próprio. */
export const DOMAIN_PANEL_TITLE: Record<string, string> = {
  financas: 'Contexto financeiro',
  corpo: 'Contexto do corpo',
  guardian: 'Investigação',
};

export function DomainContextPanel({ route }: { route: string }) {
  switch (route) {
    case 'financas':
      return <FinancasContextPanel />;
    case 'corpo':
      return <CorpoContextPanel />;
    case 'guardian':
      return <GuardianContextPanel />;
    default:
      return null;
  }
}
