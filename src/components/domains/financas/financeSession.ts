'use client';

/**
 * Sessão de Finanças na UI: um repositório em memória (o único adapter que existe hoje) populado
 * com DADOS DE DEMONSTRAÇÃO gerados relativos ao mês corrente. Toda leitura passa por `FinanceApi`
 * e toda escrita por casos de uso do domínio — a UI não guarda dado financeiro em lugar nenhum.
 *
 * Quando existir um adapter real (banco/Open Finance), só `getFinanceRepository()` muda.
 */

import {
  GoalEngine,
  contributeToGoal,
  createInMemoryFinanceRepository,
  createTransaction,
  executeFinanceAction,
  proposePayment,
} from '@/domains/finance';
import type { FinanceRepository, Transaction } from '@/domains/finance';
import type { GuardianEvaluation } from '@/foundation/types/guardian';
import type { Action } from '@/foundation/types/action';
import { ensureDomains, routeOf } from '../shared/runtime';
import type { DecisionRoute } from '../shared/runtime';
import { createUiStore, useUiStore } from '../shared/uiStore';
import { isoDay } from '../shared/format';

export type FinanceScenario = 'tranquilo' | 'apertado';

export type FinanceFocus =
  | { kind: 'bill'; id: string }
  | { kind: 'budget'; id: string }
  | { kind: 'goal'; id: string }
  | { kind: 'attention' }
  | null;

/** `version` sobe a cada escrita para as telas relerem o repositório. */
export const financeUi = createUiStore<{ version: number; focus: FinanceFocus }>({ version: 0, focus: null });

interface Session {
  repo: FinanceRepository;
  scenario: FinanceScenario;
  now: Date;
}

let session: Session | undefined;

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

function scenarioFromUrl(): FinanceScenario {
  if (typeof window === 'undefined') return 'tranquilo';
  return new URLSearchParams(window.location.search).get('cenario') === 'apertado' ? 'apertado' : 'tranquilo';
}

