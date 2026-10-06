/**
 * MEDUSA FOUNDATION — Action model
 *
 * Seção 9 da missão: ações precisam ser primeira classe. Uma IA de domínio não
 * apenas informa — ela interpreta, sugere, prepara, pede aprovação, executa,
 * desfaz e registra. Modelar "dados" não basta.
 */

import type { DomainId } from './domain';
import type { AutonomyLevel, RiskLevel } from './autonomy';

export type ActionStatus =
  | 'PROPOSED'
  | 'ANALYZING'
  | 'AWAITING_APPROVAL'
  | 'AUTHORIZED'
  | 'EXECUTING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'UNDONE';

export interface Action<TPayload = unknown> {
  id: string;
  domain: DomainId;
  type: string; // ex.: 'CREATE_REVIEW_BLOCK', 'CATEGORIZE_TRANSACTION'
  /** Frase curta, legível por humano, do que a ação pretende fazer. */
  intent: string;
  payload: TPayload;
  /** Quem/o que originou esta ação — normalmente um DomainEvent.id. */
  source?: string;
  /**
   * Cadeia causal: todo evento, contexto, decisão, aprovação, execução,
   * resultado e feedback do MESMO caso compartilham este id. Opcional pra
   * não quebrar quem já cria Actions; sem ele a trilha causal fica incompleta.
   */
  correlationId?: string;
  /** DomainEvent.id que disparou esta ação (mais preciso que `source`, que é texto livre). */
  sourceEventId?: string;
  /** Domínio/entidade afetada, quando a ação atravessa domínios (ex.: Agenda). */
  target?: DomainId;
  riskLevel: RiskLevel;
  autonomyLevel?: AutonomyLevel; // preenchido pelo Guardian, não pelo domínio emissor
  trustRequirement?: number;
  reversible: boolean;
  /** Presente apenas quando reversible=true — o que desfazer significa aqui. */
  undoDescription?: string;
  requiresApproval: boolean;
  status: ActionStatus;
  createdAt: string;
  executedAt?: string;
  /** Referência ao ActionAuditLogEntry gerado quando a ação é processada. */
  auditReference?: string;
}
