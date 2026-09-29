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
        <p className="dm-eyebrow">Finanças · {view.monthLabel}</p>
        <h1 className="dm-title">Antes de mexer em qualquer coisa, quatro respostas.</h1>
        <p className="dm-subtitle">Tudo aqui vem dos lançamentos e compromissos registrados — nada é estimado às cegas.</p>
      </div>

      <ol className="fin-answers">
        <Answer index={0} question="Quanto tenho" value={view.available} note="em conta, sem contar a reserva" delay={200} />
        <Answer index={1} question="Quanto gastei" value={view.spent} note={`de ${brl(view.income)} que entraram`} delay={450} />
        <Answer index={2} question="O que falta pagar" value={view.billsTotal} note={`${view.bills.length} conta${view.bills.length === 1 ? '' : 's'} até o fim do mês`} delay={700} />
        <li className="fin-answer dm-rise" style={{ ['--i' as string]: 4 }}>
          <span className="dm-eyebrow">O que merece atenção</span>
          <strong className="fin-answer-text">{first ? first.observation.replace(/(\d{4})-(\d{2})-(\d{2})/g, '$3/$2') : 'Nada pede atenção agora.'}</strong>
          <span className="dm-faint text-[13px]">{view.attention.length > 1 ? `e mais ${view.attention.length - 1} ponto${view.attention.length > 2 ? 's' : ''}` : ' '}</span>
        </li>
      </ol>

      <section className="dm-card dm-card-pad fin-flow-card dm-rise" style={{ ['--i' as string]: 5 }} aria-label="Distribuição do mês">
        <h2 className="dm-h2">É assim que o mês se distribui</h2>
        <FlowBar view={view} morph />
      </section>

      <div className="fin-intro-foot dm-rise" style={{ ['--i' as string]: 6 }}>
        <button type="button" className="dm-btn" data-variant="primary" onClick={onContinue} autoFocus>
          Ver meu mês
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </button>
        <DemoBadge hint="Os números desta introdução são de demonstração: nenhum banco está conectado ainda." />
      </div>
    </div>
  );
}
