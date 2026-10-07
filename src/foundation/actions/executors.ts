/**
 * MEDUSA FOUNDATION — Executores de ação (quem FAZ depois que o Guardian autoriza)
 *
 * O Guardian decide se uma ação pode acontecer; ele não sabe executá-la.
 * Cada efeito real no mundo (estornar no emissor, enviar e-mail, criar evento
 * no Google) precisa de um EXECUTOR conectado. Sem executor, aprovar uma ação
 * não pode virar mensagem de sucesso: a ação fica AUTHORIZED e o estado
 * honesto é "aprovada — executor não conectado".
 *
 *   proposta → aprovação (lifecycle) → executor? ──sim──→ executeAuthorized → SUCCESS/FAILED + resultado
 *                                               └─não──→ AUTHORIZED, sem execução, sem resultado inventado
 *
 * Um executor é registrado por (domínio, tipo de ação) e declara com que
 * provedor fala. Registro é explícito: nenhum tipo ganha executor por padrão.
 */

import { getAction } from '../actionBus';
import { resolveApproval } from '../guardianLifecycle';
import { GuardianApproval } from '../guardian';
import { executeAuthorized } from './submit';
import type { ExecutionReport } from './submit';
import type { Action, ActionStatus } from '../types/action';
import type { DomainId } from '../types/domain';

export interface ActionExecutor {
  domain: DomainId;
  actionType: string;
  /** Com quem o executor fala de verdade (ex.: "Agenda interna", "Gmail API"). */
  provider: string;
  run(action: Action): ExecutionReport;
}

const executors = new Map<string, ActionExecutor>();
const keyOf = (domain: DomainId, actionType: string) => `${domain}::${actionType}`;

export function registerExecutor(executor: ActionExecutor): void {
  executors.set(keyOf(executor.domain, executor.actionType), executor);
}

export function unregisterExecutor(domain: DomainId, actionType: string): void {
  executors.delete(keyOf(domain, actionType));
}

export function executorFor(domain: DomainId, actionType: string): ActionExecutor | undefined {
  return executors.get(keyOf(domain, actionType));
}

/**
 * Estado de execução legível pela UI. Os nomes dizem o que de fato aconteceu —
 * `aprovada_sem_executor` existe justamente para ninguém precisar escrever
 * "enviado" quando nada foi enviado.
 */
export type ExecutionState =
  | 'aguardando_aprovacao'
  | 'aprovada_sem_executor'
  | 'aprovada_aguardando_execucao'
  | 'executando'
  | 'executada'
  | 'falhou'
  | 'rejeitada'
  | 'cancelada'
  | 'desfeita'
  | 'proposta';

export function executionStateOf(action: Pick<Action, 'domain' | 'type' | 'status' | 'restoredAt'>): ExecutionState {
  const map: Partial<Record<ActionStatus, ExecutionState>> = {
    AWAITING_APPROVAL: 'aguardando_aprovacao',
    EXECUTING: 'executando',
    SUCCESS: 'executada',
    FAILED: 'falhou',
    REJECTED: 'rejeitada',
    CANCELLED: 'cancelada',
    UNDONE: 'desfeita',
  };
  if (action.status === 'AUTHORIZED') {
    return executorFor(action.domain, action.type) && !action.restoredAt ? 'aprovada_aguardando_execucao' : 'aprovada_sem_executor';
  }
  return map[action.status] ?? 'proposta';
}

/** Rótulo curto e verdadeiro para cada estado (a UI pode usar como está). */
export const EXECUTION_STATE_LABEL: Record<ExecutionState, string> = {
  proposta: 'Proposta',
  aguardando_aprovacao: 'Aguardando sua aprovação',
  aprovada_sem_executor: 'Ação aprovada — executor não conectado',
  aprovada_aguardando_execucao: 'Aprovada — aguardando execução',
  executando: 'Executando',
  executada: 'Executada',
  falhou: 'Falhou',
  rejeitada: 'Recusada',
  cancelada: 'Cancelada',
  desfeita: 'Desfeita',
};

export interface DecisionResult {
  action: Action;
  state: ExecutionState;
  /** Presente só quando um executor de fato rodou. */
  report?: ExecutionReport;
  provider?: string;
}

function approvalOf(actionId: string) {
  return GuardianApproval.listApprovalRequests().find((r) => r.actionId === actionId && r.status === 'pending');
}

/**
 * Aprovar pelo caminho oficial e, SE houver executor, executar. Sem executor a
 * ação fica autorizada e o resultado diz isso — nunca um sucesso inventado.
 */
export function approveAction(actionId: string): DecisionResult {
  const request = approvalOf(actionId);
  if (!request) throw new Error(`Não há aprovação pendente para a ação "${actionId}".`);
  const { action } = resolveApproval(request.id, 'approve');
  const executor = executorFor(action.domain, action.type);
  if (!executor) return { action, state: 'aprovada_sem_executor' };
  const exec = executeAuthorized(action.id, () => executor.run(action));
  return { action: exec.action, state: executionStateOf(exec.action), report: exec.report, provider: executor.provider };
}

export function rejectAction(actionId: string): DecisionResult {
  const request = approvalOf(actionId);
  if (!request) throw new Error(`Não há aprovação pendente para a ação "${actionId}".`);
  const { action } = resolveApproval(request.id, 'reject');
  return { action, state: 'rejeitada' };
}

/** Executa uma ação que o Guardian autorizou sozinho (L1), se houver executor. */
export function runIfAuthorized(actionId: string): DecisionResult {
  const action = getAction(actionId);
  if (!action) throw new Error(`Ação "${actionId}" não encontrada.`);
  if (action.status !== 'AUTHORIZED') return { action, state: executionStateOf(action) };
  const executor = executorFor(action.domain, action.type);
  if (!executor) return { action, state: 'aprovada_sem_executor' };
  const exec = executeAuthorized(action.id, () => executor.run(action));
  return { action: exec.action, state: executionStateOf(exec.action), report: exec.report, provider: executor.provider };
}

/** Só para testes de contrato. */
export function __resetExecutorsForTests(): void {
  executors.clear();
}
