'use client';

import React from 'react';
import { FinancasContextPanel } from './financas/FinancasContextPanel';
import { CorpoContextPanel } from './corpo/CorpoContextPanel';
import { GuardianContextPanel } from './guardian/GuardianContextPanel';
import { GmailContextPanel } from './gmail/GmailContextPanel';
import { EspiritualContextPanel } from './espiritual/EspiritualContextPanel';

/** Título do painel por domínio — também é o que diz ao Shell que a rota tem painel próprio. */
export const DOMAIN_PANEL_TITLE: Record<string, string> = {
  financas: 'Contexto financeiro',
  corpo: 'Contexto do corpo',
  guardian: 'Investigação',
  espiritual: 'Contexto espiritual',
  gmail: 'Contexto do Gmail',
};

export function DomainContextPanel({ route }: { route: string }) {
  switch (route) {
    case 'financas':
      return <FinancasContextPanel />;
    case 'corpo':
      return <CorpoContextPanel />;
    case 'guardian':
      return <GuardianContextPanel />;
    case 'espiritual':
      return <EspiritualContextPanel />;
    case 'gmail':
      return <GmailContextPanel />;
    default:
      return null;
  }
}
