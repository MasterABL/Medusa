/**
 * MEDUSA — Finance Domain — Repository boundary (seção 33)
 *
 * O domínio nunca depende de localStorage ou de um componente React
 * diretamente — ele só conhece esta interface. `InMemoryFinanceRepository`
 * (repository/inMemory.ts) é a única implementação hoje, usada em testes e
 * em desenvolvimento; um adapter de banco real (ex.: Supabase) implementaria
 * a MESMA interface sem o domínio precisar mudar uma linha.
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

export interface FinanceRepository {
  // Accounts
  getAccount(id: string): FinancialAccount | undefined;
  listAccounts(filter?: { active?: boolean }): FinancialAccount[];
  saveAccount(account: FinancialAccount): void;

  // Transactions
  getTransaction(id: string): Transaction | undefined;
  listTransactions(filter?: { accountId?: string; categoryId?: string; from?: string; to?: string }): Transaction[];
  saveTransaction(transaction: Transaction): void;

  // Categories
  getCategory(id: string): Category | undefined;
  listCategories(filter?: { kind?: Category['kind'] }): Category[];
  saveCategory(category: Category): void;

  // Budgets
  getBudget(id: string): Budget | undefined;
  listBudgets(filter?: { active?: boolean }): Budget[];
  saveBudget(budget: Budget): void;

  // Recurring commitments
  getRecurringCommitment(id: string): RecurringCommitment | undefined;
  listRecurringCommitments(filter?: { active?: boolean }): RecurringCommitment[];
  saveRecurringCommitment(commitment: RecurringCommitment): void;

  // Goals
  getGoal(id: string): FinancialGoal | undefined;
  listGoals(): FinancialGoal[];
  saveGoal(goal: FinancialGoal): void;

  // Projections (histórico de cálculos já gerados)
  saveProjection(projection: Projection): void;
  listProjections(): Projection[];
}
