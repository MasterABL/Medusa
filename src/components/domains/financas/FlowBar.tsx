'use client';

import React from 'react';
import { brl } from '../shared/format';
import type { FinanceView } from './financeView';

/**
 * Diagrama de distribuição em fluxo: as entradas do mês repartidas em gasto realizado, contas que
 * faltam pagar e sobra. Se o mês fecha no vermelho, a barra deixa de fingir uma sobra: mostra o
 * quanto falta cobrir, em tom de alerta.
 */
export function FlowBar({ view, morph = false }: { view: FinanceView; morph?: boolean }) {
  const total = Math.max(view.income, view.spent + view.billsTotal, 1);
  const overdrawn = view.free < 0;
  const seg = [
    { key: 'gasto', label: 'Já gasto', value: view.spent, tone: 'spent' },
    { key: 'pagar', label: 'Falta pagar', value: view.billsTotal, tone: 'bills' },
    ...(overdrawn ? [] : [{ key: 'livre', label: 'Sobra do mês', value: view.free, tone: 'free' }]),
  ];
  const sum = seg.reduce((s, x) => s + x.value, 0);

  return (
    <div>
      <div
        className="fin-flow"
        role="img"
        aria-label={`Das entradas de ${brl(view.income)}: ${brl(view.spent)} já gastos, ${brl(view.billsTotal)} a pagar${overdrawn ? `, faltam ${brl(-view.free)} para fechar o mês` : `, sobram ${brl(view.free)}`}.`}
        style={morph ? { viewTransitionName: 'dm-flow' } : undefined}
      >
        {seg.map((s, i) => (
          <span key={s.key} className="fin-flow-seg" data-tone={s.tone} style={{ flexBasis: `${(s.value / Math.max(sum, total)) * 100}%`, ['--i' as string]: i }} />
        ))}
        {overdrawn && <span className="fin-flow-seg" data-tone="over" style={{ flexBasis: `${(-view.free / (total - view.free)) * 100}%`, ['--i' as string]: 2 }} />}
      </div>
      <ul className="fin-flow-legend">
        {seg.map((s) => (
          <li key={s.key}>
            <span className="fin-dot" data-tone={s.tone} aria-hidden="true" />
            <span className="dm-muted">{s.label}</span>
            <strong className="dm-num">{brl(s.value)}</strong>
            <span className="dm-faint dm-num">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
        {overdrawn && (
          <li>
            <span className="fin-dot" data-tone="over" aria-hidden="true" />
            <span className="dm-alert-text font-semibold">Falta cobrir</span>
            <strong className="dm-num dm-alert-text">{brl(-view.free)}</strong>
          </li>
        )}
      </ul>
    </div>
  );
}
