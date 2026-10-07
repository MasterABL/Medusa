/**
 * MEDUSA — E-mail — Contratos
 *
 * O Medusa não é um cliente de e-mail. O domínio existe para ENTENDER o que chega,
 * RELACIONAR com o resto da vida (projeto, tarefa, prazo, evento), PRIORIZAR e propor
 * AÇÃO — sempre pelo Guardian.
 *
 * Privacidade por desenho:
 *   - `EmailMessage` guarda metadados + snippet. Nunca o corpo inteiro.
 *   - Se uma integração entregar o corpo, ele entra como `EmailContentForAnalysis`
 *     (transitório): é lido pela extração e descartado. Do corpo só sobram trechos
 *     curtos de evidência (`Evidence.excerpt`, no máximo ~80 caracteres).
 *   - Nenhum token, cabeçalho de autenticação ou credencial passa por aqui.
 *
 * Procedência: o minha-vida tinha `emailRiscoClassifier.js` (regex determinístico,
 * risco antes de categoria, nunca inventar prazo) e `avisosFaculdade.js` (avisos do
 * EAD). Os aprendizados vieram; o schema, os nomes e a implementação, não.
 */

import type { DataOrigin } from '../../../foundation/types/dataState';
import type { LifeDomain } from '../../../foundation/types/lifeDomain';
import type { ImportanceTier } from '../../../foundation/context/importance';
import type { EventContextCategory } from '../../../foundation/reminders/types';
import type { TaskPriority } from '../../tasks/model/types';
import type { EntityRef } from '../../../foundation/relations/graph';

export type EmailProviderKind = 'gmail' | 'outlook' | 'fixture' | 'local';

export interface EmailAddress {
  name?: string;
  address: string;
}

export interface EmailAttachmentMeta {
  id?: string;
  filename: string;
  mimeType?: string;
  sizeBytes?: number;
}

export type EmailDirection = 'received' | 'sent';

export interface EmailMessageSource {
  provider: EmailProviderKind;
  externalId?: string;
  /** Conta/caixa de onde veio (rótulo, nunca credencial). */
  account?: string;
  /** `fixture` nunca pode ser apresentado como real. */
  origin: DataOrigin;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  source: EmailMessageSource;
  direction: EmailDirection;
  sender: EmailAddress;
  recipients: EmailAddress[];
  subject: string;
  /** Prévia curta fornecida pelo provedor. É o máximo de conteúdo que fica guardado. */
  snippet: string;
  /** Hora local ISO `YYYY-MM-DDTHH:MM:SS`. Datas relativas ("amanhã") são lidas a partir daqui. */
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  attachments: EmailAttachmentMeta[];
  /** Preenchidos pela análise (não pela fonte). */
  importance?: ImportanceTier;
  risk?: EmailRisk[];
  domain?: LifeDomain;
  relatedProjectId?: string;
  relatedTaskId?: string;
  relatedEventId?: string;
}

/** Corpo entregue pela integração SÓ para análise. Não é persistido em lugar nenhum. */
export interface EmailContentForAnalysis {
  messageId: string;
  text: string;
  retention: 'transient';
}

export type EmailThreadStatus = 'needs_action' | 'waiting_reply' | 'informational' | 'done' | 'snoozed' | 'archived';

export interface EmailThread {
  threadId: string;
  messages: EmailMessage[];
  participants: EmailAddress[];
  subject: string;
  lastMessageAt: string;
  unreadCount: number;
  importance?: ImportanceTier;
  status: EmailThreadStatus;
}

/** Estados de leitura/fluxo. Uma mensagem pode estar em vários ao mesmo tempo (não lida + acionável). */
export type EmailReadingState = 'unread' | 'read' | 'important' | 'actionable' | 'waiting' | 'done' | 'snoozed' | 'archived';

// ===== Evidência e extração =====

export interface Evidence {
  field: 'subject' | 'snippet' | 'sender' | 'attachment' | 'body';
  /** Trecho curto (≤ 80 caracteres) que sustenta a conclusão. */
  excerpt: string;
  start: number;
  end: number;
}

