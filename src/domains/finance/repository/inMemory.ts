/**
 * MEDUSA — Finance Domain — In-memory repository
 *
 * Implementação de referência da FinanceRepository — usada em testes e
 * enquanto não existe um adapter de persistência real. Cada instância é
 * isolada (não é um módulo com estado global como o Guardian/EventBus da
 * fundação), porque múltiplos testes/usuários não deveriam compartilhar o
 * mesmo repositório sem pedir por isso explicitamente.
 */

import type {
  Budget,
  Category,
  FinancialAccount,
  FinancialGoal,
  Projection,
  RecurringCommitment,
  Transaction,
} from '../model/types';
import type { FinanceRepository } from './types';

export function createInMemoryFinanceRepository(): FinanceRepository {
  const accounts = new Map<string, FinancialAccount>();
  const transactions = new Map<string, Transaction>();
  const categories = new Map<string, Category>();
  const budgets = new Map<string, Budget>();
  const commitments = new Map<string, RecurringCommitment>();
  const goals = new Map<string, FinancialGoal>();
  const projections: Projection[] = [];

  return {
    getAccount: (id) => accounts.get(id),
    listAccounts: (filter) =>
      Array.from(accounts.values()).filter((a) => filter?.active === undefined || a.active === filter.active),
    saveAccount: (account) => void accounts.set(account.id, account),

    getTransaction: (id) => transactions.get(id),
    listTransactions: (filter) =>
      Array.from(transactions.values()).filter(
        (t) =>
          (!filter?.accountId || t.accountId === filter.accountId) &&
          (!filter?.categoryId || t.categoryId === filter.categoryId) &&
          (!filter?.from || t.occurredAt >= filter.from) &&
          (!filter?.to || t.occurredAt <= filter.to)
      ),
    saveTransaction: (transaction) => void transactions.set(transaction.id, transaction),

    getCategory: (id) => categories.get(id),
    listCategories: (filter) =>
      Array.from(categories.values()).filter((c) => !filter?.kind || c.kind === filter.kind),
    saveCategory: (category) => void categories.set(category.id, category),

    getBudget: (id) => budgets.get(id),
    listBudgets: (filter) =>
      Array.from(budgets.values()).filter((b) => filter?.active === undefined || b.active === filter.active),
    saveBudget: (budget) => void budgets.set(budget.id, budget),

    getRecurringCommitment: (id) => commitments.get(id),
    listRecurringCommitments: (filter) =>
      Array.from(commitments.values()).filter((c) => filter?.active === undefined || c.active === filter.active),
    saveRecurringCommitment: (commitment) => void commitments.set(commitment.id, commitment),

    getGoal: (id) => goals.get(id),
    listGoals: () => Array.from(goals.values()),
    saveGoal: (goal) => void goals.set(goal.id, goal),

    saveProjection: (projection) => void projections.push(projection),
    listProjections: () => [...projections],
  };
}
