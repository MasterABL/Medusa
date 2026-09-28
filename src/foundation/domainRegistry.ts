/**
 * MEDUSA FOUNDATION — Domain Registry (seção 37/38)
 *
 * Abstração central para registrar domínios sem hardcode espalhado pelo
 * sistema. Qualquer domínio futuro (Espiritual, etc.) entra por aqui, com o
 * mesmo contrato que Educação e Agenda já usam nesta própria rodada.
 *
 * Deliberadamente um MÓDULO COM ESTADO (um Map em memória), não uma classe —
 * mesmo padrão simples já usado no resto do projeto (ver
 * src/lib/audioFeedback.ts). Persistência real (se algum dia for necessária)
 * é decisão de quem for integrar isto num Provider React, não desta camada.
 */

import type { DomainCapability, DomainDefinition, DomainId, DomainPersona } from './types/domain';

const registry = new Map<DomainId, DomainDefinition>();

export class DomainRegistryError extends Error {}

export function registerDomain(definition: DomainDefinition): void {
  if (registry.has(definition.id)) {
    throw new DomainRegistryError(
      `Domínio "${definition.id}" já está registrado — cada domínio só pode ser registrado uma vez.`
    );
  }
  registry.set(definition.id, definition);
}

/** Substitui um registro existente — usado por domínios que evoluem (ex.: ganham persona depois). */
export function updateDomain(definition: DomainDefinition): void {
  if (!registry.has(definition.id)) {
    throw new DomainRegistryError(
      `Domínio "${definition.id}" não está registrado — use registerDomain() primeiro.`
    );
  }
  registry.set(definition.id, definition);
}

export function getDomain(id: DomainId): DomainDefinition | undefined {
  return registry.get(id);
}

export function requireDomain(id: DomainId): DomainDefinition {
  const domain = registry.get(id);
  if (!domain) {
    throw new DomainRegistryError(`Domínio "${id}" não encontrado no registry.`);
  }
  return domain;
}

export function listDomains(): DomainDefinition[] {
  return Array.from(registry.values());
}

export function listLiveDomains(): DomainDefinition[] {
  return listDomains().filter((d) => d.isLive);
}

export function getPersona(id: DomainId): DomainPersona | undefined {
  return getDomain(id)?.persona;
}

export function getCapability(id: DomainId, capabilityId: string): DomainCapability | undefined {
  return getDomain(id)?.capabilities.find((c) => c.id === capabilityId);
}

export function listCapabilities(id: DomainId): DomainCapability[] {
  return getDomain(id)?.capabilities ?? [];
}

export function hasImplementedCapability(id: DomainId, capabilityId: string): boolean {
  return getCapability(id, capabilityId)?.implemented === true;
}

/**
 * Só para testes de contrato — nunca chamar isto em código de produção. Sem
 * isso, cada script de teste que roda `registerDomain()` teria que reiniciar
 * o processo Node pra limpar o estado do Map.
 */
export function __resetRegistryForTests(): void {
  registry.clear();
}