export interface Extracted<T> {
  value: T;
  evidence: Evidence;
  confidence: number;
}

export type ActionVerb = 'enviar' | 'responder' | 'confirmar' | 'pagar' | 'assinar' | 'entregar' | 'revisar' | 'agendar' | 'comparecer' | 'concluir';

export type MeetingKind = 'reuniao' | 'consulta' | 'prova' | 'entrevista' | 'aula' | 'evento';

export interface EmailExtraction {
  dates: Extracted<{ date: string; kind: 'absoluta' | 'relativa' | 'dia_da_semana' | 'dia_do_mes'; raw: string }>[];
  times: Extracted<{ time: string; raw: string }>[];
  /** "até sexta", "vence dia 10", "deve ser entregue amanhã". */
  deadline?: Extracted<{ date: string; time?: string; phrase: string; alreadyPast: boolean }>;
  /** "reunião terça às 14h", "consulta confirmada para amanhã às 18h". */
  meeting?: Extracted<{ kind: MeetingKind; date?: string; time?: string; endTime?: string }>;
  amounts: Extracted<{ amount: number; currency: 'BRL' }>[];
  location?: Extracted<{ text: string; online: boolean }>;
  people: Extracted<{ name: string }>[];
  organization?: Extracted<{ name: string }>;
  discipline?: Extracted<{ name: string }>;
  course?: Extracted<{ name: string }>;
  project?: Extracted<{ name: string; matchedProjectId?: string }>;
  documents: Extracted<{ name: string }>[];
  actionRequest?: Extracted<{ verb: ActionVerb; object?: string }>;
  /** Esforço DITO no texto ("leva uns 20 min"). Nunca presumido aqui. */
  effort?: Extracted<{ minutes: number }>;
  /** O texto anuncia cancelamento/remarcação de um compromisso. */
  cancellation?: Extracted<{ kind: 'cancelado' | 'remarcado' }>;
}

// ===== Classificação e risco =====

export type EmailCategory =
  | 'medical'
  | 'academic'
  | 'work'
  | 'finance'
  | 'security'
  | 'meeting'
  | 'document'
  | 'personal'
  | 'notification'
  | 'newsletter'
  | 'marketing'
  | 'spam';

export interface EmailClassification {
  category: EmailCategory;
  domain: LifeDomain;
  importance: ImportanceTier;
  /** Por que essa importância — cada motivo cita a regra; nunca "remetente famoso". */
  reasons: string[];
  confidence: number;
  /** O texto pede algo do usuário (responder, enviar, pagar, comparecer...). */
  actionRequested: boolean;
  /** Envio em massa (marketing/newsletter/notificação automática). */
  bulk: boolean;
}

export type EmailRiskType =
  | 'deadline'
  | 'financial'
  | 'medical'
  | 'academic'
  | 'work'
  | 'meeting'
  | 'security'
  | 'document'
  | 'request'
  | 'follow_up'
  | 'informational';

export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';

export type TemporalImpact = 'vencido' | 'hoje' | 'proximo' | 'futuro' | 'nenhum';

export interface EmailRisk {
  type: EmailRiskType;
  severity: RiskSeverity;
  reason: string;
  deadline?: string;
  financialImpact?: { amount: number; currency: 'BRL' };
  temporalImpact: TemporalImpact;
  domain: LifeDomain;
  confidence: number;
  evidence: Evidence[];
}

// ===== Candidatos (propostas, nunca gravadas sozinhas) =====

export type EmailCandidateKind = 'task' | 'calendar_event' | 'deadline' | 'reminder' | 'finance' | 'reply';

export type CandidateStatus = 'proposed' | 'accepted' | 'dismissed' | 'linked_existing';

