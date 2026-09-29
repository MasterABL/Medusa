'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Disclosure } from '../shared/Disclosure';
import { brl, pct, shortDayLabel } from '../shared/format';
import { financeUi, proposeBillPayment, registerGoalContribution, useFinanceFocus } from './financeSession';
import type { ActionOutcome } from './financeSession';
import type { BillView, BudgetView, FinanceView, GoalRow } from './financeView';

/** Abre e rola até o item quando o Context Panel (ou outro ponto) pede foco nele. */
function useFocusOpen(kind: 'bill' | 'budget' | 'goal', id: string) {
  const focus = useFinanceFocus();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const focused = focus?.kind === kind && 'id' in focus && focus.id === id;
  useEffect(() => {
    if (!focused) return;
    setOpen(true);
    ref.current?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    ref.current?.classList.add('fin-flash');
    const t = window.setTimeout(() => ref.current?.classList.remove('fin-flash'), 1400);
    return () => window.clearTimeout(t);
  }, [focused, focus]);
  return { ref, open, setOpen };
}

const STATUS_TEXT: Record<BillView['status'], (d: number) => string> = {
  vencida: (d) => `Venceu há ${Math.abs(d)} dia${Math.abs(d) > 1 ? 's' : ''}`,
  hoje: () => 'Vence hoje',
  a_vencer: (d) => (d === 1 ? 'Vence amanhã' : `Vence em ${d} dias`),
};

export function BillRow({ bill }: { bill: BillView }) {
  const { ref, open, setOpen } = useFocusOpen('bill', bill.commitment.id);
  const [outcome, setOutcome] = useState<ActionOutcome | null>(null);
  const [day, month] = shortDayLabel(bill.dueDate).split('/');

  return (
    <div ref={ref} className="fin-row" id={`fin-bill-${bill.commitment.id}`}>
      <Disclosure
        open={open}
        onOpenChange={setOpen}
        buttonClassName="fin-row-btn"
        summary={
          <span className="fin-row-summary">
            <span className="fin-date" aria-hidden="true">
              <b className="dm-num">{day}</b>
              <i>{month}</i>
            </span>
            <span className="min-w-0 flex-1">
              <strong className="fin-row-title">{bill.commitment.label}</strong>
              <span className="dm-chip" data-tone={bill.status === 'a_vencer' ? undefined : bill.status === 'vencida' ? 'alert' : 'accent'}>
                {bill.status !== 'a_vencer' && <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 13 }}>schedule</span>}
                {STATUS_TEXT[bill.status](bill.daysUntil)}
              </span>
            </span>
            <strong className="dm-num fin-row-amount">{brl(bill.commitment.expectedAmount, { cents: true })}</strong>
          </span>
        }
      >
        <div className="fin-row-detail">
          <p className="dm-muted text-[13px]">Repete todo mês, no dia {bill.commitment.dueDayOfMonth}. O valor é o esperado — o real pode variar.</p>
          {outcome ? (
            <p className="fin-outcome" role="status">
              <span className="material-symbols-outlined" aria-hidden="true">hourglass_top</span>
              <span>Pedido criado e <strong>aguardando sua aprovação</strong> em “Aguardando sua decisão”. Nenhum dinheiro foi movido — pagamentos exigem sua aprovação, sempre.</span>
            </p>
          ) : (
            <button
              type="button"
              className="dm-btn"
              data-size="sm"
              onClick={() => setOutcome(proposeBillPayment({ commitmentId: bill.commitment.id, label: bill.commitment.label, amount: bill.commitment.expectedAmount }))}
            >
              <span className="material-symbols-outlined" aria-hidden="true">outbox</span>
              Propor pagamento
            </button>
          )}
        </div>
      </Disclosure>
    </div>
  );
}

const BUDGET_STATE: Record<BudgetView['consumption']['state'], { text: string; tone: 'ok' | 'near' | 'over' }> = {
  dentro_do_limite: { text: 'Dentro do limite', tone: 'ok' },
  proximo_do_limite: { text: 'Perto do limite', tone: 'near' },
  estourado: { text: 'Limite ultrapassado', tone: 'over' },
};

