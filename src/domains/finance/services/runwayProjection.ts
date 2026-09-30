/**
 * MEDUSA — Finance — Projeção mensal com premissas explícitas
 *
 * Reaproveita `projectCashflow` (compromissos recorrentes, já existente) e
 * soma o que ele não conhece: faturas com vencimento no período e ritmo de
 * gasto variável. Sai sempre como `estimativa` com as próprias premissas —
 * nunca como saldo.
 */

import type { RecurringCommitment, Transaction, FinancialAccount } from '../model/types';
import type { Assumption, FinanceSnapshot, ForecastConfidence, ProjectionWithAssumptions } from '../model/statements';
import { occurrencesInWindow, isOccurrenceSettled } from './obligations';
import { buildInvoices } from './invoiceEngine';

function addMonths(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

export function projectWithAssumptions(input: {
  snapshot: FinanceSnapshot;
  accounts: FinancialAccount[];
  transactions: Transaction[];
  commitments: RecurringCommitment[];
  monthsAhead: number;
}): ProjectionWithAssumptions {
  const { snapshot, monthsAhead } = input;
  const start = snapshot.tenho.total;
  const fromDate = snapshot.asOf;

  const cards = input.accounts.filter((a) => a.active && a.type === 'credit_card' && a.currency === snapshot.currency);
  const invoices = cards.flatMap((c) => buildInvoices(c, input.transactions, fromDate)).filter((i) => i.total > 0);
  const monthlyVariable = snapshot.sustento.dailyBurn !== undefined ? snapshot.sustento.dailyBurn * 30 : 0;

  let running = start;
  const points = Array.from({ length: monthsAhead }, (_, idx) => {
    const periodStart = addMonths(fromDate, idx);
    const periodEnd = addMonths(fromDate, idx + 1);
    const lastDay = new Date(Date.parse(`${periodEnd}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

    // Recorrentes: ocorrências do período ainda NÃO acertadas (o saldo de hoje já reflete as pagas).
    // Não usa `projectCashflow` porque ele desconhece acerto e contaria de novo uma conta já paga este mês.
    const recurringParts: string[] = [];
    let recurringDelta = 0;
    for (const c of input.commitments.filter((x) => x.active)) {
      for (const due of occurrencesInWindow(c, periodStart, lastDay)) {
        if (isOccurrenceSettled(c, due, input.transactions)) continue;
        recurringDelta += c.type === 'income' ? c.expectedAmount : -c.expectedAmount;
        recurringParts.push(`${c.label} (${c.type === 'income' ? '+' : '-'}${c.expectedAmount})`);
      }
    }

    const due = invoices.filter((i) => (i.dueDate ? i.dueDate >= periodStart && i.dueDate < periodEnd : i.month === periodStart.slice(0, 7)));
    const invoiceTotal = due.reduce((s, i) => s + i.total, 0);

    running = Math.round((running + recurringDelta - invoiceTotal - monthlyVariable) * 100) / 100;
    const basis = [
      recurringParts.length > 0 ? `Compromissos recorrentes: ${recurringParts.join(', ')}` : 'Nenhum compromisso recorrente pendente no período',
      invoiceTotal > 0 ? `Faturas no período: -${invoiceTotal.toFixed(2)}` : 'Nenhuma fatura conhecida no período',
      monthlyVariable > 0 ? `Gasto variável estimado: -${monthlyVariable.toFixed(2)}` : 'Sem ritmo de gasto variável conhecido',
    ].join('. ');
    return { periodLabel: periodStart.slice(0, 7), projectedBalance: running, basis };
  });

  const assumptions: Assumption[] = [
    { key: 'ponto_de_partida', text: `Parte do Tenho de hoje (${start.toFixed(2)} ${snapshot.currency}).` },
    { key: 'recorrentes', text: 'Só compromissos recorrentes CADASTRADOS entram; o que não está cadastrado não existe na projeção.' },
    { key: 'variavel', text: snapshot.sustento.dailyBurn !== undefined ? `Gasto variável repete o ritmo observado (${snapshot.sustento.dailyBurn.toFixed(2)}/dia × 30).` : 'Sem ritmo observado: gasto variável não entra.' },
    { key: 'faturas', text: 'Faturas conhecidas (inclusive parcelas projetadas) saem no mês do vencimento; se cadastrar a fatura como conta fixa, evite duplicar.' },
    { key: 'regime_caixa', text: 'Regime de caixa: compras no cartão contam quando a fatura vence, não na data da compra.' },
  ];

  const confidence: ForecastConfidence = snapshot.sustento.confidence === 'alta' && monthsAhead <= 1 ? 'alta' : monthsAhead > 3 ? 'baixa' : snapshot.sustento.confidence === 'baixa' ? 'baixa' : 'media';
  return { kind: 'estimativa', startingBalance: start, horizonMonths: monthsAhead, points, assumptions, confidence };
}
