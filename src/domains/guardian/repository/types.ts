/**
 * MEDUSA — Guardian — Persistence boundary
 *
 * Tudo o que o Guardian precisa lembrar entre ciclos passa por aqui:
 * findings, propostas, execuções, cooldowns e o histórico de eventos
 * (append-only). O runtime nunca guarda estado em variável de módulo — assim um
 * adapter de banco pode ser plugado sem mudar o runtime.
 *
 * O que continua em memória da fundação (e NÃO passa por aqui ainda): trust,
 * approval requests e audit log da fundação. Ver docs/domains/GUARDIAN.md.
 */

import type { Cooldown, ExecutionRecord, Finding, GuardianEvent, Proposal } from '../model/types';

export interface GuardianRepository {
  /** Geração de ids sequenciais (o adapter de banco pode usar sequence/uuid). */
  nextId(prefix: string): string;

  saveFinding(finding: Finding): void;
  getFinding(id: string): Finding | undefined;
  listFindings(filter?: { status?: Finding['status']; origin?: string }): Finding[];
  findByDedupeKey(dedupeKey: string): Finding[];

  saveProposal(proposal: Proposal): void;
  getProposal(id: string): Proposal | undefined;
  listProposals(filter?: { status?: Proposal['status'] }): Proposal[];

  saveExecution(execution: ExecutionRecord): void;
  listExecutions(filter?: { findingId?: string }): ExecutionRecord[];

  setCooldown(cooldown: Cooldown): void;
  getActiveCooldown(key: string, now: Date): Cooldown | undefined;

  /** Append-only: não existe update/delete. */
  appendEvent(event: GuardianEvent): void;
  listEvents(filter?: { findingId?: string; type?: GuardianEvent['type']; cycleId?: string }): GuardianEvent[];
}
