/**
 * MEDUSA FOUNDATION — Runtime do Personal OS (o que as telas consomem)
 *
 * Até aqui a fundação era um conjunto de motores testados sem consumidor:
 * tarefas, projetos, prioridade, recomendação, planner, lembretes v2,
 * Guardian, e-mail, relações, persistência. Este módulo é o ÚNICO lugar que
 * os monta juntos, na ordem certa, para a camada visual:
 *
 *   Agenda (itens reais) ─┐
 *   Tarefas / Projetos ───┼─→ Context Aggregator → Hoje (Agora · Próximo · Atenção · Recomendação)
 *   Lembretes v2 ─────────┤        Priority Engine → Recommendation Engine → Planner
 *   E-mail (local) ───────┘        tudo que AGE passa pelo Guardian → executor → resultado → audit
 *
 * Não é um segundo motor: nenhuma regra de negócio mora aqui, só composição
 * e persistência. Sem React — testável em Node e usado pelo PersonalOSProvider.
 *
 * Persistência (StorageAdapter): tarefas, projetos, relações, lembretes,
 * estado do Guardian, estado do dia, rotina e e-mails locais. Supabase segue
 * BLOQUEADO (ver persistence/stores.ts) — o adapter real é localStorage.
 */

import { bootstrapDomains } from '../domains';
import type { StorageAdapter } from '../persistence/storage';
import { createSnapshotPersistence } from '../persistence/snapshot';
import type { PersistenceAdapter } from '../persistence/snapshot';
import { createProjectPersistence, createReminderPersistence, createTaskPersistence, PERSISTENCE_KEYS } from '../persistence/stores';
import type { ReminderSnapshot } from '../persistence/stores';
import { createRelationStore } from '../relations/graph';
import type { EntityRef, Relation } from '../relations/graph';
import { createReminderEngine } from '../reminders/engine';
import type { AckAction, ReminderRecord, SyncReport, TickReport } from '../reminders/engine';
import { createChannelRegistry, createDynamicIslandChannel, createEmailChannel, createNativeMobileChannel, createWebNotificationChannel } from '../reminders/channels';
import type { NotificationPayload, WebNotificationEnv, ChannelCapability } from '../reminders/channels';
import { eventContextsFor, freeWindowsFor } from '../context/sources';
import { selectToday } from '../context/today';
import type { TodayContext } from '../context/aggregator';
import { rankCandidates } from '../priority/engine';
import type { PriorityCandidate, PriorityResult } from '../priority/engine';
import { fromProjectTasks, fromTask } from '../priority/candidates';
import { proposeRecommendation } from '../recommendations/engine';
import type { Recommendation } from '../recommendations/engine';
import { proposeSchedule, suggestSchedule } from '../planner/planner';
import type { ProtectedWindow, SuggestedSchedule } from '../planner/planner';
import { buildUniversalActionCenter } from '../actions/universal';
import type { UniversalActionCenter } from '../actions/universal';
import { submitThroughGuardian } from '../actions/submit';
import { approveAction, executionStateOf, registerExecutor, rejectAction, runIfAuthorized, EXECUTION_STATE_LABEL } from '../actions/executors';
import type { DecisionResult, ExecutionState } from '../actions/executors';
import { getAction } from '../actionBus';
import { GuardianAuditLog } from '../guardian';
import { expireOverdueApprovals, resolveApproval } from '../guardianLifecycle';
import { GuardianApproval } from '../guardian';
import { exportGuardianState, importGuardianState, isGuardianSnapshot } from '../guardianSnapshot';
import type { GuardianSnapshot } from '../guardianSnapshot';
import type { CanonicalEvent } from '../events/canonical';
import { canonicalToAgendaItem, canonicalToEventContexts, reminderPolicyResolver } from '../events/canonical';
import type { DataState } from '../types/dataState';
import * as DS from '../dataState';
import type { ActionAuditLogEntry } from '../types/guardian';
import type { LifeDomain } from '../types/lifeDomain';

import type { AgendaItem } from '../../types/agenda';
import { createInMemoryAgendaSource } from '../../domains/agenda/repository/source';
import type { AgendaSource } from '../../domains/agenda/repository/source';
import { dayInputFrom } from '../../domains/agenda/selectors';
import type { BufferRule, RoutineBlock, TravelLeg } from '../../domains/agenda/model/temporal';
import type { Task, TaskPriority, TaskStatus } from '../../domains/tasks/model/types';
import { createInMemoryTaskRepository } from '../../domains/tasks/repository/types';
import { actionabilityOf, findCycles, unlockedBy } from '../../domains/tasks/services/dependencies';
import { transition, validateTask } from '../../domains/tasks/services/lifecycle';
import type { Project, ProjectKind, ProjectStatus } from '../../domains/projects/model/types';
import { createInMemoryProjectRepository } from '../../domains/projects/repository/types';
import { assessDeadline, nextActionableTasks, projectProgress, validateProject } from '../../domains/projects/services/progress';
import type { EmailAnalysis, EmailMessage } from '../../domains/email/model/types';
import { analyzeEmail, analyzeThread, groupIntoThreads } from '../../domains/email/services/pipeline';
import type { ThreadAnalysis } from '../../domains/email/services/pipeline';
import { createEmailActionCenter } from '../../domains/email/services/actions';
import { emailContextSource, reminderEventsFromEmail } from '../../domains/email/services/bridges';
import { gmailProviderState } from '../../domains/email/providers/types';
import { googleCalendarProviderState, outlookCalendarProviderState } from '../../domains/calendar/providers';
import { selectEmailInbox } from '../../domains/email/selectors';
import type { EmailFilterId, EmailInbox } from '../../domains/email/selectors';
import type { ProviderState } from '../providers/state';
import type { LoadEntry, LoadProgression, WorkoutSession, WorkoutSheet } from '../../domains/body/model/training';
import { createInMemoryBodyTrainingRepository } from '../../domains/body/repository/trainingInMemory';
import { endWorkout, logSet as logWorkoutSet, startWorkout } from '../../domains/body/services/sessionEngine';
import { historyFor, progressionFor } from '../../domains/body/services/progressionEngine';
import type { GratitudeEntry, MemoryReviewLog, PresenceSummary, RecallGrade, ScriptureMemoryCard } from '../../domains/spiritual/model/memory';
import type { SpiritualPractice, SpiritualPracticeType } from '../../domains/spiritual/model/types';
import type { BibleReference } from '../../domains/spiritual/model/bible';
import { dueCards, newMemoryCard, reviewMemoryCard } from '../../domains/spiritual/services/memorySrs';
import { presenceDatesFrom, summarizePresence } from '../../domains/spiritual/services/presence';

