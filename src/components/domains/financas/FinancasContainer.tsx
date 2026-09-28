'use client';

import React from 'react';
import '../financas/financas.css';
import { useDomainEntry } from '../shared/useDomainEntry';
import { runTransition } from '../shared/viewTransition';
import { FinancasEntrada } from './FinancasEntrada';
import { FinancasHome } from './FinancasHome';
import { getFinanceSession } from './financeSession';

export function FinancasContainer() {
  const { phase, complete, replay } = useDomainEntry('financas');
  // Garante o repositório antes de qualquer leitura.
  React.useMemo(() => getFinanceSession(), []);

  if (phase === 'loading') return <div className="dm-root" aria-busy="true" />;
  if (phase === 'first') return <FinancasEntrada onContinue={() => runTransition(complete)} />;
  return <FinancasHome onReplayIntro={() => runTransition(replay)} />;
}