export function BudgetRow({ view }: { view: BudgetView }) {
  const { ref, open, setOpen } = useFocusOpen('budget', view.budget.id);
  const c = view.consumption;
  const state = BUDGET_STATE[c.state];
  return (
    <div ref={ref} className="fin-row" id={`fin-budget-${view.budget.id}`}>
      <Disclosure
        open={open}
        onOpenChange={setOpen}
        buttonClassName="fin-row-btn"
        summary={
          <span className="fin-budget-summary">
            <span className="flex items-baseline justify-between gap-3">
              <strong className="fin-row-title">{view.categoryName}</strong>
              <span className="dm-num dm-muted text-[13px]">{pct(c.percentUsed)}</span>
            </span>
            <span className="dm-bar" aria-hidden="true">
              <i data-tone={state.tone === 'over' ? 'alert' : state.tone === 'near' ? 'accent' : undefined} style={{ width: `${Math.min(100, c.percentUsed * 100)}%` }} />
            </span>
            <span className="flex items-center justify-between gap-3 text-[12px]">
              <span className="dm-muted dm-num">
                {brl(c.consumedAmount)} de {brl(view.budget.limitAmount)}
              </span>
              <span className={state.tone === 'over' ? 'dm-alert-text font-semibold' : state.tone === 'near' ? 'font-semibold' : 'dm-faint'}>
                {state.tone !== 'ok' && '● '}
                {c.remainingAmount >= 0 ? `Resta ${brl(c.remainingAmount)}` : `Passou ${brl(-c.remainingAmount)}`}
              </span>
            </span>
          </span>
        }
      >
        <div className="fin-row-detail">
          <p className="dm-eyebrow">{state.text} · lançamentos do mês</p>
          {view.transactions.length === 0 ? (
            <p className="dm-muted text-[13px]">Nenhum gasto nesta categoria ainda.</p>
          ) : (
            <ul className="fin-txn-list">
              {view.transactions.map((t) => (
                <li key={t.id}>
                  <span className="dm-faint dm-num">{shortDayLabel(t.occurredAt)}</span>
                  <span className="min-w-0 flex-1 truncate">{t.description}</span>
                  <span className="dm-num">{brl(t.amount, { cents: true })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Disclosure>
    </div>
  );
}

const TRACK_TEXT: Record<GoalRow['track'], string> = {
  no_prazo: 'No ritmo do prazo',
  fora_do_prazo: 'Abaixo do ritmo do prazo',
  sem_prazo_definido: 'Sem prazo definido',
  concluido: 'Concluída',
};

export function GoalRowView({ row }: { row: GoalRow }) {
  const { ref, open, setOpen } = useFocusOpen('goal', row.goal.id);
  const [raw, setRaw] = useState('');
  const [outcome, setOutcome] = useState<ActionOutcome | null>(null);
  const amount = Number(raw.replace(/\./g, '').replace(',', '.'));
  const valid = Number.isFinite(amount) && amount > 0;
  const g = row.goal;

  return (
    <div ref={ref} className="fin-row" id={`fin-goal-${g.id}`}>
      <Disclosure
        open={open}
        onOpenChange={setOpen}
        buttonClassName="fin-row-btn"
        summary={
          <span className="fin-budget-summary">
            <span className="flex items-baseline justify-between gap-3">
              <strong className="fin-row-title">{g.label}</strong>
              <span className="dm-chip" data-tone={row.track === 'fora_do_prazo' ? 'accent' : row.track === 'concluido' ? 'support' : undefined}>
                {TRACK_TEXT[row.track]}
              </span>
            </span>
            <span className="dm-bar" aria-hidden="true">
              <i data-tone="primary" style={{ width: `${row.progress * 100}%` }} />
            </span>
            <span className="flex items-center justify-between gap-3 text-[12px]">
              <span className="dm-muted dm-num">
                {brl(g.currentAmount)} de {brl(g.targetAmount)} · {pct(row.progress)}
              </span>
              <span className="dm-faint dm-num">Faltam {brl(row.remaining)}</span>
            </span>
          </span>
        }
      >
        <div className="fin-row-detail">
          {g.targetDate && <p className="dm-muted text-[13px]">Prazo: {g.targetDate.split('-').reverse().join('/')}. O ritmo compara o que foi guardado com o que seria preciso, em linha reta, até essa data.</p>}
          {g.milestones.length > 0 && (
            <ul className="fin-milestones">
              {g.milestones.map((m) => (
                <li key={m.id} data-done={m.achieved}>
                  <span className="material-symbols-outlined" aria-hidden="true">{m.achieved ? 'check_circle' : 'radio_button_unchecked'}</span>
                  {m.label} · {brl(m.targetAmount)} <span className="sr-only">{m.achieved ? '(atingido)' : '(a atingir)'}</span>
                </li>
              ))}
            </ul>
          )}
          {outcome ? (
            <p className="fin-outcome" role="status">
              <span className="material-symbols-outlined" aria-hidden="true">{outcome.route === 'automatica' ? 'check_circle' : 'hourglass_top'}</span>
              <span>{outcome.route === 'automatica' ? 'Aporte registrado.' : <>Aporte <strong>aguardando sua aprovação</strong> em “Aguardando sua decisão”; a meta só muda depois.</>}</span>
            </p>
          ) : (
            <form
              className="fin-contrib"
              onSubmit={(e) => {
                e.preventDefault();
                if (!valid) return;
                setOutcome(registerGoalContribution(g.id, amount));
                setRaw('');
              }}
            >
              <label className="dm-eyebrow" htmlFor={`contrib-${g.id}`}>Registrar aporte</label>
              <div className="fin-sim-row">
                <span className="dm-muted" aria-hidden="true">R$</span>
                <input id={`contrib-${g.id}`} className="dm-field" inputMode="decimal" placeholder="0,00" value={raw} onChange={(e) => setRaw(e.target.value)} />
                <button type="submit" className="dm-btn" data-size="sm" data-variant="primary" disabled={!valid}>Registrar</button>
              </div>
            </form>
          )}
        </div>
      </Disclosure>
    </div>
  );
}

/** O domínio devolve datas em ISO dentro do texto; na tela vão como dd/mm. */
const prettyDates = (text: string) => text.replace(/(\d{4})-(\d{2})-(\d{2})/g, '$3/$2');

export function AttentionCard({ view }: { view: FinanceView }) {
  const [top, ...rest] = view.attention;
  if (!top) {
    return (
      <section className="dm-card dm-card-pad fin-attention" data-calm="true" aria-label="O que merece atenção">
        <span className="material-symbols-outlined dm-accent-text" aria-hidden="true">task_alt</span>
        <div>
          <p className="dm-eyebrow">O que merece atenção</p>
          <p className="fin-attention-text">Nada pede sua atenção agora.</p>
          <p className="dm-muted text-[13px]">Nenhum orçamento perto do limite, nenhuma conta vencendo nos próximos 3 dias.</p>
        </div>
      </section>
    );
  }
  return (
    <section className="dm-card dm-card-pad fin-attention" data-severity={top.type === 'cashflow_negative' || (top.type === 'budget_near_limit' && top.severity === 'alta') ? 'alta' : 'atencao'} aria-label="O que merece atenção">
      <span className="material-symbols-outlined fin-attention-icon" aria-hidden="true">{top.type === 'recurring_commitment_due' ? 'event_upcoming' : top.severity === 'alta' ? 'priority_high' : 'notifications_active'}</span>
      <div className="min-w-0 flex-1">
        <p className="dm-eyebrow">O que merece atenção · {top.severity === 'alta' ? 'prioridade alta' : 'prioridade moderada'}</p>
        <p className="fin-attention-text">{prettyDates(top.observation)}</p>
        {top.impact && <p className="dm-muted text-[13px]">{top.impact}</p>}
        <Disclosure summary={<span className="dm-btn" data-variant="quiet" data-size="sm" style={{ paddingInline: 0 }}>Ver evidência{rest.length > 0 ? ` e mais ${rest.length}` : ''}</span>} chevron={false} className="mt-2">
          <div className="fin-row-detail">
            <ul className="fin-evidence">
              {top.evidence.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <p className="dm-faint text-[12px]">Confiança {pct(top.confidence)} — cálculo direto sobre lançamentos e compromissos cadastrados.</p>
            {rest.length > 0 && (
              <>
                <p className="dm-eyebrow mt-2">Também observado</p>
                <ul className="fin-evidence">
                  {rest.map((r) => (
                    <li key={r.id}>{prettyDates(r.observation)}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Disclosure>
      </div>
    </section>
  );
}

export { financeUi };
