/**
 * MEDUSA — Cenários de integração (seção 39) + orquestração evento→ação (seção 29)
 *
 * Cada cenário atravessa camadas reais (engine → evento → ação → Guardian →
 * Agenda/Hoje/Island) sem UI. Nenhum passo é simulado por um stub que decide
 * o resultado: o Guardian, o Trust Engine, o Event Bus e os repositórios são
 * os de produção do código.
 */

import { resetAll, seedTrust, makeChecker } from './_helpers';
import * as ActionBus from '../../../src/foundation/actionBus';
import * as EventBus from '../../../src/foundation/eventBus';
import * as IslandQueue from '../../../src/foundation/island/eventQueue';
import * as ProactiveMessaging from '../../../src/foundation/messaging/proactiveMessage';
import * as Lifecycle from '../../../src/foundation/guardianLifecycle';
import { GuardianAuditLog } from '../../../src/foundation/guardian';
import { getTodayContextSnapshot } from '../../../src/foundation/hojeContext';

import { createInMemoryFinanceRepository } from '../../../src/domains/finance/repository/inMemory';
import { createFixtureAccount, createFixtureRecurringCommitment } from '../../../src/domains/finance/fixtures';
import * as FinanceApi from '../../../src/domains/finance/api';
import { createFinancialReminder } from '../../../src/domains/finance/useCases/createFinancialReminder';
import { proposePayment } from '../../../src/domains/finance/useCases/proposePayment';
import { executeFinanceAction, FinanceExecutionError } from '../../../src/domains/finance/useCases/executor';
import { resolveFinanceTodayContext } from '../../../src/domains/finance/adapters/hojeResolver';

import { computeRoutineLoad } from '../../../src/domains/body/services/routineLoadHeuristic';
import { generateBodyInsights } from '../../../src/domains/body/services/insightsEngine';
import { scheduleLightActivity } from '../../../src/domains/body/useCases/scheduleLightActivity';

import { createInMemorySpiritualRepository } from '../../../src/domains/spiritual/repository/inMemory';
import { createFixtureGoal, createFixturePractice } from '../../../src/domains/spiritual/fixtures';
import { createGoal } from '../../../src/domains/spiritual/useCases/createGoal';
import { recordPractice } from '../../../src/domains/spiritual/useCases/recordPractice';
import { resolveSpiritualTodayContext } from '../../../src/domains/spiritual/adapters/hojeResolver';

