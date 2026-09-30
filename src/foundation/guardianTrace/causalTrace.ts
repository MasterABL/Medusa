/**
 * MEDUSA FOUNDATION — Trilha causal (leitura que costura a cadeia toda)
 *
 *   evento → contexto → decisão → política → autonomia → aprovação
 *          → execução → resultado → feedback → auditoria
 *
 * Não cria armazenamento novo: lê EventBus, ActionBus, AuditLog, Approval e
 * os registros de contexto/resultado/feedback, ligados por `correlationId`.
 * Também VERIFICA a integridade da cadeia — é aqui que "executou sem
 * aprovação" vira violação visível em vez de fato perdido.
 */

import type { Action } from '../types/action';
import type { CausalStage, CausalTrace, TraceViolation } from '../types/guardianTrace';
import { getHistory } from '../eventBus';
import { listActions } from '../actionBus';
import { GuardianApproval, GuardianAuditLog } from '../guardian';
import { listDecisionContext } from './decisionContext';
import { listOutcomes } from './outcome';
import { listFeedback } from './feedback';

const EXECUTED: Action['status'][] = ['EXECUTING', 'SUCCESS', 'FAILED', 'UNDONE'];

export function buildCausalTrace(correlationId: string): CausalTrace {
  const actions = listActions().filter((a) => a.correlationId === correlationId);
  const actionIds = new Set(actions.map((a) => a.id));
  const sourceEventIds = new Set(actions.map((a) => a.sourceEventId).filter((x): x is string => !!x));

  const events = getHistory().filter((e) => e.correlationId === correlationId || sourceEventIds.has(e.id));
  const context = listDecisionContext({ correlationId });
  const audit = GuardianAuditLog.listRecent(Number.MAX_SAFE_INTEGER).filter((e) => actionIds.has(e.actionId)).reverse();
  const approvals = GuardianApproval.listApprovalRequests().filter((r) => actionIds.has(r.actionId));
  const outcomes = listOutcomes().filter((o) => actionIds.has(o.actionId));
  const feedback = listFeedback().filter((f) => actionIds.has(f.actionId));

  const needsApproval = actions.filter((a) => a.requiresApproval);
  const executed = actions.filter((a) => EXECUTED.includes(a.status));
  const finished = actions.filter((a) => a.status === 'SUCCESS' || a.status === 'FAILED');

  const stage = (id: CausalStage['stage'], present: boolean, required: boolean, refs: string[], note?: string): CausalStage => ({
    stage: id,
    status: present ? 'presente' : required ? 'ausente' : 'nao_aplicavel',
    refs,
    note,
  });

  const hasActions = actions.length > 0;
  const stages: CausalStage[] = [
    stage('evento', events.length > 0, hasActions, events.map((e) => e.id)),
    stage('contexto', context.length > 0, hasActions, context.map((c) => c.id), context.length === 0 && hasActions ? 'Nada registra com base em quê esta decisão foi tomada.' : undefined),
    stage('decisao', hasActions, false, actions.map((a) => a.id)),
    stage('politica', audit.length > 0, hasActions, audit.map((a) => a.id)),
    stage('autonomia', actions.some((a) => a.autonomyLevel !== undefined), hasActions, actions.filter((a) => a.autonomyLevel).map((a) => `${a.id}:${a.autonomyLevel}`)),
    stage('aprovacao', approvals.length > 0, needsApproval.length > 0, approvals.map((r) => r.id)),
    stage('execucao', executed.length > 0, false, executed.map((a) => `${a.id}:${a.status}`)),
    stage('resultado', outcomes.length > 0, finished.length > 0, outcomes.map((o) => o.id)),
    stage('feedback', feedback.length > 0, false, feedback.map((f) => f.id)),
    stage('auditoria', audit.length > 0, hasActions, audit.map((a) => a.id)),
  ];

  return { correlationId, stages, events, actions, approvals, audit, context, outcomes, feedback, violations: verifyTraceIntegrity({ actions, approvals, audit, outcomes, context }) };
}

export function verifyTraceIntegrity(input: Pick<CausalTrace, 'actions' | 'approvals' | 'audit' | 'outcomes' | 'context'>): TraceViolation[] {
  const violations: TraceViolation[] = [];
  for (const a of input.actions) {
    const audited = input.audit.some((e) => e.actionId === a.id);
    if (EXECUTED.includes(a.status) && !audited) {
      violations.push({ code: 'executada_sem_auditoria', severity: 'violacao', actionId: a.id, message: `Ação ${a.type} executou sem nenhuma entrada de auditoria.` });
    }
    if (EXECUTED.includes(a.status) && a.requiresApproval) {
      const approved = input.approvals.some((r) => r.actionId === a.id && r.status === 'approved');
      if (!approved) violations.push({ code: 'executada_sem_aprovacao', severity: 'violacao', actionId: a.id, message: `Ação ${a.type} exigia aprovação e executou sem uma aprovação concedida.` });
    }
    if (a.status === 'SUCCESS' && !input.outcomes.some((o) => o.actionId === a.id)) {
      violations.push({ code: 'sucesso_sem_resultado', severity: 'aviso', actionId: a.id, message: `Ação ${a.type} rodou, mas ninguém registrou se o efeito aconteceu.` });
    }
  }
  const actionIds = new Set(input.actions.map((a) => a.id));
  for (const r of input.approvals) {
    if (!actionIds.has(r.actionId)) violations.push({ code: 'aprovacao_sem_acao', severity: 'violacao', actionId: r.actionId, message: 'Aprovação aponta para uma ação que não existe nesta cadeia.' });
  }
  if (input.actions.length > 0 && input.context.length === 0) {
    violations.push({ code: 'sem_contexto_da_decisao', severity: 'aviso', message: 'A decisão não registrou contexto: não dá pra explicar com base em quê foi tomada.' });
  }
  return violations;
}
