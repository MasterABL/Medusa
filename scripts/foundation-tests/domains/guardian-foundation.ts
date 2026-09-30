/**
 * MEDUSA FOUNDATION — Guardian: cadeia causal completa
 *
 *   Evento → Contexto → Decisão → Política → Autonomia → Aprovação
 *          → Execução → Resultado → Feedback → Auditoria
 *
 * Dedup e cooldown já são cobertos por `contract-tests` (EventBus) e
 * `guardian-runtime` (cooldown de achado/ação); aqui só se prova que eles
 * entram na MESMA trilha, sem sistema paralelo.
 */

import { resetAll, seedTrust, makeChecker } from './_helpers';
import * as EventBus from '../../../src/foundation/eventBus';
import * as ActionBus from '../../../src/foundation/actionBus';
import { GuardianPolicy, GuardianTrust, GuardianApproval, GuardianAuditLog } from '../../../src/foundation/guardian';
import * as Lifecycle from '../../../src/foundation/guardianLifecycle';
import * as DecisionContext from '../../../src/foundation/guardianTrace/decisionContext';
import * as Outcomes from '../../../src/foundation/guardianTrace/outcome';
import * as Feedback from '../../../src/foundation/guardianTrace/feedback';
import * as Grants from '../../../src/foundation/guardianTrace/grant';
import * as Trace from '../../../src/foundation/guardianTrace/causalTrace';
import * as ActionCenter from '../../../src/foundation/guardianTrace/actionCenter';

const NOW = '2026-09-10T12:00:00.000Z';
const CID = 'caso-1';

