/**
 * MEDUSA — E-mail — Ações pelo Guardian (sem segundo motor de decisão)
 *
 *   candidato → submitThroughGuardian (domínio `email`) → L1 executa | L2/L3 aguarda
 *             → aprovação (Lifecycle.resolveApproval) → applyCandidate → executeAuthorized
 *
 * Garantias:
 *   - Propor o mesmo candidato duas vezes devolve a MESMA ação (um pedido de aprovação só).
 *   - Aplicar é idempotente: se o e-mail já gerou tarefa/evento (RelationStore), nada novo
 *     é criado — o resultado é "sem efeito", não uma duplicata.
 *   - Responder, encaminhar, excluir, cancelar compromisso e agendar pagamento são L3:
 *     nunca executam sem aprovação humana, e o provedor só aceita a operação com o id da
 *     ação já aprovada (ver providers/types.ts).
 *   - Cada passo vira linha na trilha de auditoria (fonte, decisão, motivo, confiança,
 *     ação, resultado), além da trilha causal do próprio Guardian.
 */

import type { CanonicalEvent } from '../../../foundation/events/canonical';
import type { RelationStore, EntityRef } from '../../../foundation/relations/graph';
import type { TaskRepository } from '../../tasks/repository/types';
import type { Task } from '../../tasks/model/types';
import type { Repository } from '../../../foundation/persistence/snapshot';
import type { SubmittedAction } from '../../../foundation/actions/submit';
import { executeAuthorized, submitThroughGuardian } from '../../../foundation/actions/submit';
import { getAction } from '../../../foundation/actionBus';
import type { CalendarEventCandidate, DeadlineCandidate, EmailAnalysis, EmailAuditEntry, EmailCandidate, EmailMessage, TaskCandidate } from '../model/types';

export type SensitiveEmailAction = 'SEND_EMAIL_REPLY' | 'FORWARD_EMAIL' | 'DELETE_EMAIL' | 'CANCEL_EVENT_FROM_EMAIL' | 'SCHEDULE_PAYMENT_FROM_EMAIL';

export interface EmailActionCenterDeps {
  relations: RelationStore;
  tasks?: TaskRepository;
  /** Onde eventos aceitos de e-mail ficam como CanonicalEvent até a Agenda absorvê-los. */
  events?: Repository<CanonicalEvent>;
  /** Trilha de auditoria (acrescentada; pode ser ligada a um AppendLog persistente). */
  audit?: EmailAuditEntry[];
  /** true = tenta CREATE_TASK_FROM_EMAIL (L1 só com confiança conquistada); padrão: só sugere. */
  autoCreateTasks?: boolean;
}

export const emailRef = (messageId: string): EntityRef => ({ kind: 'email', id: messageId });
export const derivedTaskId = (messageId: string) => `email-task:${messageId}`;
export const derivedEventId = (messageId: string) => `email-event:${messageId}`;

function guardianTypeFor(c: EmailCandidate, autoCreate: boolean): string | undefined {
  switch (c.kind) {
    case 'task':
      return autoCreate ? 'CREATE_TASK_FROM_EMAIL' : 'SUGGEST_TASK_FROM_EMAIL';
    case 'calendar_event':
      return 'SUGGEST_EVENT_FROM_EMAIL';
    case 'deadline':
    case 'finance':
      return 'SUGGEST_DEADLINE_FROM_EMAIL';
    case 'reply':
      return 'SUGGEST_REPLY';
    default:
      return undefined; // lembrete: vai pelo Reminder Engine (agenda/CREATE_REMINDER)
  }
}

