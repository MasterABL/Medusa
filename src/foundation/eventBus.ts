/**
 * MEDUSA FOUNDATION — Domain Event Bus (seção 10)
 *
 * Domínios emitem eventos; quem quiser reagir se inscreve. Sem isto, agentes
 * de domínio "conversariam diretamente de maneira caótica" (texto da missão)
 * — um domínio nunca deveria importar outro domínio pra reagir a algo dele.
 *
 * Dedup (seção 57, "princípio de não-intrusão"): dois eventos com a mesma
 * `dedupeKey` dentro da janela de retenção contam como um só publish — o
 * segundo é descartado silenciosamente, sem notificar os listeners de novo.
 */

import type { DomainEvent, DomainEventListener, EventPriority } from './types/event';
import type { DomainId } from './types/domain';

const DEFAULT_DEDUPE_WINDOW_MS = 2000;

interface Subscription {
  id: string;
  eventType: string | '*';
  listener: DomainEventListener;
}

let subscriptions: Subscription[] = [];
let history: DomainEvent[] = [];
let dedupeWindowMs = DEFAULT_DEDUPE_WINDOW_MS;
let subscriptionCounter = 0;
let eventCounter = 0;

function makeId(prefix: string, counter: number): string {
  return `${prefix}_${Date.now()}_${counter}`;
}

export function subscribe<TPayload = unknown>(
  eventType: string | '*',
  listener: DomainEventListener<TPayload>
): () => void {
  subscriptionCounter += 1;
  const id = makeId('sub', subscriptionCounter);
  subscriptions.push({ id, eventType, listener: listener as DomainEventListener });
  return () => {
    subscriptions = subscriptions.filter((s) => s.id !== id);
  };
}

function isDuplicate(event: Pick<DomainEvent, 'domain' | 'type' | 'dedupeKey' | 'createdAt'>): boolean {
  if (!event.dedupeKey) return false;
  const cutoff = new Date(event.createdAt).getTime() - dedupeWindowMs;
  return history.some(
    (h) =>
      h.domain === event.domain &&
      h.type === event.type &&
      h.dedupeKey === event.dedupeKey &&
      new Date(h.createdAt).getTime() >= cutoff
  );
}

export interface PublishInput<TPayload = unknown> {
  domain: DomainId;
  type: string;
  payload: TPayload;
  priority?: EventPriority;
  dedupeKey?: string;
  correlationId?: string;
}

/** Devolve o evento publicado, ou `null` quando foi descartado por dedup. */
export function publish<TPayload = unknown>(input: PublishInput<TPayload>): DomainEvent<TPayload> | null {
  eventCounter += 1;
  const createdAt = new Date().toISOString();
  const candidate: DomainEvent<TPayload> = {
    id: makeId('evt', eventCounter),
    domain: input.domain,
    type: input.type,
    payload: input.payload,
    priority: input.priority ?? 1,
    dedupeKey: input.dedupeKey,
    correlationId: input.correlationId,
    createdAt,
  };

  if (isDuplicate(candidate)) {
    return null;
  }

  history.push(candidate as DomainEvent);

  for (const sub of subscriptions) {
    if (sub.eventType === '*' || sub.eventType === candidate.type) {
      sub.listener(candidate as DomainEvent);
    }
  }

  return candidate;
}

export function getHistory(filter?: { domain?: DomainId; type?: string }): DomainEvent[] {
  return history.filter(
    (e) => (!filter?.domain || e.domain === filter.domain) && (!filter?.type || e.type === filter.type)
  );
}

/** Só para testes de contrato. */
export function __resetEventBusForTests(newDedupeWindowMs?: number): void {
  subscriptions = [];
  history = [];
  subscriptionCounter = 0;
  eventCounter = 0;
  dedupeWindowMs = newDedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS;
}
