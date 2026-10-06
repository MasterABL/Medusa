/**
 * MEDUSA — E-mail — Candidatos (o que este e-mail poderia virar)
 *
 * A regra que separa as coisas (testada):
 *   "reunião às 14h"              → EVENTO       (acontece num horário)
 *   "entrega até sexta"           → PRAZO + TAREFA (trabalho a fazer até uma data)
 *   "responda este e-mail"        → TAREFA / resposta
 *   "pagamento da fatura vence"   → FINANÇAS + PRAZO (pagar é sempre humano)
 *
 * Candidato é PROPOSTA. Nada aqui grava na Agenda, em Tasks ou no banco: quem decide é o
 * Guardian (services/actions.ts). E antes de propor, cada candidato procura o que JÁ existe
 * (evento na Agenda, tarefa derivada do mesmo e-mail) e, se achar, só se liga a ele —
 * o mesmo e-mail nunca vira duas tarefas, dois eventos e quatro lembretes.
 */

import type {
  ActionVerb, CalendarEventCandidate, CandidateAction, DeadlineCandidate, EmailCandidate, EmailClassification, EmailExtraction, EmailMessage, Evidence,
  FinanceCandidate, MeetingKind, ReminderIntentCandidate, ReplyCandidate, TaskCandidate,
} from '../model/types';
import type { CanonicalEvent } from '../../../foundation/events/canonical';
import type { Task, TaskPriority } from '../../tasks/model/types';
import type { RelationStore } from '../../../foundation/relations/graph';
import type { EventContextCategory } from '../../../foundation/reminders/types';
import type { ImportanceTier } from '../../../foundation/context/importance';
import { classifyEvent, normalize } from '../../../foundation/context/importance';
import { canonicalToAgendaItem } from '../../../foundation/events/canonical';
import { PATTERNS } from './classify';

export interface ExistingContext {
  /** Eventos já conhecidos (Agenda, Google Calendar...) como CanonicalEvent. */
  events?: CanonicalEvent[];
  tasks?: Task[];
  relations?: RelationStore;
}

export interface CandidateOptions {
  timezone?: string;
  /**
   * Estimativas configuráveis por verbo (ex.: responder: 10). Vazio por padrão: o Medusa não
   * presume esforço. Quando usada, o candidato carrega `estimateSource: 'heuristica'`.
   */
  estimateHeuristics?: Partial<Record<ActionVerb, number>>;
  /** Antecedência dos lembretes de compromisso vindo de e-mail, por importância. */
  reminderOffsets?: Partial<Record<ImportanceTier, number[]>>;
  /** Horário do aviso de um prazo só com data (padrão 09:00). */
  deadlineReminderTime?: string;
}

const DEFAULT_REMINDER_OFFSETS: Record<ImportanceTier, number[]> = { critical: [15, 5], high: [15], medium: [], low: [] };

const MEETING_LABEL: Record<MeetingKind, string> = { consulta: 'Consulta', prova: 'Prova', reuniao: 'Reunião', entrevista: 'Entrevista', aula: 'Aula', evento: 'Evento' };
const VERB_LABEL: Record<ActionVerb, string> = {
  enviar: 'Enviar', responder: 'Responder', confirmar: 'Confirmar', pagar: 'Pagar', assinar: 'Assinar', entregar: 'Entregar', revisar: 'Revisar', agendar: 'Agendar', comparecer: 'Comparecer', concluir: 'Concluir',
};
const TIER_TO_PRIORITY: Record<ImportanceTier, TaskPriority> = { critical: 'critical', high: 'high', medium: 'medium', low: 'low' };

