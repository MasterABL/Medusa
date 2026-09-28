/**
 * MEDUSA — Finance Domain — Event types (seção 28)
 *
 * Publicados via a fundação (src/foundation/eventBus.ts), domain='finance'.
 */

export const FINANCE_EVENT_TYPES = {
  TRANSACTION_CREATED: 'TRANSACTION_CREATED',
  TRANSACTION_UPDATED: 'TRANSACTION_UPDATED',
  BUDGET_THRESHOLD_REACHED: 'BUDGET_THRESHOLD_REACHED',
  PAYMENT_DUE_SOON: 'PAYMENT_DUE_SOON',
  PROJECTION_UPDATED: 'PROJECTION_UPDATED',
  GOAL_PROGRESS_CHANGED: 'GOAL_PROGRESS_CHANGED',
} as const;

export type FinanceEventType = (typeof FINANCE_EVENT_TYPES)[keyof typeof FINANCE_EVENT_TYPES];

export interface TransactionCreatedPayload {
  transactionId: string;
  accountId: string;
}

export interface BudgetThresholdReachedPayload {
  budgetId: string;
  percentUsed: number;
}

export interface PaymentDueSoonPayload {
  commitmentId: string;
  dueDate: string;
  daysUntilDue: number;
}

export interface GoalProgressChangedPayload {
  goalId: string;
  progress: number;
}
