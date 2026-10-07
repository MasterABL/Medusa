/**
 * MEDUSA FOUNDATION — Action Bus (seções 9/33/41)
 *
 * Cria Actions e as despacha pelo único caminho válido (Guardian.evaluate).
 * Também guarda o estado corrente de cada Action para permitir transições
 * (EXECUTING → SUCCESS/FAILED) e desfazer ações reversíveis (seção 33).
 */

import type { Action, ActionStatus } from './types/action';
import type { DomainId } from './types/domain';
import type { RiskLevel } from './types/autonomy';
import type { GuardianEvaluation } from './types/guardian';
import { evaluate } from './guardian';

const actions = new Map<string, Action>();
let counter = 0;

export interface CreateActionInput<TPayload = unknown> {
  domain: DomainId;
  type: string;
  intent: string;
  payload: TPayload;
  riskLevel: RiskLevel;
  reversible: boolean;
  undoDescription?: string;
  source?: string;
  target?: DomainId;
  correlationId?: string;
  sourceEventId?: string;
}

export function createAction<TPayload = unknown>(input: CreateActionInput<TPayload>): Action<TPayload> {
  counter += 1;
  const action: Action<TPayload> = {
    id: `action_${Date.now()}_${counter}`,
    domain: input.domain,
    type: input.type,
    intent: input.intent,
    payload: input.payload,
    source: input.source,
    correlationId: input.correlationId,
    sourceEventId: input.sourceEventId,
    target: input.target,
    riskLevel: input.riskLevel,
    reversible: input.reversible,
    undoDescription: input.undoDescription,
    requiresApproval: false, // preenchido de verdade só depois de passar pelo Guardian
    status: 'PROPOSED',
    createdAt: new Date().toISOString(),
  };
  actions.set(action.id, action as Action);
  return action;
}

/** Único ponto de entrada pra decidir o que fazer com uma Action recém-criada. */
export function dispatch(action: Action): GuardianEvaluation {
  const evaluation = evaluate(action);
  actions.set(evaluation.action.id, evaluation.action);
  return evaluation;
}

export function getAction(id: string): Action | undefined {
  return actions.get(id);
}

export function listActions(filter?: { domain?: DomainId; status?: ActionStatus }): Action[] {
  return Array.from(actions.values()).filter(
    (a) => (!filter?.domain || a.domain === filter.domain) && (!filter?.status || a.status === filter.status)
  );
}

const TERMINAL_STATUSES: ActionStatus[] = ['SUCCESS', 'FAILED', 'REJECTED', 'CANCELLED', 'UNDONE'];

export function updateStatus(id: string, status: ActionStatus): Action {
  const action = actions.get(id);
  if (!action) {
    throw new Error(`Action "${id}" não encontrada.`);
  }
  if (TERMINAL_STATUSES.includes(action.status) && status !== 'UNDONE') {
    throw new Error(
      `Action "${id}" já está em estado terminal ("${action.status}") — não pode transicionar para "${status}".`
    );
  }
  const updated: Action = {
    ...action,
    status,
    executedAt: status === 'SUCCESS' || status === 'FAILED' ? new Date().toISOString() : action.executedAt,
  };
  actions.set(id, updated);
  return updated;
}

/** Só ações reversíveis, e só depois de já terem tido SUCCESS — nunca desfaz o que nem executou. */
export function undo(id: string): Action {
  const action = actions.get(id);
  if (!action) {
    throw new Error(`Action "${id}" não encontrada.`);
  }
  if (!action.reversible) {
    throw new Error(`Action "${id}" (${action.type}) não é reversível — não há undo possível.`);
  }
  if (action.status !== 'SUCCESS') {
    throw new Error(`Action "${id}" só pode ser desfeita depois de SUCCESS (está em "${action.status}").`);
  }
  return updateStatus(id, 'UNDONE');
}

/** Só para testes de contrato. */
export function __resetActionBusForTests(): void {
  actions.clear();
  counter = 0;
}

/**
 * Repõe ações vindas de um snapshot persistido (ver `guardian/snapshot.ts`).
 * Só acrescenta ids que ainda não existem nesta sessão — nunca sobrescreve uma
 * ação viva. Não passa pelo Guardian de novo: a decisão original já está no
 * audit log restaurado junto.
 */
export function restoreActions(list: Action[]): number {
  let added = 0;
  for (const a of list) {
    if (!a || typeof a.id !== 'string' || actions.has(a.id)) continue;
    actions.set(a.id, a);
    added += 1;
  }
  return added;
}
