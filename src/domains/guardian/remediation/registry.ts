/**
 * MEDUSA — Guardian — Remediation registry
 *
 * Um remediador é a única peça que MUDA algo. O runtime nunca conserta nada por
 * conta própria: se não há remediador registrado para a ação sugerida, o finding
 * fica bloqueado e a proposta vira trabalho humano.
 */

import type { Finding, Proposal } from '../model/types';

export interface RemediationContext {
  finding: Finding;
  proposal: Proposal;
  now: Date;
}

export interface RemediationCheck {
  matches: boolean;
  observed: string;
}

export interface RemediationHandler {
  actionKey: string;
  /** Estado esperado depois da execução, em texto (vai para a verificação). */
  expectation(finding: Finding): string;
  describe(finding: Finding): string;
  execute(ctx: RemediationContext): Promise<void> | void;
  /** Verificador próprio. Ausente → o runtime tenta re-detecção; sem fonte → "não verificável". */
  verify?(ctx: RemediationContext): Promise<RemediationCheck> | RemediationCheck;
}

export interface RemediationRegistry {
  register(handler: RemediationHandler): void;
  get(actionKey: string): RemediationHandler | undefined;
  has(actionKey: string): boolean;
  list(): string[];
}

export function createRemediationRegistry(): RemediationRegistry {
  const handlers = new Map<string, RemediationHandler>();
  return {
    register(handler) {
      if (handlers.has(handler.actionKey)) throw new Error(`Remediador "${handler.actionKey}" já registrado.`);
      handlers.set(handler.actionKey, handler);
    },
    get: (key) => handlers.get(key),
    has: (key) => handlers.has(key),
    list: () => Array.from(handlers.keys()),
  };
}