function propose(type: string, opts: { reversible?: boolean; correlationId?: string; eventId?: string } = {}) {
  return ActionBus.dispatch(
    ActionBus.createAction({
      domain: 'finance', type, intent: `teste ${type}`, payload: {}, riskLevel: 'baixo',
      reversible: opts.reversible ?? true, undoDescription: 'desfazer',
      correlationId: opts.correlationId, sourceEventId: opts.eventId,
    })
  );
}

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('guardian-foundation');

  // 1. Caso L2 completo: precisa de aprovação, executa depois dela, tem resultado e feedback
  resetAll();
  {
    GuardianPolicy.registerAutonomyRule({ domain: 'finance', actionType: 'AJUSTAR_ORCAMENTO', baseRisk: 'moderado', reversible: true, ceilingLevel: 'L2' });
    const evt = EventBus.publish({ domain: 'finance', type: 'ORCAMENTO_ESTOURADO', payload: { categoria: 'lazer' }, correlationId: CID, dedupeKey: 'lazer-2026-09' });
    check('1.1: evento nasce com correlationId', evt?.correlationId === CID);
    check('1.2: o mesmo evento repetido dentro da janela é descartado (dedup entra na trilha, sem duplicar)', EventBus.publish({ domain: 'finance', type: 'ORCAMENTO_ESTOURADO', payload: {}, correlationId: CID, dedupeKey: 'lazer-2026-09' }) === null);

    const ctx = DecisionContext.recordDecisionContext({ correlationId: CID, eventIds: [evt!.id], signals: [{ kind: 'orcamento', ref: 'budget#lazer-2026-09', summary: 'Lazer em 112% do limite mensal' }] });
    const ev = propose('AJUSTAR_ORCAMENTO', { correlationId: CID, eventId: evt!.id });
    check('1.3: política L2 exige aprovação e o Action carrega a cadeia', ev.decision.level === 'L2' && ev.approvalRequest !== undefined && ev.action.correlationId === CID && ev.action.sourceEventId === evt!.id);

    const beforeApproval = Trace.buildCausalTrace(CID);
    check('1.4: antes da aprovação a trilha marca aprovação presente e execução ausente (não aplicável ainda)', beforeApproval.stages.find((s) => s.stage === 'aprovacao')?.status === 'presente' && beforeApproval.stages.find((s) => s.stage === 'execucao')?.status === 'nao_aplicavel');
    check('1.5: contexto da decisão aparece na trilha', beforeApproval.context[0]?.id === ctx.id);

    Lifecycle.resolveApproval(ev.approvalRequest!.id, 'approve');
    Lifecycle.beginExecution(ev.action.id);
    Lifecycle.completeExecution(ev.action.id, true);

    const noOutcome = Trace.buildCausalTrace(CID);
    check('1.6: executou com sucesso mas ninguém registrou o efeito => aviso "sucesso_sem_resultado"', noOutcome.violations.some((v) => v.code === 'sucesso_sem_resultado' && v.severity === 'aviso') && noOutcome.stages.find((s) => s.stage === 'resultado')?.status === 'ausente');

    Outcomes.recordOutcomeResult({ actionId: ev.action.id, result: 'efeito_confirmado', evidence: 'orçamento reajustado conferido no repositório' });
    const fb = Feedback.recordFeedback({ actionId: ev.action.id, kind: 'explicit', signal: 'positive', at: NOW });
    const full = Trace.buildCausalTrace(CID);
    check('1.7: cadeia completa: as 10 etapas presentes', full.stages.every((s) => s.status === 'presente'));
    check('1.8: sem nenhuma violação nem aviso', full.violations.length === 0);
    check('1.9: feedback explícito positivo em ação JÁ aprovada não conta de novo na confiança', !fb.countsTowardTrust && GuardianTrust.getTrust('finance', 'AJUSTAR_ORCAMENTO')?.sampleSize === 1);
    check('1.10: auditoria tem avaliação + aprovação + execução (trilha append-only)', full.audit.length >= 4);
    check('1.11: outra cadeia não vaza: trilha de um caso desconhecido é vazia', Trace.buildCausalTrace('caso-x').actions.length === 0);
  }

  // 2. Violações detectadas
  resetAll();
  {
    GuardianPolicy.registerAutonomyRule({ domain: 'finance', actionType: 'PAGAR', baseRisk: 'alto', reversible: false, ceilingLevel: 'L3' });
    const ev = propose('PAGAR', { reversible: false, correlationId: 'v1' });
    // força o bypass: marca como executando sem passar pela aprovação (o ActionBus permite updateStatus direto)
    ActionBus.updateStatus(ev.action.id, 'EXECUTING');
    const t = Trace.buildCausalTrace('v1');
    check('2.1: executar ação que exigia aprovação sem aprovação é VIOLAÇÃO', t.violations.some((v) => v.code === 'executada_sem_aprovacao' && v.severity === 'violacao'));
    check('2.2: sem contexto da decisão vira aviso de rastreabilidade', t.violations.some((v) => v.code === 'sem_contexto_da_decisao'));
    check('2.3: o caminho oficial (lifecycle) recusa executar sem aprovação', (() => { try { Lifecycle.beginExecution(ev.action.id); return false; } catch { return true; } })());
  }

  // 3. Resultado: regras
  resetAll();
  {
    GuardianPolicy.registerAutonomyRule({ domain: 'finance', actionType: 'CATEGORIZAR', baseRisk: 'baixo', reversible: true, ceilingLevel: 'L1' });
    seedTrust('finance', 'CATEGORIZAR', 8);
    const ev = propose('CATEGORIZAR', { correlationId: 'r1' });
    check('3.1: com confiança, ação L1 reversível é autorizada sem aprovação', ev.decision.level === 'L1' && !ev.decision.requiresApproval);
    check('3.2: não há resultado antes de executar', (() => { try { Outcomes.recordOutcomeResult({ actionId: ev.action.id, result: 'nao_verificavel' }); return false; } catch { return true; } })());
    Lifecycle.beginExecution(ev.action.id);
    Lifecycle.completeExecution(ev.action.id, true);
    check('3.3: "efeito_confirmado" exige evidência', (() => { try { Outcomes.recordOutcomeResult({ actionId: ev.action.id, result: 'efeito_confirmado' }); return false; } catch { return true; } })());
    check('3.4: "falhou" contradiz SUCCESS', (() => { try { Outcomes.recordOutcomeResult({ actionId: ev.action.id, result: 'falhou', evidence: 'x' }); return false; } catch { return true; } })());
    Outcomes.recordOutcomeResult({ actionId: ev.action.id, result: 'nao_verificavel', observedAt: '2026-09-10T12:00:00Z' });
    Outcomes.recordOutcomeResult({ actionId: ev.action.id, result: 'sem_efeito', evidence: 'categoria não mudou', observedAt: '2026-09-10T13:00:00Z' });
    check('3.5: observação mais recente vale; histórico preservado', Outcomes.latestOutcome(ev.action.id)?.result === 'sem_efeito' && Outcomes.listOutcomes(ev.action.id).length === 2);
    const center = ActionCenter.buildActionCenter(NOW);
    check('3.6: Action Center conta a execução autônoma com efeito ausente como falha recente', center.counts.failedRecent === 1 && center.autonomousRecent[0].undoAvailable);
  }

  // 4. Feedback e confiança
  resetAll();
  {
    GuardianPolicy.registerAutonomyRule({ domain: 'finance', actionType: 'CATEGORIZAR', baseRisk: 'baixo', reversible: true, ceilingLevel: 'L1' });
    seedTrust('finance', 'CATEGORIZAR', 8);
    const ev = propose('CATEGORIZAR', { correlationId: 'f1' });
    Lifecycle.beginExecution(ev.action.id);
    Lifecycle.completeExecution(ev.action.id, true);
    const before = GuardianTrust.getTrust('finance', 'CATEGORIZAR')!.sampleSize;

    const implicitPos = Feedback.recordFeedback({ actionId: ev.action.id, kind: 'implicit', signal: 'positive' });
    check('4.1: feedback implícito positivo NÃO vira confiança (IA não sobe a própria autoridade)', !implicitPos.countsTowardTrust && GuardianTrust.getTrust('finance', 'CATEGORIZAR')!.sampleSize === before);
    const explicitPos = Feedback.recordFeedback({ actionId: ev.action.id, kind: 'explicit', signal: 'positive' });
    check('4.2: explícito positivo em ação automática conta', explicitPos.countsTowardTrust && GuardianTrust.getTrust('finance', 'CATEGORIZAR')!.sampleSize === before + 1);
    check('4.3: idempotente — repetir não duplica evidência', Feedback.recordFeedback({ actionId: ev.action.id, kind: 'explicit', signal: 'positive' }).id === explicitPos.id && GuardianTrust.getTrust('finance', 'CATEGORIZAR')!.sampleSize === before + 1);
    const implicitNeg = Feedback.recordFeedback({ actionId: ev.action.id, kind: 'implicit', signal: 'negative', note: 'desfeita em 3s' });
    check('4.4: implícito NEGATIVO conta (evidência contra sempre entra)', implicitNeg.countsTowardTrust && GuardianTrust.getTrust('finance', 'CATEGORIZAR')!.rejectedCount === 1);
    check('4.5: todo feedback explica por que contou ou não', Feedback.listFeedback(ev.action.id).every((f) => f.trustRationale.length > 10));
    check('4.6: ação ainda PROPOSED não recebe feedback', (() => { const p = ActionBus.createAction({ domain: 'finance', type: 'CATEGORIZAR', intent: 'x', payload: {}, riskLevel: 'baixo', reversible: true }); try { Feedback.recordFeedback({ actionId: p.id, kind: 'explicit', signal: 'positive' }); return false; } catch { return true; } })());
    for (let i = 0; i < 5; i += 1) Feedback.recordFeedback({ actionId: propose('CATEGORIZAR').action.id, kind: 'explicit', signal: 'negative' });
    const after = propose('CATEGORIZAR');
    check('4.7: feedback negativo repetido derruba a confiança e a próxima ação perde a autonomia', GuardianTrust.getTrust('finance', 'CATEGORIZAR')!.state !== 'confiavel' && after.decision.level !== 'L1' && after.decision.requiresApproval);
  }

  // 5. Grants
  resetAll();
  {
    GuardianPolicy.registerAutonomyRule({ domain: 'finance', actionType: 'CATEGORIZAR', baseRisk: 'baixo', reversible: true, ceilingLevel: 'L1' });
    GuardianPolicy.registerAutonomyRule({ domain: 'finance', actionType: 'PAGAR', baseRisk: 'alto', reversible: false, ceilingLevel: 'L3' });
    const g = Grants.createGrant({ domain: 'finance', actionType: 'CATEGORIZAR', now: NOW, expiresAt: '2026-10-10T00:00:00Z' });
    check('5.1: grant ativo dentro da validade', Grants.activeGrantFor('finance', 'CATEGORIZAR', '2026-09-20T00:00:00Z')?.id === g.id);
    check('5.2: grant vencido não vale', Grants.activeGrantFor('finance', 'CATEGORIZAR', '2026-10-11T00:00:00Z') === undefined);
    Grants.revokeGrant(g.id, '2026-09-15T00:00:00Z');
    check('5.3: grant revogado para de valer na data da revogação, não antes', Grants.activeGrantFor('finance', 'CATEGORIZAR', '2026-09-14T00:00:00Z')?.id === g.id && Grants.activeGrantFor('finance', 'CATEGORIZAR', '2026-09-16T00:00:00Z') === undefined);
    check('5.4: grant em regra de teto L3 é marcado INERTE (L2/L3 nunca sobem)', Grants.isGrantInert('finance', 'PAGAR') && !Grants.isGrantInert('finance', 'CATEGORIZAR') && Grants.isGrantInert('finance', 'DESCONHECIDA'));
    check('5.5: grant nasce vencido => erro', (() => { try { Grants.createGrant({ domain: 'finance', actionType: 'X', now: NOW, expiresAt: '2026-01-01T00:00:00Z' }); return false; } catch { return true; } })());
    check('5.6: grant NÃO altera a decisão da política (ainda não está ligado ao classify)', (() => { Grants.createGrant({ domain: 'finance', actionType: 'CATEGORIZAR', now: NOW }); return propose('CATEGORIZAR').decision.level === 'L2'; })());
  }

  // 6. Contexto da decisão: sem conteúdo privado por desenho
  resetAll();
  {
    check('6.1: sinal sem origem é rejeitado', (() => { try { DecisionContext.recordDecisionContext({ correlationId: 'c', signals: [{ kind: 'k', ref: ' ', summary: 's' }] }); return false; } catch { return true; } })());
    check('6.2: resumo longo demais (cópia de conteúdo) é rejeitado', (() => { try { DecisionContext.recordDecisionContext({ correlationId: 'c', signals: [{ kind: 'k', ref: 'x#1', summary: 'a'.repeat(DecisionContext.MAX_SIGNAL_SUMMARY + 1) }] }); return false; } catch { return true; } })());
    check('6.3: contexto vazio é rejeitado', (() => { try { DecisionContext.recordDecisionContext({ correlationId: 'c', signals: [] }); return false; } catch { return true; } })());
  }

  // 7. Action Center
  resetAll();
  {
    check('7.1: sem nenhuma ação avaliada => empty', ActionCenter.selectActionCenter(NOW).status === 'empty');
    GuardianPolicy.registerAutonomyRule({ domain: 'finance', actionType: 'PAGAR', baseRisk: 'alto', reversible: false, ceilingLevel: 'L3' });
    const late = propose('PAGAR', { reversible: false });
    const view = ActionCenter.buildActionCenter(NOW);
    check('7.2: ação pendente aparece com motivo e prazo', view.awaitingApproval.length === 1 && view.awaitingApproval[0].approval.reason.length > 0 && typeof view.awaitingApproval[0].expiresInMs === 'number');
    const center = ActionCenter.selectActionCenter(NOW);
    check('7.3: com pendências o estado segue "ready" (pendência é conteúdo, não bloqueio)', center.status === 'ready' && center.data.counts.awaiting === 1);
    check('7.4: aprovação vencida mas ainda não varrida aparece com expiresInMs negativo', ActionCenter.buildActionCenter('2099-01-01T00:00:00Z').awaitingApproval[0].expiresInMs! < 0);
    check('7.5: linha de autonomia mostra teto L3 e grant inerte', view.autonomy.some((r) => r.actionType === 'PAGAR' && r.ceiling === 'L3' && r.grantInert));
    Lifecycle.resolveApproval(late.approvalRequest!.id, 'reject');
    const after = ActionCenter.buildActionCenter(NOW);
    check('7.6: rejeitada sai das pendentes e vai pro histórico', after.awaitingApproval.length === 0 && after.resolvedRecent.length === 1 && after.resolvedRecent[0].approval.status === 'rejected');
    check('7.7: auditoria registrou avaliação e rejeição (append-only)', GuardianAuditLog.listForAction(late.action.id).length >= 2);
    check('7.8: nenhuma aprovação fica pendente indevidamente', GuardianApproval.listApprovalRequests({ status: 'pending' }).length === 0);
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[guardian-foundation] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
