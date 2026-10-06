'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { getReconciledFinanceData } from './financeBridge';
import {
  FINANCIAL_ACCOUNTS,
  CREDIT_CARDS,
  RECENT_TRANSACTIONS,
  FINANCIAL_GOALS,
  FINANCIAL_ANOMALIES,
  TransactionRecord,
  FinancialGoal,
  FinancialAnomalyItem,
} from './financeFixtures';
import { useShell } from '@/context/ShellContext';
import { playFeedback } from '@/lib/audioFeedback';

type FinanceSubView = 'equilibrio' | 'contas-cartoes' | 'transacoes' | 'metas' | 'anomalias';

export function FinanceContainer() {
  const reconciled = useMemo(() => getReconciledFinanceData(), []);
  const { triggerIslandNotification, setActiveRoute } = useShell();

  // Subnavegação interna de Finanças
  const [subView, setSubView] = useState<FinanceSubView>('equilibrio');

  // Estados Interativos de Simulação e Gavetas da Home
  const [simulatedExpense, setSimulatedExpense] = useState<number>(0);
  const [activeDrawer, setActiveDrawer] = useState<'nenhuma' | 'origens' | 'compromissos'>('nenhuma');
  const [anomaliaResolvida, setAnomaliaResolvida] = useState<boolean>(false);

  // Estados das Transações
  const [txFilter, setTxFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [searchTx, setSearchTx] = useState<string>('');

  // Estados das Anomalias
  const [anomalies, setAnomalies] = useState<FinancialAnomalyItem[]>(FINANCIAL_ANOMALIES);

  // Recálculo dinâmico baseado no simulador de decisão
  const effectiveComprometido = reconciled.comprometidoTotal + simulatedExpense;
  const effectiveLivre = Math.max(0, reconciled.tenhoTotal - effectiveComprometido);
  const effectiveLivrePercent =
    reconciled.tenhoTotal > 0
      ? Math.round((effectiveLivre / reconciled.tenhoTotal) * 100)
      : 0;

  const dailyBurn = effectiveComprometido / 30 || 1;
  const simulatedRunwayDays = Math.round(reconciled.tenhoTotal / dailyBurn);
  const marginPerDay = Math.round(effectiveLivre / 30);

  // Ação de estorno da anomalia financeira (em 1 clique com bridge Guardian)
  const handleResolveAnomalia = useCallback(
    (anomalyId?: string) => {
      setAnomaliaResolvida(true);
      if (anomalyId) {
        setAnomalies((prev) =>
          prev.map((a) => (a.id === anomalyId ? { ...a, status: 'contestado' as const } : a))
        );
      }
      playFeedback('success');
      triggerIslandNotification({
        title: 'Contestação Enviada ao Guardian',
        tag: 'FINANÇAS & PROTEÇÃO',
        description: 'Estorno de R$ 89,90 solicitado ao emissor do cartão. Protocolo L2 gerado.',
        badge: 'ESTORNO ATIVO',
        state: 'active',
        durationMs: 4000,
        actionLabel: 'Ver no Guardian',
        onAction: () => setActiveRoute('guardian'),
      });
    },
    [triggerIslandNotification, setActiveRoute]
  );

  const toggleDrawer = useCallback((drawer: 'origens' | 'compromissos') => {
    setActiveDrawer((prev) => (prev === drawer ? 'nenhuma' : drawer));
    playFeedback('press');
  }, []);

  // Filtragem de transações
  const filteredTransactions = useMemo(() => {
    return RECENT_TRANSACTIONS.filter((t) => {
      if (txFilter === 'inflow' && t.type !== 'inflow') return false;
      if (txFilter === 'outflow' && t.type !== 'outflow') return false;
      if (searchTx.trim()) {
        const query = searchTx.toLowerCase();
        return (
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query) ||
          t.account.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [txFilter, searchTx]);

  return (
    <main
      className="w-full pb-20 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col gap-8 pt-6 flex-1 study-stage-enter"
      aria-label="Comando Financeiro Pessoal"
    >
      {/* 1. CABEÇALHO CONTEXTUAL + NAVEGAÇÃO INTERNA DO DOMÍNIO */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#71DBD2] animate-pulse" aria-hidden="true" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-text-muted">
              Finanças Pessoais · Comando de Caixa
            </span>
            <span className="text-text-muted/40">•</span>
            <span className="text-[11px] font-mono text-text-secondary">
              D+0 Reconciliado
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            {subView === 'equilibrio'
              ? 'Fluxo, Equilíbrio & Decisão'
              : subView === 'contas-cartoes'
              ? 'Contas Bancárias & Cartões'
              : subView === 'transacoes'
              ? 'Transações & Movimentos'
              : subView === 'metas'
              ? 'Metas & Planejamento'
              : 'Anomalias & Proteção Guardian'}
          </h1>
        </div>

        {/* Subnav interna de Finanças */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface border border-border/70 shadow-subtle overflow-x-auto self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setSubView('equilibrio');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'equilibrio'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">balance</span>
            <span>Equilíbrio</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('contas-cartoes');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'contas-cartoes'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">account_balance</span>
            <span>Contas &amp; Cartões</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('transacoes');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'transacoes'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            <span>Transações</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('metas');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'metas'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">savings</span>
            <span>Metas</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('anomalias');
              playFeedback('press');
            }}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subView === 'anomalias'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">shield</span>
            <span>Anomalias</span>
            {!anomaliaResolvida && (
              <span className="w-2 h-2 rounded-full bg-[#C45B5B]" />
            )}
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* SUBVIEW 1: EQUILÍBRIO (HOME OFICIAL DE FINANÇAS)          */}
      {/* ========================================================= */}
      {subView === 'equilibrio' && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-200">
          {/* COMPOSIÇÃO ÚNICA: QUANTO TENHO? -> COMPROMETIDO vs LIVRE -> SIMULADOR */}
          <section
            aria-label="Equilíbrio Financeiro Central"
            className="p-6 sm:p-8 rounded-3xl bg-surface border border-border/70 shadow-calm flex flex-col gap-8"
          >
            {/* A. QUANTO TENHO? (SALDO TOTAL DISPONÍVEL) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted font-bold">
                    1. Quanto tenho disponível?
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleDrawer('origens')}
                    className="text-[11px] font-mono text-[#71DBD2] hover:underline"
                  >
                    {activeDrawer === 'origens' ? 'Ocultar contas' : 'Ver origens'}
                  </button>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-text-primary tabular-nums">
                  R$ {reconciled.tenhoTotal.toLocaleString('pt-BR')}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleDrawer('origens')}
                  className={`p-3 rounded-2xl border transition-all text-left flex items-center gap-3 ${
                    activeDrawer === 'origens'
                      ? 'bg-[#FAFDF5] border-[#71DBD2] ring-1 ring-[#71DBD2]/40'
                      : 'bg-surface-secondary/40 border-border/60 hover:border-border'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-[#71DBD2] shadow-subtle">
                    <span className="material-symbols-outlined text-[18px]">account_balance</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-text-muted block">2 Contas Ativas</span>
                    <span className="text-[12px] font-mono font-bold text-text-primary">
                      Corrente + Reserva D+0
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* GAVETA DE ORIGENS (QUANDO ABERTA) */}
            {activeDrawer === 'origens' && (
              <div className="p-4 rounded-2xl bg-surface-secondary/30 border border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-200">
                <div className="p-3.5 rounded-xl bg-surface border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-text-muted">Conta Corrente</span>
                    <div className="text-[14px] font-bold text-text-primary">Principal (Operações)</div>
                  </div>
                  <span className="text-[15px] font-mono font-bold text-text-primary">
                    R$ 14.200
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-text-muted">Reserva Imediata</span>
                    <div className="text-[14px] font-bold text-text-primary">Liquidez D+0</div>
                  </div>
                  <span className="text-[15px] font-mono font-bold text-[#71DBD2]">
                    R$ 20.080
                  </span>
                </div>
              </div>
            )}

            {/* B. A BARRA VIVA DE PROPORÇÃO: COMPROMETIDO vs LIVRE */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#1C2420]" />
                  <span className="font-semibold text-text-primary">
                    Comprometido: R$ {effectiveComprometido.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-text-muted">
                    ({100 - effectiveLivrePercent}%)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#71DBD2]" />
                  <span className="font-semibold text-text-primary">
                    Livre Real: R$ {effectiveLivre.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[#18534B] dark:text-[#71DBD2] font-bold">
                    ({effectiveLivrePercent}%)
                  </span>
                </div>
              </div>

              {/* Barra física de equilíbrio com animação explicativa */}
              <div className="w-full h-7 bg-surface-secondary/80 rounded-2xl p-1 flex items-center gap-1 border border-border/60">
                <div
                  className="h-full bg-[#1C2420] rounded-xl transition-all duration-500 ease-out flex items-center justify-center text-[10px] font-mono text-[#FAFDF5] font-semibold px-2 overflow-hidden truncate"
                  style={{ width: `${Math.max(5, 100 - effectiveLivrePercent)}%` }}
                >
                  Comprometido
                </div>
                <div
                  className="h-full bg-[#71DBD2] rounded-xl transition-all duration-500 ease-out flex items-center justify-center text-[10px] font-mono text-[#1C2420] font-bold px-2 overflow-hidden truncate"
                  style={{ width: `${Math.max(5, effectiveLivrePercent)}%` }}
                >
                  Livre {effectiveLivrePercent}%
                </div>
              </div>

              {/* Indicadores complementares de Runway e Margem Diária */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-surface-secondary/40 border border-border/50 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-text-secondary">Runway de Segurança</span>
                  <span className="text-[13px] font-mono font-bold text-text-primary tabular-nums">
                    {simulatedRunwayDays} dias (~{(simulatedRunwayDays / 30).toFixed(1)} meses)
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-secondary/40 border border-border/50 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-text-secondary">Margem Livre por Dia</span>
                  <span className="text-[13px] font-mono font-bold text-[#18534B] dark:text-[#71DBD2] tabular-nums">
                    R$ {marginPerDay} / dia
                  </span>
                </div>
              </div>
            </div>

            {/* C. SIMULADOR DE DECISÃO: QUAL O IMPACTO DE UMA COMPRA? */}
            <div className="p-5 rounded-2xl bg-surface-secondary/30 border border-border/60 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                    Simulador de Consequência Imediata
                  </span>
                  <h4 className="text-[14px] font-bold text-text-primary">
                    E se eu gastar agora?
                  </h4>
                </div>

                {simulatedExpense > 0 && (
                  <button
                    type="button"
                    onClick={() => setSimulatedExpense(0)}
                    className="text-[11px] font-mono text-text-muted hover:text-text-primary"
                  >
                    Resetar simulação
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: 'Sem simulação', delta: 0 },
                  { label: '+ R$ 350', delta: 350 },
                  { label: '+ R$ 850', delta: 850 },
                  { label: '+ R$ 1.500', delta: 1500 },
                  { label: '+ R$ 3.000', delta: 3000 },
                ].map((btn) => (
                  <button
                    key={btn.delta}
                    type="button"
                    onClick={() => {
                      setSimulatedExpense(btn.delta);
                      playFeedback('press');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-mono transition-all border ${
                      simulatedExpense === btn.delta
                        ? 'bg-[#1C2420] text-[#FAFDF5] font-bold shadow-subtle'
                        : 'bg-surface border-border/70 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {simulatedExpense > 0 && (
                <div className="text-[12px] text-text-secondary bg-surface p-3 rounded-xl border border-border/60 flex items-center justify-between">
                  <span>
                    Com +R$ {simulatedExpense.toLocaleString('pt-BR')}, seu livre recua para{' '}
                    <strong className="text-text-primary">
                      R$ {effectiveLivre.toLocaleString('pt-BR')} ({effectiveLivrePercent}%)
                    </strong>.
                  </span>
                  <span className="text-[11px] font-mono text-[#C45B5B] font-semibold">
                    -{(reconciled.runwayDays - simulatedRunwayDays)} dias de runway
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* D. ANOMALIA EM DESTAQUE (BRIDGE COM O GUARDIAN) */}
          {!anomaliaResolvida && (
            <section aria-label="Alerta de Anomalia" className="flex flex-col gap-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
                Proteção Ativa do Guardian
              </span>

              <div className="p-5 rounded-2xl bg-[#FAFDF5] border border-[#C45B5B]/40 shadow-calm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#C45B5B]/15 flex items-center justify-center flex-shrink-0 text-[#C45B5B] shadow-subtle">
                    <span className="material-symbols-outlined text-[20px]">shield</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#C45B5B]/15 text-[#C45B5B] font-bold">
                        Duplicidade Detectada
                      </span>
                      <span className="text-[11px] font-mono text-text-muted">Hoje · 11:42</span>
                    </div>
                    <h4 className="text-[14px] font-bold text-text-primary">
                      Cobrança em dobro de Streaming (R$ 89,90)
                    </h4>
                    <p className="text-[12px] text-text-secondary">
                      Dois lançamentos idênticos registrados na fatura com menos de 4 minutos de intervalo.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleResolveAnomalia('anom-1')}
                    className="px-4 py-2 rounded-xl bg-[#71DBD2] hover:bg-[#71DBD2]/90 text-[#1C2420] text-[12px] font-bold transition-transform active:scale-95 shadow-subtle flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Contestar no Guardian</span>
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 2: CONTAS & CARTÕES                               */}
      {/* ========================================================= */}
      {subView === 'contas-cartoes' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Contas Bancárias */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block">
              Contas Bancárias &amp; Reservas
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FINANCIAL_ACCOUNTS.map((acc) => (
                <div
                  key={acc.id}
                  className="p-5 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-text-muted">
                        {acc.institution}
                      </span>
                      <h3 className="text-base font-bold text-text-primary">
                        {acc.name}
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-secondary text-text-secondary">
                      {acc.liquidity}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-border/40 flex items-baseline justify-between">
                    <span className="text-[11px] font-mono text-text-muted">Saldo Atual</span>
                    <span className="text-2xl font-extrabold font-mono text-text-primary tabular-nums">
                      R$ {acc.balance.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cartões de Crédito */}
          <div className="space-y-3 pt-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block">
              Cartões de Crédito &amp; Limites
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CREDIT_CARDS.map((card) => {
                const usedPct = Math.round((card.currentInvoice / card.limitTotal) * 100);

                return (
                  <div
                    key={card.id}
                    className="p-5 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono uppercase text-text-muted">
                          {card.brand}
                        </span>
                        <h3 className="text-base font-bold text-text-primary">
                          {card.name}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ADE4B5]/40 text-[#1C2420] font-bold uppercase">
                        {card.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between text-xs font-mono">
                        <span className="text-text-muted">Fatura Atual: R$ {card.currentInvoice.toLocaleString('pt-BR')}</span>
                        <span className="font-bold text-text-primary">Limite: R$ {card.limitTotal.toLocaleString('pt-BR')}</span>
                      </div>

                      <div className="w-full bg-surface-secondary h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#1C2420] dark:bg-[#71DBD2] h-full rounded-full transition-all"
                          style={{ width: `${usedPct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-text-muted pt-1">
                        <span>Fecha dia {card.closingDay} · Vence dia {card.dueDay}</span>
                        <span className="font-semibold text-text-secondary">
                          Disponível: R$ {card.availableLimit.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 3: TRANSAÇÕES & MOVIMENTAÇÕES                     */}
      {/* ========================================================= */}
      {subView === 'transacoes' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Barra de Filtro e Busca */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'inflow', label: 'Entradas' },
                { id: 'outflow', label: 'Saídas' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setTxFilter(f.id as any);
                    playFeedback('press');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-mono transition-all border ${
                    txFilter === f.id
                      ? 'bg-[#FAFDF5] border-[#71DBD2] text-text-primary font-bold shadow-subtle'
                      : 'bg-surface border-border/60 text-text-muted hover:text-text-primary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={searchTx}
              onChange={(e) => setSearchTx(e.target.value)}
              placeholder="Buscar por descrição ou categoria..."
              className="px-3.5 py-1.5 rounded-xl bg-surface border border-border/70 text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#71DBD2]"
            />
          </div>

          {/* Lista de Transações */}
          <div className="space-y-3">
            {filteredTransactions.map((tx) => {
              const isInflow = tx.type === 'inflow';

              return (
                <div
                  key={tx.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    tx.isAnomaly
                      ? 'bg-[#FAFDF5] border-[#C45B5B]/50 ring-1 ring-[#C45B5B]/20'
                      : 'bg-surface border-border/70 shadow-calm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-subtle ${
                        isInflow
                          ? 'bg-[#ADE4B5]/40 text-[#1C2420]'
                          : 'bg-surface-secondary text-text-secondary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isInflow ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-surface-secondary text-text-secondary">
                          {tx.category}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted">
                          {tx.date}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted">
                          {tx.account}
                        </span>
                      </div>
                      <h4 className="text-[14px] font-bold text-text-primary">
                        {tx.description}
                      </h4>
                    </div>
                  </div>

                  <div className="text-right flex items-center sm:flex-col justify-between sm:justify-center">
                    <span
                      className={`text-base font-extrabold font-mono tabular-nums ${
                        isInflow ? 'text-[#18534B] dark:text-[#ADE4B5]' : 'text-text-primary'
                      }`}
                    >
                      {isInflow ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>

                    {tx.isAnomaly && (
                      <span className="text-[10px] font-mono text-[#C45B5B] font-bold">
                        Anomalia detectada
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 4: METAS & PLANEJAMENTO                           */}
      {/* ========================================================= */}
      {subView === 'metas' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block">
                Metas Financeiras &amp; Acumulação
              </span>
              <p className="text-[13px] text-text-secondary">
                Objetivos de solvência, investimentos e segurança de longo prazo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FINANCIAL_GOALS.map((goal) => {
              const isCompleted = goal.progressPercent >= 100;

              return (
                <div
                  key={goal.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                    isCompleted
                      ? 'bg-[#FAFDF5] border-[#ADE4B5] shadow-calm'
                      : 'bg-surface border-border/70 shadow-calm'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-text-muted">
                      {goal.category}
                    </span>
                    <h3 className="text-base font-bold text-text-primary">
                      {goal.title}
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between text-xs font-mono">
                      <span className="text-text-muted">
                        R$ {goal.currentAmount.toLocaleString('pt-BR')}
                      </span>
                      <span className="font-bold text-text-primary">
                        Meta: R$ {goal.targetAmount.toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="w-full bg-surface-secondary h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isCompleted ? 'bg-[#ADE4B5]' : 'bg-[#71DBD2]'
                        }`}
                        style={{ width: `${goal.progressPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                      <span className="font-bold text-text-primary">
                        {goal.progressPercent}% atingido
                      </span>
                      <span className="text-text-muted">{goal.deadlineLabel}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 5: ANOMALIAS & PROTEÇÃO GUARDIAN                  */}
      {/* ========================================================= */}
      {subView === 'anomalias' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block">
                Auditoria de Anomalias &amp; Prevenção de Fraudes
              </span>
              <p className="text-[13px] text-text-secondary">
                O Guardian analisa cada débito comparando periodicidade, contratos e padrões de uso.
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {anomalies.map((anom) => {
              const isResolved = anom.status === 'contestado' || anom.status === 'resolvido';

              return (
                <div
                  key={anom.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isResolved
                      ? 'bg-surface border-border/70 shadow-calm opacity-80'
                      : 'bg-[#FAFDF5] border-[#C45B5B]/50 ring-1 ring-[#C45B5B]/20 shadow-calm'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-subtle ${
                        isResolved
                          ? 'bg-[#ADE4B5]/40 text-[#1C2420]'
                          : 'bg-[#C45B5B]/15 text-[#C45B5B]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {isResolved ? 'check_circle' : 'warning'}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-text-muted">
                          {anom.date}
                        </span>
                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                            isResolved
                              ? 'bg-[#ADE4B5]/40 text-[#1C2420]'
                              : 'bg-[#C45B5B]/20 text-[#C45B5B]'
                          }`}
                        >
                          {isResolved ? 'Contestado' : 'Pendente de Ação'}
                        </span>
                      </div>
                      <h4 className="text-[14px] font-bold text-text-primary">
                        {anom.title}
                      </h4>
                      <p className="text-[12px] text-text-secondary">
                        {anom.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
                    <span className="text-base font-mono font-bold text-text-primary">
                      R$ {anom.amount.toFixed(2)}
                    </span>

                    {!isResolved ? (
                      <button
                        type="button"
                        onClick={() => handleResolveAnomalia(anom.id)}
                        className="px-4 py-2 rounded-xl bg-[#71DBD2] hover:bg-[#71DBD2]/90 text-[#1C2420] text-[12px] font-bold transition-transform active:scale-95 shadow-subtle flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">gavel</span>
                        <span>Contestar Estorno</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-mono text-[#ADE4B5] font-semibold">
                        Protocolo L2 ativo
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
