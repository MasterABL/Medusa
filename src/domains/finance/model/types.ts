/**
 * MEDUSA — Finance Domain — Model
 *
 * Expande o contrato inicial de src/foundation/domains/finance.ts (mantido
 * como está — este é o modelo de DOMÍNIO de verdade, com regras, não só a
 * declaração de capability do Domain Registry).
 *
 * Nenhuma integração bancária real. `dataSource` é sempre explícito sobre a
 * origem do dado — hoje só 'manual' é um caminho realmente utilizável.
 */

export type AccountType = 'checking' | 'savings' | 'cash' | 'credit_card' | 'investment' | 'other';

export type FinancialDataSource = 'manual' | 'imported' | 'integration';

export interface FinancialAccount {
  id: string;
  name: string;
  type: AccountType;
  institutionLabel?: string;
  currentBalance: number;
  currency: string;
  active: boolean;
  dataSource: FinancialDataSource;
  /** Só para credit_card. Dias do mês; ausentes = desconhecidos (nunca inventados). */
  cardCycle?: { closingDay?: number; dueDay?: number };
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'pending' | 'posted' | 'cancelled';

export interface Transaction {
  id: string;
  accountId: string;
  amount: number; // sempre positivo — o sinal é dado por `type`, nunca embutido no valor
  currency: string;
  type: TransactionType;
  categoryId?: string;
  description: string;
  occurredAt: string;
  postedAt?: string;
  source: FinancialDataSource;
  recurringCommitmentId?: string;
  status: TransactionStatus;
  metadata?: Record<string, unknown>;
  /** Id na fonte externa (ex.: Open Finance). Dois lançamentos com o mesmo externalId são o MESMO fato. */
  externalId?: string;
  /** Compra parcelada: parcela `current` de `total`. Ausente = à vista. */
  installment?: { current: number; total: number };
  /** Mês da fatura ("YYYY-MM") quando a fonte informa. Preferido sobre qualquer cálculo local. */
  invoiceMonth?: string;
}

export type CategoryKind = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  kind: CategoryKind;
  colorToken?: string;
  active: boolean;
}

export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';

export interface Budget {
  id: string;
  categoryId: string;
  limitAmount: number;
  period: BudgetPeriod;
  periodLabel: string; // ex.: "2026-09" (mensal) — a granularidade depende de `period`
  active: boolean;
}

/** Estado DERIVADO de um Budget — nunca a fonte primária (seção 3, "não armazenar métricas derivadas"). */
export interface BudgetConsumption {
  budgetId: string;
  consumedAmount: number;
  remainingAmount: number;
  percentUsed: number; // 0-1+ (pode passar de 1 se estourou)
  state: 'dentro_do_limite' | 'proximo_do_limite' | 'estourado';
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

export interface RecurringCommitment {
  id: string;
  label: string;
  type: 'income' | 'expense';
  categoryId?: string;
  expectedAmount: number;
  frequency: RecurringFrequency;
  dueDayOfMonth?: number; // pra frequency='monthly'
  dueDayOfWeek?: number; // 0-6, pra frequency='weekly'
  startDate: string;
  endDate?: string;
  active: boolean;
  source: FinancialDataSource;
}

export interface GoalContribution {
  id: string;
  amount: number;
  transactionId?: string;
  occurredAt: string;
}

export interface FinancialGoalMilestone {
  id: string;
  label: string;
  targetAmount: number;
  achieved: boolean;
}

export interface FinancialGoal {
  id: string;
  label: string;
  targetAmount: number;
  /** SEMPRE derivado de `contributions` — ver goalEngine.computeGoalCurrentAmount(). */
  currentAmount: number;
  targetDate?: string;
  milestones: FinancialGoalMilestone[];
  contributions: GoalContribution[];
  createdAt: string;
}

/** `observed` é o que já aconteceu; `projected` nunca deve ser confundido com saldo real. */
export interface Projection {
  id: string;
  periodLabel: string;
  observedBalance: number;
  projectedBalance: number;
  basis: string; // explicação curta do que fundamenta o cálculo
  generatedAt: string;
}
