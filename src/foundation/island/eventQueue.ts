/**
 * MEDUSA FOUNDATION — Experience Event Queue do Dynamic Island (seção 30)
 *
 * Múltiplos domínios podem emitir eventos de experiência ao mesmo tempo. O
 * Island não mostra tudo de uma vez — esta fila decide QUAL evento está em
 * exibição agora, por prioridade/severidade, e permite que um evento crítico
 * (ex.: L3 approval request) interrompa um evento informativo que seja
 * `interruptible`. Volta a exibir o evento interrompido depois, se ele ainda
 * estiver na fila.
 *
 * Lembrete: os `islandState` usados aqui continuam os 10 estados canônicos já
 * existentes — ver types/island.ts.
 */

import type { IslandExperienceEvent, IslandEventSeverity } from '../types/island';

const SEVERITY_RANK: Record<IslandEventSeverity, number> = {
  info: 0,
  attention: 1,
  critical: 2,
};

const DEFAULT_DEDUPE_WINDOW_MS = 2000;

let queue: IslandExperienceEvent[] = [];
let dedupeWindowMs = DEFAULT_DEDUPE_WINDOW_MS;

function precedence(event: IslandExperienceEvent): [number, number, number] {
  // Maior é melhor em cada posição: severidade > prioridade declarada > mais antigo primeiro (FIFO).
  return [SEVERITY_RANK[event.severity], event.priority, -new Date(event.createdAt).getTime()];
}

function comparePrecedence(a: IslandExperienceEvent, b: IslandExperienceEvent): number {
  const pa = precedence(a);
  const pb = precedence(b);
  for (let i = 0; i < pa.length; i += 1) {
    if (pa[i] !== pb[i]) return pb[i] - pa[i]; // ordem decrescente
  }
  return 0;
}

function isDuplicate(event: IslandExperienceEvent): boolean {
  if (!event.dedupeKey) return false;
  const cutoff = new Date(event.createdAt).getTime() - dedupeWindowMs;
  return queue.some(
    (q) =>
      q.domain === event.domain &&
      q.dedupeKey === event.dedupeKey &&
      new Date(q.createdAt).getTime() >= cutoff
  );
}

/** Devolve o evento enfileirado, ou `null` quando foi descartado por dedup. */
export function enqueue(event: IslandExperienceEvent): IslandExperienceEvent | null {
  if (isDuplicate(event)) return null;
  queue.push(event);
  return event;
}

/** O evento que deveria estar em exibição agora — não remove da fila. */
export function peek(): IslandExperienceEvent | undefined {
  if (queue.length === 0) return undefined;
  return [...queue].sort(comparePrecedence)[0];
}

/** A fila inteira, já ordenada por precedência (para inspeção/debug/testes). */
export function snapshot(): IslandExperienceEvent[] {
  return [...queue].sort(comparePrecedence);
}

/** Remove um evento específico da fila (ex.: terminou de exibir, ou foi dispensado). */
export function dequeue(id: string): IslandExperienceEvent | undefined {
  const index = queue.findIndex((e) => e.id === id);
  if (index === -1) return undefined;
  const [removed] = queue.splice(index, 1);
  return removed;
}

/**
 * Um evento novo interrompe o que está em exibição quando: o atual é
 * `interruptible` E o novo tem precedência estritamente maior. Não remove o
 * evento interrompido — ele volta a concorrer pelo peek() normalmente.
 */
export function wouldInterrupt(current: IslandExperienceEvent, incoming: IslandExperienceEvent): boolean {
  if (!current.interruptible) return false;
  return comparePrecedence(incoming, current) < 0; // < 0 = incoming vem antes (maior precedência)
}

export function listByDomain(domain: IslandExperienceEvent['domain']): IslandExperienceEvent[] {
  return snapshot().filter((e) => e.domain === domain);
}

/** Só para testes de contrato. */
export function __resetIslandQueueForTests(newDedupeWindowMs?: number): void {
  queue = [];
  dedupeWindowMs = newDedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS;
}
