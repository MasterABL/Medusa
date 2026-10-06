/**
 * MEDUSA FOUNDATION — Modelo causal do Guardian
 *
 *   Evento → Contexto → Decisão → Política → Autonomia → Aprovação
 *          → Execução → Resultado → Feedback → Auditoria
 *
 * Nada aqui é um segundo sistema: cada estágio já existe na fundação
 * (EventBus, Policy, ApprovalRequest, ActionBus, AuditLog, Trust). Estes
 * tipos cobrem só o que FALTAVA — contexto da decisão, resultado observado,
 * feedback, permissão explícita (grant) — e a leitura que costura tudo.
 */

import type { DomainId } from './domain';
import type { AutonomyLevel } from './autonomy';
import type { ApprovalRequest, ActionAuditLogEntry } from './guardian';
import type { Action } from './action';
import type { DomainEvent } from './event';
import type { ActionTrustProfile } from './trust';

/** Um fato que o Guardian tinha na mão ao decidir. Referência + resumo curto — nunca conteúdo privado. */
export interface ContextSignalRef {
  kind: string;
  /** De onde veio (id de evento, regra, tabela#id...). Obrigatório: sinal sem origem não é evidência. */
  ref: string;
  summary: string;
}

export interface DecisionContextRecord {
  id: string;
  correlationId: string;
  actionId?: string;
  eventIds: string[];
  signals: ContextSignalRef[];
  recordedAt: string;
}

/**
 * Resultado OBSERVADO de uma ação executada — coisa diferente de
 * `Action.status === 'SUCCESS'` (que só diz "rodou sem erro"):
 *  - efeito_confirmado : o efeito pretendido foi verificado;
 *  - sem_efeito        : rodou, mas o efeito pretendido não aconteceu;
 *  - falhou            : a execução falhou;
 *  - nao_verificavel   : não há como checar — NUNCA conta como sucesso.
 */
export type OutcomeResult = 'efeito_confirmado' | 'sem_efeito' | 'falhou' | 'nao_verificavel';

export interface ActionOutcome {
  id: string;
  actionId: string;
  result: OutcomeResult;
  observedAt: string;
  /** Como foi verificado / o que foi observado. Vazio só é aceito em `nao_verificavel`. */
  evidence?: string;
}

export type FeedbackKind = 'explicit' | 'implicit';
export type FeedbackSignal = 'positive' | 'negative' | 'corrected';

export interface ActionFeedback {
  id: string;
  actionId: string;
  kind: FeedbackKind;
  signal: FeedbackSignal;
  at: string;
  note?: string;
  /** Este feedback virou evidência no Trust Engine? Decidido por regra, nunca pelo chamador. */
  countsTowardTrust: boolean;
  /** Por que contou / por que não contou — explicável. */
  trustRationale: string;
}

/**
 * Permissão EXPLÍCITA do usuário para uma ação específica rodar sozinha.
 * Confiança aprendida é evidência; grant é decisão humana. Só faz sentido
 * para regras com teto L1 — L2/L3 nunca sobem, com ou sem grant.
 */
export interface AutonomyGrant {
  id: string;
  domain: DomainId;
  actionType: string;
  level: 'L1';
  grantedBy: 'user';
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  note?: string;
}

export type CausalStageId =
  | 'evento'
  | 'contexto'
  | 'decisao'
  | 'politica'
  | 'autonomia'
  | 'aprovacao'
  | 'execucao'
  | 'resultado'
  | 'feedback'
  | 'auditoria';

/** presente = há registro; ausente = deveria haver e não há; nao_aplicavel = o caso não exige este estágio. */
export type CausalStageStatus = 'presente' | 'ausente' | 'nao_aplicavel';

export interface CausalStage {
  stage: CausalStageId;
  status: CausalStageStatus;
  /** Referências estruturadas (ids) — a tela decide como compor. */
  refs: string[];
  note?: string;
}

export interface TraceViolation {
  code: 'executada_sem_aprovacao' | 'executada_sem_auditoria' | 'aprovacao_sem_acao' | 'sucesso_sem_resultado' | 'sem_contexto_da_decisao';
  /** violacao = regra do Guardian quebrada; aviso = lacuna de rastreabilidade. */
  severity: 'violacao' | 'aviso';
  actionId?: string;
  message: string;
}

export interface CausalTrace {
  correlationId: string;
  stages: CausalStage[];
  events: DomainEvent[];
  actions: Action[];
  approvals: ApprovalRequest[];
  audit: ActionAuditLogEntry[];
  context: DecisionContextRecord[];
  outcomes: ActionOutcome[];
  feedback: ActionFeedback[];
  violations: TraceViolation[];
}

export interface PendingApprovalItem {
  approval: ApprovalRequest;
  action: Action;
  /** ms até expirar; negativo = já venceu mas ainda não foi varrida. Ausente = sem prazo. */
  expiresInMs?: number;
}

export interface AutonomousExecutionItem {
  action: Action;
  level: AutonomyLevel;
  outcome?: ActionOutcome;
  undoAvailable: boolean;
}

export interface AutonomyRow {
  domain: DomainId;
  actionType: string;
  ceiling: AutonomyLevel | 'desconhecido';
  trust?: Pick<ActionTrustProfile, 'state' | 'sampleSize' | 'recentAcceptanceRate'>;
  activeGrant?: AutonomyGrant;
  /** O grant não muda nada quando o teto da regra não é L1 — dizemos isso em vez de fingir que vale. */
  grantInert: boolean;
}

export interface ActionCenterView {
  generatedAt: string;
  awaitingApproval: PendingApprovalItem[];
  autonomousRecent: AutonomousExecutionItem[];
  resolvedRecent: Array<{ approval: ApprovalRequest; action?: Action }>;
  autonomy: AutonomyRow[];
  counts: { awaiting: number; autonomousRecent: number; failedRecent: number };
}