const STOP = new Set(['para', 'com', 'sobre', 'sua', 'seu', 'deve', 'ser', 'confirmada', 'confirmado', 'nossa', 'nosso', 'esta', 'este', 'essa', 'esse', 'amanha', 'hoje']);
export function significantTokens(text: string): string[] {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOP.has(t));
}
/** Palavra em comum, inclusive uma dentro da outra ("consulta" ⊂ "teleconsulta"). */
const overlaps = (a: string, b: string) => {
  const tb = significantTokens(b);
  return significantTokens(a).some((t) => tb.some((u) => u === t || (t.length >= 5 && u.includes(t)) || (u.length >= 5 && t.includes(u))));
};
const minutesOf = (iso: string) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
const cleanSubject = (s: string) => s.replace(/^\s*((re|res|fw|fwd|enc)\s*:\s*)+/i, '').trim();

function eventCategory(kind: MeetingKind, text: string, online: boolean, tier: ImportanceTier): EventContextCategory {
  if (kind === 'consulta') return /telemedicina|teleconsulta|consulta online|videochamada/i.test(text) || online ? 'telemedicine' : 'medical_consultation';
  if (kind === 'prova') return 'exam';
  if (kind === 'entrevista') return 'critical_meeting';
  if (kind === 'reuniao') return tier === 'critical' || tier === 'high' ? 'critical_meeting' : 'strict_appointment';
  if (kind === 'aula') return 'study';
  return /culto|devocional/i.test(text) ? 'practice' : 'strict_appointment';
}

function eventTitle(msg: EmailMessage, x: EmailExtraction, kind: MeetingKind): string {
  const subject = cleanSubject(msg.subject);
  const label = MEETING_LABEL[kind];
  if (kind === 'reuniao' && /reuni/i.test(subject)) return subject.slice(0, 80);
  const person = x.people.find((p) => p.evidence.field !== 'sender')?.value.name;
  if (person) return `${label} com ${person}`;
  if (x.discipline) return `${label} de ${x.discipline.value.name}`;
  if (x.organization && x.organization.confidence >= 0.8) return `${label} — ${x.organization.value.name}`;
  return normalize(subject).includes(normalize(label)) ? subject.slice(0, 80) : `${label} — ${subject}`.slice(0, 80);
}

function taskTitle(msg: EmailMessage, x: EmailExtraction): string {
  const subject = cleanSubject(msg.subject);
  const a = x.actionRequest?.value;
  if (!a) return x.deadline ? `Prazo: ${subject}`.slice(0, 80) : subject.slice(0, 80);
  if (a.object) return `${VERB_LABEL[a.verb]} ${a.object}`.slice(0, 80);
  if (a.verb === 'responder') return `Responder ${msg.sender.name ?? msg.sender.address}`.slice(0, 80);
  return `${VERB_LABEL[a.verb]}: ${subject}`.slice(0, 80);
}

function findExistingEvent(c: { title: string; start: string; category: EventContextCategory }, events: CanonicalEvent[]): CanonicalEvent | undefined {
  return events.find((e) => {
    if (e.status === 'cancelled' || e.allDay || e.start.slice(0, 10) !== c.start.slice(0, 10)) return false;
    if (Math.abs(minutesOf(e.start) - minutesOf(c.start)) > 15) return false;
    const category = e.category ?? classifyEvent(canonicalToAgendaItem(e)).category;
    return overlaps(e.title, c.title) || category === c.category;
  });
}

function findExistingTask(title: string, dueAt: string | undefined, tasks: Task[]): Task | undefined {
  return tasks.find((t) => t.status !== 'cancelled' && overlaps(t.title, title) && (!dueAt || !t.dueAt || t.dueAt.slice(0, 10) === dueAt.slice(0, 10)));
}

const REPLY_REQUEST = new RegExp('(?<![\\p{L}\\d])(responda|responder|aguardo (?:sua |seu )?(?:resposta|retorno)|me retorne|pode(?:ria)? (?:me )?responder)(?![\\p{L}\\d])', 'iu');

function findReplyRequest(msg: EmailMessage): Evidence | undefined {
  for (const field of ['subject', 'snippet'] as const) {
    const text = field === 'subject' ? msg.subject : msg.snippet;
    const m = REPLY_REQUEST.exec(text);
    if (m) return { field, excerpt: text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).trim().slice(0, 80), start: m.index, end: m.index + m[0].length };
  }
  return undefined;
}

