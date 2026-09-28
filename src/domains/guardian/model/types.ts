/**
 * MEDUSA — Guardian Domain — Model
 *
 * Guardian vigia o Medusa: observa → detecta → classifica → explica → avalia →
 * propõe → autoriza → executa → verifica → registra. Este arquivo define os
 * dados que atravessam esse fluxo. Nada aqui é inventado: um Finding SEM
 * evidência é rejeitado (ver validators.ts).
 */

import type { AutonomyLevel } from '../../../foundation/types/autonomy';

export type FindingCategory = 'code' | 'data' | 'security' | 'product' | 'ux' | 'visual' | 'runtime' | 'integration';

export type FindingSeverity = 'baixa' | 'moderada' | 'alta' | 'critica';

/** onde? o que observou? o que era esperado? qual a diferença? */
export interface Evidence {
  /** Quem produziu a observação (auditor, relatório externo, verificação). */
  source: string;
  /** Onde: arquivo:linha, coleção#id, canal, rota... nunca vazio. */
  reference: string;
  /** O que foi observado — nunca contém o segredo/conteúdo privado em si. */
  observation: string;
  expectation?: string;
  difference?: string;
  observedAt: string;
}

export type FindingStatus =
  | 'detected' // achado, ainda sem decisão
  | 'awaiting_approval' // proposta pendente de aprovação humana
  | 'in_progress' // proposta aprovada/autorizada, executando
  | 'resolved' // corrigido e VERIFICADO (ou deixou de ser observado)
  | 'unverified' // executado, mas sem verificação possível — nunca conta como resolvido
  | 'failed' // execução ou verificação falhou
  | 'blocked' // não há correção disponível, ou foi recusada/está em cooldown
  | 'dismissed';

export interface FindingOutcome {
  status: 'resolved' | 'unverified' | 'failed' | 'blocked' | 'no_longer_observed';
  reason: string;
  decidedAt: string;
  verification?: VerificationResult;
}

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  /** id do auditor que originou o achado. */
  origin: string;
  evidence: Evidence[];
  /** Contexto livre estruturado (sem conteúdo privado). */
  context: Record<string, unknown>;
  impact: string;
  confidence: number; // 0-1
  hypothesis: string;
  /** Texto de explicação gerado a partir da evidência (etapa Explain). */
  explanation?: string;
  suggestedActionKey?: string;
  /** Dados que o remediador precisa (ids de duplicatas etc.). Sem conteúdo privado. */
  remediationInput?: Record<string, unknown>;
  requiredAutonomy?: AutonomyLevel;
  status: FindingStatus;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
  occurrences: number;
  dedupeKey: string;
  correlationId: string;
  regressionOf?: string;
  proposalId?: string;
  /** Bloqueio/falha temporários: só reprocessa depois desta data (cooldown). Ausente = decisão humana necessária. */
  retryAfter?: string;
  outcome?: FindingOutcome;
}

/** Rascunho produzido por um auditor (ainda sem id/status/timestamps de ciclo de vida). */
export interface FindingDraft {
  category: FindingCategory;
  severity: FindingSeverity;
  origin: string;
  evidence: Evidence[];
  context: Record<string, unknown>;
  impact: string;
  confidence: number;
  hypothesis: string;
  suggestedActionKey?: string;
  remediationInput?: Record<string, unknown>;
  dedupeKey: string;
}

/** Ciclo de aprovação exigido pela missão: PROPOSED → PENDING_APPROVAL → APPROVED | REJECTED | EXPIRED → EXECUTING → SUCCEEDED | FAILED. */
export type ProposalStatus =
  | 'PROPOSED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'EXECUTING'
  | 'SUCCEEDED'
  | 'FAILED';

export interface Proposal {
  id: string;
  findingId: string;
  actionKey: string;
  description: string;
  payload: Record<string, unknown>;
  reversible: boolean;
  status: ProposalStatus;
  /** Action da fundação que carrega a decisão do Guardian (policy/trust/approval/audit). */
  actionId?: string;
  approvalRequestId?: string;
  /** Por que esta proposta pede (ou não) aprovação — texto explicável. */
  authorizationReason?: string;
  createdAt: string;
  updatedAt: string;
  history: Array<{ status: ProposalStatus; at: string; note?: string }>;
}

export type VerificationStatus = 'verified' | 'failed' | 'unverifiable';

export interface VerificationResult {
  status: VerificationStatus;
  /** 'none' = nenhum verificador disponível (NÃO significa que deu certo). */
  method: 'handler' | 'redetection' | 'none';
  expected: string;
  observed: string;
  checkedAt: string;
  notes?: string;
}

export interface ExecutionRecord {
  id: string;
  proposalId: string;
  findingId: string;
  actionKey: string;
  startedAt: string;
  finishedAt?: string;
  ok?: boolean;
  error?: string;
  automatic: boolean;
}

/** Trilha de auditoria do PRÓPRIO Guardian (append-only), complementar ao audit da fundação. */
export type GuardianEventType =
  | 'CYCLE_STARTED'
  | 'CYCLE_FINISHED'
  | 'AUDITOR_FAILED'
  | 'FINDING_DETECTED'
  | 'FINDING_DEDUPED'
  | 'FINDING_REOPENED'
  | 'FINDING_NO_LONGER_OBSERVED'
  | 'PROPOSAL_CREATED'
  | 'PROPOSAL_STATUS_CHANGED'
  | 'AUTHORIZATION_DECIDED'
  | 'EXECUTION_STARTED'
  | 'EXECUTION_FINISHED'
  | 'VERIFICATION_RECORDED'
  | 'FINDING_BLOCKED'
  | 'TRUST_ADJUSTED'
  | 'COOLDOWN_STARTED';

export interface GuardianEvent {
  id: string;
  cycleId?: string;
  type: GuardianEventType;
  findingId?: string;
  proposalId?: string;
  message: string;
  at: string;
}

export interface Cooldown {
  key: string;
  until: string;
  reason: string;
}
