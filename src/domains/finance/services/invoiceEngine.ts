/**
 * MEDUSA — Finance — Fatura de cartão a partir de transações
 *
 * Regras herdadas do MINHA-VIDA (bugs reais que custaram caro lá):
 *  1. Saldo da conta de cartão NÃO é fatura: é dívida total, inclui parcelas
 *     futuras. A fatura de um mês é calculada das transações.
 *  2. O mês da fatura que a própria fonte informa (`invoiceMonth`) ganha de
 *     qualquer cálculo local. Sem ele, usa-se o dia de fechamento; sem
 *     fechamento, cai no mês da compra E marca `approximated` — nunca inventa
 *     um fechamento.
 *  3. Algumas fontes mandam TODAS as parcelas de uma compra (passadas e
 *     futuras) e outras só as já cobradas. Projetar as restantes a partir de
 *     cada parcela real contaria a mesma parcela várias vezes: só a parcela
 *     MAIS AVANÇADA de cada série projeta o que falta.
 *  4. O valor de uma parcela já é o valor de UMA parcela — nunca dividir de novo.
 */

import type { FinancialAccount, Transaction } from '../model/types';
import type { CardInvoice, InvoiceLine, InvoiceStatus } from '../model/statements';

export function addMonthsToLabel(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

/** Mês da fatura de UMA transação. */
export function invoiceMonthOf(t: Transaction, closingDay?: number): { month: string; approximated: boolean } {
  if (t.invoiceMonth && /^\d{4}-\d{2}$/.test(t.invoiceMonth)) return { month: t.invoiceMonth, approximated: false };
  const date = dayOf(t.occurredAt);
  const purchaseMonth = date.slice(0, 7);
  if (closingDay && closingDay >= 1 && closingDay <= 31) {
    const day = Number(date.slice(8, 10));
    return { month: day <= closingDay ? purchaseMonth : addMonthsToLabel(purchaseMonth, 1), approximated: false };
  }
  return { month: purchaseMonth, approximated: true };
}

/** Descrição sem o sufixo "N/M" que algumas fontes grudam no fim — serve de chave da série. */
export function installmentSeriesKey(t: Transaction): string | undefined {
  if (!t.installment || t.installment.total < 2) return undefined;
  const base = t.description.replace(/\s*\d{1,2}\s*\/\s*\d{1,2}\s*$/, '').trim().toLowerCase();
  return `${t.accountId}|${base}|${t.installment.total}|${t.amount}`;
}

interface ProjectedRow {
  month: string;
  line: InvoiceLine;
}

/** Parcelas que ainda NÃO existem como transação, projetadas só da parcela mais avançada de cada série. */
export function projectRemainingInstallments(txns: Transaction[], closingDay?: number): ProjectedRow[] {
  const series = new Map<string, Transaction[]>();
  for (const t of txns) {
    const key = installmentSeriesKey(t);
    if (!key) continue;
    series.set(key, [...(series.get(key) ?? []), t]);
  }

  const rows: ProjectedRow[] = [];
  for (const group of Array.from(series.values())) {
    const latest = group.reduce((a, b) => (b.installment!.current > a.installment!.current ? b : a));
    const { current, total } = latest.installment!;
    const { month: baseMonth } = invoiceMonthOf(latest, closingDay);
    for (let n = current + 1; n <= total; n += 1) {
      rows.push({
        month: addMonthsToLabel(baseMonth, n - current),
        line: {
          description: latest.description.replace(/\s*\d{1,2}\s*\/\s*\d{1,2}\s*$/, '').trim() || latest.description,
          amount: latest.amount,
          kind: 'parcelada',
          installment: { current: n, total },
          projected: true,
        },
      });
    }
  }
  return rows;
}

function dateFor(month: string, day?: number): string | undefined {
  if (!day || day < 1) return undefined;
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, '0')}`;
}

export function buildInvoices(card: FinancialAccount, transactions: Transaction[], asOf: string): CardInvoice[] {
  const closingDay = card.cardCycle?.closingDay;
  const dueDay = card.cardCycle?.dueDay;
  const txns = transactions.filter((t) => t.accountId === card.id && t.status !== 'cancelled');

  const byMonth = new Map<string, { lines: InvoiceLine[]; approximated: boolean }>();
  const bucket = (month: string) => {
    if (!byMonth.has(month)) byMonth.set(month, { lines: [], approximated: false });
    return byMonth.get(month)!;
  };

  for (const t of txns) {
    const { month, approximated } = invoiceMonthOf(t, closingDay);
    const b = bucket(month);
    if (approximated) b.approximated = true;
    // estorno/crédito no cartão abate a fatura
    const signed = t.type === 'income' ? -t.amount : t.amount;
    b.lines.push({
      transactionId: t.id,
      description: t.description,
      amount: signed,
      kind: t.installment && t.installment.total > 1 ? 'parcelada' : 'a_vista',
      installment: t.installment,
      projected: false,
    });
  }

  for (const row of projectRemainingInstallments(txns, closingDay)) bucket(row.month).lines.push(row.line);

  const asOfMonth = asOf.slice(0, 7);
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { lines, approximated }]) => {
      const closingDate = dateFor(month, closingDay);
      const status: InvoiceStatus =
        month > asOfMonth ? 'projetada' : closingDate && closingDate < asOf ? 'fechada' : month < asOfMonth ? 'fechada' : 'aberta';
      const total = round2(lines.reduce((s, l) => s + l.amount, 0));
      const projectedTotal = round2(lines.filter((l) => l.projected).reduce((s, l) => s + l.amount, 0));
      return { cardAccountId: card.id, month, total, lines, closingDate, dueDate: dateFor(month, dueDay), status, approximated, projectedTotal };
    });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
