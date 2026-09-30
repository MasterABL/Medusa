/**
 * MEDUSA — Finance — Posição financeira: Tenho / Comprometido / Livre / Sustento
 *
 * FÓRMULAS (todas sobre a moeda pedida; nada é convertido):
 *
 *   Tenho        = Σ saldo das contas ATIVAS do tipo checking|savings|cash
 *   Comprometido = Σ faturas com vencimento em [asOf, asOf+horizonDays]
 *                + Σ contas fixas previstas na janela e ainda não acertadas
 *                + Σ despesas pendentes (fora de cartão) até o fim da janela
 *   Livre        = Tenho − Comprometido               (pode ser negativo)
 *   dailyBurn    = Σ despesas posted em [asOf−burnWindowDays+1, asOf]
 *                  em contas que NÃO são cartão, excluindo transferências e
 *                  lançamentos vinculados a conta fixa / burnWindowDays
 *   runwayDays   = ⌊Livre / dailyBurn⌋   só se Livre > 0, dailyBurn > 0 e ≥ 7 dias observados
 *
 * JANELAS: horizonDays=30 porque é o ciclo em que contas fixas e fatura se
 * repetem (mensal); burnWindowDays=30 pelo mesmo motivo — uma janela menor
 * oscila com um único gasto grande, uma maior esconde mudança de hábito.
 * Ambas são parâmetros, nunca constantes escondidas.
 *
 * Regime: CAIXA. Compra no cartão vira saída quando a fatura vence (Comprometido),
 * não na data da compra — é por isso que despesa de cartão fica fora do dailyBurn.
 * Limitação conhecida: pagamento de fatura lançado como despesa comum na conta
 * corrente entra no dailyBurn; passe `excludeCategoryIds` pra tirá-lo.
 */

import type { FinancialAccount, RecurringCommitment, Transaction } from '../model/types';
import type {
  AccountBalanceLine,
  Assumption,
  ExcludedAccount,
  FinanceSnapshot,
  ForecastConfidence,
  ObligationItem,
} from '../model/statements';
import { buildInvoices } from './invoiceEngine';
import { upcomingFixedBills } from './obligations';

const DAY = 86_400_000;
const LIQUID: FinancialAccount['type'][] = ['checking', 'savings', 'cash'];

