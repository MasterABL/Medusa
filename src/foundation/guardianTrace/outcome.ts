/**
 * MEDUSA FOUNDATION — Resultado observado de uma ação (append-only)
 *
 * `Action.status === 'SUCCESS'` só diz que a execução não deu erro. O
 * resultado diz se o EFEITO PRETENDIDO aconteceu. `nao_verificavel` nunca
 * conta como sucesso — mesma regra do Guardian (um achado "unverified" não
 * vira "resolved").
 */

import type { ActionOutcome, OutcomeResult } from '../types/guardianTrace';
import { getAction } from '../actionBus';

let outcomes: ActionOutcome[] = [];
let counter = 0;

export class OutcomeError extends Error {}

export interface RecordOutcomeResultInput {
  actionId: string;
  result: OutcomeResult;
  evidence?: string;
  observedAt?: string;
}

export function recordOutcomeResult(input: RecordOutcomeResultInput): ActionOutcome {
  const action = getAction(input.actionId);
  if (!action) throw new OutcomeError(`Action "${input.actionId}" não encontrada.`);
  if (action.status !== 'SUCCESS' && action.status !== 'FAILED' && action.status !== 'UNDONE') {
    throw new OutcomeError(`Só há resultado para ação já executada (status atual: "${action.status}").`);
  }
  if (input.result === 'efeito_confirmado' && !input.evidence?.trim()) {
    throw new OutcomeError('"efeito_confirmado" exige evidência do que foi observado.');
  }
  if (input.result === 'falhou' && action.status === 'SUCCESS') {
    throw new OutcomeError('Resultado "falhou" contradiz a execução (SUCCESS): use "sem_efeito".');
  }
  counter += 1;
  const outcome: ActionOutcome = {
    id: `outcome_${Date.now()}_${counter}`,
    actionId: input.actionId,
    result: input.result,
    evidence: input.evidence,
    observedAt: input.observedAt ?? new Date().toISOString(),
  };
  outcomes.push(outcome);
  return outcome;
}

export function listOutcomes(actionId?: string): ActionOutcome[] {
  return outcomes.filter((o) => !actionId || o.actionId === actionId);
}

/** A observação MAIS RECENTE vale; as anteriores continuam no histórico. */
export function latestOutcome(actionId: string): ActionOutcome | undefined {
  const all = listOutcomes(actionId);
  return all[all.length - 1];
}

export function __resetOutcomesForTests(): void {
  outcomes = [];
  counter = 0;
}

/** Repõe resultados observados de um snapshot (só ids novos). */
export function restoreOutcomes(list: ActionOutcome[]): number {
  const known = new Set(outcomes.map((o) => o.id));
  const fresh = list.filter((o) => o && typeof o.id === 'string' && !known.has(o.id));
  outcomes = [...fresh, ...outcomes].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  return fresh.length;
}