export interface CandidateResult {
  candidates: EmailCandidate[];
  actions: CandidateAction[];
  /** Por que algo NÃO virou candidato (ex.: horário sem data). Vai para a auditoria. */
  skipped: string[];
}

export function deriveCandidates(msg: EmailMessage, c: EmailClassification, x: EmailExtraction, existing: ExistingContext = {}, opts: CandidateOptions = {}): CandidateResult {
  const out: EmailCandidate[] = [];
  const actions: CandidateAction[] = [];
  const skipped: string[] = [];
  const tz = opts.timezone ?? 'America/Sao_Paulo';
  const offsets = { ...DEFAULT_REMINDER_OFFSETS, ...opts.reminderOffsets };
  const emailRef = { kind: 'email' as const, id: msg.id };
  const text = `${msg.subject}\n${msg.snippet}`;
  const base = { sourceEmailId: msg.id, threadId: msg.threadId, status: 'proposed' as const };
  const act = (kind: CandidateAction['kind'], guardianActionType: string, label: string, candidateId?: string) =>
    actions.push({ id: `${msg.id}:act:${kind}${candidateId ? `:${candidateId.split(':').pop()}` : ''}`, kind, messageId: msg.id, candidateId, guardianActionType, label });

  if (c.bulk) {
    act('arquivar', 'ARCHIVE_EMAIL', 'Arquivar');
    act('ignorar', 'NONE', 'Ignorar');
    return { candidates: [], actions, skipped: ['envio em massa: nenhum candidato'] };
  }

  // ---- compromisso ----
  let eventCand: CalendarEventCandidate | undefined;
  const m = x.meeting?.value;
  if (m && x.cancellation) {
    const ex = m.date && m.time ? findExistingEvent({ title: eventTitle(msg, x, m.kind), start: `${m.date}T${m.time}:00`, category: eventCategory(m.kind, text, false, c.importance) }, existing.events ?? []) : undefined;
    if (ex) act('cancelar_evento', 'CANCEL_EVENT_FROM_EMAIL', `Cancelar "${ex.title}" na Agenda`, ex.id);
    skipped.push(`compromisso ${x.cancellation.value.kind} no e-mail — não vira evento novo`);
  } else if (m && m.date && (m.time || m.kind === 'prova')) {
    const online = !!x.location?.value.online;
    const category = eventCategory(m.kind, text, online, c.importance);
    const tier: ImportanceTier = m.kind === 'consulta' || m.kind === 'prova' ? 'critical' : c.importance;
    const start = m.time ? `${m.date}T${m.time}:00` : m.date;
    const title = eventTitle(msg, x, m.kind);
    eventCand = {
      ...base,
      id: `${msg.id}:calendar_event`,
      kind: 'calendar_event',
      title,
      start,
      end: m.time && m.endTime ? `${m.date}T${m.endTime}:00` : undefined,
      allDay: !m.time || undefined,
      timezone: tz,
      participants: [msg.sender],
      location: x.location?.value.text,
      category,
      tier,
      rigid: ['consulta', 'prova', 'entrevista', 'reuniao', 'aula'].includes(m.kind),
      domain: c.domain,
      meetingKind: m.kind,
      confidence: x.meeting!.confidence,
      reasons: [`${MEETING_LABEL[m.kind].toLowerCase()} com ${m.time ? 'data e horário' : 'data'} no texto`],
      evidence: [x.meeting!.evidence, ...(x.location ? [x.location.evidence] : [])],
    };
    const linked = existing.relations?.findLinked(emailRef, 'event');
    const ex = m.time ? findExistingEvent({ title, start, category }, existing.events ?? []) : undefined;
    if (linked) eventCand = { ...eventCand, status: 'linked_existing', matchedExisting: linked, reasons: [...eventCand.reasons, 'este e-mail já gerou um evento'] };
    else if (ex) eventCand = { ...eventCand, status: 'linked_existing', matchedExisting: { kind: 'event', id: ex.id }, reasons: [...eventCand.reasons, `já está na Agenda como "${ex.title}"`] };
    out.push(eventCand);
    if (eventCand.status === 'proposed') act('criar_evento', 'SUGGEST_EVENT_FROM_EMAIL', `Adicionar "${title}" à Agenda`, eventCand.id);

    // lembrete só para compromisso novo — o que já está na Agenda já tem os lembretes dele
    if (eventCand.status === 'proposed' && m.time && offsets[tier].length > 0) {
      const r: ReminderIntentCandidate = { ...base, id: `${msg.id}:reminder`, kind: 'reminder', targetCandidateId: eventCand.id, offsetsMinutes: offsets[tier], confidence: eventCand.confidence, reasons: [`${tier}: avisar T-${offsets[tier].join('/T-')}`], evidence: eventCand.evidence };
      out.push(r);
    }
  } else if (m && m.time && !m.date) {
    skipped.push('horário sem data no texto — compromisso não agendado (não se presume o dia)');
  }

  // ---- prazo / finanças / tarefa ----
  const dl = x.deadline?.value;
  const dueAt = dl ? (dl.time ? `${dl.date}T${dl.time}:00` : dl.date) : undefined;
  const isEventDeadline = !!(dl && m && m.date === dl.date && !x.actionRequest);

  let financeCand: FinanceCandidate | undefined;
  if (c.category === 'finance' && c.importance !== 'low') {
    const financeKind: FinanceCandidate['financeKind'] = PATTERNS.financeCritical.test(text) ? 'negativacao' : /fatura/i.test(text) ? 'fatura' : /cobran/i.test(text) ? 'cobranca' : 'pagamento';
    financeCand = {
      ...base,
      id: `${msg.id}:finance`,
      kind: 'finance',
      title: `${financeKind === 'fatura' ? 'Fatura' : financeKind === 'negativacao' ? 'Risco de negativação' : financeKind === 'cobranca' ? 'Cobrança' : 'Pagamento'}${x.organization ? ` — ${x.organization.value.name}` : ''}`,
      financeKind,
      amount: x.amounts[0]?.value.amount,
      dueAt,
      paymentRequiresApproval: true,
      confidence: c.confidence,
      reasons: ['pagamento é sempre decisão humana — o Medusa só organiza prazo e lembrete'],
      evidence: [x.deadline?.evidence, x.amounts[0]?.evidence].filter(Boolean) as FinanceCandidate['evidence'],
    };
    out.push(financeCand);
  }

  let deadlineCand: DeadlineCandidate | undefined;
  if (dl && !isEventDeadline) {
    const title = financeCand ? `Vencimento: ${financeCand.title}` : taskTitle(msg, x);
    deadlineCand = {
      ...base,
      id: `${msg.id}:deadline`,
      kind: 'deadline',
      title,
      dueAt: dueAt!,
      domain: c.domain,
      tier: c.importance,
      projectId: x.project?.value.matchedProjectId,
      alreadyPast: dl.alreadyPast,
      confidence: x.deadline!.confidence,
      reasons: [dl.alreadyPast ? 'prazo já vencido' : `prazo no texto: "${dl.phrase}"`],
      evidence: [x.deadline!.evidence],
    };
    out.push(deadlineCand);
    act('adicionar_prazo', 'SUGGEST_DEADLINE_FROM_EMAIL', `Registrar prazo ${dl.date}`, deadlineCand.id);
    if (!dl.alreadyPast && (c.importance === 'critical' || c.importance === 'high')) {
      out.push({ ...base, id: `${msg.id}:reminder_deadline`, kind: 'reminder', targetCandidateId: deadlineCand.id, offsetsMinutes: dl.time ? [60, 0] : [0], confidence: deadlineCand.confidence, reasons: [dl.time ? 'avisar 1 h antes e na hora do prazo' : `avisar no dia do prazo às ${opts.deadlineReminderTime ?? '09:00'}`], evidence: deadlineCand.evidence });
    }
  }

  const verb = x.actionRequest?.value.verb;
  if ((x.actionRequest && verb !== 'pagar') || (dl && !isEventDeadline && !financeCand)) {
    const title = taskTitle(msg, x);
    const est = x.effort ? { estimatedMinutes: x.effort.value.minutes, estimateSource: 'texto' as const } : verb && opts.estimateHeuristics?.[verb] ? { estimatedMinutes: opts.estimateHeuristics[verb], estimateSource: 'heuristica' as const } : {};
    let task: TaskCandidate = {
      ...base,
      id: `${msg.id}:task`,
      kind: 'task',
      title,
      dueAt,
      ...est,
      domain: c.domain,
      priority: TIER_TO_PRIORITY[c.importance],
      projectId: x.project?.value.matchedProjectId,
      confidence: x.actionRequest?.confidence ?? x.deadline?.confidence ?? 0.6,
      reasons: [x.actionRequest ? `pedido no texto: ${x.actionRequest.value.verb}` : 'prazo sem pedido explícito — trabalho a fazer até a data'],
      evidence: [x.actionRequest?.evidence, x.deadline?.evidence, x.effort?.evidence].filter(Boolean) as TaskCandidate['evidence'],
    };
    const linked = existing.relations?.findLinked(emailRef, 'task', ['derived_from']);
    const ex = findExistingTask(title, dueAt, existing.tasks ?? []);
    if (linked) task = { ...task, status: 'linked_existing', matchedExisting: linked, reasons: [...task.reasons, 'este e-mail já gerou uma tarefa'] };
    else if (ex) task = { ...task, status: 'linked_existing', matchedExisting: { kind: 'task', id: ex.id }, reasons: [...task.reasons, `parece a tarefa existente "${ex.title}"`] };
    out.push(task);
    if (task.status === 'proposed') act('criar_tarefa', 'SUGGEST_TASK_FROM_EMAIL', `Criar tarefa "${title}"`, task.id);
    // o prazo é o mesmo trabalho: se a tarefa já existe, o prazo também já está coberto por ela
    if (task.status === 'linked_existing' && deadlineCand) {
      const linkedDeadline: DeadlineCandidate = { ...deadlineCand, status: 'linked_existing', matchedExisting: task.matchedExisting, reasons: [...deadlineCand.reasons, 'coberto pela tarefa já existente'] };
      const i = out.findIndex((x) => x.id === deadlineCand!.id);
      out[i] = linkedDeadline;
      for (let j = out.length - 1; j >= 0; j--) if (out[j].kind === 'reminder' && (out[j] as ReminderIntentCandidate).targetCandidateId === deadlineCand.id) out.splice(j, 1);
      for (let j = actions.length - 1; j >= 0; j--) if (actions[j].candidateId === deadlineCand.id) actions.splice(j, 1);
    }
  }

  // pedido de resposta pode vir junto de outro pedido ("me envie… responda quando puder")
  const replyHit = msg.direction === 'received' ? findReplyRequest(msg) : undefined;
  if (verb === 'responder' || replyHit) {
    const ev = replyHit ?? x.actionRequest!.evidence;
    const reply: ReplyCandidate = { ...base, id: `${msg.id}:reply`, kind: 'reply', to: msg.sender, dueAt, confidence: 0.75, reasons: ['o remetente espera resposta'], evidence: [ev] };
    out.push(reply);
    act('responder', 'SUGGEST_REPLY', `Responder ${msg.sender.name ?? msg.sender.address}`, reply.id);
  }

  if (x.documents.length > 0 && msg.attachments.length > 0) act('abrir_documento', 'OPEN_EMAIL_DOCUMENT', `Abrir ${msg.attachments[0].filename}`);
  if ((c.importance === 'critical' || c.importance === 'high') && !msg.isStarred) act('marcar_importante', 'MARK_EMAIL_IMPORTANT', 'Marcar como importante');
  if (out.length === 0 && actions.length === 0) act('arquivar', 'ARCHIVE_EMAIL', 'Arquivar');

  return { candidates: out, actions, skipped };
}
