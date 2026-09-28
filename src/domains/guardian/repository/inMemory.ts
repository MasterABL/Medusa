/**
 * MEDUSA — Guardian — In-memory repository (uma instância por chamada).
 */

import type { Cooldown, ExecutionRecord, Finding, GuardianEvent, Proposal } from '../model/types';
import type { GuardianRepository } from './types';

export function createInMemoryGuardianRepository(): GuardianRepository {
  const findings = new Map<string, Finding>();
  const proposals = new Map<string, Proposal>();
  const executions: ExecutionRecord[] = [];
  const cooldowns = new Map<string, Cooldown>();
  const events: GuardianEvent[] = [];
  const counters = new Map<string, number>();

  return {
    nextId(prefix) {
      const n = (counters.get(prefix) ?? 0) + 1;
      counters.set(prefix, n);
      return `${prefix}_${n}`;
    },

    saveFinding: (f) => void findings.set(f.id, f),
    getFinding: (id) => findings.get(id),
    listFindings: (filter) =>
      Array.from(findings.values()).filter(
        (f) => (!filter?.status || f.status === filter.status) && (!filter?.origin || f.origin === filter.origin)
      ),
    findByDedupeKey: (key) => Array.from(findings.values()).filter((f) => f.dedupeKey === key),

    saveProposal: (p) => void proposals.set(p.id, p),
    getProposal: (id) => proposals.get(id),
    listProposals: (filter) => Array.from(proposals.values()).filter((p) => !filter?.status || p.status === filter.status),

    saveExecution(record) {
      const idx = executions.findIndex((e) => e.id === record.id);
      if (idx >= 0) executions[idx] = record;
      else executions.push(record);
    },
    listExecutions: (filter) => executions.filter((e) => !filter?.findingId || e.findingId === filter.findingId),

    setCooldown: (c) => void cooldowns.set(c.key, c),
    getActiveCooldown(key, now) {
      const c = cooldowns.get(key);
      return c && new Date(c.until).getTime() > now.getTime() ? c : undefined;
    },

    appendEvent: (e) => void events.push(e),
    listEvents: (filter) =>
      events.filter(
        (e) =>
          (!filter?.findingId || e.findingId === filter.findingId) &&
          (!filter?.type || e.type === filter.type) &&
          (!filter?.cycleId || e.cycleId === filter.cycleId)
      ),
  };
}