interface CandidateBase {
  /** Estável: `${messageId}:${kind}` (+ sufixo) — reprocessar o mesmo e-mail gera o mesmo id. */
  id: string;
  kind: EmailCandidateKind;
  sourceEmailId: string;
  threadId: string;
  confidence: number;
  reasons: string[];
  evidence: Evidence[];
  status: CandidateStatus;
  /** Quando já existe na Agenda/Tasks: o candidato só LIGA, não cria. */
  matchedExisting?: EntityRef;
}

export interface TaskCandidate extends CandidateBase {
  kind: 'task';
  title: string;
  dueAt?: string;
  estimatedMinutes?: number;
  /** De onde veio a estimativa: dita no texto, ou heurística configurável (sempre marcada). */
  estimateSource?: 'texto' | 'heuristica';
  domain: LifeDomain;
  priority: TaskPriority;
  projectId?: string;
}

export interface CalendarEventCandidate extends CandidateBase {
  kind: 'calendar_event';
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  timezone: string;
  participants: EmailAddress[];
  location?: string;
  category: EventContextCategory;
  tier: ImportanceTier;
  rigid: boolean;
  domain: LifeDomain;
  meetingKind: MeetingKind;
}

export interface DeadlineCandidate extends CandidateBase {
  kind: 'deadline';
  title: string;
  dueAt: string;
  domain: LifeDomain;
  tier: ImportanceTier;
  projectId?: string;
  alreadyPast: boolean;
}

export interface ReminderIntentCandidate extends CandidateBase {
  kind: 'reminder';
  /** Candidato (evento ou prazo) sobre o qual avisar. */
  targetCandidateId: string;
  offsetsMinutes: number[];
}

export interface FinanceCandidate extends CandidateBase {
  kind: 'finance';
  title: string;
  financeKind: 'cobranca' | 'fatura' | 'pagamento' | 'negativacao';
  amount?: number;
  dueAt?: string;
  /** Pagar é sempre ação humana. O Medusa só organiza (prazo/lembrete). */
  paymentRequiresApproval: true;
}

export interface ReplyCandidate extends CandidateBase {
  kind: 'reply';
  to: EmailAddress;
  /** Responder automaticamente é L3. Isto é só o lembrete de que alguém espera resposta. */
  dueAt?: string;
}

export type EmailCandidate = TaskCandidate | CalendarEventCandidate | DeadlineCandidate | ReminderIntentCandidate | FinanceCandidate | ReplyCandidate;

/** Próxima ação possível para um e-mail — vai para o Priority/Recommendation/Guardian existentes. */
export type CandidateActionKind =
  | 'responder'
  | 'criar_tarefa'
  | 'criar_evento'
  | 'adicionar_prazo'
  | 'abrir_documento'
  | 'acompanhar_depois'
  | 'ignorar'
  | 'arquivar'
  | 'marcar_importante'
  | 'cancelar_evento';

export interface CandidateAction {
  id: string;
  kind: CandidateActionKind;
  messageId: string;
  candidateId?: string;
  /** actionType registrado no Guardian (domínio `email`). */
  guardianActionType: string;
  label: string;
}

// ===== Trilha de auditoria =====

export type EmailAuditStep = 'classificacao' | 'extracao' | 'risco' | 'candidato' | 'deduplicacao' | 'guardian' | 'resultado';

export interface EmailAuditEntry {
  at: string;
  source: EmailProviderKind;
  messageId: string;
  step: EmailAuditStep;
  decision: string;
  reason: string;
  confidence?: number;
  action?: string;
  outcome?: 'proposto' | 'aceito' | 'recusado' | 'executado' | 'bloqueado' | 'aguardando_aprovacao' | 'ligado_a_existente';
  refs?: { candidateId?: string; actionId?: string; entity?: EntityRef };
}

export interface EmailAnalysis {
  messageId: string;
  threadId: string;
  analyzedAt: string;
  classification: EmailClassification;
  extraction: EmailExtraction;
  risks: EmailRisk[];
  candidates: EmailCandidate[];
  actions: CandidateAction[];
  readingStates: EmailReadingState[];
  audit: EmailAuditEntry[];
}
