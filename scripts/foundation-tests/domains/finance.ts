/**
 * MEDUSA — Finance Domain — testes de contrato (seção 38)
 *
 * Nota de honestidade: uma regra com teto L1 só executa sozinha DEPOIS de o
 * Trust Engine acumular evidência real (>=5 amostras, alta aceitação). Sem
 * histórico, o Guardian devolve L2 (proposta) — comportamento correto e
 * testado abaixo nas duas situações.
 */

import { resetAll, seedTrust, makeChecker } from './_helpers';
import { createInMemoryFinanceRepository } from '../../../src/domains/finance/repository/inMemory';
import {
  createFixtureAccount,
  createFixtureCategories,
  createFixtureTransaction,
  createFixtureRecurringCommitment,
} from '../../../src/domains/finance/fixtures';
import { categorizeTransaction } from '../../../src/domains/finance/useCases/categorizeTransaction';
import { createTransaction } from '../../../src/domains/finance/useCases/createTransaction';
import * as EventBus from '../../../src/foundation/eventBus';
import { createBudget } from '../../../src/domains/finance/useCases/createBudget';
import { adjustBudget } from '../../../src/domains/finance/useCases/adjustBudget';
import { linkRecurringCommitment } from '../../../src/domains/finance/useCases/linkRecurringCommitment';
import { createProjection } from '../../../src/domains/finance/useCases/createProjection';
import { proposePayment, proposeTransfer } from '../../../src/domains/finance/useCases/proposePayment';
import { executeFinanceAction, FinanceExecutionError } from '../../../src/domains/finance/useCases/executor';
import { computeCategoryTotals } from '../../../src/domains/finance/services/categoryEngine';
import { computeBudgetConsumption } from '../../../src/domains/finance/services/budgetEngine';
import { detectRecurringCandidates } from '../../../src/domains/finance/services/recurrenceHeuristic';
import { computeGoalProgress, addContribution } from '../../../src/domains/finance/services/goalEngine';
import { generateFinanceInsights } from '../../../src/domains/finance/services/insightsEngine';
import { validateTransaction, FinanceValidationError } from '../../../src/domains/finance/validators';
import * as FinanceApi from '../../../src/domains/finance/api';
import type { FinancialGoal } from '../../../src/domains/finance/model/types';

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('finance');

  // 1. Categorizar: sem histórico = L2 (proposta); com confiança real = L1 auto
  resetAll();
  {
    const repo = createInMemoryFinanceRepository();
    repo.saveAccount(createFixtureAccount());
    for (const c of createFixtureCategories()) repo.saveCategory(c);
    repo.saveTransaction(createFixtureTransaction({ id: 'txn_1', categoryId: 'cat_alimentacao' }));

    const first = categorizeTransaction(repo, 'txn_1', 'cat_moradia');
    check('1.1: sem histórico de confiança, categorizar é L2 (proposta, nunca auto)', first.decision.level === 'L2' && first.decision.requiresApproval);
    check('1.2: enquanto pendente, a transação NÃO foi alterada', repo.getTransaction('txn_1')?.categoryId === 'cat_alimentacao');

    seedTrust('finance', 'CATEGORIZE_TRANSACTION');
    const second = categorizeTransaction(repo, 'txn_1', 'cat_moradia');
    check('1.3: com evidência real de confiança, categorizar vira L1 (executa sozinho)', second.decision.level === 'L1' && !second.decision.requiresApproval);
    check('1.4: L1 aplicou a recategorização no repository', repo.getTransaction('txn_1')?.categoryId === 'cat_moradia');
  }

  // 1b. Criar transação: validação, eventos e travessia de limiar de orçamento
  resetAll();
  {
    const repo = createInMemoryFinanceRepository();
    repo.saveAccount(createFixtureAccount());
    for (const c of createFixtureCategories()) repo.saveCategory(c);
    repo.saveBudget({ id: 'b_thr', categoryId: 'cat_alimentacao', period: 'monthly', periodLabel: '2026-02', limitAmount: 100, active: true });

    const first = createTransaction(repo, createFixtureTransaction({ id: 'ct1', categoryId: 'cat_alimentacao', amount: 50 }));
    check('1b.1: transação persistida e TRANSACTION_CREATED emitido', repo.getTransaction('ct1') !== undefined && EventBus.getHistory({ domain: 'finance', type: 'TRANSACTION_CREATED' }).length === 1);
    check('1b.2: 50% do orçamento não cruza limiar nenhum', first.thresholdsCrossed.length === 0);

    const second = createTransaction(repo, createFixtureTransaction({ id: 'ct2', categoryId: 'cat_alimentacao', amount: 35 }));
    check('1b.3: cruzar 80% emite BUDGET_THRESHOLD_REACHED uma vez', second.thresholdsCrossed.length === 1 && EventBus.getHistory({ domain: 'finance', type: 'BUDGET_THRESHOLD_REACHED' }).length === 1);

    createTransaction(repo, createFixtureTransaction({ id: 'ct3', categoryId: 'cat_alimentacao', amount: 1 }));
    check('1b.4: continuar acima de 80% NÃO repete o alarme', EventBus.getHistory({ domain: 'finance', type: 'BUDGET_THRESHOLD_REACHED' }).length === 1);

    const third = createTransaction(repo, createFixtureTransaction({ id: 'ct4', categoryId: 'cat_alimentacao', amount: 20 }));
    check('1b.5: estourar 100% dispara o segundo limiar', third.thresholdsCrossed.length === 1 && EventBus.getHistory({ domain: 'finance', type: 'BUDGET_THRESHOLD_REACHED' }).length === 2);

    const rejects = (fn: () => unknown): boolean => { try { fn(); return false; } catch (e) { return e instanceof FinanceValidationError; } };
    check('1b.6: id duplicado é rejeitado', rejects(() => createTransaction(repo, createFixtureTransaction({ id: 'ct1' }))));
    check('1b.7: conta inexistente é rejeitada', rejects(() => createTransaction(repo, createFixtureTransaction({ id: 'ct9', accountId: 'nao_existe' }))));
    check('1b.8: valor negativo é rejeitado antes de persistir', rejects(() => createTransaction(repo, createFixtureTransaction({ id: 'ct10', amount: -3 }))) && repo.getTransaction('ct10') === undefined);
  }

  // 2. Totais por categoria
  resetAll();
  {
    const totals = computeCategoryTotals(
      [
        createFixtureTransaction({ id: 't1', categoryId: 'cat_alimentacao', amount: 100 }),
        createFixtureTransaction({ id: 't2', categoryId: 'cat_alimentacao', amount: 50 }),
        createFixtureTransaction({ id: 't3', categoryId: 'cat_moradia', amount: 800 }),
      ],
      createFixtureCategories()
    );
    check('2.1: soma por categoria correta', totals.find((t) => t.categoryId === 'cat_alimentacao')?.total === 150);
  }

  // 3. Orçamento: consumo derivado + ajuste é L2
  resetAll();
  {
    const repo = createInMemoryFinanceRepository();
    for (const c of createFixtureCategories()) repo.saveCategory(c);
    const budget = { id: 'budget_1', categoryId: 'cat_alimentacao', period: 'monthly' as const, periodLabel: '2026-02', limitAmount: 200, active: true };
    seedTrust('finance', 'CREATE_BUDGET');
    const created = createBudget(repo, budget);
    check('3.1: criar orçamento com confiança acumulada é L1 e persiste', !created.decision.requiresApproval && repo.getBudget('budget_1') !== undefined);

    const consumption = computeBudgetConsumption(budget, [createFixtureTransaction({ id: 'x', categoryId: 'cat_alimentacao', amount: 170 })]);
    check('3.2: consumo/restante/percentual são DERIVADOS (nunca guardados)', consumption.consumedAmount === 170 && consumption.remainingAmount === 30);
    check('3.3: 85% consumido => perto do limite', consumption.state === 'proximo_do_limite');

    const adjust = adjustBudget(repo, 'budget_1', 300);
    check('3.4: ajustar orçamento é L2 (teto da política)', adjust.decision.level === 'L2' && adjust.decision.requiresApproval);
    check('3.5: orçamento não muda enquanto pendente', repo.getBudget('budget_1')?.limitAmount === 200);
  }

  // 4. Recorrência: heurística nomeada como heurística, com evidência
  resetAll();
  {
    const candidates = detectRecurringCandidates([
      createFixtureTransaction({ id: 'r1', description: 'Netflix assinatura', amount: 39.9, occurredAt: '2026-01-05' }),
      createFixtureTransaction({ id: 'r2', description: 'Netflix assinatura', amount: 39.9, occurredAt: '2026-02-05' }),
      createFixtureTransaction({ id: 'r3', description: 'Netflix assinatura', amount: 39.9, occurredAt: '2026-03-05' }),
    ]);
    check('4.1: heurística detecta padrão mensal', candidates.length === 1);
    check('4.2: confiança é interpretável (baixa/moderada/alta), nunca um número solto', ['baixa', 'moderada', 'alta'].includes(candidates[0]?.confidence));
    const none = detectRecurringCandidates([createFixtureTransaction({ id: 'solo', description: 'Compra única', occurredAt: '2026-01-05' })]);
    check('4.3: uma única ocorrência NÃO vira recorrência (não inventa padrão)', none.length === 0);
  }

  // 5. Vincular compromisso
  resetAll();
  {
    const repo = createInMemoryFinanceRepository();
    repo.saveTransaction(createFixtureTransaction({ id: 'txn_link' }));
    repo.saveRecurringCommitment(createFixtureRecurringCommitment());
    seedTrust('finance', 'LINK_RECURRING_COMMITMENT');
    const evaluation = linkRecurringCommitment(repo, 'txn_link', 'fixture_commitment_1');
    check('5.1: vincular (com confiança) é L1 e grava recurringCommitmentId', !evaluation.decision.requiresApproval && repo.getTransaction('txn_link')?.recurringCommitmentId === 'fixture_commitment_1');
  }

  // 6. Projeção (observado vs projetado)
  resetAll();
  {
    const repo = createInMemoryFinanceRepository();
    repo.saveRecurringCommitment(createFixtureRecurringCommitment());
    seedTrust('finance', 'CREATE_PROJECTION');
    const res = createProjection(repo, 1000, '2026-01-01', 3);
    check('6.1: projeta N meses', res.projections?.length === 3);
    check('6.2: saldo observado fica separado do projetado', res.projections?.[0]?.observedBalance === 1000 && res.projections[0].projectedBalance !== 1000);
  }

  // 7. Meta: progresso derivado do histórico de contribuições
  resetAll();
  {
    const goal: FinancialGoal = {
      id: 'goal_1',
      label: 'Reserva (fixture)',
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: '2026-12-31',
      contributions: [],
      milestones: [{ id: 'm1', label: 'Metade', targetAmount: 500, achieved: false }],
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    check('7.1: meta sem contribuição = 0%', computeGoalProgress(goal) === 0);
    const updated = addContribution(goal, { id: 'c1', amount: 600, occurredAt: '2026-02-01' });
    check('7.2: currentAmount é recalculado a partir das contribuições', updated.currentAmount === 600);
    check('7.3: milestone atingido é marcado sozinho pelo histórico', updated.milestones[0].achieved === true);
  }

  // 8. Insights: sem dado => insufficient_evidence
  resetAll();
  {
    const empty = generateFinanceInsights({
      cashflow: { income: 0, expense: 0, netFlow: 0, transactionCount: 0, periodFrom: '2026-01-01', periodTo: '2026-01-31' },
      budgetConsumptions: [],
      upcomingCommitments: [],
      categorySpikes: [],
      goalTracks: [],
      now: '2026-01-31',
    });
    check('8.1: sem transações => insufficient_evidence (nunca inventa evidência)', empty[0]?.type === 'insufficient_evidence');

    const negative = generateFinanceInsights({
      cashflow: { income: 100, expense: 400, netFlow: -300, transactionCount: 5, periodFrom: '2026-01-01', periodTo: '2026-01-31' },
      budgetConsumptions: [],
      upcomingCommitments: [],
      categorySpikes: [],
      goalTracks: [],
      now: '2026-01-31',
    });
    check('8.2: fluxo negativo gera cashflow_negative com evidência e ação proposta', negative[0]?.type === 'cashflow_negative' && negative[0].evidence.length > 0 && negative[0].proposedActionType === 'CREATE_FINANCIAL_REMINDER');
  }

  // 9. Pagamento/transferência: sempre L3, nunca executam (CENÁRIO 3)
  resetAll();
  {
    seedTrust('finance', 'EXECUTE_PAYMENT', 20); // mesmo com muita "confiança", L3 continua L3
    const evaluation = proposePayment({ accountId: 'fixture_account_1', amount: 500, currency: 'BRL', description: 'Pagamento fixture' });
    check('9.1: EXECUTE_PAYMENT é L3 mesmo com confiança acumulada (confiança nunca concede autoridade)', evaluation.decision.level === 'L3' && evaluation.decision.requiresApproval);
    check('9.2: uma ApprovalRequest pendente foi criada', evaluation.approvalRequest?.status === 'pending');
    check('9.3: TRANSFER_FUNDS também é L3', proposeTransfer({ accountId: 'fixture_account_1', amount: 1, currency: 'BRL', description: 't' }).decision.level === 'L3');

    let threw = false;
    try {
      executeFinanceAction(createInMemoryFinanceRepository(), evaluation.action);
    } catch (e) {
      threw = e instanceof FinanceExecutionError;
    }
    check('9.4: chamar o executor direto com EXECUTE_PAYMENT lança — nada financeiro executa', threw);
  }

  // 10. Validação interpretável
  resetAll();
  {
    let msg = '';
    try {
      validateTransaction(createFixtureTransaction({ amount: -5 }));
    } catch (e) {
      msg = e instanceof FinanceValidationError ? e.message : '';
    }
    check('10.1: valor negativo é rejeitado com erro interpretável', msg.includes('negativo'));
    let badCurrency = false;
    try {
      validateTransaction(createFixtureTransaction({ currency: 'real' }));
    } catch {
      badCurrency = true;
    }
    check('10.2: moeda fora do padrão ISO é rejeitada', badCurrency);
  }

  // 11. Contrato público consumido pela futura UI
  resetAll();
  {
    const repo = createInMemoryFinanceRepository();
    repo.saveAccount(createFixtureAccount());
    const overview = FinanceApi.getOverview(repo, '2026-01-01', '2026-01-31', '2026-01-31');
    check('11.1: getOverview() calcula saldo total a partir do repository', overview.totalBalance === 1500);
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[finance] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
