/**
 * Helpers compartilhados pelos testes de domínio.
 */

import * as DomainRegistry from '../../../src/foundation/domainRegistry';
import * as EventBus from '../../../src/foundation/eventBus';
import * as ActionBus from '../../../src/foundation/actionBus';
import { GuardianPolicy, GuardianTrust, GuardianApproval, GuardianAuditLog } from '../../../src/foundation/guardian';
import * as IslandQueue from '../../../src/foundation/island/eventQueue';
import * as SoundMap from '../../../src/foundation/sound/soundMap';
import * as MotionIdentity from '../../../src/foundation/motion/motionIdentity';
import * as Goals from '../../../src/foundation/goals/goalModel';
import * as Metrics from '../../../src/foundation/metrics/metricModel';
import * as ProactiveMessaging from '../../../src/foundation/messaging/proactiveMessage';
import * as ContextPanelRegistry from '../../../src/foundation/contextPanel/contextPanelRegistry';
import { bootstrapDomains, __resetBootstrapForTests } from '../../../src/foundation/domains';
import type { DomainId } from '../../../src/foundation/types/domain';

export function resetAll(): void {
  DomainRegistry.__resetRegistryForTests();
  EventBus.__resetEventBusForTests();
  ActionBus.__resetActionBusForTests();
  GuardianPolicy.__resetPolicyForTests();
  GuardianTrust.__resetTrustForTests();
  GuardianApproval.__resetApprovalsForTests();
  GuardianAuditLog.__resetAuditLogForTests();
  IslandQueue.__resetIslandQueueForTests();
  SoundMap.__resetSoundMapForTests();
  MotionIdentity.__resetMotionIdentityForTests();
  Goals.__resetGoalsForTests();
  Metrics.__resetMetricsForTests();
  ProactiveMessaging.__resetProactiveMessagesForTests();
  ContextPanelRegistry.__resetContextPanelsForTests();
  __resetBootstrapForTests();
  bootstrapDomains();
}

/**
 * Acumula evidência REAL de aceitação (mesmo caminho que o Guardian usa) até
 * o Trust Engine considerar o tipo de ação "confiável" — só assim uma regra
 * com teto L1 executa sozinha. Nunca fabrica o resultado de policy.classify().
 */
export function seedTrust(domain: DomainId, actionType: string, acceptedCount = 6): void {
  for (let i = 0; i < acceptedCount; i += 1) {
    GuardianTrust.recordOutcome({ domain, actionType, outcome: 'accepted', actionId: `seed_${actionType}_${i}` });
  }
}

export function makeChecker(tag: string): {
  check: (label: string, cond: boolean) => void;
  result: () => { total: number; fails: number };
} {
  let total = 0;
  let fails = 0;
  return {
    check(label, cond) {
      total += 1;
      console.log(`${cond ? 'PASS' : 'FAIL'} — [${tag}] ${label}`);
      if (!cond) fails += 1;
    },
    result: () => ({ total, fails }),
  };
}
