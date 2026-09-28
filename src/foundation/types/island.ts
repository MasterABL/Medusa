/**
 * MEDUSA FOUNDATION — Dynamic Island multi-evento (seção 30)
 *
 * IMPORTANTE: o catálogo de produção do Island (`IslandState`, em
 * src/types/shell.ts) é FECHADO em 10 estados canônicos — ver
 * src/fixtures/islandFixtures.ts. Esta fila NUNCA inventa um 11º estado.
 * O que ela resolve é OUTRO problema: com múltiplos domínios emitindo
 * eventos, qual deles o Island deveria estar comunicando agora, dentre os
 * 10 estados já existentes — e quando um evento mais urgente deve interromper
 * o que está sendo mostrado.
 */

import type { DomainId } from './domain';
import type { IslandState } from '@/types/shell';

export type IslandEventSeverity = 'info' | 'attention' | 'critical';

export interface IslandExperienceEvent {
  id: string;
  domain: DomainId;
  /** Qual dos 10 estados canônicos este evento quer usar para se apresentar. */
  islandState: IslandState;
  priority: number; // maior = mais prioritário na fila
  severity: IslandEventSeverity;
  message: string;
  icon?: string;
  soundKey?: string;
  durationMs?: number;
  requiresAttention: boolean;
  /** Se true, um evento de prioridade maior pode cortar a exibição atual. */
  interruptible: boolean;
  sourceActionId?: string;
  createdAt: string;
  /** Dedup: dois eventos com a mesma chave dentro da janela viram um só. */
  dedupeKey?: string;
}
