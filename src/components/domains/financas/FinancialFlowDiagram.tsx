'use client';

import React, { useState } from 'react';
import { brl } from '../shared/format';
import type { FinanceView } from './financeView';

export interface FinancialFlowDiagramProps {
  view: FinanceView;
  simulatedExpense?: number;
  interactive?: boolean;
}

/**
 * Diagrama Estruturado de Fluxo Financeiro — Assinatura de Finanças.
 * Representa o dinheiro percorrendo o sistema através de linhas, eixos e proporções geométricas:
 * Entrada (Total recebido) → Ramos de destinação (Gasto realizado, Contas fixas, Reserva/Metas, Margem livre).
 * Reage instantaneamente a simulações de gastos e hover com motion preciso e controlado.
 */
export function FinancialFlowDiagram({ view, simulatedExpense = 0, interactive = true }: FinancialFlowDiagramProps) {
  const [activeStream, setActiveStream] = useState<string | null>(null);

  const income = Math.max(view.income, 1);
  const totalAllocated = view.spent + view.billsTotal;
  const rawFree = view.income - totalAllocated;
  const effectiveFree = rawFree - simulatedExpense;
  const isOverdrawn = effectiveFree < 0;

  // Stream definitions with precise geometric ratios
  const streams = [
    {
      id: 'spent',
      label: 'Gasto no mês',
      sub: `${view.monthLabel.split(' ')[0]} realizado`,
      amount: view.spent,
      pct: Math.round((view.spent / income) * 100),
      color: 'var(--fin-spent)',
      strokeColor: 'rgba(140, 160, 150, 0.45)',
      fillColor: 'rgba(140, 160, 150, 0.14)',
      icon: 'shopping_bag',
    },
    {
      id: 'bills',
      label: 'Contas a pagar',
      sub: `${view.bills.length} compromissos`,
      amount: view.billsTotal,
      pct: Math.round((view.billsTotal / income) * 100),
      color: 'var(--fin-bills)',
      strokeColor: 'rgba(235, 185, 80, 0.65)',
      fillColor: 'rgba(235, 185, 80, 0.16)',
      icon: 'receipt_long',
    },
    {
      id: 'free',
      label: isOverdrawn ? 'Déficit projetado' : 'Margem livre',
      sub: isOverdrawn
        ? `Faltam ${brl(-effectiveFree)}`
        : `${brl(Math.max(0, effectiveFree / Math.max(view.daysLeft, 1)))}/dia (${view.daysLeft}d)`,
      amount: Math.abs(effectiveFree),
      pct: Math.max(0, Math.round((effectiveFree / income) * 100)),
      color: isOverdrawn ? 'var(--dm-alert-text)' : 'var(--fin-free)',
      strokeColor: isOverdrawn ? 'rgba(196, 91, 91, 0.8)' : 'rgba(113, 219, 210, 0.75)',
      fillColor: isOverdrawn ? 'rgba(196, 91, 91, 0.22)' : 'rgba(113, 219, 210, 0.18)',
      icon: isOverdrawn ? 'error_outline' : 'account_balance_wallet',
    },
  ];

  return (
    <div className="fin-flow-system" data-active-stream={activeStream || undefined}>
      {/* Header com eixos e balanço */}
      <div className="fin-flow-header">
        <div className="fin-flow-axis-label">
          <span className="fin-axis-mark" aria-hidden="true" />
          <span className="dm-eyebrow">Eixo de Distribuição · Balanço Mensal</span>
        </div>
        <div className="fin-balance-badge" data-balanced={!isOverdrawn}>
          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>
            {isOverdrawn ? 'warning' : 'scale'}
          </span>
          <span className="dm-num font-mono text-[12px]">
            {isOverdrawn ? `Descompasso: ${brl(-effectiveFree)}` : `Balanço equilibrado · ${brl(income)}`}
          </span>
        </div>
      </div>

      {/* Diagrama de Fluxo Vetorial */}
      <div className="fin-river-container">
        <svg
          className="fin-river-svg"
          viewBox="0 0 840 210"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Fluxo financeiro de ${brl(income)} distribuído entre gastos, contas e margem livre.`}
        >
          <defs>
            <linearGradient id="finGradSpent" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(113, 219, 210, 0.3)" />
              <stop offset="100%" stopColor="rgba(140, 160, 150, 0.5)" />
            </linearGradient>
            <linearGradient id="finGradBills" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(113, 219, 210, 0.3)" />
              <stop offset="100%" stopColor="rgba(235, 185, 80, 0.55)" />
            </linearGradient>
            <linearGradient id="finGradFree" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(113, 219, 210, 0.4)" />
              <stop offset="100%" stopColor={isOverdrawn ? 'rgba(196, 91, 91, 0.7)' : 'rgba(113, 219, 210, 0.65)'} />
            </linearGradient>

            {/* Pattern de coordenadas e régua financeira */}
            <pattern id="finGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.08" />
            </pattern>
          </defs>

          {/* Malha sutil de coordenadas geométricas */}
          <rect width="100%" height="100%" fill="url(#finGridPattern)" />

          {/* Faixa 1: Ramo de Gastos (Cima) */}
          <path
            d="M 60,105 C 240,105 280,45 780,45"
            fill="none"
            stroke="url(#finGradSpent)"
            strokeWidth={Math.max(6, Math.min(24, (view.spent / income) * 44))}
            strokeLinecap="round"
            className="fin-stream-path"
            data-stream="spent"
          />

          {/* Faixa 2: Ramo de Contas (Centro) */}
          <path
            d="M 60,105 C 260,105 320,105 780,105"
            fill="none"
            stroke="url(#finGradBills)"
            strokeWidth={Math.max(6, Math.min(24, (view.billsTotal / income) * 44))}
            strokeLinecap="round"
            className="fin-stream-path"
            data-stream="bills"
          />

          {/* Faixa 3: Ramo de Margem Livre (Baixo) */}
          <path
            d="M 60,105 C 240,105 280,165 780,165"
            fill="none"
            stroke="url(#finGradFree)"
            strokeWidth={Math.max(6, Math.min(24, (Math.max(0, effectiveFree) / income) * 44))}
            strokeLinecap="round"
            className={`fin-stream-path ${isOverdrawn ? 'fin-stream-overdrawn' : ''}`}
            data-stream="free"
          />

          {/* Se houver simulação ativa, traçado de projeção da simulação */}
          {simulatedExpense > 0 && (
            <path
              d="M 60,105 C 240,105 300,185 780,185"
              fill="none"
              stroke="rgba(196, 91, 91, 0.75)"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              className="fin-stream-simulated"
            />
          )}

          {/* Nó de Origem (Entradas) */}
          <circle cx="60" cy="105" r="9" fill="rgb(var(--color-primary-rgb))" className="fin-node-pulse" />
          <circle cx="60" cy="105" r="4" fill="#ffffff" />

          {/* Nós Terminais dos 3 ramos */}
          <circle cx="780" cy="45" r="5" fill="var(--fin-spent)" />
          <circle cx="780" cy="105" r="5" fill="var(--fin-bills)" />
          <circle cx="780" cy="165" r="5" fill={isOverdrawn ? 'var(--dm-alert-text)' : 'var(--fin-free)'} />
        </svg>

        {/* Labels e Metas sobrepostas no diagrama */}
        <div className="fin-stream-anchors" aria-hidden="true">
          <div className="fin-anchor fin-anchor-inflow">
            <span className="fin-anchor-tag">Entrada Real</span>
            <strong className="dm-num text-[14px]">{brl(income)}</strong>
          </div>
          <div className="fin-anchor fin-anchor-spent">
            <span className="fin-anchor-tag">Saídas Realizadas</span>
            <strong className="dm-num text-[13px]">{brl(view.spent)}</strong>
          </div>
          <div className="fin-anchor fin-anchor-bills">
            <span className="fin-anchor-tag">Compromissos Fixos</span>
            <strong className="dm-num text-[13px]">{brl(view.billsTotal)}</strong>
          </div>
          <div className="fin-anchor fin-anchor-free">
            <span className="fin-anchor-tag">{isOverdrawn ? 'Falta Cobrir' : 'Margem Livre'}</span>
            <strong className={`dm-num text-[13px] ${isOverdrawn ? 'dm-alert-text' : 'dm-accent-text'}`}>
              {brl(effectiveFree)}
            </strong>
          </div>
        </div>
      </div>

      {/* Grid de Destinações e Ações */}
      <div className="fin-destinations-deck">
        {streams.map((s) => {
          const isSelected = activeStream === s.id;
          return (
            <div
              key={s.id}
              className={`fin-dest-card ${isSelected ? 'fin-dest-selected' : ''}`}
              onMouseEnter={interactive ? () => setActiveStream(s.id) : undefined}
              onMouseLeave={interactive ? () => setActiveStream(null) : undefined}
              data-stream={s.id}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="fin-dest-indicator" style={{ backgroundColor: s.color }} aria-hidden="true" />
                <span className="dm-eyebrow text-[10px]">{s.label}</span>
                <span className="dm-num font-mono text-[11px] text-text-muted">{s.pct}%</span>
              </div>
              <p className="fin-dest-amount dm-num font-bold text-[18px] sm:text-[20px] text-text-primary mt-1">
                {brl(s.amount)}
              </p>
              <p className="text-[12px] text-text-secondary mt-0.5 leading-snug">{s.sub}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
