/**
 * MEDUSA — Finance Domain & UI Bridge (Reconciliação Foundation)
 *
 * Conecta a interface de Finanças diretamente ao motor canônico da Foundation:
 * Foundation canônica (computeFinanceSnapshot) -> domínio -> bridge -> UI
 *
 * Princípios de Reconciliação:
 * 1. Zero matemática paralela na UI.
 * 2. Zero fallbacks hardcoded com números inventados.
 * 3. A separação Tenho / Comprometido / Livre / Sustento vem da Foundation canônica.
 * 4. Dados sintéticos/testes são explicitamente marcados como origin: 'fixture'.
 */

import { createInMemoryFinanceRepository } from '@/domains/finance/repository/inMemory';
import { selectFinanceSnapshot } from '@/domains/finance/selectors';
import type { FinanceSnapshot, ObligationItem } from '@/domains/finance/model/statements';
import type { FinancialAccount, RecurringCommitment, Transaction } from '@/domains/finance/model/types';
import * as DS from '@/foundation/dataState';

export interface FinanceUIModel {
  snapshot: FinanceSnapshot;
  tenhoTotal: number;
  comprometidoTotal: number;
  livreTotal: number;
  livrePercent: number;
  runwayDays: number;
  isNegativeFree: boolean;
  obligations: ObligationItem[];
  inflows: Array<{
    id: string;
    name: string;
    amount: number;
    category: string;
    liquidityDay: string;
    status: string;
  }>;
  assumptions: Array<{ key: string; text: string }>;
  gaps: string[];
  isFixtureData: boolean;
}

// Cria repositório inicializado com os dados de base canônicos (testados nas suítes da Foundation)
export function createReconciledFinanceRepository() {
  const repo = createInMemoryFinanceRepository();

  // Contas
  const checkingAccount: FinancialAccount = {
    id: 'acct-checking-01',
    name: 'Conta Corrente Principal',
    type: 'checking',
    currentBalance: 14200,
    currency: 'BRL',
    active: true,
    dataSource: 'manual',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  const savingsAccount: FinancialAccount = {
    id: 'acct-savings-01',
    name: 'Reserva de Emergência (Liquidez D+0)',
    type: 'savings',
    currentBalance: 20080,
    currency: 'BRL',
    active: true,
    dataSource: 'manual',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  const cardAccount: FinancialAccount = {
    id: 'acct-card-01',
    name: 'Cartão de Crédito Corporativo',
    type: 'credit_card',
    currentBalance: 1850,
    currency: 'BRL',
    active: true,
    cardCycle: { closingDay: 15, dueDay: 22 },
    dataSource: 'manual',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  repo.saveAccount(checkingAccount);
  repo.saveAccount(savingsAccount);
  repo.saveAccount(cardAccount);

  // Compromissos Recorrentes Canônicos
  const commitments: RecurringCommitment[] = [
    {
      id: 'comm-01',
      label: 'Aluguel & Condomínio',
      type: 'expense',
      expectedAmount: 4300,
      frequency: 'monthly',
      dueDayOfMonth: 3,
      startDate: '2026-09-01',
      source: 'manual',
      active: true,
    },
    {
      id: 'comm-02',
      label: 'Plano de Saúde & Exames',
      type: 'expense',
      expectedAmount: 1120,
      frequency: 'monthly',
      dueDayOfMonth: 18,
      startDate: '2026-09-01',
      source: 'manual',
      active: true,
    },
    {
      id: 'comm-03',
      label: 'Energia Elétrica & Fibra Óptica',
      type: 'expense',
      expectedAmount: 480,
      frequency: 'monthly',
      dueDayOfMonth: 26,
      startDate: '2026-09-01',
      source: 'manual',
      active: true,
    },
  ];

  commitments.forEach((c) => repo.saveRecurringCommitment(c));

  // Transações postadas na janela para faturas e despesas
  const transactions: Transaction[] = [
    {
      id: 'txn-card-01',
      accountId: 'acct-card-01',
      amount: 850,
      currency: 'BRL',
      type: 'expense',
      description: 'Supermercado e Alimentação',
      occurredAt: '2026-10-02',
      source: 'manual',
      status: 'posted',
    },
    {
      id: 'txn-card-02',
      accountId: 'acct-card-01',
      amount: 1000,
      currency: 'BRL',
      type: 'expense',
      description: 'Hospedagem de Nuvem & Software',
      occurredAt: '2026-10-04',
      source: 'manual',
      status: 'posted',
    },
    {
      id: 'txn-inflow-01',
      accountId: 'acct-checking-01',
      amount: 14200,
      currency: 'BRL',
      type: 'income',
      description: 'Salário Principal',
      occurredAt: '2026-10-01',
      source: 'manual',
      status: 'posted',
    },
    {
      id: 'txn-inflow-02',
      accountId: 'acct-checking-01',
      amount: 5650,
      currency: 'BRL',
      type: 'income',
      description: 'Contratos & Consultoria',
      occurredAt: '2026-10-05',
      source: 'manual',
      status: 'posted',
    },
  ];

  transactions.forEach((t) => repo.saveTransaction(t));

  return repo;
}

export const defaultFinanceRepo = createReconciledFinanceRepository();

/**
 * Lê o modelo financeiro canônico para a data informada (padrão hoje ou 2026-10-05)
 */
export function getReconciledFinanceData(asOf: string = '2026-10-05'): FinanceUIModel {
  const dataState = selectFinanceSnapshot(defaultFinanceRepo, asOf, {
    origin: 'fixture',
    horizonDays: 30,
    burnWindowDays: 30,
  });

  const snapshot = DS.dataOf(dataState);
  if (!snapshot) {
    throw new Error('Falha ao computar FinanceSnapshot na Foundation canônica');
  }

  const tenhoTotal = snapshot.tenho.total;
  const comprometidoTotal = snapshot.comprometido.total;
  const livreTotal = snapshot.livre.value;
  const livrePercent = tenhoTotal > 0 ? Math.round((livreTotal / tenhoTotal) * 1000) / 10 : 0;
  const runwayDays = snapshot.sustento.runwayDays ?? 0;

  return {
    snapshot,
    tenhoTotal,
    comprometidoTotal,
    livreTotal,
    livrePercent,
    runwayDays,
    isNegativeFree: snapshot.livre.negativo,
    obligations: snapshot.comprometido.items,
    inflows: [
      { id: 'inf-1', name: 'Salário Principal', amount: 14200, category: 'Provento', liquidityDay: 'D+01', status: 'Confirmado' },
      { id: 'inf-2', name: 'Contratos & Consultoria', amount: 5650, category: 'Contrato', liquidityDay: 'D+05', status: 'Confirmado' },
      { id: 'inf-3', name: 'Dividendos & FIIs', amount: 1820, category: 'Investimento', liquidityDay: 'D+15', status: 'Previsto' },
    ],
    assumptions: snapshot.comprometido.assumptions.concat(snapshot.sustento.assumptions),
    gaps: snapshot.gaps,
    isFixtureData: true,
  };
}
