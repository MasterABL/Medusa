/**
 * MEDUSA PERSONAL OS — Ações universais pelo Guardian: L1, L2, L3, aprovação, resultado.
 */
import { makeChecker, resetAll } from '../domains/_helpers';
import { submitThroughGuardian, executeAuthorized } from '../../../src/foundation/actions/submit';
import { buildUniversalActionCenter, selectUniversalActionCenter, toUniversalAction } from '../../../src/foundation/actions/universal';
import * as Lifecycle from '../../../src/foundation/guardianLifecycle';
import * as Trace from '../../../src/foundation/guardianTrace/causalTrace';
import { GuardianTrust } from '../../../src/foundation/guardian';

const base = { riskLevel: 'baixo' as const, reversible: true, payload: {} };

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('actions');

  resetAll();
  {
    check('0.1: sem nenhuma ação → Action Center universal empty', selectUniversalActionCenter('2026-10-06T10:00:00').status === 'empty');
    const l1 = submitThroughGuardian({ ...base, domain: 'agenda', type: 'CREATE_REMINDER', intent: 'Lembrar telemedicina T-5', correlationId: 'c1', signals: [{ kind: 'evento', ref: 'agenda#tele', summary: 'critical' }] });
    check('1.1: L1 — criar lembrete T-5 é autorizado sem histórico (informativo, baixo risco)', l1.authorized && l1.evaluation.decision.level === 'L1');
    const done = executeAuthorized(l1.action.id, () => ({ ok: true, evidence: 'entregue na Dynamic Island' }));
    check('1.2: execução pelo caminho oficial deixa SUCCESS + resultado confirmado', done.action.status === 'SUCCESS' && done.outcome.result === 'efeito_confirmado');

    const l2 = submitThroughGuardian({ ...base, domain: 'agenda', type: 'SUGGEST_FOCUS_BLOCK', intent: 'Reservar 45 min para o projeto', correlationId: 'c2' });
    check('2.1: L2 — sugerir bloco para projeto aguarda decisão do usuário', !l2.authorized && l2.evaluation.decision.level === 'L2' && !!l2.evaluation.approvalRequest);
    check('2.2: ação não autorizada nunca executa', (() => { try { executeAuthorized(l2.action.id, () => ({ ok: true, evidence: 'x' })); return false; } catch { return true; } })());
    Lifecycle.resolveApproval(l2.evaluation.approvalRequest!.id, 'approve');
    const exec = executeAuthorized(l2.action.id, () => ({ ok: true, evidence: 'bloco criado 15:00–15:45' }));
    check('2.3: aprovada → executa e registra resultado', exec.action.status === 'SUCCESS' && exec.outcome.evidence === 'bloco criado 15:00–15:45');

    const l3 = submitThroughGuardian({ domain: 'finance', type: 'EXECUTE_PAYMENT', intent: 'Pagar fatura do cartão', payload: { valor: 320 }, riskLevel: 'alto', reversible: false, correlationId: 'c3' });
    check('3.1: L3 — ação financeira crítica sempre exige aprovação humana', !l3.authorized && l3.evaluation.decision.level === 'L3');
    for (let i = 0; i < 30; i += 1) GuardianTrust.recordOutcome({ domain: 'finance', actionType: 'EXECUTE_PAYMENT', outcome: 'accepted', actionId: `t${i}` });
    const l3b = submitThroughGuardian({ domain: 'finance', type: 'EXECUTE_PAYMENT', intent: 'Pagar de novo', payload: {}, riskLevel: 'alto', reversible: false, correlationId: 'c3b' });
    check('3.2: confiança alta NÃO rebaixa L3 (nunca executa sozinho)', !l3b.authorized && l3b.evaluation.decision.level === 'L3');
    Lifecycle.resolveApproval(l3.evaluation.approvalRequest!.id, 'reject');
    check('3.3: rejeitada → nunca executa', (() => { try { executeAuthorized(l3.action.id, () => ({ ok: true, evidence: 'x' })); return false; } catch { return true; } })());

    const failed = submitThroughGuardian({ ...base, domain: 'agenda', type: 'CREATE_REMINDER', intent: 'Lembrar algo', correlationId: 'c4' });
    const f = executeAuthorized(failed.action.id, () => { throw new Error('canal caiu'); });
    check('4.1: exceção na execução → FAILED + resultado "falhou" com o erro (nunca sucesso falso)', f.action.status === 'FAILED' && f.outcome.result === 'falhou' && f.outcome.evidence === 'canal caiu');
    const none = submitThroughGuardian({ ...base, domain: 'agenda', type: 'CREATE_REMINDER', intent: 'Lembrar sem canal', correlationId: 'c5' });
    check('4.2: executou mas nenhum canal entregou → "sem_efeito"', executeAuthorized(none.action.id, () => ({ ok: true, noEffect: true, evidence: 'nativo bloqueado' })).outcome.result === 'sem_efeito');

    const u = toUniversalAction(l3.action);
    check('5.1: visão universal: domínio, risco, autonomia, motivo, aprovação e status', u.sourceDomain === 'finance' && u.risk === 'alto' && u.autonomy === 'L3' && !!u.reason && u.approval?.status === 'rejected');
    const center = buildUniversalActionCenter();
    check('5.2: Action Center universal agrupa pendentes (só o L3 repetido) e conta por domínio', center.awaitingApproval.length === 1 && center.awaitingApproval[0].id === l3b.action.id && (center.byDomain.agenda ?? 0) === 4 && (center.byDomain.finance ?? 0) === 2);
    check('5.3: trilha causal completa do lembrete (evento → contexto → decisão → execução → resultado)', Trace.buildCausalTrace('c1').violations.length === 0 && Trace.buildCausalTrace('c1').context.length === 1);
  }

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[actions] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