// ───────────────────────────── tipos públicos ─────────────────────────────

/** Quem grava na Agenda (a camada temporal oficial). O runtime nunca guarda itens de agenda. */
export interface AgendaWriter {
  add(item: AgendaItem): void;
  has(id: string): boolean;
}

export interface TodayHistoryEntry {
  id: string;
  itemId: string;
  title: string;
  category?: string;
  /** HH:mm de início planejado. */
  plannedStart?: string;
  completedAt: string;
  durationMinutes: number;
  status: 'completed' | 'skipped';
}

/** Estado do dia que o usuário produz na tela Hoje (antes vivia num useState e sumia no reload). */
export interface TodayState {
  version: 1;
  date: string;
  completedIds: string[];
  extendedMinutes: Record<string, number>;
  checkins: string[];
  dismissed: string[];
  history: TodayHistoryEntry[];
}

/** Rotina declarada pelo usuário (trabalho, deslocamento, sono, horários protegidos). Vazia por padrão. */
export interface RoutineConfig {
  version: 1;
  routine: RoutineBlock[];
  travel: TravelLeg[];
  buffers: BufferRule[];
  protectedWindows: ProtectedWindow[];
}

export interface NewTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueAt?: string;
  estimatedMinutes?: number;
  domain?: LifeDomain;
  projectId?: string;
  milestoneId?: string;
  dependsOn?: string[];
  relatedEventId?: string;
}

export interface NewProjectInput {
  title: string;
  objective: string;
  kind?: ProjectKind;
  relatedDomains?: LifeDomain[];
  /** Entrega final (ISO data ou data-hora). */
  deadline?: { label: string; dueAt: string; hard?: boolean };
  milestones?: Array<{ title: string; dueAt?: string }>;
}

export interface TaskView {
  task: Task;
  projectTitle?: string;
  actionable: boolean;
  blockedBy?: string;
  overdue: boolean;
  priority?: PriorityResult;
}

export interface DisputeChargeInput {
  anomalyId: string;
  description: string;
  amount: number;
  merchant?: string;
  /** De onde veio a anomalia. `fixture` = dado de exemplo — a ação diz isso no próprio texto. */
  origin: 'fixture' | 'manual' | 'real';
}

export interface ActionView {
  id: string;
  domain: string;
  type: string;
  intent: string;
  autonomy?: string;
  reason?: string;
  state: ExecutionState;
  stateLabel: string;
  createdAt: string;
  approvalExpiresAt?: string;
  outcome?: { result: string; evidence?: string };
  restored: boolean;
}

export interface PersonalOSOptions {
  storage: StorageAdapter;
  /** Ambiente da Web Notification API (injetável para teste). */
  webNotificationEnv?: () => WebNotificationEnv;
  /** Relógio injetável (testes). */
  clock?: () => Date;
  /** Atraso do flush automático em ms. 0 = só flush manual (testes). */
  autoFlushMs?: number;
}

