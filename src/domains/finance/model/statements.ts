/**
 * MEDUSA — Finance — Contratos de posição financeira (Tenho / Comprometido / Livre / Sustento)
 *
 * Procedência: fatura de cartão, parcelas e categorização vêm do MINHA-VIDA
 * (Pluggy); a separação Tenho/Comprometido/Livre/Sustento é NOVA — não existia
 * como conceito único lá (o valor do "saldo do cartão" era mostrado como se
 * fosse fatura, que foi um bug real).
 *
 * Definições (fórmulas em services/snapshotEngine.ts):
 *  - TENHO        dinheiro líquido hoje: contas corrente/poupança/dinheiro ativas.
 *                 Cartão é dívida (nunca soma); investimento é reportado à parte.
 *  - COMPROMETIDO o que já é obrigação nos próximos `horizonDays`: faturas com
 *                 vencimento na janela, contas fixas previstas e ainda não
 *                 pagas, e despesas pendentes.
 *  - LIVRE        Tenho − Comprometido. Pode ser negativo — o sinal é informação.
 *  - SUSTENTO     por quantos dias o Livre cobre o ritmo de gasto observado.
 *                 É ESTIMATIVA e sempre carrega as próprias premissas.
 */

export type InvoiceLineKind = 'a_vista' | 'parcelada';

export interface InvoiceLine {
  transactionId?: string;
  description: string;
  /** Positivo = gasto; negativo = estorno/crédito. */
  amount: number;
  kind: InvoiceLineKind;
  installment?: { current: number; total: number };
  /** true = parcela futura calculada aqui (a fonte ainda não a enviou). Nunca é fato consumado. */
  projected: boolean;
}

export type InvoiceStatus = 'projetada' | 'aberta' | 'fechada';

export interface CardInvoice {
  cardAccountId: string;
  /** "YYYY-MM" */
  month: string;
  total: number;
  lines: InvoiceLine[];
  closingDate?: string;
  dueDate?: string;
  status: InvoiceStatus;
  /** true = o mês de alguma linha foi aproximado (sem mês da fonte e sem dia de fechamento). */
  approximated: boolean;
  /** Parte do total que vem de parcelas projetadas. */
  projectedTotal: number;
}

export type ObligationKind = 'fatura' | 'conta_fixa' | 'pendente';

export interface ObligationItem {
  kind: ObligationKind;
  label: string;
  amount: number;
  /** YYYY-MM-DD. Ausente = vencimento desconhecido. */
  dueDate?: string;
  sourceId: string;
  /** Vem de dado projetado (parcela futura estimada)? */
  projected: boolean;
  /** Parte de `amount` que é projeção (parcelas ainda não enviadas pela fonte). */
  projectedAmount?: number;
}

export interface AccountBalanceLine {
  accountId: string;
  name: string;
  balance: number;
}

export interface ExcludedAccount {
  accountId: string;
  reason: 'outra_moeda' | 'cartao_e_divida' | 'investimento_fora_do_liquido' | 'inativa' | 'outro_tipo';
}

export type ForecastConfidence = 'baixa' | 'media' | 'alta';

export interface Assumption {
  key: string;
  text: string;
}

export interface FinanceSnapshot {
  asOf: string;
  currency: string;
  horizonDays: number;
  tenho: { total: number; lines: AccountBalanceLine[]; excluded: ExcludedAccount[] };
  investido: number;
  comprometido: {
    total: number;
    parts: { faturas: number; contasFixas: number; pendentes: number };
    items: ObligationItem[];
    /** Regras aplicadas que o leitor precisa saber pra não ler o número como mais do que ele é. */
    assumptions: Assumption[];
  };
  livre: { value: number; negativo: boolean };
  sustento: {
    /** Gasto médio diário observado; ausente se não há despesa na janela. */
    dailyBurn?: number;
    /** Dias que o Livre cobre. Ausente quando Livre ≤ 0, sem gasto observado ou dados insuficientes. */
    runwayDays?: number;
    windowDays: number;
    /** Dias da janela cobertos por dados (primeira transação -> asOf). */
    observedDays: number;
    confidence: ForecastConfidence;
    /** Sempre presente: estimativa NUNCA se apresenta como certeza. */
    kind: 'estimativa';
    assumptions: Assumption[];
  };
  /** O que o cálculo NÃO conseguiu saber — alimenta o estado "partial" na UI. */
  gaps: string[];
}

export interface DuplicateGroup {
  transactionIds: string[];
  confidence: 'alta' | 'media';
  reason: string;
}

/** Estado do sync com fonte externa (Open Finance). O domínio guarda o que a fonte disse, não chama a fonte. */
export interface OpenFinanceSyncState {
  provider: string;
  lastSyncAt?: string;
  lastResult?: 'ok' | 'erro' | 'parcial';
  lastError?: string;
  /** Itens (conexões) esperados vs. que responderam na última rodada. */
  itemsExpected?: number;
  itemsSynced?: number;
  /** Permissão/consentimento da conexão vigente? Falso = precisa reautorizar. */
  authorized: boolean;
}

export interface MonthlyProjectionPoint {
  periodLabel: string;
  projectedBalance: number;
  basis: string;
}

export interface ProjectionWithAssumptions {
  kind: 'estimativa';
  startingBalance: number;
  horizonMonths: number;
  points: MonthlyProjectionPoint[];
  assumptions: Assumption[];
  confidence: ForecastConfidence;
}
