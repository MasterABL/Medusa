'use client';

import React from 'react';
import { FinancasContextPanel } from './financas/FinancasContextPanel';

/** Título do painel por domínio — também é o que diz ao Shell que a rota tem painel próprio. */
export const DOMAIN_PANEL_TITLE: Record<string, string> = {
  financas: 'Contexto financeiro',
};

export function DomainContextPanel({ route }: { route: string }) {
  switch (route) {
    case 'financas':
      return <FinancasContextPanel />;
    default:
      return null;
  }
}
