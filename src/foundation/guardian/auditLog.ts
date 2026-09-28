/**
 * MEDUSA FOUNDATION — Action Audit Log (seções 7/8/41)
 *
 * Append-only por design: `record()` é a única forma de escrever aqui, e não
 * existe nenhuma função de update/delete neste módulo. Toda ação avaliada
 * pelo Guardian gera uma entrada — mesmo quando o resultado é "L1, executada
 * automaticamente" (é exatamente o log que alimenta a experiência descrita na
 * seção 8, "AUTONOMIA RECENTE").
 */

import type { ActionAuditLogEntry } from '../types/guardian';
import type { AutonomyDecision } from '../types/autonomy';
import type { ActionStatus } from '../types/action';
import type { DomainId } from '../types/domain';

let entries: ActionAuditLogEntry[] = [];
let counter = 0;

export interface RecordAuditInput {
  actionId: string;
  domain: DomainId;
  actionType: string;
  statusAtLog: ActionStatus;
  decision: AutonomyDecision;
}

export function record(input: RecordAuditInput): ActionAuditLogEntry {
  counter += 1;
  const entry: ActionAuditLogEntry = {
    id: `audit_${Date.now()}_${counter}`,
    actionId: input.actionId,
    domain: input.domain,
    actionType: input.actionType,
    autonomyLevel: input.decision.level,
    statusAtLog: input.statusAtLog,
    decision: input.decision,
    createdAt: new Date().toISOString(),
  };
  entries.push(entry);
  return entry;
}

export function getEntry(id: string): ActionAuditLogEntry | undefined {
  return entries.find((e) => e.id === id);
}

export function listRecent(limit = 20, filter?: { domain?: DomainId }): ActionAuditLogEntry[] {
  const filtered = filter?.domain ? entries.filter((e) => e.domain === filter.domain) : entries;
  return filtered.slice(-limit).reverse(); // mais recente primeiro
}

/** Só para testes de contrato. */
export function __resetAuditLogForTests(): void {
  entries = [];
  counter = 0;
}
