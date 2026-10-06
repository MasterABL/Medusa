'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { getReconciledFinanceData } from './financeBridge';
import { useShell } from '@/context/ShellContext';
import { playFeedback } from '@/lib/audioFeedback';

export function FinanceContainer() {
  const reconciled = useMemo(() => getReconciledFinanceData(), []);
  const { triggerIslandNotification } = useShell();

  // Estados Interativos de Simulação e Gavetas
  const [simulatedExpense, setSimulatedExpense] = useState<number>(0);
  const [activeDrawer, setActiveDrawer] = useState<'nenhuma' | 'origens' | 'compromissos' | 'sustento'>('nenhuma');
  const [anomaliaResolvida, setAnomaliaResolvida] = useState<boolean>(false);

  // Recálculo dinâmico baseado no simulador de decisão
  const effectiveComprometido = reconciled.comprometidoTotal + simulatedExpense;
  const effectiveLivre = Math.max(0, reconciled.tenhoTotal - effectiveComprometido);
  const effectiveLivrePercent = reconciled.tenhoTotal > 0
    ? Math.round((effectiveLivre / reconciled.tenhoTotal) * 100)
    : 0;

  const dailyBurn = (effectiveComprometido / 30) || 1;
  const simulatedRunwayDays = Math.round(reconciled.tenhoTotal / dailyBurn);
  const marginPerDay = Math.round(effectiveLivre / 30);

  // Ação de estorno da anomalia financeira (em 1 clique)
  const handleResolveAnomalia = useCallback(() => {
    setAnomaliaResolvida(true);
    playFeedback('success');
    triggerIslandNotification({
      title: 'Contestação Enviada',
      tag: 'FINANÇAS & SEGURANÇA',
      description: 'Estorno de R$ 89,90 solicitado ao emissor do cartão com sucesso.',
      badge: 'ESTORNO ATIVO',
      state: 'active',
      durationMs: 4000,
    });
  }, [triggerIslandNotification]);

  const toggleDrawer = useCallback((drawer: 'origens' | 'compromissos' | 'sustento') => {
    setActiveDrawer((prev) => (prev === drawer ? 'nenhuma' : drawer));
    playFeedback('press');
  }, []);

  return (
    <main
      className="w-full pb-20 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col gap-8 pt-6 flex-1 study-stage-enter"
      aria-label="Comando Financeiro Pessoal"
    >
      {/* 1. CABEÇALHO LIMPO E COMPACTO */}
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
            Fluxo, Equilíbrio &amp; Decisão
          </h1>
        </div>

        <div className="flex items-center gap-2 text-[12px] font-mono text-text-secondary bg-surface px-3 py-1.5 rounded-full border border-border/60 shadow-subtle">
          <span className="material-symbols-outlined text-[16px] text-[#71DBD2]">verified</span>
          <span>Runway: {simulatedRunwayDays} dias</span>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. CENTRO DA EXPERIÊNCIA: UMA COMPOSIÇÃO ÚNICA                */}
      {/*    QUANTO TENHO? → COMPROMETIDO vs LIVRE → SIMULADOR          */}
      {/* ============================================================== */}
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

        {/* B. BARRA DE EQUILÍBRIO PROPORCIONAL CONTÍNUA: COMPROMETIDO vs LIVRE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <button
              type="button"
              onClick={() => toggleDrawer('compromissos')}
              className="flex items-center gap-2 group hover:opacity-100"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFF18C] border border-amber-400" />
              <span className="uppercase text-text-muted group-hover:text-text-primary">
                2. Comprometido: R$ {effectiveComprometido.toLocaleString('pt-BR')}
              </span>
              <span className="text-[#71DBD2] text-[10px]">
                {activeDrawer === 'compromissos' ? '▲' : '▼ detalhes'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => toggleDrawer('sustento')}
              className="flex items-center gap-2 group hover:opacity-100"
            >
              <span className="uppercase text-text-muted group-hover:text-text-primary">
                3. Livre: R$ {effectiveLivre.toLocaleString('pt-BR')} ({effectiveLivrePercent}%)
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#71DBD2]" />
              <span className="text-[#71DBD2] text-[10px]">
                {activeDrawer === 'sustento' ? '▲' : '▼ margem'}
              </span>
            </button>
          </div>

          {/* A Barra Contínua Viva */}
          <div className="w-full h-5 rounded-xl bg-surface-secondary/70 overflow-hidden flex items-stretch p-0.5 border border-border/60 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-[#FFF18C] to-[#FFF18C]/80 rounded-l-lg transition-all duration-300"
              style={{ width: `${Math.min(100, Math.round((effectiveComprometido / reconciled.tenhoTotal) * 100))}%` }}
              title={`Comprometido: R$ ${effectiveComprometido.toLocaleString('pt-BR')}`}
            />
            <div
              className="h-full bg-gradient-to-r from-[#ADE4B5] to-[#71DBD2] rounded-r-lg transition-all duration-300 flex-1"
              title={`Livre: R$ ${effectiveLivre.toLocaleString('pt-BR')}`}
            />
          </div>
        </div>

        {/* GAVETA DE COMPROMISSOS (QUANDO ABERTA) */}
        {activeDrawer === 'compromissos' && (
          <div className="p-4 rounded-2xl bg-surface-secondary/30 border border-border/60 flex flex-col gap-2.5 animate-in fade-in duration-200">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Compromissos Recorrentes e Faturas Ativas
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-surface border border-border/60 flex justify-between items-center text-[12px]">
                <span>Aluguel &amp; Condomínio</span>
                <span className="font-mono font-bold text-text-primary">R$ 4.300</span>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border/60 flex justify-between items-center text-[12px]">
                <span>Plano de Saúde</span>
                <span className="font-mono font-bold text-text-primary">R$ 1.120</span>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border/60 flex justify-between items-center text-[12px]">
                <span>Energia &amp; Fibra</span>
                <span className="font-mono font-bold text-text-primary">R$ 480</span>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border/60 flex justify-between items-center text-[12px]">
                <span>Cartão Corporativo (Fatura)</span>
                <span className="font-mono font-bold text-text-primary">R$ 1.850</span>
              </div>
            </div>
          </div>
        )}

        {/* GAVETA DE SUSTENTO & MARGEM DIÁRIA (QUANDO ABERTA) */}
        {activeDrawer === 'sustento' && (
          <div className="p-4 rounded-2xl bg-surface-secondary/30 border border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
            <div className="p-3.5 rounded-xl bg-surface border border-border/60">
              <span className="text-[10px] font-mono uppercase text-text-muted">Margem por Dia</span>
              <div className="text-xl font-bold font-mono text-[#71DBD2] mt-0.5">
                R$ {marginPerDay} / dia
              </div>
              <span className="text-[10px] text-text-muted">Próximos 30 dias</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-border/60">
              <span className="text-[10px] font-mono uppercase text-text-muted">Autonomia / Runway</span>
              <div className="text-xl font-bold font-mono text-text-primary mt-0.5">
                {simulatedRunwayDays} dias
              </div>
              <span className="text-[10px] text-emerald-800">Sem queimar reservas</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-border/60">
              <span className="text-[10px] font-mono uppercase text-text-muted">Taxa de Margem</span>
              <div className="text-xl font-bold font-mono text-text-primary mt-0.5">
                {effectiveLivrePercent}%
              </div>
              <span className="text-[10px] text-text-muted">Segura acima de 20%</span>
            </div>
          </div>
        )}

        {/* C. SIMULADOR DE DECISÃO INTEGRADO ("E SE EU TOMAR UMA DECISÃO?") */}
        <div className="p-5 rounded-2xl bg-surface-secondary/30 border border-border/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71DBD2] font-bold block">
                Simulador de Decisão · Impacto Instantâneo
              </span>
              <h3 className="text-[14px] font-bold text-text-primary">
                E se eu realizar um gasto eventual hoje?
              </h3>
            </div>
            <span className="text-[14px] font-mono font-bold text-text-primary bg-surface px-3 py-1 rounded-xl border border-border/60">
              {simulatedExpense === 0 ? 'Sem gasto simulado' : `Gasto simulado: R$ ${simulatedExpense.toLocaleString('pt-BR')}`}
            </span>
          </div>

          {/* Botões rápidos de decisão */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {[0, 500, 1500, 3000, 5000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setSimulatedExpense(val);
                  playFeedback('press');
                }}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-mono font-semibold transition-all border ${
                  simulatedExpense === val
                    ? 'bg-[#71DBD2] text-[#1C2420] border-[#71DBD2] shadow-subtle'
                    : 'bg-surface border-border/70 text-text-muted hover:text-text-primary'
                }`}
              >
                {val === 0 ? 'Zerar' : `+R$ ${val}`}
              </button>
            ))}
          </div>

          {simulatedExpense > 0 && (
            <div className="text-[11px] font-mono text-text-secondary pt-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-[15px] text-[#71DBD2]">info</span>
              <span>
                Com R$ {simulatedExpense.toLocaleString('pt-BR')} adicionais, seu capital livre passa a ser R$ {effectiveLivre.toLocaleString('pt-BR')} ({simulatedRunwayDays} dias de runway).
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. O QUE VEM DEPOIS? & RADAR DE ATENÇÃO (UMA LINHA HARMONIOSA) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* O QUE VEM DEPOIS? (PRÓXIMOS VENCIMENTOS) */}
        <section aria-label="O que vem depois" className="flex flex-col gap-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
            4. O que vem depois? · Vencimentos Iminentes
          </span>

          <div className="p-5 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col justify-between gap-3 h-full">
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-surface-secondary/40 border border-border/60 flex items-center justify-between">
                <div>
                  <h4 className="text-[13px] font-semibold text-text-primary">SaaS Cloud Sync</h4>
                  <span className="text-[10px] font-mono text-text-muted">Vence em 4 dias (22 Out)</span>
                </div>
                <span className="text-[13px] font-mono font-bold text-text-primary">
                  R$ 89,90
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-secondary/40 border border-border/60 flex items-center justify-between">
                <div>
                  <h4 className="text-[13px] font-semibold text-text-primary">Energia Elétrica &amp; Fibra</h4>
                  <span className="text-[10px] font-mono text-text-muted">Vence em 8 dias (26 Out)</span>
                </div>
                <span className="text-[13px] font-mono font-bold text-text-primary">
                  R$ 480,00
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-secondary/40 border border-border/60 flex items-center justify-between">
                <div>
                  <h4 className="text-[13px] font-semibold text-text-primary">Aluguel &amp; Condomínio</h4>
                  <span className="text-[10px] font-mono text-text-muted">Vence em 15 dias (03 Nov)</span>
                </div>
                <span className="text-[13px] font-mono font-bold text-text-primary">
                  R$ 4.300,00
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 text-[11px] font-mono text-text-muted flex justify-between">
              <span>Agendamento Automático</span>
              <span className="text-emerald-700">100% Coberto pelo Saldo</span>
            </div>
          </div>
        </section>

        {/* EXISTE ALGO ESTRANHO? (RADAR DE ATENÇÃO) */}
        <section aria-label="Existe algo estranho" className="flex flex-col gap-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
            5. Existe algo estranho? · Radar Guardian
          </span>

          {!anomaliaResolvida ? (
            <div className="p-5 rounded-2xl bg-[#FFF18C]/20 border border-[#FFF18C]/70 shadow-calm flex flex-col justify-between gap-4 h-full">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#9E6500]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9E6500] animate-ping" />
                    Anomalia Detectada
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#9E6500]">
                    R$ 89,90 Duplicado
                  </span>
                </div>
                <h4 className="text-[15px] font-bold text-text-primary">
                  Cobrança Repetida: SaaS Cloud Sync
                </h4>
                <p className="text-[12px] text-text-secondary leading-snug">
                  Dois lançamentos idênticos registrados na fatura com 4 minutos de intervalo. Possível erro de gateway.
                </p>
              </div>

              <div className="pt-2 border-t border-[#FFF18C]/40 flex items-center justify-between">
                <span className="text-[11px] font-mono text-text-muted">Ação L2 sugerida</span>
                <button
                  type="button"
                  onClick={handleResolveAnomalia}
                  className="px-4 py-2 rounded-xl bg-[#FFF18C] hover:bg-[#FFF18C]/90 text-[#1C2420] text-[12px] font-bold transition-transform active:scale-95 flex items-center gap-1.5 shadow-subtle"
                >
                  <span className="material-symbols-outlined text-[16px]">undo</span>
                  <span>Solicitar Estorno com 1 toque</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col justify-between gap-3 h-full">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-text-muted">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-800 font-bold">
                    Radar Limpo &amp; Protegido
                  </span>
                </div>
                <h4 className="text-[14px] font-semibold text-text-primary">
                  Nenhuma anomalia ativa
                </h4>
                <p className="text-[12px] text-text-muted">
                  Cobrança duplicada de R$ 89,90 estornada. Faturas e assinaturas auditadas sem duplicidades.
                </p>
              </div>

              <div className="pt-2 border-t border-border/50 text-[11px] font-mono text-text-muted flex justify-between">
                <span>Proteção Contínua</span>
                <span className="text-emerald-700">Integridade D+0</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
