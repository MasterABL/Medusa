'use client';

import React, { useMemo } from 'react';
import { FINANCAS_DATA } from './financeFixtures';
import { getReconciledFinanceData } from './financeBridge';

export function FinanceContextPanel() {
  const reconciled = useMemo(() => getReconciledFinanceData(), []);
  const data = FINANCAS_DATA;
  const pendingBills = data.upcomingBills.filter((b) => b.status !== 'pago').slice(0, 3);

  return (
    <div className="space-y-6">
      {/* 1. Solvência & Reserva */}
      <div className="space-y-2.5 pb-5 border-b border-border/60">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Solvência &amp; Liquidez
          </span>
          <span className="text-[11px] font-mono text-[#18534B] dark:text-[#71DBD2] font-semibold tabular-nums">
            {reconciled.runwayDays} dias de caixa
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-text-primary tabular-nums">
            R$ {reconciled.tenhoTotal.toLocaleString('pt-BR')}
          </span>
          <span className="text-[11px] text-text-secondary font-mono">Disponível</span>
        </div>
        <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
          <div className="bg-[#18534B] dark:bg-medusa-primary h-full w-[94%]" />
        </div>
        <div className="text-[10px] text-text-muted font-mono pt-0.5 flex justify-between">
          <span>Livre: R$ {reconciled.livreTotal.toLocaleString('pt-BR')}</span>
          <span className="font-semibold text-text-secondary">({reconciled.livrePercent}%)</span>
        </div>
      </div>

      {/* 2. Próximos Vencimentos a Liquidar */}
      <div className="space-y-2.5 pb-5 border-b border-border/60">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Vencimentos Próximos
          </span>
          <span className="text-[10px] font-mono text-text-muted tabular-nums">
            {pendingBills.length} pendentes
          </span>
        </div>

        <div className="space-y-2">
          {pendingBills.map((bill) => (
            <div key={bill.id} className="bg-surface-secondary border border-border/70 rounded-xl p-2.5 space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-text-primary truncate max-w-[130px]">{bill.title}</span>
                <span className="font-mono font-bold text-text-primary tabular-nums">
                  R$ {bill.amount.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-text-muted">
                <span>Vence: {bill.dueDate}</span>
                <span className={bill.status === 'agendado' ? 'text-[#18534B] dark:text-[#71DBD2]' : 'text-alert'}>
                  {bill.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Ritmo do Mês (Pacing) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Ritmo Temporal
          </span>
          <span className="text-[10px] font-mono text-[#18534B] dark:text-[#ADE4B5] font-semibold">
            Dentro da Meta
          </span>
        </div>

        <div className="bg-surface-secondary border border-border/70 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-semibold text-text-primary">Dia {data.summary.monthPacingDay} de 30</span>
            <span className="font-mono text-text-secondary">50% do mês decorrido</span>
          </div>
          <p className="text-[11px] text-text-secondary leading-snug">
            Despesas discricionárias em 48% do orçamento. Taxa de poupança preservada em 36.2%.
          </p>
        </div>
      </div>
    </div>
  );
}
