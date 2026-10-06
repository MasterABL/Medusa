/**
 * MEDUSA FOUNDATION — Porta única de ação para qualquer motor (lembrete, planner,
 * recomendação, finanças, automação futura)
 *
 *   evento → contexto → política → decisão → ação → resultado → feedback
 *
 * Não é um segundo motor de decisão: só costura o que já existe na ordem
 * certa — ActionBus.createAction (com correlação) → registro de contexto →
 * Guardian.evaluate (política/autonomia/aprovação/auditoria) → lifecycle de
 * execução → resultado observado. Quem decide continua sendo a política.
 */

import { createAction, dispatch, getAction } from '../actionBus';
import { beginExecution, completeExecution } from '../guardianLifecycle';
import { recordDecisionContext } from '../guardianTrace/decisionContext';
import { recordOutcomeResult } from '../guardianTrace/outcome';
import type { Action } from '../types/action';
import type { DomainId } from '../types/domain';
import type { RiskLevel } from '../types/autonomy';
import type { GuardianEvaluation } from '../types/guardian';
import type { ActionOutcome, ContextSignalRef, DecisionContextRecord } from '../types/guardianTrace';

export interface SubmitActionInput<P> {
  domain: DomainId;
  type: string;
  intent: string;
  payload: P;
  riskLevel: RiskLevel;
  reversible: boolean;
  undoDescription?: string;
  correlationId: string;
  sourceEventId?: string;
  /** Com base em quê a ação foi proposta (vira DecisionContextRecord). */
  signals?: ContextSignalRef[];
}

export interface SubmittedAction<P> {
  evaluation: GuardianEvaluation;
  action: Action<P>;
  context?: DecisionContextRecord;
  /** true = política autorizou executar sem perguntar. */
  authorized: boolean;
}

export function submitThroughGuardian<P>(input: SubmitActionInput<P>): SubmittedAction<P> {
  const created = createAction({
    domain: input.domain,
    type: input.type,
    intent: input.intent,
    payload: input.payload,
    riskLevel: input.riskLevel,
    reversible: input.reversible,
    undoDescription: input.undoDescription,
    correlationId: input.correlationId,
    sourceEventId: input.sourceEventId,
    source: input.sourceEventId,
  });
  const context =
    input.signals && input.signals.length > 0
      ? recordDecisionContext({ correlationId: input.correlationId, actionId: created.id, eventIds: input.sourceEventId ? [input.sourceEventId] : [], signals: input.signals })
      : undefined;
  const evaluation = dispatch(created);
  return { evaluation, action: evaluation.action as Action<P>, context, authorized: evaluation.action.status === 'AUTHORIZED' };
}

export interface ExecutionReport {
  ok: boolean;
  /** O que foi observado — obrigatório quando ok (vira evidência do resultado). */
  evidence?: string;
  error?: string;
  /** Rodou, mas o efeito pretendido não aconteceu (ex.: nenhum canal entregou). */
  noEffect?: boolean;
}

/**
 * Executa uma ação JÁ AUTORIZADA pelo caminho oficial (lifecycle) e registra
 * o resultado. Nunca executa ação aguardando aprovação.
 */
export function executeAuthorized(actionId: string, run: () => ExecutionReport): { action: Action; outcome: ActionOutcome; report: ExecutionReport } {
  const current = getAction(actionId);
  if (!current || current.status !== 'AUTHORIZED') {
    throw new Error(`Ação "${actionId}" não está autorizada (status: ${current?.status ?? 'inexistente'}).`);
  }
  beginExecution(actionId);
  let report: ExecutionReport;
  try {
    report = run();
  } catch (err) {
    report = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  const action = completeExecution(actionId, report.ok);
  const outcome = report.ok
    ? recordOutcomeResult({ actionId, result: report.noEffect ? 'sem_efeito' : 'efeito_confirmado', evidence: report.evidence ?? 'executado' })
    : recordOutcomeResult({ actionId, result: 'falhou', evidence: report.error });
  return { action, outcome, report };
}
