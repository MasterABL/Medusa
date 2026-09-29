'use client';

import React from 'react';
import type { FinanceView } from './financeView';
import { FinancialFlowDiagram } from './FinancialFlowDiagram';

/**
 * Diagrama de distribuição em fluxo: substitui a barra simplória anterior por
 * uma linguagem visual autêntica de fluxo financeiro, mantendo total compatibilidade
 * com as views existentes de Finanças.
 */
export function FlowBar({
  view,
  morph = false,
  simulatedExpense = 0,
}: {
  view: FinanceView;
  morph?: boolean;
  simulatedExpense?: number;
}) {
  return (
    <div style={morph ? { viewTransitionName: 'dm-flow' } : undefined}>
      <FinancialFlowDiagram view={view} simulatedExpense={simulatedExpense} />
    </div>
  );
}