function seed(repo: FinanceRepository, now: Date, scenario: FinanceScenario): void {
  const y = now.getFullYear();
  const m = now.getMonth();
  const dim = daysInMonth(y, m);
  const today = now.getDate();
  const at = (monthOffset: number, day: number) => isoDay(new Date(y, m + monthOffset, Math.min(day, daysInMonth(y, m + monthOffset))));
  const nowISO = now.toISOString();
  const apertado = scenario === 'apertado';

  repo.saveAccount({ id: 'acc_corrente', name: 'Conta corrente', type: 'checking', currentBalance: apertado ? 1380 : 4250, currency: 'BRL', active: true, dataSource: 'manual', createdAt: nowISO, updatedAt: nowISO });
  repo.saveAccount({ id: 'acc_reserva', name: 'Reserva', type: 'savings', currentBalance: 18200, currency: 'BRL', active: true, dataSource: 'manual', createdAt: nowISO, updatedAt: nowISO });

  for (const [id, name, kind] of [
    ['cat_moradia', 'Moradia e fixos', 'expense'],
    ['cat_alimentacao', 'Alimentação', 'expense'],
    ['cat_transporte', 'Transporte', 'expense'],
    ['cat_lazer', 'Lazer e saídas', 'expense'],
    ['cat_estudos', 'Estudos', 'expense'],
    ['cat_assinaturas', 'Assinaturas', 'expense'],
    ['cat_salario', 'Salário', 'income'],
  ] as const) {
    repo.saveCategory({ id, name, kind, active: true });
  }

  const txn = (t: Omit<Transaction, 'currency' | 'source' | 'status'> & Partial<Transaction>) =>
    createTransaction(repo, { currency: 'BRL', source: 'manual', status: 'posted', ...t });

  // Receita do mês (e dos três anteriores: dá histórico para a heurística de recorrência).
  txn({ id: 'tx_salario', accountId: 'acc_corrente', amount: apertado ? 5200 : 8450, type: 'income', categoryId: 'cat_salario', description: 'Salário', occurredAt: at(0, 5) });

  // Assinaturas: 4 ocorrências mensais → a heurística de recorrência as detecta sozinha.
  const subs: Array<[string, number, string, number]> = [
    ['Netflix', 55.9, 'nfx', 12],
    ['Spotify Família', 34.9, 'spf', 14],
    ['Armazenamento na nuvem', 14.9, 'cld', 18],
  ];
  for (const [label, amount, key, day] of subs) {
    for (let back = 3; back >= 0; back -= 1) {
      const date = at(-back, day);
      if (date > isoDay(now)) continue; // não inventa cobrança futura
      txn({ id: `tx_${key}_${back}`, accountId: 'acc_corrente', amount, type: 'expense', categoryId: 'cat_assinaturas', description: label, occurredAt: date });
    }
  }

  // Despesas do mês corrente (até hoje).
  const spend: Array<[string, string, number, number, string]> = [
    ['tx_aluguel', 'cat_moradia', 2450, 3, 'Aluguel'],
    ['tx_merc1', 'cat_alimentacao', 312.4, 2, 'Supermercado'],
    ['tx_merc2', 'cat_alimentacao', 284.75, Math.max(2, today - 9), 'Supermercado'],
    ['tx_ifood', 'cat_alimentacao', apertado ? 420 : 212.6, Math.max(2, today - 3), 'Restaurantes e delivery'],
    ['tx_feira', 'cat_alimentacao', 96.2, Math.max(2, today - 1), 'Feira'],
    ['tx_uber', 'cat_transporte', apertado ? 260 : 128, Math.max(2, today - 5), 'Transporte por aplicativo'],
    ['tx_livro', 'cat_estudos', 210, Math.max(2, today - 12), 'Material de estudo'],
    ['tx_bar', 'cat_lazer', apertado ? 980 : 790, Math.max(2, today - 2), 'Saídas e lazer'],
  ];
  for (const [id, categoryId, amount, day, description] of spend) {
    txn({ id, accountId: 'acc_corrente', amount, type: 'expense', categoryId, description, occurredAt: at(0, Math.min(day, today)) });
  }

  // Compromissos recorrentes. Um já pago (com transação vinculada) e dois ainda a pagar.
  repo.saveRecurringCommitment({ id: 'rc_aluguel', label: 'Aluguel', type: 'expense', categoryId: 'cat_moradia', expectedAmount: 2450, frequency: 'monthly', dueDayOfMonth: 3, startDate: at(-6, 1), active: true, source: 'manual' });
  repo.saveTransaction({ ...repo.getTransaction('tx_aluguel')!, recurringCommitmentId: 'rc_aluguel' });
  repo.saveRecurringCommitment({ id: 'rc_internet', label: 'Internet fibra', type: 'expense', categoryId: 'cat_moradia', expectedAmount: 145, frequency: 'monthly', dueDayOfMonth: Math.min(today + 1, dim), startDate: at(-6, 1), active: true, source: 'manual' });
  repo.saveRecurringCommitment({ id: 'rc_cartao', label: 'Fatura do cartão', type: 'expense', categoryId: 'cat_lazer', expectedAmount: apertado ? 1680 : 680, frequency: 'monthly', dueDayOfMonth: Math.min(today + 5, dim), startDate: at(-6, 1), active: true, source: 'manual' });

  // Orçamentos do mês (limites definidos pela pessoa; consumo é sempre derivado).
  const label = `${y}-${String(m + 1).padStart(2, '0')}`;
  for (const [id, categoryId, limit] of [
    ['bd_alimentacao', 'cat_alimentacao', 1500],
    ['bd_moradia', 'cat_moradia', 2600],
    ['bd_estudos', 'cat_estudos', 480],
    ['bd_lazer', 'cat_lazer', 900],
  ] as const) {
    repo.saveBudget({ id, categoryId, limitAmount: limit, period: 'monthly', periodLabel: label, active: true });
  }

  // Metas (o currentAmount nasce das contribuições, nunca de um número solto).
  const mk = (id: string, goalLabel: string, target: number, parts: number[], targetDate: string, createdAt: string) => {
    const contributions = parts.map((amount, i) => ({ id: `${id}_c${i}`, amount, occurredAt: createdAt }));
    repo.saveGoal({
      id,
      label: goalLabel,
      targetAmount: target,
      currentAmount: contributions.reduce((s, c) => s + c.amount, 0),
      targetDate,
      milestones: [
        { id: `${id}_m1`, label: '50%', targetAmount: target * 0.5, achieved: false },
        { id: `${id}_m2`, label: '75%', targetAmount: target * 0.75, achieved: false },
      ].map((ms) => ({ ...ms, achieved: contributions.reduce((s, c) => s + c.amount, 0) >= ms.targetAmount })),
      contributions,
      createdAt,
    });
  };
  mk('goal_reserva', 'Reserva de emergência', 30000, [6000, 6000, 6200], isoDay(new Date(y + 1, m, 1)), isoDay(new Date(y - 1, m, 1)));
  mk('goal_ferias', 'Viagem de férias', 15000, [4800, 4800], isoDay(new Date(y + 1, 0, 15)), isoDay(new Date(y, m - 6, 1)));
}