export function createEmailActionCenter(deps: EmailActionCenterDeps) {
  const proposals = new Map<string, SubmittedAction<{ candidateId: string; messageId: string }>>();
  const audit = deps.audit ?? [];
  const log = (e: EmailAuditEntry) => audit.push(e);

  /** L1 informativo: registra no Guardian que o e-mail foi classificado (auditável). */
  function recordClassification(msg: EmailMessage, a: EmailAnalysis, now: string) {
    const submitted = submitThroughGuardian({
      domain: 'email',
      type: 'CLASSIFY_EMAIL',
      intent: `Classificar e-mail "${msg.subject}" como ${a.classification.category}/${a.classification.importance}`,
      payload: { messageId: msg.id, category: a.classification.category, importance: a.classification.importance },
      riskLevel: 'baixo',
      reversible: true,
      correlationId: `email:${msg.id}`,
      signals: [{ kind: 'email', ref: `email#${msg.id}`, summary: a.classification.reasons.join('; ') }],
    });
    if (submitted.authorized) executeAuthorized(submitted.action.id, () => ({ ok: true, evidence: `classificado: ${a.classification.category}` }));
    log({ at: now, source: msg.source.provider, messageId: msg.id, step: 'guardian', decision: `CLASSIFY_EMAIL → ${submitted.evaluation.decision.level}`, reason: submitted.evaluation.decision.reason, confidence: a.classification.confidence, action: 'CLASSIFY_EMAIL', outcome: submitted.authorized ? 'executado' : 'aguardando_aprovacao', refs: { actionId: submitted.action.id } });
    return submitted;
  }

  function propose(a: EmailAnalysis, candidateId: string, now: string, source: EmailMessage['source']['provider'] = 'gmail') {
    const existing = proposals.get(candidateId);
    if (existing) return existing;
    const c = a.candidates.find((x) => x.id === candidateId);
    if (!c) throw new Error(`Candidato "${candidateId}" não existe nesta análise.`);
    if (c.status !== 'proposed') throw new Error(`Candidato "${candidateId}" não é uma proposta (${c.status}).`);
    const type = guardianTypeFor(c, !!deps.autoCreateTasks);
    if (!type) throw new Error(`Candidato "${c.kind}" não é proposto ao Guardian por aqui (lembretes vão pelo Reminder Engine).`);
    const submitted = submitThroughGuardian({
      domain: 'email',
      type,
      intent: `${type} a partir do e-mail ${a.messageId}: ${'title' in c ? c.title : c.kind}`,
      payload: { candidateId, messageId: a.messageId },
      riskLevel: 'baixo',
      reversible: true,
      undoDescription: 'Remover o item criado a partir do e-mail.',
      correlationId: `email:${a.messageId}`,
      signals: c.evidence.slice(0, 3).map((e) => ({ kind: 'email', ref: `email#${a.messageId}:${e.field}`, summary: e.excerpt })),
    });
    proposals.set(candidateId, submitted);
    log({ at: now, source, messageId: a.messageId, step: 'guardian', decision: `${type} → ${submitted.evaluation.decision.level}`, reason: submitted.evaluation.decision.reason, confidence: c.confidence, action: type, outcome: submitted.authorized ? 'executado' : 'aguardando_aprovacao', refs: { candidateId, actionId: submitted.action.id } });
    return submitted;
  }

  function createTask(a: EmailAnalysis, c: TaskCandidate | DeadlineCandidate, now: string): Task {
    const t: Task = {
      id: derivedTaskId(a.messageId),
      title: c.title,
      description: `Derivada do e-mail ${a.messageId}.`,
      priority: c.kind === 'task' ? c.priority : c.tier,
      status: 'todo',
      dueAt: c.dueAt,
      estimatedMinutes: c.kind === 'task' ? c.estimatedMinutes : undefined,
      domain: c.domain,
      projectId: c.projectId,
      dependsOn: [],
      createdAt: now,
      updatedAt: now,
    };
    deps.tasks!.save(t);
    return t;
  }

  /** Aplica um candidato cuja ação já foi AUTORIZADA (L1 ou aprovada). Idempotente. */
  function apply(a: EmailAnalysis, candidateId: string, now: string, source: EmailMessage['source']['provider'] = 'gmail') {
    const submitted = proposals.get(candidateId);
    if (!submitted) throw new Error(`Candidato "${candidateId}" ainda não foi proposto ao Guardian.`);
    const current = getAction(submitted.action.id);
    const c = a.candidates.find((x) => x.id === candidateId)!;
    const email = emailRef(a.messageId);
    const why = { by: 'guardian' as const, reason: `aceito via ação ${submitted.action.id}`, confidence: c.confidence };
    let created: EntityRef | undefined;
    const exec = executeAuthorized(submitted.action.id, () => {
      if (c.kind === 'task' || c.kind === 'deadline' || c.kind === 'finance') {
        if (!deps.tasks) return { ok: false, error: 'repositório de tarefas não fornecido' };
        const already = deps.relations.findLinked(email, 'task', ['derived_from']);
        if (already) {
          created = already;
          return { ok: true, noEffect: true, evidence: `este e-mail já tinha gerado ${already.id}` };
        }
        const dl: DeadlineCandidate | TaskCandidate | undefined =
          c.kind === 'finance' ? (a.candidates.find((x) => x.kind === 'deadline') as DeadlineCandidate | undefined) : (c as TaskCandidate | DeadlineCandidate);
        if (!dl) return { ok: false, error: 'pagamento sem prazo no texto — nada para registrar' };
        const task = createTask(a, dl, now);
        created = { kind: 'task', id: task.id };
        deps.relations.link(created, 'derived_from', email, why, now);
        if (task.projectId) deps.relations.link(created, 'belongs_to', { kind: 'project', id: task.projectId }, why, now);
        if (dl.kind === 'deadline' || task.dueAt) deps.relations.link(created, 'scheduled_as', { kind: 'deadline', id: `${a.messageId}:deadline` }, why, now);
        return { ok: true, evidence: `tarefa ${task.id} criada` };
      }
      if (c.kind === 'calendar_event') {
        if (!deps.events) return { ok: false, error: 'repositório de eventos não fornecido' };
        const already = deps.relations.findLinked(email, 'event');
        if (already) {
          created = already;
          return { ok: true, noEffect: true, evidence: `este e-mail já tinha gerado ${already.id}` };
        }
        const ev = eventFromCandidate(c, now);
        deps.events.save(ev);
        created = { kind: 'event', id: ev.id };
        deps.relations.link(created, 'derived_from', email, why, now);
        return { ok: true, evidence: `evento ${ev.id} criado (${ev.start})` };
      }
      if (c.kind === 'reply') return { ok: true, noEffect: true, evidence: 'lembrete de resposta registrado — nada foi enviado' };
      return { ok: false, error: `candidato ${c.kind} não se aplica por aqui` };
    });
    log({ at: now, source, messageId: a.messageId, step: 'resultado', decision: exec.report.ok ? (exec.report.noEffect ? 'sem efeito' : 'aplicado') : 'falhou', reason: exec.report.evidence ?? exec.report.error ?? '', action: current?.type, outcome: exec.report.ok ? (exec.report.noEffect ? 'ligado_a_existente' : 'aceito') : 'bloqueado', refs: { candidateId, actionId: submitted.action.id, entity: created } });
    return { ...exec, created };
  }

  /** L3: pede aprovação. Nunca executa aqui — quem executa é o provedor, com o id aprovado. */
  function requestSensitive(type: SensitiveEmailAction, messageId: string, payload: Record<string, unknown>, now: string, source: EmailMessage['source']['provider'] = 'gmail') {
    const submitted = submitThroughGuardian({
      domain: 'email',
      type,
      intent: `${type} (e-mail ${messageId})`,
      payload: { messageId, ...payload },
      riskLevel: 'alto',
      reversible: false,
      correlationId: `email:${messageId}`,
    });
    log({ at: now, source, messageId, step: 'guardian', decision: `${type} → ${submitted.evaluation.decision.level}`, reason: submitted.evaluation.decision.reason, action: type, outcome: submitted.authorized ? 'executado' : 'aguardando_aprovacao', refs: { actionId: submitted.action.id } });
    return submitted;
  }

  return { recordClassification, propose, apply, requestSensitive, audit: () => audit, proposalFor: (candidateId: string) => proposals.get(candidateId) };
}

export type EmailActionCenter = ReturnType<typeof createEmailActionCenter>;

export function eventFromCandidate(c: CalendarEventCandidate, now: string, status: CanonicalEvent['status'] = 'confirmed'): CanonicalEvent {
  return {
    id: derivedEventId(c.sourceEmailId),
    source: { kind: 'gmail', externalId: c.sourceEmailId, label: 'e-mail', observedAt: now },
    title: c.title,
    start: c.start,
    end: c.end,
    allDay: c.allDay,
    timezone: c.timezone,
    importance: c.tier,
    category: c.category,
    rigidity: c.rigid ? 'rigid' : 'flexible',
    domain: c.domain,
    location: c.location,
    participants: c.participants.map((p) => ({ name: p.name, email: p.address, role: 'organizer' as const })),
    status,
    dedupKey: `email:${c.sourceEmailId}`,
  };
}