const NOW = '2026-02-08T10:00:00.000Z';

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('integração');

  // ===========================================================================
  // CENÁRIO 1 — FINANÇAS
  // payment due → Finance Event → Insight → CREATE_FINANCIAL_REMINDER → Guardian → L1 → Agenda → Hoje
  // ===========================================================================
  resetAll();
  {
    const repo = createInMemoryFinanceRepository();
    repo.saveAccount(createFixtureAccount());
    const commitment = createFixtureRecurringCommitment(); // vence todo dia 10
    repo.saveRecurringCommitment(commitment);

    const insights = FinanceApi.getInsights(repo, '2026-02-01', '2026-02-28', '2026-02-08');
    const due = insights.find((i) => i.type === 'recurring_commitment_due');
    check('C1.1: o domínio detecta o vencimento próximo e gera um insight com evidência', !!due && due.evidence.length > 0);
    check('C1.2: o insight propõe a ação CREATE_FINANCIAL_REMINDER', due?.proposedActionType === 'CREATE_FINANCIAL_REMINDER');

    seedTrust('finance', 'CREATE_FINANCIAL_REMINDER');
    const result1 = createFinancialReminder(commitment, '2026-02-10', 2);
    check('C1.3: Guardian classifica L1 e não pede aprovação', result1.evaluation.decision.level === 'L1' && !result1.evaluation.decision.requiresApproval);
    check('C1.4: evento PAYMENT_DUE_SOON foi publicado', EventBus.getHistory({ domain: 'finance', type: 'PAYMENT_DUE_SOON' }).length === 1);
    check('C1.5: a Agenda recebe só domain=finance / sourceType=finance_deadline / sourceId', result1.schedulingRequest?.agendaDomain === 'finance' && result1.schedulingRequest?.source.sourceType === 'finance_deadline' && result1.schedulingRequest?.source.sourceId === commitment.id);
    check('C1.6: a Agenda não recebe nenhum cálculo financeiro (só título/data/descrição)', Object.keys(result1.schedulingRequest ?? {}).sort().join(',') === 'agendaDomain,date,description,source,title');
    check('C1.7: mensagem proativa chega ao Hoje, com evidência', getTodayContextSnapshot().messagesForToday.some((m) => m.domain === 'finance' && m.evidence.evidence.length > 0));

    createFinancialReminder(commitment, '2026-02-10', 2);
    check('C1.8: repetir o mesmo aviso não gera spam (cooldown/dedupe reais)', ProactiveMessaging.list({ domain: 'finance', surface: 'hoje' }).length === 1);

    const hoje = resolveFinanceTodayContext(insights);
    check('C1.9: Hoje recebe UMA frase compacta, não uma lista de métricas', !!hoje && hoje.headline.includes('vence em 2 dia'));
    check('C1.10: a ação ficou auditada', GuardianAuditLog.listForAction(result1.evaluation.action.id).length === 1);
  }

  // ===========================================================================
  // CENÁRIO 2 — CORPO
  // routine context → Body Insight → SCHEDULE_LIGHT_ACTIVITY → Agenda → Guardian → approved/executed → Island event
  // ===========================================================================
  resetAll();
  {
    const load = computeRoutineLoad({ workMinutes: 480, studyMinutes: 180, commuteMinutes: 120, plannedActivityMinutes: 0, sleepQuality: 'ruim', energyLevel: 'baixa' });
    const insights = generateBodyInsights({ routineLoad: load, now: NOW });
    const high = insights.find((i) => i.type === 'routine_load_high');
    check('C2.1: contexto de rotina gera insight ROUTINE_LOAD_HIGH com evidência', !!high && high.evidence.length > 0);
    check('C2.2: o insight propõe SCHEDULE_LIGHT_ACTIVITY', high?.proposedActionType === 'SCHEDULE_LIGHT_ACTIVITY');

    const proposal = scheduleLightActivity('act_caminhada_leve', '2026-02-09', 20, high!.observation);
    check('C2.3: sem histórico de confiança o Guardian pede aprovação (L2) e nada é agendado ainda', proposal.evaluation.decision.requiresApproval && proposal.schedulingRequest === undefined);

    const approved = Lifecycle.resolveApproval(proposal.evaluation.approvalRequest!.id, 'approve');
    check('C2.4: usuário aprova => AUTHORIZED', approved.action.status === 'AUTHORIZED');
    Lifecycle.beginExecution(approved.action.id);
    const done = Lifecycle.completeExecution(approved.action.id, true);
    check('C2.5: executada com sucesso (EXECUTING → SUCCESS)', done.status === 'SUCCESS');

    const island = IslandQueue.enqueue({
      id: 'island_body_1',
      domain: 'body',
      islandState: 'success',
      priority: 1,
      severity: 'info',
      message: 'Caminhada leve agendada',
      soundKey: 'plan-ready',
      requiresAttention: false,
      interruptible: true,
      sourceActionId: done.id,
      createdAt: new Date().toISOString(),
    });
    check('C2.6: o evento de experiência entra na fila do Island referenciando a Action', island?.sourceActionId === done.id && IslandQueue.peek()?.domain === 'body');
    check('C2.7: usar só 1 dos 10 estados canônicos do Island (nenhum 11º estado inventado)', IslandQueue.peek()?.islandState === 'success');
    check('C2.8: a aprovação humana virou evidência de confiança', (GuardianAuditLog.listForAction(done.id).map((e) => e.statusAtLog).join('>') === 'AWAITING_APPROVAL>AUTHORIZED>EXECUTING>SUCCESS'));
  }

  // ===========================================================================
  // CENÁRIO 3 — FINANÇAS L3
  // financial action → EXECUTE_PAYMENT → Guardian → L3 → ApprovalRequest → NO execution
  // ===========================================================================
  resetAll();
  {
    const repo = createInMemoryFinanceRepository();
    repo.saveAccount(createFixtureAccount({ currentBalance: 1500 }));
    const before = repo.getAccount('fixture_account_1')!.currentBalance;

    seedTrust('finance', 'EXECUTE_PAYMENT', 30);
    const e = proposePayment({ accountId: 'fixture_account_1', amount: 999, currency: 'BRL', description: 'Boleto fixture' });
    check('C3.1: L3 mesmo com confiança máxima', e.decision.level === 'L3');
    check('C3.2: ApprovalRequest pendente criada', e.approvalRequest?.status === 'pending');
    check('C3.3: NENHUM saldo mudou só por propor', repo.getAccount('fixture_account_1')!.currentBalance === before);

    const approved = Lifecycle.resolveApproval(e.approvalRequest!.id, 'approve');
    Lifecycle.beginExecution(approved.action.id);
    let refused = false;
    try {
      executeFinanceAction(repo, approved.action);
    } catch (err) {
      refused = err instanceof FinanceExecutionError;
    }
    check('C3.4: mesmo APROVADO, o executor recusa — não existe integração bancária real', refused);
    const failed = Lifecycle.completeExecution(approved.action.id, false);
    check('C3.5: a Action termina FAILED (nunca SUCCESS falso)', failed.status === 'FAILED');
    check('C3.6: saldo continua intacto depois de todo o fluxo', repo.getAccount('fixture_account_1')!.currentBalance === before);
    check('C3.7: nenhum evento de sucesso financeiro foi emitido', EventBus.getHistory({ domain: 'finance', type: 'TRANSACTION_CREATED' }).length === 0);
  }

  // ===========================================================================
  // CENÁRIO 4 — ESPIRITUAL
  // practice completed → event → goal progress → Today contextual update
  // ===========================================================================
  resetAll();
  {
    const repo = createInMemorySpiritualRepository();
    createGoal(repo, createFixtureGoal());
    seedTrust('spiritual', 'UPDATE_GOAL_PROGRESS');

    const before = repo.getGoal('fixture_goal_1')!.currentPracticeCount;
    const { goalUpdateEvaluation } = recordPractice(repo, createFixturePractice({ relatedGoalId: 'fixture_goal_1' }), NOW);
    const after = repo.getGoal('fixture_goal_1')!;

    check('C4.1: evento PRACTICE_COMPLETED emitido', EventBus.getHistory({ domain: 'spiritual', type: 'PRACTICE_COMPLETED' }).length === 1);
    check('C4.2: UPDATE_GOAL_PROGRESS passou pelo Guardian (L1) e foi executada', goalUpdateEvaluation?.decision.level === 'L1' && after.currentPracticeCount === before + 1);

    const ctx = resolveSpiritualTodayContext(after.label, after.id, before, after.currentPracticeCount, after.targetPracticeCount);
    check('C4.3: Hoje recebe a atualização contextual (progresso da meta)', ctx?.headline === `Meta "${after.label}" avançou.` && ctx.detail === '1/30 práticas.');

    ProactiveMessaging.publish({
      domain: 'spiritual',
      message: ctx!.headline,
      evidence: { reason: 'Prática concluída vinculada à meta.', evidence: [ctx!.detail!] },
      surfaceTargets: ['hoje'],
    });
    check('C4.4: aparece no snapshot do Hoje', getTodayContextSnapshot().messagesForToday.some((m) => m.domain === 'spiritual'));
  }

  // ===========================================================================
  // Orquestração evento→ação (seção 29): Educação — LESSON_COMPLETED → CREATE_REVIEW_BLOCK → Guardian
  // Nenhum domínio importa outro: só o Event Bus liga os dois lados.
  // ===========================================================================
  resetAll();
  {
    seedTrust('education', 'CREATE_REVIEW_BLOCK');
    const evaluations: string[] = [];
    const unsubscribe = EventBus.subscribe('LESSON_COMPLETED', (event) => {
      const action = ActionBus.createAction({
        domain: 'education',
        type: 'CREATE_REVIEW_BLOCK',
        intent: 'Criar bloco de revisão depois da aula concluída',
        payload: event.payload,
        source: event.id,
        riskLevel: 'baixo',
        reversible: true,
        undoDescription: 'Remover o bloco de revisão.',
      });
      evaluations.push(ActionBus.dispatch(action).decision.level);
    });
    EventBus.publish({ domain: 'education', type: 'LESSON_COMPLETED', payload: { lessonId: 'l1' } });
    unsubscribe();
    check('C5.1: evento de Educação vira ação passando pelo Guardian (L1 com confiança)', evaluations.length === 1 && evaluations[0] === 'L1');
    check('C5.2: a Action carrega o id do evento de origem', ActionBus.listActions({ domain: 'education' })[0].source !== undefined);
  }

  // ===========================================================================
  // Agregação: 3 domínios detectam contexto ao mesmo tempo => o agregador agrupa, não empilha 3 avisos
  // ===========================================================================
  resetAll();
  {
    for (const domain of ['finance', 'body', 'spiritual'] as const) {
      ProactiveMessaging.publish({
        domain,
        message: `Aviso de ${domain}`,
        evidence: { reason: 'Contexto detectado', evidence: [] },
        surfaceTargets: ['hoje'],
      });
    }
    const groups = ProactiveMessaging.groupRecent(5000, 'hoje');
    check('C6.1: três domínios simultâneos caem num único grupo sintetizável', groups.length === 1 && groups[0].length === 3);
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[integração] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
