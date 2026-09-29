'use client';

import React, { useMemo } from 'react';
import { DemoBadge } from '../shared/DemoBadge';
import { brl } from '../shared/format';
import { useCountUp } from '../shared/useCountUp';
import { FlowBar } from './FlowBar';
import { buildFinanceView } from './financeView';

function Answer({ index, question, value, note, delay }: { index: number; question: string; value: number; note: string; delay: number }) {
  const shown = useCountUp(value, { delayMs: delay, durationMs: 900 });
  return (
    <li className="fin-answer dm-rise" style={{ ['--i' as string]: index + 1 }}>
      <span className="dm-eyebrow">{question}</span>
      <strong className="dm-num fin-answer-value">{brl(shown)}</strong>
      <span className="dm-faint text-[13px]">{note}</span>
    </li>
  );
}

/**
 * Entrada de Finanças — "fluxo": as quatro perguntas que a tela responde aparecem em sequência,
 * com o número de cada uma contando até o valor real, e o diagrama de distribuição se desenha por
 * último. O diagrama leva `view-transition-name`, então ao entrar na Home ele se move até o lugar
 * dele em vez de a tela simplesmente trocar.
 */
export function FinancasEntrada({ onContinue }: { onContinue: () => void }) {
  const view = useMemo(() => buildFinanceView(), []);
  const first = view.attention[0];

  return (
    <div className="dm-root fin-root fin-intro" data-domain="financas">
      <div className="fin-intro-head dm-rise">
        <div className="flex items-center gap-2">
          <span className="fin-axis-mark" aria-hidden="true" />
          <p className="dm-eyebrow">Finanças · {view.monthLabel} · Organização de Fluxo</p>
        </div>
        <h1 className="dm-title">O dinheiro tem um caminho. Aqui está o seu balanço.</h1>
        <p className="dm-subtitle">Antes de mexer em qualquer número: clareza do que entrou, do que está comprometido e do que permanece livre.</p>
      </div>

      <ol className="fin-answers fin-blueprint-grid">
        <Answer index={0} question="Eixo 01 · Saldo em Conta" value={view.available} note="em conta corrente ativa, sem contar reservas" delay={180} />
        <Answer index={1} question="Eixo 02 · Gasto Realizado" value={view.spent} note={`de ${brl(view.income)} computados no mês`} delay={380} />
        <Answer index={2} question="Eixo 03 · Contas a Vencer" value={view.billsTotal} note={`${view.bills.length} compromisso${view.bills.length === 1 ? '' : 's'} mapeados`} delay={580} />
        <li className="fin-answer dm-rise" style={{ ['--i' as string]: 4 }}>
          <span className="dm-eyebrow">Eixo 04 · Foco & Atenção</span>
          <strong className="fin-answer-text">{first ? first.observation.replace(/(\d{4})-(\d{2})-(\d{2})/g, '$3/$2') : 'Fluxo sob controle absoluto.'}</strong>
          <span className="dm-faint text-[13px]">{view.attention.length > 1 ? `e mais ${view.attention.length - 1} ponto${view.attention.length > 2 ? 's' : ''} sob observação` : 'nenhuma pendência crítica'}</span>
        </li>
      </ol>

      <section className="dm-card dm-card-pad fin-flow-card dm-rise" style={{ ['--i' as string]: 5 }} aria-label="Distribuição do mês">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="dm-h2">Topologia de distribuição do dinheiro</h2>
          <span className="dm-muted text-[13px] font-mono">Balanço matemático exato</span>
        </div>
        <FlowBar view={view} morph />
      </section>

      <div className="fin-intro-foot dm-rise" style={{ ['--i' as string]: 6 }}>
        <button type="button" className="dm-btn" data-variant="primary" onClick={onContinue} autoFocus>
          Acessar Controle Financeiro
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </button>
        <DemoBadge hint="Os números desta introdução são de demonstração: nenhum banco está conectado ainda." />
      </div>
    </div>
  );
}

