'use client';

import React, { useMemo } from 'react';
import { Disclosure } from '../shared/Disclosure';
import { DemoBadge } from '../shared/DemoBadge';
import { DomainHeader } from '../shared/DomainHeader';
import { PendingApprovals } from '../shared/PendingApprovals';
import { brl } from '../shared/format';
import { FlowBar } from './FlowBar';
import { SafeMarginSimulator } from './SafeMarginSimulator';
import { AttentionCard, BillRow, BudgetRow, GoalRowView } from './FinancasSections';
import { buildFinanceView } from './financeView';
import { executeApprovedFinanceAction, focusFinance, notifyFinanceChanged, useFinanceState } from './financeSession';

export function FinancasHome({ onReplayIntro }: { onReplayIntro: () => void }) {
  const { version } = useFinanceState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const view = useMemo(() => buildFinanceView(), [version]);
  const [simulatedExpense, setSimulatedExpense] = React.useState(0);
  const overdrawn = view.free < 0;

  const title = overdrawn ? (
    <>Faltam <span className="dm-num fin-alert-num">{brl(-view.free)}</span> para fechar {view.monthLabel.split(' ')[0]}.</>
  ) : (
    <>Você ainda pode gastar <span className="dm-num dm-accent-text">{brl(view.free)}</span> em {view.monthLabel.split(' ')[0]}.</>
  );

  return (
    <div className="dm-root fin-root" data-domain="financas">
      <DomainHeader
        eyebrow={`Finanças · ${view.monthLabel}`}
        title={title}
        subtitle={
          overdrawn
            ? 'Entradas menos o que já foi gasto e o que ainda falta pagar não fecham o mês. Veja abaixo onde há folga.'
            : `Sobra do mês = entradas − gasto − contas que faltam pagar. Isso dá ${brl(view.dailyMargin)} por dia nos ${view.daysLeft} dias que restam.`
        }
        aside={
          <>
            <DemoBadge hint="Os lançamentos, contas e metas desta tela são exemplos gerados para mostrar o produto. Nenhum banco está conectado." />
            <button type="button" className="dm-btn" data-variant="quiet" data-size="sm" onClick={onReplayIntro}>
              <span className="material-symbols-outlined" aria-hidden="true">replay</span>
              Rever introdução
            </button>
          </>
        }
      />

      {/* Primeira dobra: Ledger Deck geométrico estruturado */}
      <section aria-label="Balanço estruturado do mês" className="fin-balance-deck dm-rise" style={{ ['--i' as string]: 0 }}>
        <div className="fin-deck-grid">
          <div className="fin-deck-cell">
            <span className="fin-cell-axis" aria-hidden="true" />
            <p className="dm-eyebrow">Saldo em conta</p>
            <p className="fin-tile-value dm-num">{brl(view.available)}</p>
            <p className="dm-faint text-[12px]">{brl(view.saved)} guardados em reserva</p>
          </div>
          <div className="fin-deck-cell">
            <span className="fin-cell-axis" aria-hidden="true" />
            <p className="dm-eyebrow">Recebido no mês</p>
            <p className="fin-tile-value dm-num">{brl(view.income)}</p>
            <p className="dm-faint text-[12px]">entradas de {view.monthLabel.split(' ')[0]}</p>
          </div>
          <div className="fin-deck-cell">
            <span className="fin-cell-axis" aria-hidden="true" />
            <p className="dm-eyebrow">Gasto no mês</p>
            <p className="fin-tile-value dm-num">{brl(view.spent)}</p>
            <p className="dm-faint text-[12px] dm-num">{view.income > 0 ? Math.round((view.spent / view.income) * 100) : 0}% do que entrou</p>
          </div>
          <button
            type="button"
            className="fin-deck-cell fin-deck-btn"
            onClick={() => (view.bills[0] ? focusFinance({ kind: 'bill', id: view.bills[0].commitment.id }) : undefined)}
            disabled={view.bills.length === 0}
          >
            <span className="fin-cell-axis" aria-hidden="true" />
            <div className="flex items-center justify-between">
              <p className="dm-eyebrow">Falta pagar</p>
              <span className="material-symbols-outlined text-[16px] text-text-muted" aria-hidden="true">arrow_forward</span>
            </div>
            <p className="fin-tile-value dm-num">{brl(view.billsTotal)}</p>
            <p className="dm-faint text-[12px]">{view.bills.length === 0 ? 'nenhuma conta pendente' : `${view.bills.length} conta${view.bills.length > 1 ? 's' : ''} · ver próxima`}</p>
          </button>
        </div>
      </section>

      <div className="dm-rise" style={{ ['--i' as string]: 1 }}>
        <AttentionCard view={view} />
      </div>

      <PendingApprovals domain="finance" version={version} execute={executeApprovedFinanceAction} onChanged={notifyFinanceChanged} />

      {/* Fluxo Financeiro Contínuo com simulador dinâmico */}
      <section className="dm-card dm-card-pad fin-flow-card dm-rise" style={{ ['--i' as string]: 2 }} aria-label="Distribuição do mês">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <h2 className="dm-h2">Para onde vai o que entra</h2>
            <p className="dm-muted text-[13px] mt-0.5">O caminho do dinheiro pelo sistema: entradas, compromissos fixos e margem diária livre.</p>
          </div>
          <span className="dm-muted text-[13px] font-mono">
            Entradas de {view.monthLabel.split(' ')[0]}: <strong className="dm-num font-bold">{brl(view.income)}</strong>
          </span>
        </div>
        <FlowBar view={view} morph simulatedExpense={simulatedExpense} />
        <Disclosure summary={<span className="dm-btn" data-variant="quiet" data-size="sm" style={{ paddingInline: 0 }}><span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>calculate</span>Decidir um gasto agora</span>} chevron={false}>
          <SafeMarginSimulator view={view} onSimulate={setSimulatedExpense} />
        </Disclosure>
      </section>

      <div className="fin-cols">
        <section className="dm-card dm-card-pad dm-rise" style={{ ['--i' as string]: 3 }} aria-label="Contas a pagar">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="dm-h2">Contas a pagar</h2>
            <span className="dm-muted text-[13px] dm-num">{brl(view.billsTotal)}</span>
          </div>
          {view.bills.length === 0 ? (
            <p className="dm-muted text-[13px] mt-3">Tudo o que estava cadastrado para este mês já foi pago.</p>
          ) : (
            <div className="fin-list">{view.bills.map((b) => <BillRow key={b.commitment.id} bill={b} />)}</div>
          )}
        </section>

        <section className="dm-card dm-card-pad dm-rise" style={{ ['--i' as string]: 4 }} aria-label="Orçamentos do mês">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="dm-h2">Orçamentos do mês</h2>
            <span className="dm-muted text-[13px]">{view.daysLeft} dias restantes</span>
          </div>
          <div className="fin-list">{view.budgets.map((b) => <BudgetRow key={b.budget.id} view={b} />)}</div>
        </section>
      </div>

      <div className="fin-cols">
        <section className="dm-card dm-card-pad dm-rise" style={{ ['--i' as string]: 5 }} aria-label="Metas">
          <h2 className="dm-h2">Metas</h2>
          <div className="fin-list">{view.goals.map((g) => <GoalRowView key={g.goal.id} row={g} />)}</div>
        </section>

        <section className="dm-card dm-card-pad dm-rise" style={{ ['--i' as string]: 6 }} aria-label="Assinaturas detectadas">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="dm-h2">Assinaturas detectadas</h2>
            <span className="dm-muted text-[13px] dm-num">{brl(view.subscriptionsTotal, { cents: true })}/mês</span>
          </div>
          {view.subscriptions.length === 0 ? (
            <p className="dm-muted text-[13px] mt-3">Ainda não há repetições suficientes para reconhecer uma assinatura.</p>
          ) : (
            <ul className="fin-subs">
              {view.subscriptions.map((s) => (
                <li key={s.label}>
                  <span className="min-w-0 flex-1 truncate">{s.label}</span>
                  <span className="dm-faint text-[12px]">{s.occurrences} cobranças</span>
                  <span className="dm-num">{brl(s.monthlyAmount, { cents: true })}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="dm-faint text-[12px] mt-3">Reconhecidas por heurística de recorrência (intervalo entre cobranças parecidas), não por confirmação do banco.</p>
        </section>
      </div>
    </div>
  );
}
