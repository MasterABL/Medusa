/**
 * MEDUSA FOUNDATION — contrato FUTURO do domínio Finanças (seções 18/19/20/45)
 *
 * NADA aqui é implementação de produto. Nenhum saldo real, nenhuma conexão
 * bancária, nenhum Open Finance — só os tipos de dados e o contrato de
 * capabilities que permitem, no futuro, construir Finanças sem redesenhar o
 * Domain Registry, o Guardian ou a Agenda.
 *
 * Ponte já pronta com a Agenda: `AgendaSourceRef.sourceType` já inclui
 * `'finance_deadline'` (ver src/types/agenda.ts) — uma FinancialEntity com
 * `dueDate` pode virar um AgendaItem sem que a Agenda precise saber nada
 * sobre categorias, orçamento ou projeção (seção 20: "Agenda não deve
 * absorver a lógica financeira").
 */

import type { DomainDefinition } from '../types/domain';

// ---------------------------------------------------------------------------
// Contratos de dados futuros — nenhum destes tipos é persistido/usado hoje.
// ---------------------------------------------------------------------------

export type FinancialEntityKind = 'account' | 'card' | 'commitment' | 'goal';

export interface FinancialEntity {
  id: string;
  kind: FinancialEntityKind;
  label: string;
  /** Presente quando a entidade tem uma data-limite (fatura, assinatura, etc.) — ponte com a Agenda. */
  dueDate?: string;
}

export interface Transaction {
  id: string;
  entityId: string;
  amount: number;
  category: string;
  occurredAt: string;
  description?: string;
}

export interface FinancialGoal {
  id: string;
  label: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
}

export interface Budget {
  id: string;
  category: string;
  limitAmount: number;
  periodLabel: string; // ex.: "2026-09"
}

export interface RecurringCommitment {
  id: string;
  label: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'yearly';
  nextDueDate: string;
}

export interface Projection {
  id: string;
  periodLabel: string;
  projectedBalance: number;
  basis: string; // explicação curta do que fundamenta a projeção
}

export interface FinancialInsight {
  id: string;
  observation: string;
  evidence: string[];
}

// ---------------------------------------------------------------------------
// Registro do domínio — contrato apenas, `isLive: false`.
// ---------------------------------------------------------------------------

export const financeDomain: DomainDefinition = {
  id: 'finance',
  label: 'Finanças',
  icon: 'wallet',
  route: '#financas',
  isLive: false,
  persona: {
    id: 'persona-finance',
    domain: 'finance',
    displayName: 'Finanças',
    tone: 'sóbrio mas nunca alarmista — explica consequência, não gera pânico',
    interactionStyle: 'sempre liga um número a uma consequência concreta antes de recomendar algo',
    initiativeLevel: 'proativo',
    motionIdentityId: 'motion-finance',
    soundProfileId: 'sound-finance',
    decisionStyle: 'qualquer coisa que mexe em dinheiro de verdade nasce L3 até prova em contrário',
  },
  capabilities: [
    {
      id: 'analyzeTransaction',
      domain: 'finance',
      label: 'Analisar transação',
      description: 'Interpreta pra onde o dinheiro está indo, padrões e recorrências.',
      implemented: false,
      actionTypes: ['CATEGORIZE_TRANSACTION'],
    },
    {
      id: 'createBudget',
      domain: 'finance',
      label: 'Criar orçamento',
      description: 'Define limite por categoria/período.',
      implemented: false,
      actionTypes: ['CREATE_BUDGET', 'ADJUST_BUDGET'],
    },
    {
      id: 'projectCashflow',
      domain: 'finance',
      label: 'Projetar fluxo de caixa',
      description: 'Cenários futuros a partir de compromissos recorrentes conhecidos.',
      implemented: false,
      actionTypes: [],
    },
    {
      id: 'suggestAction',
      domain: 'finance',
      label: 'Sugerir ação financeira',
      description: 'Reservas, ajustes, alternativas — sempre como proposta, nunca execução automática de dinheiro real.',
      implemented: false,
      actionTypes: ['CREATE_FINANCIAL_REMINDER'],
    },
  ],
  eventTypes: ['PAYMENT_DUE_SOON', 'BUDGET_THRESHOLD_REACHED', 'TRANSACTION_CATEGORIZED'],
  actionTypes: ['CATEGORIZE_TRANSACTION', 'CREATE_BUDGET', 'ADJUST_BUDGET', 'CREATE_FINANCIAL_REMINDER', 'EXECUTE_PAYMENT'],
  motionIdentityId: 'motion-finance',
  soundProfileId: 'sound-finance',
  contextPanelId: 'context-panel-finance',
};
