/**
 * MEDUSA — Finance — Adapter do MINHA-VIDA (financas_contas_bancarias, financas_transacoes_of,
 * financas_contas_fixas, financas_metas)
 *
 * Tradução pura de linhas já lidas. Decisões que valem registro:
 *  - `saldo_atual` de um CARTÃO no legado é a dívida total (inclui parcelas
 *    futuras), não a fatura — é exatamente por isso que o adapter guarda o
 *    saldo como `currentBalance` e o cálculo de fatura sai das transações
 *    (services/invoiceEngine.ts), nunca do saldo.
 *  - `dia_fechamento`/`dia_vencimento` ausentes ficam ausentes: não se inventa ciclo.
 *  - O sinal vem de `tipo`: `amount` é sempre positivo no Medusa.
 *  - Sem moeda no legado: BRL é premissa explícita do legado (Pluggy Brasil).
 */

import type { FinancialAccount, RecurringCommitment, Transaction, AccountType } from '../model/types';

export interface LegacyContaBancariaRow {
  id: number | string;
  nome: string;
  instituicao?: string | null;
  tipo: 'corrente' | 'poupanca' | 'cartao' | 'carteira' | string;
  saldo_atual: number | string;
  provider?: string | null;
  provider_item_id?: string | null;
  provider_account_id?: string | null;
  dia_fechamento?: number | null;
  dia_vencimento?: number | null;
  ativo?: boolean | null;
  criado_em?: string;
}

export interface LegacyTransacaoOFRow {
  id: number | string;
  conta_bancaria_id: number | string;
  descricao: string;
  valor: number | string;
  tipo: 'entrada' | 'saida' | string;
  categoria?: string | null;
  data: string;
  provider_transaction_id?: string | null;
  parcela_atual?: number | null;
  total_parcelas?: number | null;
  fatura_mes?: string | null;
}

export interface LegacyContaFixaRow {
  id: number | string;
  nome: string;
  categoria?: string | null;
  valor: number | string;
  dia_vencimento: number;
  data_fim?: string | null;
  ativo?: boolean | null;
}

const TYPE: Record<string, AccountType> = { corrente: 'checking', poupanca: 'savings', cartao: 'credit_card', carteira: 'cash' };
const toNum = (v: number | string): number => (typeof v === 'number' ? v : Number(v));

export const legacyAccountId = (id: number | string): string => `acct-${id}`;

export function mapAccount(row: LegacyContaBancariaRow): FinancialAccount {
  const created = row.criado_em ?? '1970-01-01T00:00:00.000Z';
  const type = TYPE[row.tipo] ?? 'other';
  const cycle = type === 'credit_card' && (row.dia_fechamento || row.dia_vencimento) ? { closingDay: row.dia_fechamento ?? undefined, dueDay: row.dia_vencimento ?? undefined } : undefined;
  return {
    id: legacyAccountId(row.id),
    name: row.nome,
    type,
    institutionLabel: row.instituicao ?? undefined,
    currentBalance: toNum(row.saldo_atual),
    currency: 'BRL',
    active: row.ativo !== false,
    dataSource: row.provider ? 'integration' : 'manual',
    cardCycle: cycle,
    createdAt: created,
    updatedAt: created,
  };
}

export function mapTransaction(row: LegacyTransacaoOFRow): Transaction {
  const parcelado = row.total_parcelas !== null && row.total_parcelas !== undefined && row.total_parcelas > 1 && row.parcela_atual;
  return {
    id: `txn-${row.id}`,
    accountId: legacyAccountId(row.conta_bancaria_id),
    amount: Math.abs(toNum(row.valor)),
    currency: 'BRL',
    type: row.tipo === 'entrada' ? 'income' : 'expense',
    categoryId: row.categoria ?? undefined,
    description: row.descricao,
    occurredAt: row.data.slice(0, 10),
    source: row.provider_transaction_id ? 'integration' : 'manual',
    status: 'posted',
    externalId: row.provider_transaction_id ?? undefined,
    installment: parcelado ? { current: row.parcela_atual!, total: row.total_parcelas! } : undefined,
    invoiceMonth: row.fatura_mes && /^\d{4}-\d{2}$/.test(row.fatura_mes) ? row.fatura_mes : undefined,
  };
}

export function mapFixedBill(row: LegacyContaFixaRow): RecurringCommitment {
  return {
    id: `fixa-${row.id}`,
    label: row.nome,
    type: 'expense',
    categoryId: row.categoria ?? undefined,
    expectedAmount: toNum(row.valor),
    frequency: 'monthly',
    dueDayOfMonth: row.dia_vencimento,
    // O legado não guarda a data de início; data estável e antiga evita "começa amanhã" falso.
    startDate: '1970-01-01',
    endDate: row.data_fim ?? undefined,
    active: row.ativo !== false,
    source: 'manual',
  };
}
