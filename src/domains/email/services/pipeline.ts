/**
 * MEDUSA — E-mail — Pipeline de análise
 *
 *   EmailMessage → extração → classificação → risco → candidatos → ações possíveis
 *
 * Tudo puro e determinístico: mesmo e-mail + mesmo `now` → mesma análise, com os mesmos ids
 * de candidato. Cada passo deixa uma linha na trilha de auditoria (fonte, decisão, motivo,
 * confiança). A análise por THREAD vem por cima: o contexto real está na conversa, não na
 * mensagem solta (a confirmação de terça confirma o convite de segunda; um "foi cancelada"
 * na resposta anula o compromisso proposto antes).
 */

import type {
  EmailAnalysis, EmailAuditEntry, EmailCandidate, EmailContentForAnalysis, EmailMessage, EmailReadingState, EmailThread, EmailThreadStatus,
} from '../model/types';
import { extractContext } from './extract';
import type { ExtractOptions } from './extract';
import { classifyEmail } from './classify';
import { assessRisk } from './risk';
import { deriveCandidates, significantTokens } from './candidates';
import type { CandidateOptions, ExistingContext } from './candidates';

export interface AnalyzeOptions extends ExtractOptions, CandidateOptions {
  now: string;
  existing?: ExistingContext;
  /** Corpo transitório por mensagem (nunca persistido). */
  contents?: EmailContentForAnalysis[];
  /** Estados decididos pelo usuário/provedor (concluído, adiado, arquivado). */
  userStates?: Record<string, EmailReadingState[]>;
}

const ACTIONABLE: EmailCandidate['kind'][] = ['task', 'calendar_event', 'deadline', 'finance', 'reply'];

function readingStatesOf(msg: EmailMessage, a: Pick<EmailAnalysis, 'classification' | 'candidates'>, user: EmailReadingState[] = []): EmailReadingState[] {
  const s = new Set<EmailReadingState>([msg.isRead ? 'read' : 'unread']);
  if (msg.isStarred || a.classification.importance === 'critical' || a.classification.importance === 'high') s.add('important');
  if (a.candidates.some((c) => ACTIONABLE.includes(c.kind) && c.status === 'proposed')) s.add('actionable');
  if (msg.labels.includes('SNOOZED')) s.add('snoozed');
  if (msg.source.provider === 'gmail' && msg.labels.length > 0 && !msg.labels.includes('INBOX') && !msg.labels.includes('SENT')) s.add('archived');
  for (const u of user) s.add(u);
  if (s.has('done')) s.delete('actionable');
  return Array.from(s);
}

export function analyzeEmail(msg: EmailMessage, opts: AnalyzeOptions): EmailAnalysis {
  const source = msg.source.provider;
  const audit: EmailAuditEntry[] = [];
  const log = (e: Omit<EmailAuditEntry, 'at' | 'source' | 'messageId'>) => audit.push({ at: opts.now, source, messageId: msg.id, ...e });

  const content = opts.contents?.find((c) => c.messageId === msg.id);
  const extraction = extractContext(msg, content, opts);
  log({
    step: 'extracao',
    decision: [extraction.deadline && 'prazo', extraction.meeting && 'compromisso', extraction.amounts.length && 'valor', extraction.actionRequest && 'pedido'].filter(Boolean).join(', ') || 'nada acionável',
    reason: content ? 'assunto, prévia e corpo transitório (corpo não guardado)' : 'assunto e prévia',
  });

  const classification = classifyEmail(msg, extraction, { now: opts.now });
  log({ step: 'classificacao', decision: `${classification.category} / ${classification.domain} / ${classification.importance}`, reason: classification.reasons.join('; '), confidence: classification.confidence });

  const risks = assessRisk(msg, classification, extraction, opts.now);
  log({ step: 'risco', decision: risks.map((r) => `${r.type}:${r.severity}`).join(', '), reason: risks[0].reason, confidence: risks[0].confidence });

  const { candidates, actions, skipped } = deriveCandidates(msg, classification, extraction, opts.existing, opts);
  for (const c of candidates) {
    log({
      step: c.status === 'linked_existing' ? 'deduplicacao' : 'candidato',
      decision: `${c.kind}${c.status === 'linked_existing' ? ` → já existe (${c.matchedExisting?.kind}:${c.matchedExisting?.id})` : ''}`,
      reason: c.reasons.join('; '),
      confidence: c.confidence,
      outcome: c.status === 'linked_existing' ? 'ligado_a_existente' : 'proposto',
      refs: { candidateId: c.id, entity: c.matchedExisting },
    });
  }
  for (const s of skipped) log({ step: 'candidato', decision: 'nada criado', reason: s });

  const partial = { classification, candidates };
  return {
    messageId: msg.id,
    threadId: msg.threadId,
    analyzedAt: opts.now,
    classification,
    extraction,
    risks,
    candidates,
    actions,
    readingStates: readingStatesOf(msg, partial, opts.userStates?.[msg.id]),
    audit,
  };
}