export function getFinanceSession(): Session {
  ensureDomains();
  if (!session) {
    const now = new Date();
    const repo = createInMemoryFinanceRepository();
    const scenario = scenarioFromUrl();
    seed(repo, now, scenario);
    session = { repo, scenario, now };
  }
  return session;
}

function bump(): void {
  financeUi.set((s) => ({ version: s.version + 1 }));
}

export interface ActionOutcome {
  route: DecisionRoute;
  actionId: string;
  reason: string;
}

function outcomeOf(evaluation: GuardianEvaluation): ActionOutcome {
  return { route: routeOf(evaluation), actionId: evaluation.action.id, reason: evaluation.decision.reason };
}

/** "Pagar": o domínio só PROPÕE (L3). Nada é pago — a Action fica aguardando aprovação. */
export function proposeBillPayment(input: { commitmentId: string; label: string; amount: number }): ActionOutcome {
  const { repo } = getFinanceSession();
  const evaluation = proposePayment({ accountId: repo.listAccounts({ active: true })[0].id, amount: input.amount, currency: 'BRL', description: input.label });
  bump();
  return outcomeOf(evaluation);
}

export function registerGoalContribution(goalId: string, amount: number): ActionOutcome {
  const { repo, now } = getFinanceSession();
  const evaluation = contributeToGoal(repo, goalId, { id: `contrib_${goalId}_${Date.now()}`, amount, occurredAt: now.toISOString() });
  bump();
  return outcomeOf(evaluation);
}

/**
 * Executor chamado DEPOIS de uma pessoa aprovar um pedido pendente de Finanças.
 * `UPDATE_GOAL` não tem ramo no executor do domínio (o efeito vive no caso de uso), então a UI
 * aplica o mesmo efeito pelo mesmo motor (`GoalEngine.addContribution`) — lacuna do domínio, registrada no relatório.
 * `EXECUTE_PAYMENT` cai no executor real, que SEMPRE lança: não existe integração bancária.
 */
export function executeApprovedFinanceAction(action: Action): void {
  const { repo } = getFinanceSession();
  if (action.type === 'UPDATE_GOAL') {
    const payload = action.payload as { goalId: string; contribution: { id: string; amount: number; occurredAt: string } };
    const goal = repo.getGoal(payload.goalId);
    if (!goal) throw new Error(`Meta "${payload.goalId}" não encontrada.`);
    repo.saveGoal(GoalEngine.addContribution(goal, payload.contribution));
  } else {
    executeFinanceAction(repo, action);
  }
  bump();
}

export function notifyFinanceChanged(): void {
  bump();
}

export function useFinanceState() {
  return useUiStore(financeUi);
}

export function useFinanceFocus(): FinanceFocus {
  return useUiStore(financeUi).focus;
}

export function focusFinance(focus: FinanceFocus): void {
  // `focus` novo a cada clique: reabre mesmo quando é o mesmo item já focado antes.
  financeUi.set({ focus: focus ? { ...focus } : null });
}