// ───────────────────────────── utilitários ─────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');
export function localIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
export const dateOfIso = (iso: string) => iso.slice(0, 10);
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localIso(d).slice(0, 10);
}
let seq = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq += 1).toString(36)}`;

const emptyToday = (date: string): TodayState => ({ version: 1, date, completedIds: [], extendedMinutes: {}, checkins: [], dismissed: [], history: [] });
const emptyRoutine = (): RoutineConfig => ({ version: 1, routine: [], travel: [], buffers: [], protectedWindows: [] });

export const RUNTIME_KEYS = {
  ...PERSISTENCE_KEYS,
  relations: 'personal-os/relations',
  guardian: 'personal-os/guardian',
  today: 'personal-os/today',
  routine: 'personal-os/routine',
  emailMessages: 'personal-os/email-messages',
  emailEvents: 'personal-os/email-events',
  disputes: 'personal-os/finance-disputes',
  bodyTraining: 'personal-os/body-training',
  spiritual: 'personal-os/spiritual',
} as const;

export interface BodyTrainingSnapshot {
  version: 1;
  sheets: WorkoutSheet[];
  loads: LoadEntry[];
  sessions: WorkoutSession[];
}

export interface SpiritualSnapshot {
  version: 1;
  gratitude: GratitudeEntry[];
  practices: SpiritualPractice[];
  memoryCards: ScriptureMemoryCard[];
  memoryReviews: MemoryReviewLog[];
}

// ───────────────────────────── runtime ─────────────────────────────

export function createPersonalOS(opts: PersonalOSOptions) {
  bootstrapDomains();
  const clock = opts.clock ?? (() => new Date());
  const nowIso = () => localIso(clock());
  const today = () => dateOfIso(nowIso());

  // ---- repositórios ----
  const tasks = createInMemoryTaskRepository('manual');
  const projects = createInMemoryProjectRepository('manual');
  const relations = createRelationStore();
  const emailMessages = new Map<string, EmailMessage>();
  const emailEvents = new Map<string, CanonicalEvent>();
  const disputes = new Map<string, string>(); // anomalyId → actionId
  let todayState: TodayState = emptyToday(today());
  let routine: RoutineConfig = emptyRoutine();
  let agendaItems: AgendaItem[] = [];
  let agendaWriter: AgendaWriter | undefined;
  let islandSink: (p: NotificationPayload) => void = () => undefined;
  const training = createInMemoryBodyTrainingRepository('manual');
  let spiritual: SpiritualSnapshot = { version: 1, gratitude: [], practices: [], memoryCards: [], memoryReviews: [] };

  // ---- persistência ----
  const pTasks = createTaskPersistence(opts.storage);
  const pProjects = createProjectPersistence(opts.storage);
  const pReminders = createReminderPersistence(opts.storage);
  const pRelations = createSnapshotPersistence<{ version: 1; relations: Relation[] }>({ storage: opts.storage, key: RUNTIME_KEYS.relations, version: 1 });
  const pGuardian = createSnapshotPersistence<GuardianSnapshot>({ storage: opts.storage, key: RUNTIME_KEYS.guardian, version: 1, validate: isGuardianSnapshot });
  const pToday = createSnapshotPersistence<TodayState>({ storage: opts.storage, key: RUNTIME_KEYS.today, version: 1 });
  const pRoutine = createSnapshotPersistence<RoutineConfig>({ storage: opts.storage, key: RUNTIME_KEYS.routine, version: 1 });
  const pEmail = createSnapshotPersistence<EmailMessage[]>({ storage: opts.storage, key: RUNTIME_KEYS.emailMessages, version: 1 });
  const pEmailEvents = createSnapshotPersistence<CanonicalEvent[]>({ storage: opts.storage, key: RUNTIME_KEYS.emailEvents, version: 1 });
  const pDisputes = createSnapshotPersistence<Array<[string, string]>>({ storage: opts.storage, key: RUNTIME_KEYS.disputes, version: 1 });
  const pTraining = createSnapshotPersistence<BodyTrainingSnapshot>({ storage: opts.storage, key: RUNTIME_KEYS.bodyTraining, version: 1 });
  const pSpiritual = createSnapshotPersistence<SpiritualSnapshot>({ storage: opts.storage, key: RUNTIME_KEYS.spiritual, version: 1 });

  // ---- lembretes v2 (um motor só para o app inteiro) ----
  const channels = createChannelRegistry([
    createDynamicIslandChannel((p) => islandSink(p)),
    createWebNotificationChannel(opts.webNotificationEnv),
    createNativeMobileChannel(),
    createEmailChannel(),
  ]);
  const reminders = createReminderEngine({
    channels,
    // política declarada no próprio evento (ex.: e-mail da clínica pede T-15/T-5); sem isso vale a do tier
    // (eventos aceitos guardam a política declarada: aceitar na Agenda não troca o que o e-mail pediu)
    policyFor: (ctx) => reminderPolicyResolver(Array.from(emailEvents.values()).concat(pendingEmailEvents()))(ctx),
  });

  // ---- e-mail: provedor LOCAL (Gmail/Outlook bloqueados) ----
  const emailEventRepo = {
    origin: 'manual' as const,
    get: (id: string) => emailEvents.get(id),
    list: () => Array.from(emailEvents.values()),
    save: (incoming: CanonicalEvent) => {
      // herda a política de lembrete que o e-mail declarou (o evento aceito não a carrega sozinho)
      const declared = incoming.reminderPolicy ? undefined : pendingEmailEvents().find((e) => e.id === incoming.id)?.reminderPolicy;
      const ev = declared ? { ...incoming, reminderPolicy: declared } : incoming;
      emailEvents.set(ev.id, ev);
      // o compromisso aceito vai para a Agenda — a camada temporal oficial
      if (agendaWriter && !agendaWriter.has(ev.id)) agendaWriter.add(canonicalToAgendaItem(ev, { now: nowIso() }));
    },
    remove: (id: string) => void emailEvents.delete(id),
  };
  const emailCenter = createEmailActionCenter({ relations, tasks, events: emailEventRepo });
  const emailAnalyses = new Map<string, EmailAnalysis>();
  const emailProposalByAction = new Map<string, { messageId: string; candidateId: string }>();

  // ---- executores conectados (efeito real dentro do Medusa) ----
  registerExecutor({
    domain: 'agenda',
    actionType: 'SUGGEST_FOCUS_BLOCK',
    provider: 'Agenda interna (localStorage)',
    run(action) {
      if (!agendaWriter) return { ok: false, error: 'Agenda não conectada a este runtime.' };
      const p = action.payload as { recommendationId: string; title?: string; window: { startIso: string }; durationMinutes: number; domain?: string };
      const id = `focus:${p.recommendationId}`;
      if (agendaWriter.has(id)) return { ok: true, noEffect: true, evidence: 'o bloco já estava na Agenda' };
      agendaWriter.add(blockItem(id, p.title ?? action.intent, p.window.startIso, p.durationMinutes, p.domain));
      return { ok: true, evidence: `bloco ${id} gravado na Agenda` };
    },
  });
  registerExecutor({
    domain: 'agenda',
    actionType: 'APPLY_SUGGESTED_SCHEDULE',
    provider: 'Agenda interna (localStorage)',
    run(action) {
      if (!agendaWriter) return { ok: false, error: 'Agenda não conectada a este runtime.' };
      const blocks = (action.payload as { blocks: SuggestedSchedule['blocks'] }).blocks;
      let added = 0;
      for (const b of blocks) {
        const id = `plan:${b.taskId}:${b.date}:${b.startMin}`;
        if (agendaWriter.has(id)) continue;
        const task = tasks.get(b.taskId);
        agendaWriter.add(blockItem(id, b.title, `${b.date}T${pad(Math.floor(b.startMin / 60))}:${pad(b.startMin % 60)}:00`, b.endMin - b.startMin, task?.domain));
        relations.link({ kind: 'task', id: b.taskId }, 'scheduled_as', { kind: 'event', id }, { by: 'guardian', reason: `plano aprovado (${action.id})` }, nowIso());
        added += 1;
      }
      return added > 0 ? { ok: true, evidence: `${added} bloco(s) gravado(s) na Agenda` } : { ok: true, noEffect: true, evidence: 'todos os blocos já estavam na Agenda' };
    },
  });

  function blockItem(id: string, title: string, startIso: string, minutes: number, domain?: string): AgendaItem {
    const date = startIso.slice(0, 10);
    const startMin = Number(startIso.slice(11, 13)) * 60 + Number(startIso.slice(14, 16));
    const endMin = Math.min(startMin + minutes, 23 * 60 + 59);
    const agendaDomain = (['education', 'body', 'finance', 'work'] as const).includes(domain as never) ? (domain as AgendaItem['domain']) : 'personal';
    const now = nowIso();
    return {
      id,
      title,
      kind: 'time_block' as AgendaItem['kind'],
      domain: agendaDomain,
      categoryId: `cat-${agendaDomain}`,
      colorId: agendaDomain,
      date,
      startTime: `${pad(Math.floor(startMin / 60))}:${pad(startMin % 60)}`,
      endTime: `${pad(Math.floor(endMin / 60))}:${pad(endMin % 60)}`,
      durationMinutes: endMin - startMin,
      isFlexible: true,
      source: { sourceType: 'external', sourceId: id, sourceLabel: 'Medusa · Personal OS' },
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
    };
  }

  // ---- mudança + flush ----
  const listeners = new Set<() => void>();
  let version = 0;
  let flushTimer: ReturnType<typeof setTimeout> | undefined;
  let lastFlushError: string | undefined;
  function changed() {
    version += 1;
    for (const l of Array.from(listeners)) l();
    const delay = opts.autoFlushMs ?? 250;
    if (delay > 0) {
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(() => void flush(), delay);
    }
  }

  async function flush(): Promise<{ ok: boolean; error?: string }> {
    const at = nowIso();
    const results = await Promise.all([
      pTasks.save(tasks.list(), at),
      pProjects.save(projects.list(), at),
      pReminders.save(reminders.exportState() as ReminderSnapshot, at),
      pRelations.save(relations.exportState(), at),
      pGuardian.save(exportGuardianState(), at),
      pToday.save(todayState, at),
      pRoutine.save(routine, at),
      pEmail.save(Array.from(emailMessages.values()), at),
      pEmailEvents.save(Array.from(emailEvents.values()), at),
      pDisputes.save(Array.from(disputes.entries()), at),
      pTraining.save({ version: 1, sheets: training.listSheets(), loads: training.listLoads(), sessions: training.listSessions() }, at),
      pSpiritual.save(spiritual, at),
    ]);
    const failed = results.find((r) => !r.ok) as { ok: false; error: string } | undefined;
    lastFlushError = failed?.error;
    return failed ? { ok: false, error: failed.error } : { ok: true };
  }

  async function load<T>(p: PersistenceAdapter<T>): Promise<T | undefined> {
    const s = await p.load();
    return s.status === 'ready' ? s.data : undefined;
  }

  /** Carrega tudo do armazenamento. Chamar uma vez, antes de usar. */
  async function hydrate(): Promise<{ ok: boolean; guardian?: ReturnType<typeof importGuardianState>; error?: string }> {
    try {
      for (const t of (await load(pTasks)) ?? []) tasks.save(t);
      for (const p of (await load(pProjects)) ?? []) projects.save(p);
      const rem = await load(pReminders);
      if (rem) reminders.importState(rem);
      const rel = await load(pRelations);
      if (rel) relations.importState(rel);
      const g = await load(pGuardian);
      const report = g ? importGuardianState(g, nowIso()) : undefined;
      const t = await load(pToday);
      todayState = t && t.date === today() ? t : emptyToday(today());
      routine = (await load(pRoutine)) ?? emptyRoutine();
      for (const m of (await load(pEmail)) ?? []) emailMessages.set(m.id, m);
      for (const e of (await load(pEmailEvents)) ?? []) emailEvents.set(e.id, e);
      for (const [k, v] of (await load(pDisputes)) ?? []) disputes.set(k, v);
      const tr = await load(pTraining);
      if (tr) {
        for (const sh of tr.sheets) training.saveSheet(sh);
        for (const l of tr.loads) training.saveLoad(l);
        for (const se of tr.sessions) training.saveSession(se);
      }
      spiritual = (await load(pSpiritual)) ?? spiritual;
      reanalyzeEmails(false);
      changed();
      return { ok: true, guardian: report };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // ───── Agenda ─────
  function agendaSource(): AgendaSource {
    return createInMemoryAgendaSource('manual', { items: agendaItems, routine: routine.routine, travel: routine.travel, buffers: routine.buffers });
  }

  /** Itens reais da Agenda (já com recorrência expandida pela camada visual). */
  function setAgenda(items: AgendaItem[], writer?: AgendaWriter) {
    agendaItems = items;
    if (writer) agendaWriter = writer;
    syncReminders();
  }

  // ───── Lembretes ─────
  function pendingEmailEvents(): CanonicalEvent[] {
    // compromissos detectados em e-mail AINDA não aceitos: já ganham lembrete provisório (mesmo id do aceito)
    return reminderEventsFromEmail(Array.from(emailAnalyses.values()), nowIso()).filter((e) => !emailEvents.has(e.id));
  }

  function syncReminders(): SyncReport {
    const now = nowIso();
    const dates = [today(), addDays(today(), 1)];
    const agenda = agendaSource();
    const pending = pendingEmailEvents();
    const contexts = dates.flatMap((d) => [
      ...eventContextsFor(agenda, d),
      ...canonicalToEventContexts({ date: d, events: pending.filter((e) => !agendaItems.some((i) => i.id === e.id)) }),
    ]);
    const report = reminders.syncEvents(contexts, now, { coveredDates: dates });
    if (report.planned.length || report.cancelled.length || report.superseded.length) changed();
    return report;
  }

  function tick(): TickReport {
    const now = nowIso();
    if (dateOfIso(now) !== todayState.date) todayState = emptyToday(dateOfIso(now)); // virou o dia
    expireOverdueApprovals(clock());
    const report = reminders.tick(now);
    if (report.delivered.length || report.expired.length || report.superseded.length) changed();
    return report;
  }

  function acknowledgeReminder(reminderId: string, action: AckAction, snoozeMinutes?: number): ReminderRecord {
    const r = reminders.acknowledge(reminderId, action, nowIso(), snoozeMinutes);
    changed();
    return r;
  }

  // ───── Tarefas ─────
  function createTask(input: NewTaskInput): Task {
    const now = nowIso();
    const task: Task = {
      id: newId('task'),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      priority: input.priority ?? 'medium',
      status: 'todo',
      dueAt: input.dueAt || undefined,
      estimatedMinutes: input.estimatedMinutes && input.estimatedMinutes > 0 ? input.estimatedMinutes : undefined,
      domain: input.domain ?? 'personal',
      projectId: input.projectId || undefined,
      milestoneId: input.milestoneId || undefined,
      relatedEventId: input.relatedEventId,
      dependsOn: input.dependsOn ?? [],
      createdAt: now,
      updatedAt: now,
    };
    const errors = validateTask(task);
    if (input.projectId && !projects.get(input.projectId)) errors.push('Projeto inexistente.');
    for (const d of task.dependsOn) if (!tasks.get(d)) errors.push(`Dependência inexistente: ${d}.`);
    if (errors.length) throw new Error(errors.join(' '));
    tasks.save(task);
    if (task.projectId) relations.link({ kind: 'task', id: task.id }, 'belongs_to', { kind: 'project', id: task.projectId }, { by: 'user', reason: 'criada no projeto' }, now);
    for (const d of task.dependsOn) relations.link({ kind: 'task', id: task.id }, 'depends_on', { kind: 'task', id: d }, { by: 'user', reason: 'dependência declarada' }, now);
    if (task.relatedEventId) relations.link({ kind: 'task', id: task.id }, 'scheduled_as', { kind: 'event', id: task.relatedEventId }, { by: 'user', reason: 'ligada ao compromisso' }, now);
    changed();
    return task;
  }

  /** Mudar estado pelo ciclo de vida oficial (bloquear exige motivo; concluir respeita dependências). */
  function setTaskStatus(id: string, to: TaskStatus, o: { reason?: string; actualMinutes?: number } = {}): { task: Task; unlocked: string[] } {
    const task = tasks.get(id);
    if (!task) throw new Error(`Tarefa "${id}" não encontrada.`);
    const next = transition(task, to, tasks.list(), nowIso(), o);
    // calculado ANTES de gravar: "quem fica executável quando esta for concluída"
    const unlocked = to === 'done' ? unlockedBy(id, tasks.list()) : [];
    tasks.save(next);
    changed();
    return { task: next, unlocked };
  }

  function updateTask(id: string, patch: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'dueAt' | 'estimatedMinutes' | 'dependsOn' | 'projectId' | 'milestoneId' | 'domain'>>): Task {
    const task = tasks.get(id);
    if (!task) throw new Error(`Tarefa "${id}" não encontrada.`);
    const next: Task = { ...task, ...patch, updatedAt: nowIso() };
    const errors = validateTask(next);
    const all = tasks.list().map((t) => (t.id === id ? next : t));
    if (findCycles(all).some((c) => c.includes(id))) errors.push('Essa dependência cria um ciclo.');
    if (errors.length) throw new Error(errors.join(' '));
    tasks.save(next);
    changed();
    return next;
  }

  function rankedPriorities(): PriorityResult[] {
    const now = nowIso();
    const all = tasks.list();
    const cands: PriorityCandidate[] = [];
    const inProject = new Set<string>();
    for (const p of projects.list({ status: ['active', 'planning'] })) {
      const avail = p.deadlines.length ? availableMinutesUntil(p.deadlines.map((d) => d.dueAt).sort()[0]) : undefined;
      for (const c of fromProjectTasks(p, all, now, avail)) {
        cands.push(c);
        if (c.refs?.taskId) inProject.add(c.refs.taskId);
      }
    }
    for (const t of all) if (!inProject.has(t.id) && t.status !== 'done' && t.status !== 'cancelled') cands.push(fromTask(t, all, { availableMinutesBeforeDue: t.dueAt ? availableMinutesUntil(t.dueAt) : undefined }));
    return rankCandidates(cands, now);
  }

  function taskViews(): TaskView[] {
    const all = tasks.list();
    const now = nowIso();
    const ranked = new Map(rankedPriorities().filter((r) => r.candidate.refs?.taskId).map((r) => [r.candidate.refs!.taskId!, r]));
    return all
      .map((task) => {
        const a = actionabilityOf(task, all);
        return {
          task,
          projectTitle: task.projectId ? projects.get(task.projectId)?.title : undefined,
          actionable: a.actionable,
          blockedBy: a.actionable ? undefined : `${a.reason}${a.detail.length ? `: ${a.detail.join(', ')}` : ''}`,
          overdue: !!task.dueAt && task.status !== 'done' && task.status !== 'cancelled' && (task.dueAt.length > 10 ? task.dueAt < now : task.dueAt < dateOfIso(now)),
          priority: ranked.get(task.id),
        };
      })
      .sort((x, y) => (y.priority?.score ?? -1) - (x.priority?.score ?? -1) || x.task.createdAt.localeCompare(y.task.createdAt));
  }

  // ───── Projetos ─────
  function createProject(input: NewProjectInput): Project {
    const now = nowIso();
    const id = newId('proj');
    const milestones = (input.milestones ?? []).filter((m) => m.title.trim()).map((m, i) => ({ id: `${id}-m${i + 1}`, title: m.title.trim(), order: i, dueAt: m.dueAt || undefined }));
    const project: Project = {
      id,
      title: input.title.trim(),
      objective: input.objective.trim(),
      kind: input.kind ?? 'personal',
      status: 'active',
      relatedDomains: input.relatedDomains ?? ['personal'],
      milestones,
      deadlines: input.deadline?.dueAt ? [{ id: `${id}-d1`, label: input.deadline.label || 'Entrega', dueAt: input.deadline.dueAt, hard: input.deadline.hard ?? true, milestoneId: milestones[milestones.length - 1]?.id }] : [],
      relatedEventIds: [],
      documents: [],
      createdAt: now,
      updatedAt: now,
    };
    const errors = validateProject(project);
    if (errors.length) throw new Error(errors.join(' '));
    projects.save(project);
    changed();
    return project;
  }

  function setProjectStatus(id: string, status: ProjectStatus): Project {
    const p = projects.get(id);
    if (!p) throw new Error(`Projeto "${id}" não encontrado.`);
    const next = { ...p, status, updatedAt: nowIso() };
    projects.save(next);
    changed();
    return next;
  }

  /** Minutos livres REAIS na Agenda (rotina, deslocamento e buffer descontados) daqui até `dueIso` (máx. 14 dias). */
  function availableMinutesUntil(dueIso: string): number {
    const now = nowIso();
    const agenda = agendaSource();
    const endDate = dateOfIso(dueIso);
    let total = 0;
    for (let d = dateOfIso(now), i = 0; d <= endDate && i < 14; d = addDays(d, 1), i++) {
      const windows = freeWindowsFor(agenda, d, d === dateOfIso(now) ? now : `${d}T00:00:00`);
      for (const w of windows) {
        const end = d === endDate && dueIso.length > 10 ? Math.min(Date.parse(w.endIso), Date.parse(dueIso)) : Date.parse(w.endIso);
        total += Math.max(0, Math.round((end - Date.parse(w.startIso)) / 60_000));
      }
    }
    return total;
  }

  function projectViews() {
    const now = nowIso();
    const all = tasks.list();
    return projects.list().map((p) => {
      const next = p.deadlines.map((d) => d.dueAt).sort()[0];
      return {
        project: p,
        progress: projectProgress(p, all, now),
        deadline: assessDeadline(p, all, now, next ? availableMinutesUntil(next) : undefined),
        nextTasks: nextActionableTasks(p, all),
      };
    });
  }

  // ───── Hoje ─────
  function todayContext(): DataState<TodayContext> {
    const now = nowIso();
    const analyses = Array.from(emailAnalyses.values());
    return selectToday(
      {
        date: today(),
        agenda: agendaSource(),
        tasks,
        projects,
        reminders,
        availableMinutes: (_pid, dueIso) => availableMinutesUntil(dueIso),
        extraSources: analyses.length ? [emailContextSource({ provider: localEmailState(), analyses, subjects: Object.fromEntries(Array.from(emailMessages.values()).map((m) => [m.id, m.subject])) })] : [],
      },
      now
    );
  }

  function updateToday(mut: (s: TodayState) => TodayState) {
    if (todayState.date !== today()) todayState = emptyToday(today());
    todayState = mut({ ...todayState });
    changed();
  }

  function completeBlock(entry: { itemId: string; title: string; category?: string; plannedStart?: string; durationMinutes: number }) {
    updateToday((s) => ({
      ...s,
      completedIds: s.completedIds.includes(entry.itemId) ? s.completedIds : [...s.completedIds, entry.itemId],
      history: s.history.some((h) => h.itemId === entry.itemId) ? s.history : [{ id: newId('hist'), completedAt: nowIso(), status: 'completed', ...entry }, ...s.history],
    }));
  }
  const extendBlock = (itemId: string, minutes: number) => updateToday((s) => ({ ...s, extendedMinutes: { ...s.extendedMinutes, [itemId]: (s.extendedMinutes[itemId] ?? 0) + minutes } }));
  const confirmCheckin = (itemId: string) => updateToday((s) => ({ ...s, checkins: s.checkins.includes(itemId) ? s.checkins : [...s.checkins, itemId] }));
  const dismissNotice = (noticeId: string) => updateToday((s) => ({ ...s, dismissed: s.dismissed.includes(noticeId) ? s.dismissed : [...s.dismissed, noticeId] }));

  // ───── Recomendação / Planner ─────
  /** O usuário aceitou a recomendação: vira proposta no Guardian e, aprovada pelo próprio clique, o bloco vai para a Agenda. */
  function acceptRecommendation(rec: Recommendation): DecisionResult {
    const submitted = proposeRecommendation(rec);
    // anexa o título e o domínio ao payload para o executor gravar um bloco legível
    const action = getAction(submitted.action.id)!;
    (action.payload as Record<string, unknown>).title = rec.title;
    if (rec.targetRef.taskId) (action.payload as Record<string, unknown>).domain = tasks.get(rec.targetRef.taskId)?.domain;
    const result = submitted.authorized ? runIfAuthorized(action.id) : approveAction(action.id);
    if (rec.targetRef.taskId && result.state === 'executada') {
      relations.link({ kind: 'task', id: rec.targetRef.taskId }, 'scheduled_as', { kind: 'event', id: `focus:${rec.id}` }, { by: 'user', reason: 'recomendação aceita' }, nowIso());
    }
    changed();
    return result;
  }

  function planWeek(days = 7): SuggestedSchedule {
    const agenda = agendaSource();
    return suggestSchedule({
      now: nowIso(),
      fromDate: today(),
      days,
      dayInput: (d) => dayInputFrom(agenda, d),
      tasks: tasks.list(),
      projects: projects.list({ status: ['active', 'planning'] }),
      protectedWindows: routine.protectedWindows,
    });
  }

  /** O plano vai ao Guardian (L2). Nada é gravado até alguém aprovar no Action Center. */
  function proposePlan(schedule: SuggestedSchedule) {
    if (schedule.blocks.length === 0) throw new Error('O plano não tem blocos para gravar.');
    const submitted = proposeSchedule(schedule, `planner:${schedule.horizon.from}:${Date.now()}`);
    changed();
    return submitted;
  }

  function setRoutine(next: Omit<RoutineConfig, 'version'>) {
    routine = { version: 1, ...next };
    syncReminders();
    changed();
  }

  // ───── Guardian ─────
  function actionCenter(): UniversalActionCenter {
    return buildUniversalActionCenter();
  }

  function actionViews(limit = 50): ActionView[] {
    return buildUniversalActionCenter(undefined, limit).recent.map((u) => {
      const a = getAction(u.id)!;
      const state = executionStateOf(a);
      return {
        id: u.id,
        domain: u.sourceDomain,
        type: u.type,
        intent: u.intent,
        autonomy: u.autonomy,
        reason: u.reason,
        state,
        stateLabel: EXECUTION_STATE_LABEL[state],
        createdAt: u.createdAt,
        approvalExpiresAt: u.approval?.expiresAt,
        outcome: u.outcome ? { result: u.outcome.result, evidence: u.outcome.evidence } : undefined,
        restored: !!a.restoredAt,
      };
    });
  }

  function auditTrail(limit = 50): ActionAuditLogEntry[] {
    return GuardianAuditLog.listRecent(limit);
  }

  /** Aprovar no Action Center. Ações de e-mail aplicam pelo próprio domínio (idempotente). */
  function approve(actionId: string): DecisionResult {
    const email = emailProposalByAction.get(actionId);
    let result: DecisionResult;
    if (email) {
      const request = GuardianApproval.listApprovalRequests().find((r) => r.actionId === actionId && r.status === 'pending');
      if (!request) throw new Error(`Não há aprovação pendente para "${actionId}".`);
      resolveApproval(request.id, 'approve');
      const analysis = emailAnalyses.get(email.messageId);
      if (!analysis) throw new Error('Análise do e-mail não encontrada.');
      const exec = emailCenter.apply(analysis, email.candidateId, nowIso(), emailMessages.get(email.messageId)?.source.provider ?? 'fixture');
      result = { action: exec.action, state: executionStateOf(exec.action), report: exec.report, provider: 'Medusa (tarefas/Agenda internas)' };
      reanalyzeEmails(false);
      syncReminders();
    } else {
      result = approveAction(actionId);
    }
    changed();
    return result;
  }

  function reject(actionId: string): DecisionResult {
    const r = rejectAction(actionId);
    changed();
    return r;
  }

  // ───── Finanças ─────
  /**
   * Contestar uma cobrança: vira proposta DISPUTE_CHARGE no Guardian (L2, irreversível).
   * Não existe executor conectado a emissor de cartão — aprovar deixa a ação
   * "aprovada — executor não conectado", e nada diz que um estorno foi enviado.
   * Idempotente por anomalia: contestar duas vezes devolve a mesma ação.
   */
  function disputeCharge(input: DisputeChargeInput): ActionView {
    const existing = disputes.get(input.anomalyId);
    if (existing && getAction(existing)) return actionViews(500).find((a) => a.id === existing)!;
    const example = input.origin === 'fixture' ? ' [dados de exemplo]' : '';
    const submitted = submitThroughGuardian({
      domain: 'finance',
      type: 'DISPUTE_CHARGE',
      intent: `Contestar cobrança "${input.description}" (R$ ${input.amount.toFixed(2).replace('.', ',')})${example}`,
      payload: { anomalyId: input.anomalyId, amount: input.amount, merchant: input.merchant, origin: input.origin },
      riskLevel: 'moderado',
      reversible: false,
      correlationId: `finance:anomaly:${input.anomalyId}`,
      signals: [{ kind: 'finance_anomaly', ref: `anomaly#${input.anomalyId}`, summary: `${input.description} — origem ${input.origin}` }],
    });
    disputes.set(input.anomalyId, submitted.action.id);
    changed();
    return actionViews(500).find((a) => a.id === submitted.action.id)!;
  }

  const disputeFor = (anomalyId: string): ActionView | undefined => {
    const id = disputes.get(anomalyId);
    return id ? actionViews(500).find((a) => a.id === id) : undefined;
  };

  // ───── E-mail (provedor local) ─────
  function localEmailState(): ProviderState {
    const msgs = Array.from(emailMessages.values());
    const fixture = msgs.length > 0 && msgs.every((m) => m.source.origin === 'fixture');
    return { provider: 'local', status: 'connected', isFixture: fixture, detail: fixture ? 'mensagens de exemplo (provedor local)' : 'provedor local — sem sincronização externa' };
  }

  function providerStates(): Record<'local_email' | 'gmail' | 'outlook' | 'google_calendar' | 'outlook_calendar', ProviderState> {
    return {
      local_email: localEmailState(),
      gmail: gmailProviderState(),
      outlook: { provider: 'outlook', status: 'permission-required', detail: 'BLOQUEADO: integração com Outlook/Microsoft Graph não implementada.' },
      google_calendar: googleCalendarProviderState(),
      outlook_calendar: outlookCalendarProviderState(),
    };
  }

  function existingContext() {
    const now = nowIso();
    const events: CanonicalEvent[] = agendaItems.filter((i) => i.startTime).map((i) => ({
      id: i.id,
      source: { kind: 'internal' as const },
      title: i.title,
      start: `${i.date}T${i.startTime}:00`,
      end: i.endTime ? `${i.date}T${i.endTime}:00` : undefined,
      status: i.status === 'cancelled' ? ('cancelled' as const) : ('confirmed' as const),
    }));
    return { events: [...events, ...Array.from(emailEvents.values())], tasks: tasks.list(), relations, now };
  }

  function reanalyzeEmails(propose: boolean) {
    const ctx = existingContext();
    const knownProjects = projects.list().map((p) => ({ id: p.id, title: p.title }));
    for (const msg of Array.from(emailMessages.values())) {
      const a = analyzeEmail(msg, { now: ctx.now, existing: ctx, knownProjects });
      emailAnalyses.set(msg.id, a);
      if (!propose) continue;
      for (const c of a.candidates) {
        if (c.status !== 'proposed' || c.kind === 'reminder') continue;
        try {
          const s = emailCenter.propose(a, c.id, ctx.now, msg.source.provider);
          emailProposalByAction.set(s.action.id, { messageId: msg.id, candidateId: c.id });
        } catch {
          // candidato que não vai ao Guardian por aqui (ex.: lembrete) — ignorado de propósito
        }
      }
    }
  }

  /**
   * Entrada de e-mails pelo provedor LOCAL (fixtures de teste, importação manual).
   * Classifica (L1, auditado), propõe candidatos ao Guardian (L2) e já dá lembrete
   * provisório a compromissos detectados. Nada sincroniza com Gmail.
   */
  function ingestEmails(messages: EmailMessage[]): { analyzed: number; proposals: number } {
    const before = emailProposalByAction.size;
    for (const m of messages) {
      const first = !emailMessages.has(m.id);
      emailMessages.set(m.id, m);
      if (first) {
        const a = analyzeEmail(m, { now: nowIso(), existing: existingContext() });
        emailCenter.recordClassification(m, a, nowIso());
      }
    }
    reanalyzeEmails(true);
    syncReminders();
    changed();
    return { analyzed: messages.length, proposals: emailProposalByAction.size - before };
  }

  function emailInbox(filter: EmailFilterId = 'todos' as EmailFilterId): DataState<EmailInbox> {
    const msgs = Array.from(emailMessages.values());
    if (msgs.length === 0) {
      return DS.permissionRequired<EmailInbox>('gmail.readonly', `Gmail BLOQUEADO: ${gmailProviderState().detail ?? 'sem OAuth/backend'} · nenhuma mensagem local importada.`);
    }
    const threads: ThreadAnalysis[] = groupIntoThreads(msgs).map((t) => analyzeThread(t, { now: nowIso(), existing: existingContext() }));
    return selectEmailInbox(localEmailState(), threads, filter, nowIso());
  }

  const emailCandidatesFor = (messageId: string) => emailAnalyses.get(messageId)?.candidates ?? [];

  // ───── Corpo: sessão de treino real (séries, cargas, histórico, progressão) ─────
  /** Registra/atualiza a ficha em uso (o conteúdo da ficha pode ser de exemplo; o registro das séries é do usuário). */
  function ensureSheet(sheet: WorkoutSheet) {
    training.saveSheet(sheet);
    changed();
  }

  function startWorkoutSession(sheetId: string): WorkoutSession {
    const active = training.getActiveSession(sheetId);
    if (active) return active;
    const sheet = training.getSheet(sheetId);
    if (!sheet) throw new Error(`Ficha "${sheetId}" não registrada.`);
    const session = startWorkout(sheet, newId('treino'), nowIso());
    training.saveSession(session);
    changed();
    return session;
  }

  /** Registra a próxima série pendente da sessão ativa e grava a carga do dia (upsert por exercício+data). */
  function logSet(sheetId: string, input: { reps: number; loadKg?: number }): WorkoutSession {
    const sheet = training.getSheet(sheetId);
    if (!sheet) throw new Error(`Ficha "${sheetId}" não registrada.`);
    const session = training.getActiveSession(sheetId) ?? startWorkoutSession(sheetId);
    const next = logWorkoutSet(sheet, session, input, nowIso());
    training.saveSession(next);
    const last = next.sets[next.sets.length - 1];
    if (last && input.loadKg !== undefined) training.saveLoad({ exerciseId: last.exerciseId, date: today(), loadKg: input.loadKg, recordedAt: nowIso(), source: 'session' });
    changed();
    return next;
  }

  function finishWorkout(sheetId: string): WorkoutSession | undefined {
    const active = training.getActiveSession(sheetId);
    if (!active) return undefined;
    const ended = endWorkout(active, nowIso());
    training.saveSession(ended);
    changed();
    return ended;
  }

  const bodyApi = {
    ensureSheet,
    startWorkout: startWorkoutSession,
    logSet,
    finishWorkout,
    activeSession: (sheetId?: string) => training.getActiveSession(sheetId),
    sessions: () => training.listSessions().sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    progression: (exerciseId: string): LoadProgression => progressionFor(exerciseId, training.listLoads()),
    loadHistory: (exerciseId: string): LoadEntry[] => historyFor(exerciseId, training.listLoads()),
  };

  // ───── Espiritual: gratidão, prática, memorização SM-2, presença sem streak ─────
  function updateSpiritual(mut: (s: SpiritualSnapshot) => SpiritualSnapshot) {
    spiritual = mut({ ...spiritual });
    changed();
  }

  const spiritualApi = {
    addGratitude(content: string): GratitudeEntry {
      const text = content.trim();
      if (!text) throw new Error('Gratidão vazia.');
      const entry: GratitudeEntry = { id: newId('grat'), date: today(), content: text, createdAt: nowIso(), private: true };
      updateSpiritual((s) => ({ ...s, gratitude: [entry, ...s.gratitude] }));
      return entry;
    },
    recordPractice(type: SpiritualPracticeType, label: string, durationMinutes?: number): SpiritualPractice {
      const p: SpiritualPractice = { id: newId('prat'), type, label, completedAt: nowIso(), durationMinutes: durationMinutes && durationMinutes > 0 ? durationMinutes : undefined };
      updateSpiritual((s) => ({ ...s, practices: [p, ...s.practices] }));
      return p;
    },
    addMemoryCard(reference: BibleReference): ScriptureMemoryCard {
      const key = `${reference.book}.${reference.chapter}.${reference.verseStart ?? ''}-${reference.verseEnd ?? ''}`;
      const existing = spiritual.memoryCards.find((c) => c.id === `mem:${key}`);
      if (existing) return existing;
      const card = newMemoryCard({ id: `mem:${key}`, reference, today: today(), now: nowIso() });
      updateSpiritual((s) => ({ ...s, memoryCards: [...s.memoryCards, card] }));
      return card;
    },
    reviewMemory(cardId: string, grade: RecallGrade): ScriptureMemoryCard {
      const card = spiritual.memoryCards.find((c) => c.id === cardId);
      if (!card) throw new Error(`Cartão "${cardId}" não encontrado.`);
      const { card: next, log } = reviewMemoryCard(card, grade, today(), nowIso());
      updateSpiritual((s) => ({ ...s, memoryCards: s.memoryCards.map((c) => (c.id === cardId ? next : c)), memoryReviews: [...s.memoryReviews, log] }));
      return next;
    },
    dueCards: () => dueCards(spiritual.memoryCards, today()),
    gratitude: () => spiritual.gratitude,
    practices: () => spiritual.practices,
    memoryCards: () => spiritual.memoryCards,
    presence(): PresenceSummary {
      const dates = presenceDatesFrom({ practices: spiritual.practices, reflections: [], prayers: [], gratitude: spiritual.gratitude, studies: [], plans: [], progresses: [], memoryCards: spiritual.memoryCards, memoryReviews: spiritual.memoryReviews });
      return summarizePresence(dates, today());
    },
  };

  // ───── API ─────
  return {
    // ciclo de vida
    hydrate,
    flush,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getVersion: () => version,
    lastFlushError: () => lastFlushError,
    storageAvailability: () => opts.storage.availability(),
    now: nowIso,

    // agenda / rotina
    setAgenda,
    setIslandSink(fn: (p: NotificationPayload) => void) {
      islandSink = fn;
    },
    routine: () => routine,
    setRoutine,

    // tarefas e projetos
    createTask,
    setTaskStatus,
    updateTask,
    tasks: () => tasks.list(),
    taskViews,
    createProject,
    setProjectStatus,
    projects: () => projects.list(),
    projectViews,
    rankedPriorities,
    availableMinutesUntil,

    // hoje
    todayContext,
    todayState: () => todayState,
    completeBlock,
    extendBlock,
    confirmCheckin,
    dismissNotice,
    acceptRecommendation,

    // planner
    planWeek,
    proposePlan,

    // lembretes
    syncReminders,
    tick,
    acknowledgeReminder,
    reminders: (eventId?: string) => reminders.list(eventId ? { eventId } : undefined),
    channelCapabilities: (): ChannelCapability[] => reminders.capabilities(),

    // guardian
    actionCenter,
    actionViews,
    auditTrail,
    approve,
    reject,

    // finanças
    disputeCharge,
    disputeFor,

    // e-mail
    ingestEmails,
    emailInbox,
    emailCandidatesFor,
    emailAnalysis: (messageId: string) => emailAnalyses.get(messageId),
    emailProposals: () => Array.from(emailProposalByAction.entries()).map(([actionId, v]) => ({ actionId, ...v })),
    providerStates,

    // corpo e espiritual
    body: bodyApi,
    spiritual: spiritualApi,

    // relações
    relationsOf: (ref: EntityRef) => [...relations.outgoing(ref), ...relations.incoming(ref)],
  };
}

export type PersonalOS = ReturnType<typeof createPersonalOS>;
