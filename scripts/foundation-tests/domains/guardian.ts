/**
 * MEDUSA — Guardian — testes de contrato (seções 19-24)
 *
 * Política, confiança, ciclo de aprovação (incl. expiração e rejeição),
 * auditoria append-only, undo, ação desconhecida, ação irreversível,
 * explicação estruturada, e independência entre domínios.
 */

import { resetAll, seedTrust, makeChecker } from './_helpers';
import * as ActionBus from '../../../src/foundation/actionBus';
import { GuardianPolicy, GuardianTrust, GuardianApproval, GuardianAuditLog, GuardianExplanation } from '../../../src/foundation/guardian';
import * as Lifecycle from '../../../src/foundation/guardianLifecycle';
import { proposePayment } from '../../../src/domains/finance/useCases/proposePayment';
import type { DomainId } from '../../../src/foundation/types/domain';

function send(domain: DomainId, type: string, reversible = true) {
  return ActionBus.dispatch(
    ActionBus.createAction({ domain, type, intent: `teste ${type}`, payload: {}, riskLevel: 'baixo', reversible, undoDescription: reversible ? 'desfazer' : undefined })
  );
}

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('guardian');

  // 1. Ação desconhecida => risco máximo
  resetAll();
  {
    const e = send('body', 'ACAO_QUE_NAO_EXISTE');
    check('1.1: ação sem política é L3 e marcada como desconhecida', e.decision.level === 'L3' && e.decision.isUnknownActionType && e.decision.requiresApproval);
  }

  // 2. Ação irreversível nunca executa sozinha, mesmo com regra L1
  resetAll();
  {
    GuardianPolicy.registerAutonomyRule({ domain: 'body', actionType: 'IRREVERSIVEL_L1', baseRisk: 'baixo', reversible: true, ceilingLevel: 'L1' });
    seedTrust('body', 'IRREVERSIVEL_L1', 20);
    const reversible = send('body', 'IRREVERSIVEL_L1', true);
    const irreversible = send('body', 'IRREVERSIVEL_L1', false);
    check('2.1: mesma regra, ação reversível com confiança executa sozinha (L1)', reversible.decision.level === 'L1');
    check('2.2: mesma regra, ação irreversível é rebaixada para L2', irreversible.decision.level === 'L2' && irreversible.decision.requiresApproval);
  }

  // 3. Trust: estados interpretáveis derivados de evidência
  resetAll();
  {
    check('3.1: sem registro algum => sem evidência (perfil inexistente)', GuardianTrust.getTrust('finance', 'CATEGORIZE_TRANSACTION') === undefined);
    for (let i = 0; i < 3; i += 1) GuardianTrust.recordOutcome({ domain: 'finance', actionType: 'A', outcome: 'accepted', actionId: `a${i}` });
    check('3.2: amostra pequena => "aprendendo"', GuardianTrust.getTrust('finance', 'A')?.state === 'aprendendo');
    for (let i = 3; i < 8; i += 1) GuardianTrust.recordOutcome({ domain: 'finance', actionType: 'A', outcome: 'accepted', actionId: `a${i}` });
    check('3.3: aceitação consistente numa amostra razoável => "confiavel"', GuardianTrust.getTrust('finance', 'A')?.state === 'confiavel');
    for (let i = 0; i < 8; i += 1) GuardianTrust.recordOutcome({ domain: 'finance', actionType: 'B', outcome: 'rejected', actionId: `b${i}` });
    check('3.4: rejeições recorrentes => "requer_atencao"', GuardianTrust.getTrust('finance', 'B')?.state === 'requer_atencao');
    const profile = GuardianTrust.getTrust('finance', 'A')!;
    check('3.5: perfil traz a evidência bruta que produziu o estado', profile.evidence.length === 8 && profile.acceptedCount === 8);
  }

  // 4. Confiança NUNCA concede autoridade sozinha
  resetAll();
  {
    seedTrust('finance', 'EXECUTE_PAYMENT', 50);
    seedTrust('finance', 'ADJUST_BUDGET', 50);
    check('4.1: L3 continua L3 com 50 aceitações', send('finance', 'EXECUTE_PAYMENT', false).decision.level === 'L3');
    check('4.2: teto L2 continua L2 com 50 aceitações', send('finance', 'ADJUST_BUDGET').decision.level === 'L2');
  }

  // 5. Ciclo de aprovação: pending -> approved -> executing -> success
  resetAll();
  {
    const e = proposePayment({ accountId: 'fixture_account_1', amount: 10, currency: 'BRL', description: 'x' });
    const approvalId = e.approvalRequest!.id;
    check('5.1: nasce pending com prazo (expiresAt)', e.approvalRequest!.status === 'pending' && !!e.approvalRequest!.expiresAt);
    check('5.2: Action nasce AWAITING_APPROVAL', ActionBus.getAction(e.action.id)?.status === 'AWAITING_APPROVAL');

    let executedEarly = false;
    try {
      Lifecycle.beginExecution(e.action.id);
      executedEarly = true;
    } catch {
      /* esperado */
    }
    check('5.3: NÃO executa antes de aprovada', !executedEarly);

    const resolved = Lifecycle.resolveApproval(approvalId, 'approve');
    check('5.4: aprovar => approval approved + Action AUTHORIZED', resolved.approval.status === 'approved' && resolved.action.status === 'AUTHORIZED');

    let doubleApproved = false;
    try {
      Lifecycle.resolveApproval(approvalId, 'approve');
      doubleApproved = true;
    } catch {
      /* esperado */
    }
    check('5.5: aprovar duas vezes lança (sem sobrescrita silenciosa)', !doubleApproved);

    check('5.6: AUTHORIZED -> EXECUTING', Lifecycle.beginExecution(e.action.id).status === 'EXECUTING');
    check('5.7: EXECUTING -> SUCCESS', Lifecycle.completeExecution(e.action.id, true).status === 'SUCCESS');

    const history = GuardianAuditLog.listForAction(e.action.id).map((h) => h.statusAtLog);
    check('5.8: auditoria registrou cada transição em ordem', JSON.stringify(history) === JSON.stringify(['AWAITING_APPROVAL', 'AUTHORIZED', 'EXECUTING', 'SUCCESS']));
    check('5.9: aprovação humana alimentou o Trust Engine', GuardianTrust.getTrust('finance', 'EXECUTE_PAYMENT')?.acceptedCount === 1);
  }

  // 6. Rejeição: terminal, nunca executa
  resetAll();
  {
    const e = proposePayment({ accountId: 'fixture_account_1', amount: 10, currency: 'BRL', description: 'x' });
    const rejected = Lifecycle.resolveApproval(e.approvalRequest!.id, 'reject');
    check('6.1: rejeitar => Action REJECTED', rejected.action.status === 'REJECTED');

    let executed = false;
    try {
      Lifecycle.beginExecution(e.action.id);
      executed = true;
    } catch {
      /* esperado */
    }
    check('6.2: execução depois de rejeição é impossível', !executed);

    let reApproved = false;
    try {
      Lifecycle.resolveApproval(e.approvalRequest!.id, 'approve');
      reApproved = true;
    } catch {
      /* esperado */
    }
    check('6.3: aprovar uma request já rejeitada lança', !reApproved);
    check('6.4: rejeição foi registrada como evidência de confiança', GuardianTrust.getTrust('finance', 'EXECUTE_PAYMENT')?.rejectedCount === 1);
  }

  // 7. Expiração
  resetAll();
  {
    const e = proposePayment({ accountId: 'fixture_account_1', amount: 10, currency: 'BRL', description: 'x' });
    const notYet = Lifecycle.expireOverdueApprovals(new Date());
    check('7.1: dentro do prazo, nada expira', notYet.length === 0);

    const expired = Lifecycle.expireOverdueApprovals(new Date(Date.now() + 25 * 60 * 60 * 1000));
    check('7.2: passado o prazo, a request expira', expired.length === 1 && expired[0].status === 'expired');
    check('7.3: a Action correspondente é cancelada', ActionBus.getAction(e.action.id)?.status === 'CANCELLED');

    let approvedAfterExpiry = false;
    try {
      Lifecycle.resolveApproval(e.approvalRequest!.id, 'approve');
      approvedAfterExpiry = true;
    } catch {
      /* esperado */
    }
    check('7.4: aprovar depois de expirar lança', !approvedAfterExpiry);
  }

  // 8. Undo: só reversível e só depois de SUCCESS
  resetAll();
  {
    seedTrust('body', 'PAUSE_BODY_PLAN');
    const reversible = send('body', 'PAUSE_BODY_PLAN', true);
    let earlyUndo = false;
    try {
      ActionBus.undo(reversible.action.id);
      earlyUndo = true;
    } catch {
      /* esperado */
    }
    check('8.1: não desfaz o que ainda não deu SUCCESS', !earlyUndo);

    Lifecycle.beginExecution(reversible.action.id);
    Lifecycle.completeExecution(reversible.action.id, true);
    check('8.2: reversível com SUCCESS pode ser desfeita', ActionBus.undo(reversible.action.id).status === 'UNDONE');

    const payment = proposePayment({ accountId: 'fixture_account_1', amount: 1, currency: 'BRL', description: 'x' });
    let irreversibleUndone = false;
    try {
      ActionBus.undo(payment.action.id);
      irreversibleUndone = true;
    } catch {
      /* esperado */
    }
    check('8.3: ação irreversível nunca pode ser desfeita', !irreversibleUndone);
  }

  // 9. Auditoria append-only
  resetAll();
  {
    const exportedNames = Object.keys(GuardianAuditLog).filter((k) => !k.startsWith('__'));
    check('9.1: audit log não expõe update/delete/remove', !exportedNames.some((k) => /update|delete|remove|clear|set/i.test(k)));
    send('agenda', 'MOVE_STUDY_BLOCK_WITHIN_WINDOW');
    send('finance', 'EXECUTE_PAYMENT', false);
    check('9.2: toda ação avaliada gera entrada de auditoria (mesmo as que não exigem aprovação)', GuardianAuditLog.listRecent(10).length === 2);
  }

  // 10. Explicação estruturada
  resetAll();
  {
    const pay = proposePayment({ accountId: 'fixture_account_1', amount: 1, currency: 'BRL', description: 'x' });
    const explanation = GuardianExplanation.explain(pay);
    check('10.1: explicação tem reason/evidence/impact/requestedDecision', !!explanation.reason && explanation.evidence.length > 0 && !!explanation.impact && explanation.requestedDecision === 'aguardar_aprovacao_humana');
    check('10.2: referencia a auditoria', explanation.auditReference === pay.auditLogEntry.id);
    seedTrust('agenda', 'MOVE_STUDY_BLOCK_WITHIN_WINDOW');
    const auto = send('agenda', 'MOVE_STUDY_BLOCK_WITHIN_WINDOW');
    check('10.3: ação automática é explicada como executar_automaticamente', GuardianExplanation.explain(auto).requestedDecision === 'executar_automaticamente');
  }

  // 11. Cross-domain: todos os domínios produzem Actions compatíveis; domínio novo não exige mudar o núcleo
  resetAll();
  {
    const domains: Array<[DomainId, string]> = [
      ['agenda', 'MOVE_STUDY_BLOCK_WITHIN_WINDOW'],
      ['education', 'CREATE_REVIEW_BLOCK'],
      ['finance', 'CATEGORIZE_TRANSACTION'],
      ['body', 'SCHEDULE_LIGHT_ACTIVITY'],
      ['spiritual', 'SCHEDULE_PRACTICE'],
    ];
    const levels = domains.map(([d, t]) => send(d, t).decision.level);
    check('11.1: Agenda/Educação/Finanças/Corpo/Espiritual passam pelo MESMO Guardian sem adaptação', levels.every((l) => l === 'L1' || l === 'L2'));
    check('11.2: auditoria filtra por domínio', GuardianAuditLog.listRecent(50, { domain: 'spiritual' }).length === 1);

    const before = send('spiritual', 'ACAO_FUTURA_INEXISTENTE');
    GuardianPolicy.registerAutonomyRule({ domain: 'spiritual', actionType: 'ACAO_FUTURA_INEXISTENTE', baseRisk: 'moderado', reversible: true, ceilingLevel: 'L2' });
    const after = send('spiritual', 'ACAO_FUTURA_INEXISTENTE');
    check('11.3: um tipo de ação novo só precisa de UMA regra registrada — nenhuma mudança no núcleo do Guardian', before.decision.level === 'L3' && after.decision.level === 'L2');
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[guardian] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