/** Mensagem com os campos derivados preenchidos (importância, risco, domínio, vínculos). */
export function enrichMessage(msg: EmailMessage, a: EmailAnalysis): EmailMessage {
  const linked = (k: string) => a.candidates.find((c) => c.matchedExisting?.kind === k)?.matchedExisting?.id;
  return {
    ...msg,
    importance: a.classification.importance,
    risk: a.risks,
    domain: a.classification.domain,
    relatedProjectId: msg.relatedProjectId ?? a.extraction.project?.value.matchedProjectId,
    relatedTaskId: msg.relatedTaskId ?? linked('task'),
    relatedEventId: msg.relatedEventId ?? linked('event'),
  };
}

const candidateKey = (c: EmailCandidate): string | undefined => {
  if (c.kind === 'calendar_event') return `event|${c.start}`;
  if (c.kind === 'deadline') return `deadline|${c.dueAt.slice(0, 10)}|${significantTokens(c.title).slice(0, 3).join(' ')}`;
  if (c.kind === 'task') return `task|${(c.dueAt ?? '').slice(0, 10)}|${significantTokens(c.title).slice(0, 3).join(' ')}`;
  if (c.kind === 'finance') return `finance|${c.dueAt ?? ''}|${c.amount ?? ''}`;
  return undefined;
};

export interface ThreadAnalysis {
  thread: EmailThread;
  analyses: EmailAnalysis[];
  /** Candidatos removidos por já aparecerem em mensagem mais nova da mesma conversa. */
  deduplicated: Array<{ candidateId: string; keptCandidateId: string }>;
}

