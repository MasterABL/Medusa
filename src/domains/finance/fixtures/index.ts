/**
 * MEDUSA — Finance Domain — Fixtures (seção 37)
 *
 * FIXTURE / SYNTHETIC / TEST — nunca estado real de usuário. Usado só para
 * testes de contrato e desenvolvimento local. Nenhum destes valores deve
 * aparecer num produto final como se fosse dado real.
 */

import type { Category, FinancialAccount, RecurringCommitment, Transaction } from '../model/types';

export const FIXTURE_TAG = 'fixture' as const;

export function createFixtureAccount(overrides: Partial<FinancialAccount> = {}): FinancialAccount {
  return {
    id: 'fixture_account_1',
    name: 'Conta Corrente (fixture)',
    type: 'checking',
    currentBalance: 1500,
    currency: 'BRL',
    active: true,
    dataSource: 'manual',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createFixtureCategories(): Category[] {
  return [
    { id: 'cat_moradia', name: 'Moradia (fixture)', kind: 'expense', active: true },
    { id: 'cat_alimentacao', name: 'Alimentação (fixture)', kind: 'expense', active: true },
    { id: 'cat_salario', name: 'Salário (fixture)', kind: 'income', active: true },
  ];
}

export function createFixtureTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: `fixture_txn_${Math.random().toString(36).slice(2, 8)}`,
    accountId: 'fixture_account_1',
    amount: 100,
    currency: 'BRL',
    type: 'expense',
    categoryId: 'cat_alimentacao',
    description: 'Transação fixture',
    occurredAt: '2026-09-01',
    source: 'manual',
    status: 'posted',
    ...overrides,
  };
}

export function createFixtureRecurringCommitment(overrides: Partial<RecurringCommitment> = {}): RecurringCommitment {
  return {
    id: 'fixture_commitment_1',
    label: 'Aluguel (fixture)',
    type: 'expense',
    categoryId: 'cat_moradia',
    expectedAmount: 800,
    frequency: 'monthly',
    dueDayOfMonth: 10,
    startDate: '2026-01-01',
    active: true,
    source: 'manual',
    ...overrides,
  };
}
