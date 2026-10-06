'use client';

import React, { useState, useMemo } from 'react';
import { FINANCAS_DATA, BudgetEnvelope, UpcomingBill } from './financeFixtures';
import { getReconciledFinanceData } from './financeBridge';

export function FinanceContainer() {
  const reconciled = useMemo(() => getReconciledFinanceData(), []);
  const [data] = useState(FINANCAS_DATA);

  // Estados do Simulador de Decisão Financeira
  const [extraRevenue, setExtraRevenue] = useState<number>(0);
  const [shockPercent, setShockPercent] = useState<number>(0);
  const [activeEnvelopeFilter, setActiveEnvelopeFilter] = useState<string>('todos');

  // Recálculo dinâmico da decisão conectado à Foundation
  const decisionSimulation = useMemo(() => {
    const baseInflow = data.inflows.reduce((acc, i) => acc + i.amount, 0);
    const adjustedInflow = baseInflow + extraRevenue;
    
    // Total de despesas dos envelopes sem a margem
    const baseExpenses = data.envelopes
      .filter((e) => e.id !== 'env-5')
      .reduce((sum, e) => sum + e.allocated, 0);

    const shockedExpenses = Math.round(baseExpenses * (1 + shockPercent / 100));
    const simulatedFreeMargin = Math.max(0, adjustedInflow - shockedExpenses);
    const simulatedMarginPercent = adjustedInflow > 0 ? (simulatedFreeMargin / adjustedInflow) * 100 : 0;
    
    const dailyBurn = shockedExpenses / 30;
    const simulatedRunwayDays = dailyBurn > 0 ? Math.round((reconciled.tenhoTotal + simulatedFreeMargin) / dailyBurn) : 999;

    return {
      adjustedInflow,
      shockedExpenses,
      simulatedFreeMargin,
      simulatedMarginPercent,
      simulatedRunwayDays,
      isComfortable: simulatedMarginPercent >= 15,
      isWarning: simulatedMarginPercent < 10,
    };
  }, [reconciled, data, extraRevenue, shockPercent]);

  return (
    <main className="w-full pb-20 px-4 sm:px-8 max-w-6xl mx-auto flex flex-col gap-8 pt-6 flex-1">
      {/* ================= 1. CABEÇALHO FINANCEIRO: EQUAÇÃO CANÔNICA DE CAIXA ================= */}
      <section aria-label="Equação Financeira Global" className="flex flex-col gap-4 border-b border-border/60 pb-5">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#18534B] dark:bg-[#71DBD2] living-pulse" />
              <span className="text-[10px] font-mono font-medium tracking-widest uppercase text-text-muted">
                Finanças · Fluxo de Caixa, Compromissos &amp; Margem
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Comando Financeiro: Entradas, Saídas &amp; Margem
            </h1>
          </div>

          {/* Equação Líquida em Destaque */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-surface border border-border/70 rounded-xl px-3 py-1.5 flex flex-col">
              <span className="text-[9px] font-mono uppercase text-text-muted">Tenho Líquido</span>
              <span className="text-[15px] font-bold font-mono tabular-nums text-text-primary">
                R$ {reconciled.tenhoTotal.toLocaleString('pt-BR')}
              </span>
            </div>
            <span className="text-text-muted font-mono font-bold">-</span>
            <div className="bg-surface border border-border/70 rounded-xl px-3 py-1.5 flex flex-col">
              <span className="text-[9px] font-mono uppercase text-text-muted">Comprometido</span>
              <span className="text-[15px] font-bold font-mono tabular-nums text-alert">
                R$ {reconciled.comprometidoTotal.toLocaleString('pt-BR')}
              </span>
            </div>
            <span className="text-text-muted font-mono font-bold">=</span>
            <div className="bg-[#71DBD2]/15 border border-medusa-primary/50 rounded-xl px-3.5 py-1.5 flex flex-col shadow-subtle">
              <span className="text-[9px] font-mono uppercase text-[#18534B] dark:text-[#71DBD2] font-bold">Livre</span>
              <span className="text-[15px] font-extrabold font-mono tabular-nums text-[#18534B] dark:text-[#71DBD2]">
                R$ {reconciled.livreTotal.toLocaleString('pt-BR')} ({reconciled.livrePercent}%)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 2. O RIO FINANCEIRO CONTÍNUO (ORIGEM → DISTRIBUIÇÃO) ================= */}
      <section aria-label="Rio Financeiro Contínuo" className="bg-surface rounded-2xl p-6 sm:p-7 border border-border/70 shadow-calm flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#18534B] dark:text-[#71DBD2]">
              water_drop
            </span>
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-text-muted">
              Rio Financeiro (Origens → Concentrador D+0 → Envelopes)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-text-muted uppercase">
            Liquidez Consolidada: R$ {data.summary.consolidatedLiquidity.toLocaleString('pt-BR')}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1.4fr] gap-6 items-center">
          {/* Origens de Entrada */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              1. Entradas (R$ {data.summary.totalMonthlyInflow.toLocaleString('pt-BR')})
            </span>
            {data.inflows.map((item) => (
              <div
                key={item.id}
                className="bg-surface-elevated border border-border/70 rounded-xl p-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-[13px] font-semibold text-text-primary">{item.name}</div>
                  <div className="text-[10px] font-mono text-text-muted flex items-center gap-1.5 pt-0.5">
                    <span className="uppercase">{item.category}</span>
                    <span>•</span>
                    <span>{item.liquidityDay}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-bold font-mono text-text-primary tabular-nums">
                    R$ {item.amount.toLocaleString('pt-BR')}
                  </div>
                  <span className="text-[9px] font-mono text-[#18534B] dark:text-[#71DBD2] font-semibold">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Concentrador SVG */}
          <div className="hidden lg:flex flex-col items-center justify-center px-4 relative">
            <svg width="50" height="200" viewBox="0 0 50 200" fill="none">
              <path d="M 0 35 C 25 35, 25 100, 50 100" stroke="currentColor" strokeWidth="2.5" className="text-medusa-primary/50 animate-flow-dash" strokeDasharray="5 3" />
              <path d="M 0 100 C 25 100, 25 100, 50 100" stroke="currentColor" strokeWidth="3" className="text-medusa-primary/70" />
              <path d="M 0 165 C 25 165, 25 100, 50 100" stroke="currentColor" strokeWidth="2.5" className="text-medusa-primary/50 animate-flow-dash" strokeDasharray="5 3" />
            </svg>
            <div className="bg-surface-secondary border border-medusa-primary/40 rounded-full px-2.5 py-1 text-center shadow-subtle my-1">
              <div className="text-[8px] font-mono uppercase text-text-muted">Concentrador</div>
              <div className="text-[10px] font-mono font-bold text-[#18534B] dark:text-[#71DBD2]">100% D+0</div>
            </div>
            <svg width="50" height="200" viewBox="0 0 50 200" fill="none">
              <path d="M 0 100 C 25 100, 25 25, 50 25" stroke="#71DBD2" strokeWidth="2.5" className="animate-flow-dash" strokeDasharray="5 3" />
              <path d="M 0 100 C 25 100, 25 65, 50 65" stroke="#ADE4B5" strokeWidth="2.5" className="animate-flow-dash" strokeDasharray="5 3" />
              <path d="M 0 100 C 25 100, 25 105, 50 105" stroke="#D0EAA3" strokeWidth="2" />
              <path d="M 0 100 C 25 100, 25 145, 50 145" stroke="#FFF18C" strokeWidth="2" />
              <path d="M 0 100 C 25 100, 25 185, 50 185" stroke="#18534B" strokeWidth="3.5" className="animate-flow-dash" strokeDasharray="6 3" />
            </svg>
          </div>

          {/* Envelopes e Margem Livre */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              2. Destino nos Envelopes Orçamentários
            </span>
            {data.envelopes.map((env) => {
              const isMargin = env.id === 'env-5';
              const pct = Math.round((env.allocated / data.summary.totalMonthlyInflow) * 100);
              return (
                <div
                  key={env.id}
                  className={`rounded-xl p-3 border ${
                    isMargin
                      ? 'bg-[#71DBD2]/10 border-medusa-primary/60 shadow-subtle ring-1 ring-medusa-primary/30'
                      : 'bg-surface-elevated border-border/70'
                  }`}
                >
                  <div className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: env.color }} />
                      <span className="font-semibold text-text-primary">{env.name}</span>
                    </div>
                    <span className="font-mono font-bold text-text-primary tabular-nums">
                      R$ {env.allocated.toLocaleString('pt-BR')} ({pct}%)
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: env.color }}
                      />
                    </div>
                    {env.billsCount > 0 && (
                      <span className="text-[9px] font-mono text-text-muted whitespace-nowrap">
                        {env.billsCount} contas
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= 3. CONTROLE ORÇAMENTÁRIO & RITMO MENSAL (PACING) ================= */}
      <section aria-label="Controle de Orçamento" className="bg-surface rounded-2xl p-6 sm:p-7 border border-border/70 shadow-calm flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-text-muted">
              speed
            </span>
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-text-muted">
              Ritmo de Consumo Orçamentário (Dia {data.summary.monthPacingDay} de 30 · {data.summary.pacingPercent}% do Mês)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#18534B] dark:text-[#ADE4B5] font-semibold">
            Ritmo Sob Controle: 48% Consumido
          </span>
        </div>

        {/* Barras de Consumo com Marcador do Dia do Mês */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.envelopes.slice(0, 4).map((env) => {
            const spentPercent = Math.round((env.spent / env.allocated) * 100);
            const isAheadOfCalendar = spentPercent > data.summary.pacingPercent;

            return (
              <div key={env.id} className="bg-surface-elevated border border-border/70 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="font-semibold text-text-primary">{env.name}</span>
                  <span className="font-mono font-bold tabular-nums text-text-primary">
                    R$ {env.spent.toLocaleString('pt-BR')} / {env.allocated.toLocaleString('pt-BR')}
                  </span>
                </div>

                {/* Barra com Indicador do Pacing */}
                <div className="relative w-full bg-surface-subtle h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${spentPercent}%`,
                      backgroundColor: isAheadOfCalendar && env.id !== 'env-1' ? '#C45B5B' : env.color,
                    }}
                  />
                </div>

                <div className="flex justify-between text-[10px] font-mono text-text-muted">
                  <span>Consumido: {spentPercent}%</span>
                  <span className={isAheadOfCalendar && env.id !== 'env-1' ? 'text-alert font-bold' : 'text-text-secondary'}>
                    {env.id === 'env-1' ? 'Compromisso Integral Liquidado' : isAheadOfCalendar ? 'Atenção: Acima da meta temporal' : 'Dentro do ritmo seguro'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 4. PRÓXIMOS COMPROMISSOS & CONTAS A PAGAR ================= */}
      <section aria-label="Próximos Compromissos" className="bg-surface rounded-2xl p-6 sm:p-7 border border-border/70 shadow-calm flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-text-muted">
              receipt_long
            </span>
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-text-muted">
              Compromissos dos Próximos Dias (Datas &amp; Liquidação)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-text-muted uppercase">
            6 Contas Identificadas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.upcomingBills.map((bill) => {
            const isPago = bill.status === 'pago';
            const isAgendado = bill.status === 'agendado';

            return (
              <div
                key={bill.id}
                className="bg-surface-elevated border border-border/70 rounded-xl p-3.5 flex flex-col justify-between gap-3 hover:border-medusa-primary/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-mono uppercase text-text-muted">{bill.category}</span>
                    <h3 className="text-[13px] font-bold text-text-primary mt-0.5">{bill.title}</h3>
                    <span className="text-[11px] text-text-secondary">{bill.recipient}</span>
                  </div>
                  <span
                    className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full font-bold ${
                      isPago
                        ? 'bg-[#ADE4B5]/25 text-[#18534B] dark:text-[#ADE4B5]'
                        : isAgendado
                        ? 'bg-[#71DBD2]/20 text-[#18534B] dark:text-[#71DBD2]'
                        : 'bg-alert/15 text-alert'
                    }`}
                  >
                    {bill.status}
                  </span>
                </div>

                <div className="flex justify-between items-end pt-2 border-t border-border/50 text-[11px] font-mono">
                  <span className="text-text-muted">Vencimento: {bill.dueDate} ({bill.dueDayRelative})</span>
                  <span className="text-[13px] font-bold text-text-primary tabular-nums">
                    R$ {bill.amount.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 5. SIMULADOR DE DECISÃO E RESILIÊNCIA A CHOQUES ================= */}
      <section aria-label="Simulador de Decisão" className="bg-surface rounded-2xl p-6 sm:p-7 border border-border/70 shadow-calm flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-medusa-primary">
              tune
            </span>
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-text-muted">
              Simulador de Decisão: &ldquo;O que muda se eu tomar esta decisão?&rdquo;
            </h2>
          </div>
          <span className="text-[10px] font-mono text-text-muted uppercase">
            Recálculo Instantâneo de Margem
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Sliders Interativos */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[12px]">
                <label htmlFor="fin-rev-slider" className="font-semibold text-text-primary">
                  Variação de Receita / Aporte Extra
                </label>
                <span className="font-mono font-bold text-text-primary">
                  {extraRevenue >= 0 ? `+R$ ${extraRevenue.toLocaleString('pt-BR')}` : `-R$ ${Math.abs(extraRevenue).toLocaleString('pt-BR')}`}
                </span>
              </div>
              <input
                id="fin-rev-slider"
                type="range"
                min="-2000"
                max="5000"
                step="250"
                value={extraRevenue}
                onChange={(e) => setExtraRevenue(Number(e.target.value))}
                className="w-full accent-medusa-primary cursor-pointer h-2 bg-surface-subtle rounded-lg"
              />
              <div className="flex justify-between text-[9px] font-mono text-text-muted">
                <span>-R$ 2.000</span>
                <span>Neutro (R$ 0)</span>
                <span>+R$ 5.000</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[12px]">
                <label htmlFor="fin-shock-slider" className="font-semibold text-text-primary">
                  Choque Operacional ou Despesa Inesperada
                </label>
                <span className="font-mono font-bold text-alert">
                  +{shockPercent}%
                </span>
              </div>
              <input
                id="fin-shock-slider"
                type="range"
                min="0"
                max="25"
                step="1"
                value={shockPercent}
                onChange={(e) => setShockPercent(Number(e.target.value))}
                className="w-full accent-alert cursor-pointer h-2 bg-surface-subtle rounded-lg"
              />
              <div className="flex justify-between text-[9px] font-mono text-text-muted">
                <span>0% (Cenário Base)</span>
                <span>+10% (Tensão)</span>
                <span>+25% (Estresse)</span>
              </div>
            </div>
          </div>

          {/* Resultado Visual do Impacto */}
          <div className="bg-surface-elevated border border-border/70 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono uppercase text-text-muted">Margem Livre Resultante</span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  decisionSimulation.isComfortable
                    ? 'bg-[#ADE4B5]/25 text-[#18534B] dark:text-[#ADE4B5]'
                    : decisionSimulation.isWarning
                    ? 'bg-alert/20 text-alert'
                    : 'bg-medusa-primary/20 text-text-primary'
                }`}
              >
                {decisionSimulation.isComfortable ? 'Colchão Seguro' : decisionSimulation.isWarning ? 'Risco de Déficit' : 'Estável'}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-text-primary tabular-nums">
                R$ {decisionSimulation.simulatedFreeMargin.toLocaleString('pt-BR')}
              </span>
              <span className="text-[14px] font-mono text-text-secondary font-semibold">
                ({decisionSimulation.simulatedMarginPercent.toFixed(1)}%)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50 text-[11px] font-mono">
              <div>
                <span className="text-text-muted block text-[9px]">Autonomia Projetada</span>
                <span className="font-bold text-[#18534B] dark:text-[#71DBD2] text-sm tabular-nums">
                  {decisionSimulation.simulatedRunwayDays} dias
                </span>
              </div>
              <div>
                <span className="text-text-muted block text-[9px]">Despesas no Cenário</span>
                <span className="font-bold text-text-primary text-sm tabular-nums">
                  R$ {decisionSimulation.shockedExpenses.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 6. LINHA DO TEMPO DE LIQUIDEZ (SALDO PROJETADO) ================= */}
      <section aria-label="Linha do Tempo de Liquidez" className="bg-surface rounded-2xl p-6 sm:p-7 border border-border/70 shadow-calm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-text-muted">
              timeline
            </span>
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-text-muted">
              Saldo Projetado ao Longo do Ciclo (D+01 a D+30)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-text-muted uppercase">
            Autonomia de {data.summary.runwayDays} dias
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {data.cashFlowHorizon.map((day) => (
            <div
              key={day.day}
              className="bg-surface-elevated border border-border/70 rounded-xl p-3 flex flex-col justify-between gap-2"
            >
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="font-bold text-text-primary">{day.day}</span>
                <span className="text-text-muted">{day.dateStr}</span>
              </div>

              <div>
                <div
                  className={`text-[12px] font-mono font-bold tabular-nums ${
                    day.netChange > 0 ? 'text-[#18534B] dark:text-[#71DBD2]' : 'text-text-primary'
                  }`}
                >
                  {day.netChange > 0 ? `+R$ ${day.netChange.toLocaleString('pt-BR')}` : `-R$ ${Math.abs(day.netChange).toLocaleString('pt-BR')}`}
                </div>
                <div className="text-[10px] font-mono text-text-muted pt-1">
                  Saldo: <strong className="text-text-secondary">R$ {day.projectedBalance.toLocaleString('pt-BR')}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
