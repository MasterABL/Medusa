/**
 * MEDUSA FOUNDATION — Domain Event model
 *
 * Regra central (seção 11 da missão): EVENTO ≠ AÇÃO.
 * Um evento diz "algo aconteceu". Ele não executa nada sozinho — quem decide o
 * que fazer a respeito é quem escuta (outro domínio, o Guardian, o Action Bus).
 */

import type { DomainId } from './domain';

export type EventPriority = 0 | 1 | 2; // 0 = baixa, 1 = normal, 2 = alta/crítica

export interface DomainEvent<TPayload = unknown> {
  id: string;
  domain: DomainId;
  type: string; // ex.: 'LESSON_COMPLETED', 'TIME_CONFLICT_DETECTED'
  payload: TPayload;
  priority: EventPriority;
  /**
   * Chave de deduplicação opcional — dois eventos com a mesma dedupeKey dentro
   * da janela de retenção do bus contam como um só (ver seção 57, "princípio
   * de não-intrusão": não disparar granularidade que vira ruído).
   */
  dedupeKey?: string;
  createdAt: string; // ISO 8601
  /** Referência opcional para rastrear a cadeia evento -> ação -> auditoria. */
  correlationId?: string;
}

export type DomainEventListener<TPayload = unknown> = (
  event: DomainEvent<TPayload>
) => void;