export function analyzeThread(thread: EmailThread, opts: AnalyzeOptions): ThreadAnalysis {
  const ordered = [...thread.messages].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  const analyses = ordered.map((m) => analyzeEmail(m, opts));
  const deduplicated: ThreadAnalysis['deduplicated'] = [];

  // da mais nova para a mais antiga: a versão mais recente de cada candidato vence
  const kept = new Map<string, string>();
  for (let i = analyses.length - 1; i >= 0; i--) {
    const a = analyses[i];
    const keep: EmailCandidate[] = [];
    const dropped = new Set<string>();
    for (const c of a.candidates) {
      const key = candidateKey(c);
      if (key && kept.has(key)) {
        deduplicated.push({ candidateId: c.id, keptCandidateId: kept.get(key)! });
        dropped.add(c.id);
        a.audit.push({ at: opts.now, source: ordered[i].source.provider, messageId: a.messageId, step: 'deduplicacao', decision: `${c.kind} já proposto por mensagem mais nova da conversa`, reason: `mantido ${kept.get(key)}`, outcome: 'ligado_a_existente', refs: { candidateId: c.id } });
        continue;
      }
      if (key) kept.set(key, c.id);
      keep.push(c);
    }
    // lembrete cujo alvo foi removido também sai (o alvo mantido traz o lembrete dele)
    a.candidates = keep.filter((c) => !(c.kind === 'reminder' && dropped.has(c.targetCandidateId)));
    a.actions = a.actions.filter((x) => !x.candidateId || !dropped.has(x.candidateId));
  }

  // cancelamento numa mensagem mais nova anula o compromisso proposto antes, na mesma data
  for (let i = 0; i < analyses.length; i++) {
    const later = analyses.slice(i + 1).find((x) => x.extraction.cancellation);
    if (!later) continue;
    const a = analyses[i];
    a.candidates = a.candidates.map((c) => {
      if (c.kind !== 'calendar_event' || c.status !== 'proposed') return c;
      const cancelledDate = later.extraction.meeting?.value.date;
      if (cancelledDate && cancelledDate !== c.start.slice(0, 10)) return c;
      a.audit.push({ at: opts.now, source: ordered[i].source.provider, messageId: a.messageId, step: 'candidato', decision: 'compromisso descartado', reason: `mensagem posterior (${later.messageId}) diz que foi ${later.extraction.cancellation!.value.kind}`, outcome: 'recusado', refs: { candidateId: c.id } });
      return { ...c, status: 'dismissed' as const, reasons: [...c.reasons, `cancelado em ${later.messageId}`] };
    });
    a.candidates = a.candidates.filter((c) => !(c.kind === 'reminder' && a.candidates.some((t) => t.id === c.targetCandidateId && t.status === 'dismissed')));
    a.actions = a.actions.filter((x) => !x.candidateId || a.candidates.find((c) => c.id === x.candidateId)?.status !== 'dismissed');
  }

  for (let i = 0; i < analyses.length; i++) analyses[i].readingStates = readingStatesOf(ordered[i], analyses[i], opts.userStates?.[ordered[i].id]);

  const last = ordered[ordered.length - 1];
  const states = new Set(analyses.flatMap((a) => a.readingStates));
  const anyActionable = analyses.some((a) => a.readingStates.includes('actionable'));
  const lastIsMineAsking = last?.direction === 'sent' && (/\?/.test(last.snippet) || !!analyses[analyses.length - 1].extraction.actionRequest);
  let status: EmailThreadStatus;
  if (analyses.every((a) => a.readingStates.includes('archived'))) status = 'archived';
  else if (analyses.every((a) => a.readingStates.includes('done'))) status = 'done';
  else if (states.has('snoozed')) status = 'snoozed';
  else if (lastIsMineAsking) status = 'waiting_reply';
  else if (anyActionable) status = 'needs_action';
  else status = 'informational';
  if (status === 'waiting_reply') analyses[analyses.length - 1].readingStates.push('waiting');

  const rank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  const importance = analyses.map((a) => a.classification.importance).sort((x, y) => rank[x] - rank[y])[0];
  return { thread: { ...thread, messages: ordered, importance, status }, analyses, deduplicated };
}

/** Agrupa mensagens soltas em threads (quando o provedor entrega mensagem a mensagem). */
export function groupIntoThreads(messages: EmailMessage[]): EmailThread[] {
  const by = new Map<string, EmailMessage[]>();
  for (const m of messages) by.set(m.threadId, [...(by.get(m.threadId) ?? []), m]);
  return Array.from(by.entries()).map(([threadId, msgs]) => {
    const sorted = [...msgs].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
    const people = new Map<string, EmailMessage['sender']>();
    for (const m of sorted) for (const p of [m.sender, ...m.recipients]) people.set(p.address.toLowerCase(), p);
    return {
      threadId,
      messages: sorted,
      participants: Array.from(people.values()),
      subject: sorted[0].subject.replace(/^\s*((re|res|fw|fwd|enc)\s*:\s*)+/i, '').trim(),
      lastMessageAt: sorted[sorted.length - 1].receivedAt,
      unreadCount: sorted.filter((m) => !m.isRead && m.direction === 'received').length,
      status: 'informational' as const,
    };
  });
}
