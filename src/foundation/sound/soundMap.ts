/**
 * MEDUSA FOUNDATION — Sound Map registry (seção 29)
 *
 * Registra QUAIS chaves de som cada domínio pode usar — não é um motor de
 * síntese novo (isso já existe em src/lib/audioFeedback.ts). Um domínio só
 * pode "tocar" uma chave que ele mesmo registrou, o que impede sons soltos
 * sendo disparados por qualquer lugar do código sem passar pelo contrato.
 */

import type { DomainSoundProfile } from '../types/sound';
import type { DomainId } from '../types/domain';

const profiles = new Map<DomainId, DomainSoundProfile>();

export function registerSoundProfile(profile: DomainSoundProfile): void {
  profiles.set(profile.domain, profile);
}

export function getSoundProfile(domain: DomainId): DomainSoundProfile | undefined {
  return profiles.get(domain);
}

export function isValidSoundKey(domain: DomainId, key: string): boolean {
  return profiles.get(domain)?.keys.includes(key) ?? false;
}

export function listSoundProfiles(): DomainSoundProfile[] {
  return Array.from(profiles.values());
}

/** Só para testes de contrato. */
export function __resetSoundMapForTests(): void {
  profiles.clear();
}
