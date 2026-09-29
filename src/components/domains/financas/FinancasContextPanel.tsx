'use client';

import React, { useMemo } from 'react';
import { brl, pct, shortDayLabel } from '../shared/format';
import { buildFinanceView } from './financeView';
import { focusFinance, useFinanceState } from './financeSession';

/**
 * Context Panel de Finanças: próxima conta, orçamento mais apertado, metas e o ponto de atenção.
 * Cada bloco leva ao mesmo item na tela principal (abre e rola até ele).
 */
export function FinancasContextPanel() {
  const { version } = useFinanceState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const view = useMemo(() => buildFinanceView(), [version]);
  const nextBill = view.bills[0];
  const tightest = [...view.budgets].sort((a, b) => b.consumption.percentUsed - a.consumption.percentUsed)[0];
  const attention = view.attention[0];

  return (
    <>
      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Próxima conta</p>
        {nextBill ? (
          <button type="button" className="dm-ctx-link" onClick={() => focusFinance({ kind: 'bill', id: nextBill.commitment.id })}>
            <span className="min-w-0">
              <strong className="block text-[14px]">{nextBill.commitment.label}</strong>
              <span className="dm-muted text-[12px]">
                {nextBill.status === 'hoje' ? 'vence hoje' : nextBill.status === 'vencida' ? 'vencida' : `vence em ${shortDayLabel(nextBill.dueDate)}`}
              </span>
            </span>
            <strong className="dm-num text-[14px]">{brl(nextBill.commitment.expectedAmount, { cents: true })}</strong>
          </button>
        ) : (
          <p className="dm-muted text-[13px]">Nenhuma conta pendente neste mês.</p>
        )}
      </div>

      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Orçamento mais apertado</p>
        {tightest ? (
          <button type="button" className="dm-ctx-link flex-col !items-stretch" onClick={() => focusFinance({ kind: 'budget', id: tightest.budget.id })}>
            <span className="flex items-baseline justify-between gap-2">
              <strong className="text-[14px]">{tightest.categoryName}</strong>
              <span className="dm-num text-[13px]">{pct(tightest.consumption.percentUsed)}</span>
            </span>
            <span className="dm-bar" aria-hidden="true">
              <i data-tone={tightest.consumption.state === 'estourado' ? 'alert' : tightest.consumption.state === 'proximo_do_limite' ? 'accent' : undefined} style={{ width: `${Math.min(100, tightest.consumption.percentUsed * 100)}%` }} />
            </span>
            <span className="dm-muted text-[12px] dm-num">
              {tightest.consumption.remainingAmount >= 0 ? `Resta ${brl(tightest.consumption.remainingAmount)}` : `Passou ${brl(-tightest.consumption.remainingAmount)}`}
            </span>
          </button>
        ) : (
          <p className="dm-muted text-[13px]">Sem orçamentos definidos.</p>
        )}
      </div>

      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Metas</p>
        <div className="flex flex-col gap-3">
          {view.goals.map((g) => (
            <button key={g.goal.id} type="button" className="dm-ctx-link flex-col !items-stretch" onClick={() => focusFinance({ kind: 'goal', id: g.goal.id })}>
              <span className="flex items-baseline justify-between gap-2">
                <strong className="text-[13px]">{g.goal.label}</strong>
                <span className="dm-num text-[12px] dm-muted">{pct(g.progress)}</span>
              </span>
              <span className="dm-bar" aria-hidden="true">
                <i data-tone="primary" style={{ width: `${g.progress * 100}%` }} />
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="dm-ctx-block">
        <p className="dm-ctx-label">Atenção</p>
        {attention ? (
          <button type="button" className="dm-ctx-link" onClick={() => document.querySelector('[aria-label="O que merece atenção"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' })}>
            <span className="text-[13px] leading-snug">{attention.observation.replace(/(\d{4})-(\d{2})-(\d{2})/g, '$3/$2')}</span>
          </button>
        ) : (
          <p className="dm-muted text-[13px]">Nada pede atenção agora.</p>
        )}
      </div>
    </>
  );
}