export interface SnapshotInput {
  accounts: FinancialAccount[];
  transactions: Transaction[];
  commitments: RecurringCommitment[];
  /** YYYY-MM-DD */
  asOf: string;
  currency?: string;
  horizonDays?: number;
  burnWindowDays?: number;
  excludeCategoryIds?: string[];
}

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeFinanceSnapshot(input: SnapshotInput): FinanceSnapshot {
  const currency = input.currency ?? 'BRL';
  const horizonDays = input.horizonDays ?? 30;
  const burnWindowDays = input.burnWindowDays ?? 30;
  const { asOf } = input;
  const windowEnd = addDays(asOf, horizonDays);
  const gaps: string[] = [];

  // ---- Tenho ----
  const lines: AccountBalanceLine[] = [];
  const excluded: ExcludedAccount[] = [];
  let investido = 0;
  for (const a of input.accounts) {
    if (!a.active) excluded.push({ accountId: a.id, reason: 'inativa' });
    else if (a.currency !== currency) excluded.push({ accountId: a.id, reason: 'outra_moeda' });
    else if (a.type === 'credit_card') excluded.push({ accountId: a.id, reason: 'cartao_e_divida' });
    else if (a.type === 'investment') {
      investido += a.currentBalance;
      excluded.push({ accountId: a.id, reason: 'investimento_fora_do_liquido' });
    } else if (LIQUID.includes(a.type)) lines.push({ accountId: a.id, name: a.name, balance: a.currentBalance });
    else excluded.push({ accountId: a.id, reason: 'outro_tipo' });
  }
  const foreign = excluded.filter((e) => e.reason === 'outra_moeda');
  if (foreign.length > 0) gaps.push(`${foreign.length} conta(s) em outra moeda ficaram fora (sem conversão cambial).`);
  const tenhoTotal = round2(lines.reduce((s, l) => s + l.balance, 0));

  // ---- Comprometido ----
  const items: ObligationItem[] = [];
  const cards = input.accounts.filter((a) => a.active && a.type === 'credit_card' && a.currency === currency);
  const asOfMonth = asOf.slice(0, 7);
  for (const card of cards) {
    const hasCycleDue = card.cardCycle?.dueDay !== undefined;
    if (!hasCycleDue) gaps.push(`Cartão "${card.name}" sem dia de vencimento: só a fatura do mês atual entrou, sem data de vencimento.`);
    for (const inv of buildInvoices(card, input.transactions, asOf)) {
      if (inv.total <= 0) continue;
      const inWindow = inv.dueDate ? inv.dueDate >= asOf && inv.dueDate <= windowEnd : inv.month === asOfMonth;
      if (!inWindow) continue;
      items.push({
        kind: 'fatura',
        label: `Fatura ${card.name} ${inv.month}`,
        amount: inv.total,
        dueDate: inv.dueDate,
        sourceId: `${card.id}:${inv.month}`,
        projected: inv.projectedTotal > 0,
        projectedAmount: inv.projectedTotal > 0 ? inv.projectedTotal : undefined,
      });
    }
  }

  const activeExpenseCommitments = input.commitments.filter((c) => c.active && c.type === 'expense');
  if (activeExpenseCommitments.length === 0) gaps.push('Nenhuma conta fixa cadastrada: o Comprometido só conhece faturas e pendências.');
  items.push(...upcomingFixedBills(input.commitments, input.transactions, asOf, windowEnd));

  const cardIds = new Set(input.accounts.filter((a) => a.type === 'credit_card').map((a) => a.id));
  for (const t of input.transactions) {
    if (t.status !== 'pending' || t.type !== 'expense' || t.currency !== currency || cardIds.has(t.accountId)) continue;
    if (t.occurredAt.slice(0, 10) > windowEnd) continue;
    items.push({ kind: 'pendente', label: t.description, amount: t.amount, dueDate: t.occurredAt.slice(0, 10), sourceId: t.id, projected: false });
  }

  const sum = (kind: ObligationItem['kind']) => round2(items.filter((i) => i.kind === kind).reduce((s, i) => s + i.amount, 0));
  const parts = { faturas: sum('fatura'), contasFixas: sum('conta_fixa'), pendentes: sum('pendente') };
  const comprometidoTotal = round2(parts.faturas + parts.contasFixas + parts.pendentes);
  const comprometidoAssumptions: Assumption[] = [
    { key: 'fatura_vencida', text: 'Faturas com vencimento anterior a hoje são tratadas como pagas: o domínio não consegue confirmar o pagamento.' },
    { key: 'parcelas_projetadas', text: 'Parcelas futuras ainda não enviadas pela fonte são projetadas a partir da parcela mais avançada de cada compra.' },
  ];

  // ---- Livre ----
  const livreValue = round2(tenhoTotal - comprometidoTotal);

  // ---- Sustento ----
  const burnFrom = addDays(asOf, -(burnWindowDays - 1));
  const exclCat = new Set(input.excludeCategoryIds ?? []);
  const burnTotal = input.transactions
    .filter(
      (t) =>
        t.status === 'posted' &&
        t.type === 'expense' &&
        t.currency === currency &&
        !cardIds.has(t.accountId) &&
        !t.recurringCommitmentId &&
        !(t.categoryId && exclCat.has(t.categoryId)) &&
        t.occurredAt.slice(0, 10) >= burnFrom &&
        t.occurredAt.slice(0, 10) <= asOf
    )
    .reduce((s, t) => s + t.amount, 0);

  const allDates = input.transactions.filter((t) => t.status !== 'cancelled').map((t) => t.occurredAt.slice(0, 10)).sort();
  const observedDays = allDates.length === 0 ? 0 : Math.min(burnWindowDays, Math.max(1, Math.round((Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${allDates[0]}T00:00:00Z`)) / DAY) + 1));

  const dailyBurn = burnTotal > 0 && observedDays > 0 ? round2(burnTotal / observedDays) : undefined;
  const enough = observedDays >= 7;
  const runwayDays = enough && livreValue > 0 && dailyBurn ? Math.floor(livreValue / dailyBurn) : undefined;

  let confidence: ForecastConfidence = observedDays >= burnWindowDays ? 'alta' : observedDays >= 14 ? 'media' : 'baixa';
  if (gaps.length > 0) confidence = confidence === 'alta' ? 'media' : 'baixa';

  const assumptions: Assumption[] = [
    { key: 'janela', text: `Ritmo de gasto = média dos últimos ${observedDays} dia(s) com dados (janela de até ${burnWindowDays}).` },
    { key: 'regime_caixa', text: 'Regime de caixa: compras no cartão contam quando a fatura vence, não na data da compra.' },
    { key: 'exclusoes', text: 'Transferências e lançamentos vinculados a contas fixas ficam fora do ritmo (já estão no Comprometido).' },
    { key: 'sem_receita', text: 'Receitas futuras não entram: o sustento é conservador, só gasta e nunca ganha.' },
  ];
  if (cards.length > 0) assumptions.push({ key: 'pagamento_fatura', text: 'Pagamento de fatura lançado como despesa comum pode inflar o ritmo; categorias podem ser excluídas.' });
  if (!enough) assumptions.push({ key: 'poucos_dias', text: `Só ${observedDays} dia(s) de dados (mínimo 7): sem estimativa de dias de sustento.` });
  if (enough && !dailyBurn) assumptions.push({ key: 'sem_gasto', text: 'Nenhuma despesa na janela: sem ritmo de gasto para estimar.' });
  if (enough && livreValue <= 0) assumptions.push({ key: 'livre_nao_positivo', text: 'Livre é zero ou negativo: não há dias de sustento a estimar.' });

  return {
    asOf,
    currency,
    horizonDays,
    tenho: { total: tenhoTotal, lines, excluded },
    investido: round2(investido),
    comprometido: { total: comprometidoTotal, parts, items, assumptions: comprometidoAssumptions },
    livre: { value: livreValue, negativo: livreValue < 0 },
    sustento: { dailyBurn, runwayDays, windowDays: burnWindowDays, observedDays, confidence, kind: 'estimativa', assumptions },
    gaps,
  };
}
