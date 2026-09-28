/**
 * MEDUSA — Finance Domain — Action types (seção 6)
 *
 * Todas as ações passam pelo Guardian (src/foundation/guardian) antes de
 * qualquer execução — ver useCases/*.ts. EXECUTE_PAYMENT/TRANSFER_FUNDS
 * existem como CONTRATO/PROPOSTA — nenhum dos dois executa dinheiro de
 * verdade nesta rodada (seção 41).
 */

export const FINANCE_ACTION_TYPES = {
  CATEGORIZE_TRANSACTION: 'CATEGORIZE_TRANSACTION',
  CREATE_BUDGET: 'CREATE_BUDGET',
  ADJUST_BUDGET: 'ADJUST_BUDGET',
  CREATE_FINANCIAL_REMINDER: 'CREATE_FINANCIAL_REMINDER',
  LINK_RECURRING_COMMITMENT: 'LINK_RECURRING_COMMITMENT',
  UPDATE_GOAL: 'UPDATE_GOAL',
  CREATE_PROJECTION: 'CREATE_PROJECTION',
  EXECUTE_PAYMENT: 'EXECUTE_PAYMENT',
  TRANSFER_FUNDS: 'TRANSFER_FUNDS',
} as const;

export type FinanceActionType = (typeof FINANCE_ACTION_TYPES)[keyof typeof FINANCE_ACTION_TYPES];

export interface CategorizeTransactionPayload {
  transactionId: string;
  categoryId: string;
}

export interface CreateFinancialReminderPayload {
  commitmentId?: string;
  message: string;
  dueDate: string;
}

export interface ExecutePaymentPayload {
  accountId: string;
  amount: number;
  currency: string;
  description: string;
}
