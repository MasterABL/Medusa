/**
 * MEDUSA FOUNDATION — Comunicação proativa
 *
 * Seções 16/17/31/39/57: domínios podem iniciar comunicação, mas a intenção é
 * UMA só (ProactiveMessage) apresentada de forma adaptada em cada canal —
 * nunca quatro cópias idênticas do mesmo texto.
 */

import type { DomainId } from './domain';

export type SurfaceTarget = 'guardian' | 'hoje' | 'island' | 'notification';

export type MessageUrgency = 'baixa' | 'normal' | 'alta';

/**
 * Explicação estruturada por trás de uma recomendação (seção 17/40/56):
 * o quê, por quê, baseado em quê, qual impacto, qual ação — nunca chain of
 * thought bruto, sempre um resumo útil.
 */
export interface MessageEvidence {
  reason: string;
  evidence: string[];
  impact?: string;
  proposedActionId?: string;
}

export interface ProactiveMessage {
  id: string;
  domain: DomainId;
  message: string;
  evidence: MessageEvidence;
  priority: number; // usado para ordenar/desempatar dentro de um mesmo urgency
  urgency: MessageUrgency;
  /** Em quais canais esta intenção pode aparecer — a apresentação é adaptada por canal. */
  surfaceTargets: SurfaceTarget[];
  requiresResponse: boolean;
  createdAt: string;
  expiresAt?: string;
  /** Nenhuma nova mensagem do mesmo (domain, dedupeKey) antes deste instante. */
  cooldownKey?: string;
  cooldownUntil?: string;
  read: boolean;
  dismissed: boolean;
}
