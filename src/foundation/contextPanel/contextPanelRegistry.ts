/**
 * MEDUSA FOUNDATION — Domain Context Panel registry (seção 35/36)
 */

import type { ContextPanelRegistration } from '../types/contextPanel';
import type { DomainId } from '../types/domain';

const panels = new Map<DomainId, ContextPanelRegistration>();

export function registerContextPanel(registration: ContextPanelRegistration): void {
  panels.set(registration.domain, registration);
}

export function getContextPanel(domain: DomainId): ContextPanelRegistration | undefined {
  return panels.get(domain);
}

export function listContextPanels(): ContextPanelRegistration[] {
  return Array.from(panels.values());
}

export function hasImplementedContextPanel(domain: DomainId): boolean {
  return getContextPanel(domain)?.implemented === true;
}

/** Só para testes de contrato. */
export function __resetContextPanelsForTests(): void {
  panels.clear();
}
