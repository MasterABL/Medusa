/**
 * MEDUSA FOUNDATION — Motion Identity registry (seção 28)
 */

import type { DomainMotionProfile } from '../types/motion';
import type { DomainId } from '../types/domain';

const profiles = new Map<DomainId, DomainMotionProfile>();

export function registerMotionProfile(profile: DomainMotionProfile): void {
  profiles.set(profile.domain, profile);
}

export function getMotionProfile(domain: DomainId): DomainMotionProfile | undefined {
  return profiles.get(domain);
}

export function listMotionProfiles(): DomainMotionProfile[] {
  return Array.from(profiles.values());
}

/** Só para testes de contrato. */
export function __resetMotionIdentityForTests(): void {
  profiles.clear();
}
