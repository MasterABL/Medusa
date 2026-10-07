/**
 * MEDUSA FOUNDATION — Reminder Engine v2 (reutilizável)
 *
 *   Evento → Importância → Contexto → Política → Reminder → Guardian → Entrega → Reconhecimento → Follow-up
 *
 * Evolui a 1ª versão (orchestrator.ts, mantida por compatibilidade) para um
 * motor com ESTADO EXPLÍCITO por lembrete:
 *  - gatilhos T-30 / T-15 / T-5 / horário exato (0), configuráveis por tier;
 *  - lembrete recorrente (regras diárias/semanais, ex.: remédio às 22h);
 *  - um gatilho dispara UMA vez (id determinístico evento@data#T-x);
 *  - gatilhos que vencem juntos → só o mais próximo sai, o resto é "superseded";
 *  - intervalo mínimo entre lembretes do mesmo evento (cooldown);
 *  - nunca lembra depois que o evento começou (expira);
 *  - cancelamento e reagendamento quando a Agenda muda;
 *  - cada entrega passa pelo Guardian (CREATE_REMINDER, L1 informativo) e
 *    deixa ação + resultado auditados;
 *  - estado de permissão/entrega por canal, sem fingir sucesso;
 *  - follow-up: entregue e não reconhecido até o fim do evento fica registrado
 *    para análise — sem disparar mais nada (sem spam).
 *
 * Não há timer aqui dentro: quem chama `tick(now)` é a camada de app (hoje a
 * Agenda já roda um intervalo de 30 s). Nenhum timer espalhado pela interface.
 */

import type { EventContext } from '../context/eventContext';
import { defaultIntentKey, intentKeyOf, startIso } from '../context/eventContext';
import type { ImportanceTier } from '../context/importance';
import type { EventContextCategory } from './types';
import type { ChannelCapability, ChannelDeliveryResult, ChannelRegistry, NotificationChannelId, NotificationPayload } from './channels';
import { channelCapabilities } from './channels';
import { submitThroughGuardian, executeAuthorized } from '../actions/submit';
import { recordFeedback } from '../guardianTrace/feedback';

export interface ReminderPolicyV2 {
  id: string;
  /** Minutos antes do início. 0 = no horário exato. */
  offsetsMinutes: number[];
  /** Ordem de preferência; o motor tenta todos os disponíveis. */
  channels: NotificationChannelId[];
  /** Intervalo mínimo entre dois lembretes do MESMO evento. */
  minGapMs: number;
  requiresAcknowledgement: boolean;
}

export const DEFAULT_REMINDER_POLICIES: Record<ImportanceTier, ReminderPolicyV2> = {
  critical: { id: 'v2_critical', offsetsMinutes: [30, 15, 5, 0], channels: ['dynamic_island', 'web_notification', 'native_mobile_notification'], minGapMs: 60_000, requiresAcknowledgement: true },
  high: { id: 'v2_high', offsetsMinutes: [15, 5], channels: ['dynamic_island', 'web_notification'], minGapMs: 60_000, requiresAcknowledgement: true },
  medium: { id: 'v2_medium', offsetsMinutes: [15], channels: ['dynamic_island', 'web_notification'], minGapMs: 120_000, requiresAcknowledgement: false },
  low: { id: 'v2_low', offsetsMinutes: [5], channels: ['dynamic_island'], minGapMs: 300_000, requiresAcknowledgement: false },
};

export type ReminderState =
  | 'scheduled'
  | 'held_for_approval'
  | 'delivered'
  | 'partially_delivered'
  | 'blocked'
  | 'failed'
  | 'acknowledged'
  | 'cancelled'
  | 'superseded'
  | 'expired';

export type AckAction = 'viewed' | 'opened' | 'dismissed' | 'snoozed';

export type FollowUpState = 'pendente' | 'reconhecido' | 'acao_tomada' | 'perdido_sem_reconhecimento' | 'entregue_sem_resposta' | 'nao_entregue';

export interface ReminderRecord {
  /** `${eventId}@${date}#T${offset}` (ou `#S${n}` para soneca, `#C` para catch-up). */
  id: string;
  eventId: string;
  occurrenceDate: string;
  occurrenceKey: string;
  /**
   * Identidade do compromisso entre fontes (ver `intentKeyOf`). Dois eventos com o mesmo
   * intent (ex.: o item da Agenda e o candidato vindo do e-mail de confirmação) geram um
   * único conjunto de lembretes. Ausente em estado exportado antes desta versão.
   */
  intentKey?: string;
  title: string;
  /** Início do evento no momento em que o lembrete foi planejado (detecta reagendamento). */
  eventStartIso: string;
  eventEndIso: string;
  offsetMinutes: number;
  triggerAtIso: string;
  tier: ImportanceTier;
  category: EventContextCategory;
  rigid: boolean;
  policyId: string;
  channels: NotificationChannelId[];
  minGapMs: number;
  requiresAcknowledgement: boolean;
  state: ReminderState;
  kind: 'offset' | 'catch_up' | 'snooze' | 'recurring';
  deliveries: ChannelDeliveryResult[];
  acknowledgement?: { action: AckAction; at: string; snoozeMinutes?: number };
  actionId?: string;
  stateReason?: string;
  followUp: FollowUpState;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringReminderRule {
  id: string;
  title: string;
  /** HH:mm */
  time: string;
  /** 0 = domingo. */
  daysOfWeek: number[];
  tier: ImportanceTier;
  category?: EventContextCategory;
  offsetsMinutes?: number[];
  channels?: NotificationChannelId[];
  active: boolean;
}

export interface ReminderEngineDeps {
  channels: ChannelRegistry;
  policies?: Partial<Record<ImportanceTier, ReminderPolicyV2>>;
  /** Política por evento (vence a do tier) — ex.: telemedicina só com T-5. */
  policyFor?: (ctx: EventContext) => ReminderPolicyV2 | undefined;
  /** Atraso tolerado depois do início para ainda entregar o lembrete do horário exato. */
  graceAfterStartMinutes?: number;
}

export interface SyncReport {
  planned: string[];
  superseded: string[];
  cancelled: string[];
  /** Ocorrências que não ganharam lembrete próprio porque outra já cobre o mesmo compromisso. */
  deduplicated: { occurrenceKey: string; coveredBy: string }[];
}

export interface TickReport {
  delivered: ReminderRecord[];
  held: ReminderRecord[];
  superseded: string[];
  expired: string[];
  deferred: string[];
}

export interface FollowUpFinding {
  occurrenceKey: string;
  eventId: string;
  title: string;
  state: FollowUpState;
  deliveredChannels: NotificationChannelId[];
  lastReminderId: string;
}

const MIN = 60_000;
const ms = (iso: string) => Date.parse(iso);
function localIso(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
const hhmm = (iso: string) => iso.slice(11, 16);
const minutesOf = (iso: string) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));

function minutesLabel(n: number): string {
  return n <= 0 ? 'agora' : `em ${n} min`;
}

export function createReminderEngine(deps: ReminderEngineDeps) {
  const records = new Map<string, ReminderRecord>();
  const rules = new Map<string, RecurringReminderRule>();
  const grace = (deps.graceAfterStartMinutes ?? 2) * MIN;
  const policyOf = (ctx: EventContext): ReminderPolicyV2 => deps.policyFor?.(ctx) ?? deps.policies?.[ctx.tier] ?? DEFAULT_REMINDER_POLICIES[ctx.tier];

  const byOccurrence = (key: string) => Array.from(records.values()).filter((r) => r.occurrenceKey === key);
  const pending = (r: ReminderRecord) => r.state === 'scheduled' || r.state === 'held_for_approval';
  const alive = (r: ReminderRecord) => r.state !== 'cancelled' && r.state !== 'superseded' && r.state !== 'expired';
  /** Outra ocorrência (de outro evento) que já cobre este mesmo compromisso, se houver. */
  const coveringOccurrence = (intentKey: string, occurrenceKey: string): string | undefined =>
    Array.from(records.values()).find((r) => r.intentKey === intentKey && r.occurrenceKey !== occurrenceKey && alive(r))?.occurrenceKey;
  const touch = (r: ReminderRecord, patch: Partial<ReminderRecord>, now: string) => {
    const next = { ...r, ...patch, updatedAt: now };
    records.set(r.id, next);
    return next;
  };

  function plan(ctx: EventContext, now: string, kind: ReminderRecord['kind'] = 'offset', policyOverride?: ReminderPolicyV2): string[] {
    const policy = policyOverride ?? policyOf(ctx);
    const start = startIso(ctx);
    const end = startIso({ date: ctx.date, startMin: Math.max(ctx.endMin, ctx.startMin + 1) });
    const key = `${ctx.eventId}@${ctx.date}`;
    const nowMs = ms(now);
    const startMs = ms(start);
    if (startMs + grace < nowMs) return [];
    const intentKey = intentKeyOf(ctx);
    if (coveringOccurrence(intentKey, key)) return [];

    const base = {
      eventId: ctx.eventId,
      occurrenceDate: ctx.date,
      occurrenceKey: key,
      intentKey,
      title: ctx.title,
      eventStartIso: start,
      eventEndIso: end,
      tier: ctx.tier,
      category: ctx.category,
      rigid: ctx.rigid,
      policyId: policy.id,
      channels: policy.channels,
      minGapMs: policy.minGapMs,
      requiresAcknowledgement: policy.requiresAcknowledgement,
      deliveries: [],
      followUp: 'pendente' as FollowUpState,
      createdAt: now,
      updatedAt: now,
    };
    const created: string[] = [];
    const offsets = Array.from(new Set(policy.offsetsMinutes)).sort((a, b) => b - a);
    for (const offset of offsets) {
      const trigger = startMs - offset * MIN;
      if (trigger < nowMs - MIN) continue; // gatilho já passou antes de o lembrete existir
      const id = `${key}#T${offset}`;
      if (records.has(id)) continue;
      records.set(id, { ...base, id, offsetMinutes: offset, triggerAtIso: localIso(trigger), state: 'scheduled', kind });
      created.push(id);
    }
    // Evento criado em cima da hora: nenhum gatilho sobrou, mas ainda dá tempo → um lembrete agora.
    const maxOffset = offsets[0] ?? 0;
    if (created.length === 0 && !offsets.some((o) => records.has(`${key}#T${o}`)) && startMs > nowMs && startMs - nowMs <= maxOffset * MIN) {
      const id = `${key}#C`;
      if (!records.has(id)) {
        records.set(id, { ...base, id, offsetMinutes: Math.round((startMs - nowMs) / MIN), triggerAtIso: now, state: 'scheduled', kind: 'catch_up' });
        created.push(id);
      }
    }
    return created;
  }

  function syncEvents(contexts: EventContext[], now: string, opts: { coveredDates?: string[] } = {}): SyncReport {
    const report: SyncReport = { planned: [], superseded: [], cancelled: [], deduplicated: [] };
    const seen = new Set(contexts.map((c) => `${c.eventId}@${c.date}`));
    // cancelar primeiro o que sumiu: se a fonte que cobria um compromisso foi removida,
    // a outra fonte do mesmo compromisso herda os lembretes nesta mesma sincronização
    const covered = new Set(opts.coveredDates ?? contexts.map((c) => c.date));
    for (const r of Array.from(records.values())) {
      if (r.kind === 'recurring' || !covered.has(r.occurrenceDate) || seen.has(r.occurrenceKey) || !pending(r)) continue;
      touch(r, { state: 'cancelled', stateReason: 'evento removido ou cancelado na Agenda' }, now);
      report.cancelled.push(r.id);
    }
    for (const ctx of contexts) {
      const key = `${ctx.eventId}@${ctx.date}`;
      const existing = byOccurrence(key);
      const start = startIso(ctx);
      const moved = existing.filter((r) => pending(r) && r.eventStartIso !== start);
      for (const r of moved) {
        // o lembrete do horário antigo fica no histórico com id próprio; o id original fica livre para o novo horário
        const archivedId = `${r.id}~${hhmm(r.eventStartIso)}`;
        records.delete(r.id);
        records.set(archivedId, { ...r, id: archivedId, state: 'superseded', stateReason: `evento reagendado para ${hhmm(start)}`, updatedAt: now });
        report.superseded.push(archivedId);
      }
      const coveredBy = existing.some(alive) ? undefined : coveringOccurrence(intentKeyOf(ctx), key);
      if (coveredBy) {
        report.deduplicated.push({ occurrenceKey: key, coveredBy });
        continue;
      }
      report.planned.push(...plan(ctx, now));
    }
    return report;
  }

  function cancelEvent(eventId: string, reason: string, now: string): string[] {
    const out: string[] = [];
    for (const r of Array.from(records.values())) {
      if (r.eventId === eventId && pending(r)) {
        touch(r, { state: 'cancelled', stateReason: reason }, now);
        out.push(r.id);
      }
    }
    return out;
  }

  function deliver(r: ReminderRecord, now: string): ReminderRecord {
    const minutesLeft = Math.round((ms(r.eventStartIso) - ms(now)) / MIN);
    const submitted = submitThroughGuardian({
      domain: 'agenda',
      type: 'CREATE_REMINDER',
      intent: `Lembrar "${r.title}" (${r.kind === 'offset' ? `T-${r.offsetMinutes}` : r.kind})`,
      payload: { reminderId: r.id, eventId: r.eventId, offsetMinutes: r.offsetMinutes },
      riskLevel: 'baixo',
      reversible: true,
      undoDescription: 'Dispensar o lembrete.',
      correlationId: `reminder:${r.occurrenceKey}`,
      signals: [
        { kind: 'evento', ref: `agenda#${r.eventId}`, summary: `${r.tier}${r.rigid ? ', horário rígido' : ''}, começa ${hhmm(r.eventStartIso)}` },
        { kind: 'politica_lembrete', ref: r.policyId, summary: r.kind === 'offset' ? `gatilho T-${r.offsetMinutes}` : `gatilho ${r.kind}` },
      ],
    });
    if (!submitted.authorized) {
      return touch(r, { state: 'held_for_approval', actionId: submitted.action.id, stateReason: submitted.evaluation.decision.reason }, now);
    }

    const payload: NotificationPayload = {
      reminderId: r.id,
      eventId: r.eventId,
      title: r.title,
      body: `Começa ${minutesLabel(minutesLeft)} (${hhmm(r.eventStartIso)})`,
      tier: r.tier,
      offsetMinutes: r.offsetMinutes,
      target: { tab: 'agenda', eventId: r.eventId, date: r.occurrenceDate },
    };
    let results: ChannelDeliveryResult[] = [];
    const exec = executeAuthorized(submitted.action.id, () => {
      results = r.channels.map((id) => {
        const ch = deps.channels.get(id);
        return ch ? ch.deliver(payload, now) : { channel: id, status: 'not_implemented', at: now, reason: 'canal não registrado' };
      });
      const delivered = results.filter((x) => x.status === 'delivered').map((x) => x.channel);
      const failedAll = results.length > 0 && results.every((x) => x.status === 'failed');
      if (failedAll) return { ok: false, error: results.map((x) => x.reason).join('; ') };
      return delivered.length > 0
        ? { ok: true, evidence: `entregue em: ${delivered.join(', ')}` }
        : { ok: true, noEffect: true, evidence: `nenhum canal entregou (${results.map((x) => `${x.channel}: ${x.status}`).join(', ')})` };
    });
    const delivered = results.filter((x) => x.status === 'delivered').length;
    const state: ReminderState =
      !exec.report.ok ? 'failed' : delivered === results.length ? 'delivered' : delivered > 0 ? 'partially_delivered' : 'blocked';
    return touch(r, { state, deliveries: results, actionId: submitted.action.id, stateReason: exec.report.evidence ?? exec.report.error }, now);
  }

  function tick(now: string): TickReport {
    const report: TickReport = { delivered: [], held: [], superseded: [], expired: [], deferred: [] };
    const nowMs = ms(now);
    const due = Array.from(records.values()).filter((r) => r.state === 'scheduled' && ms(r.triggerAtIso) <= nowMs);

    // nunca lembrar depois que o evento começou (além da tolerância do horário exato)
    for (const r of due) {
      if (nowMs > ms(r.eventStartIso) + grace) {
        touch(r, { state: 'expired', stateReason: 'o evento já começou — lembrete atrasado não é enviado' }, now);
        report.expired.push(r.id);
      }
    }
    const live = due.filter((r) => records.get(r.id)!.state === 'scheduled');
    const groups = new Map<string, ReminderRecord[]>();
    for (const r of live) groups.set(r.occurrenceKey, [...(groups.get(r.occurrenceKey) ?? []), r]);

    for (const [key, group] of Array.from(groups.entries())) {
      // vários gatilhos vencidos juntos: só o mais próximo do evento sai
      const sorted = [...group].sort((a, b) => a.offsetMinutes - b.offsetMinutes);
      const chosen = sorted[0];
      for (const r of sorted.slice(1)) {
        touch(r, { state: 'superseded', stateReason: `substituído por ${chosen.id}` }, now);
        report.superseded.push(r.id);
      }
      // o mesmo compromisso já foi lembrado neste gatilho por outra fonte → não repetir
      const twin = chosen.intentKey
        ? Array.from(records.values()).find(
            (x) => x.id !== chosen.id && x.intentKey === chosen.intentKey && x.occurrenceKey !== chosen.occurrenceKey && x.offsetMinutes === chosen.offsetMinutes && x.deliveries.some((d) => d.status === 'delivered')
          )
        : undefined;
      if (twin) {
        touch(chosen, { state: 'superseded', stateReason: `mesmo compromisso já lembrado por ${twin.id}` }, now);
        report.superseded.push(chosen.id);
        continue;
      }
      const policyGap = chosen.minGapMs;
      const last = byOccurrence(key)
        .flatMap((r) => r.deliveries.filter((d) => d.status === 'delivered').map((d) => ms(d.at)))
        .sort((a, b) => b - a)[0];
      if (last !== undefined && nowMs - last < policyGap) {
        report.deferred.push(chosen.id);
        continue;
      }
      const result = deliver(chosen, now);
      if (result.state === 'held_for_approval') report.held.push(result);
      else report.delivered.push(result);
    }
    return report;
  }

  function acknowledge(reminderId: string, action: AckAction, now: string, snoozeMinutes?: number): ReminderRecord {
    const r = records.get(reminderId);
    if (!r) throw new Error(`Lembrete "${reminderId}" não encontrado.`);
    if (!['delivered', 'partially_delivered', 'acknowledged'].includes(r.state)) throw new Error(`Só se reconhece lembrete entregue (estado atual: ${r.state}).`);
    const next = touch(r, { state: 'acknowledged', acknowledgement: { action, at: now, snoozeMinutes }, followUp: action === 'opened' ? 'acao_tomada' : 'reconhecido' }, now);
    if (action === 'opened' && r.actionId) recordFeedback({ actionId: r.actionId, kind: 'explicit', signal: 'positive', at: now, note: 'usuário abriu o compromisso pelo lembrete' });
    if (action === 'snoozed' && snoozeMinutes && snoozeMinutes > 0) {
      const at = ms(now) + snoozeMinutes * MIN;
      if (at <= ms(r.eventStartIso) + grace) {
        const n = byOccurrence(r.occurrenceKey).filter((x) => x.kind === 'snooze').length + 1;
        const id = `${r.occurrenceKey}#S${n}`;
        records.set(id, { ...r, id, kind: 'snooze', offsetMinutes: Math.round((ms(r.eventStartIso) - at) / MIN), triggerAtIso: localIso(at), state: 'scheduled', deliveries: [], acknowledgement: undefined, actionId: undefined, followUp: 'pendente', stateReason: `soneca de ${snoozeMinutes} min`, createdAt: now, updatedAt: now });
      }
    }
    return next;
  }

  function followUp(now: string): FollowUpFinding[] {
    const nowMs = ms(now);
    const keys = new Set(Array.from(records.values()).filter((r) => ms(r.eventEndIso) <= nowMs).map((r) => r.occurrenceKey));
    const findings: FollowUpFinding[] = [];
    for (const key of Array.from(keys)) {
      const group = byOccurrence(key).filter((r) => r.state !== 'cancelled');
      if (group.length === 0) continue;
      const delivered = group.filter((r) => r.deliveries.some((d) => d.status === 'delivered'));
      const acked = group.filter((r) => r.acknowledgement);
      const requiresAck = group.some((r) => r.requiresAcknowledgement);
      const state: FollowUpState = acked.some((r) => r.acknowledgement!.action === 'opened')
        ? 'acao_tomada'
        : acked.length > 0
          ? 'reconhecido'
          : delivered.length > 0
            ? requiresAck ? 'perdido_sem_reconhecimento' : 'entregue_sem_resposta'
            : 'nao_entregue';
      const last = [...group].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      for (const r of group) if (r.followUp === 'pendente' || r.followUp !== state) records.set(r.id, { ...r, followUp: state });
      findings.push({
        occurrenceKey: key,
        eventId: last.eventId,
        title: last.title,
        state,
        deliveredChannels: Array.from(new Set(delivered.flatMap((r) => r.deliveries.filter((d) => d.status === 'delivered').map((d) => d.channel)))),
        lastReminderId: last.id,
      });
    }
    return findings;
  }

  function addRecurringRule(rule: RecurringReminderRule): void {
    rules.set(rule.id, rule);
  }

  /** Gera os lembretes das regras recorrentes para `date` (idempotente). */
  function syncRecurring(date: string, now: string): string[] {
    const weekday = new Date(`${date}T00:00:00`).getDay();
    const out: string[] = [];
    for (const rule of Array.from(rules.values())) {
      if (!rule.active || !rule.daysOfWeek.includes(weekday)) continue;
      const [h, m] = rule.time.split(':').map(Number);
      const startMin = h * 60 + m;
      const ctx: EventContext = {
        eventId: `rule:${rule.id}`, title: rule.title, date, startMin, endMin: startMin + 1, durationMinutes: 1, domain: 'personal',
        category: rule.category ?? 'optional_reminder', tier: rule.tier, rigid: false, importanceSource: 'explicito_no_evento', leadTimeMinutes: 0,
        conflictsWith: [], yieldsInConflict: false, dependsOnEventIds: [],
      };
      const base = DEFAULT_REMINDER_POLICIES[rule.tier];
      const policy: ReminderPolicyV2 = { ...base, id: `recurring_${rule.id}`, offsetsMinutes: rule.offsetsMinutes ?? [0], channels: rule.channels ?? base.channels };
      const before = new Set(records.keys());
      plan(ctx, now, 'recurring', policy);
      for (const id of Array.from(records.keys())) if (!before.has(id)) out.push(id);
    }
    return out;
  }

  /**
   * Estado serializável (lembretes + regras recorrentes). Hoje o motor vive em memória:
   * sem persistir isto, recarregar a página esquece o que já foi entregue. Um adapter
   * (localStorage/backend) só precisa salvar `exportState()` e chamar `importState()`.
   */
  function exportState(): { version: 1; records: ReminderRecord[]; rules: RecurringReminderRule[] } {
    return { version: 1, records: Array.from(records.values()), rules: Array.from(rules.values()) };
  }

  function importState(state: { version: number; records: ReminderRecord[]; rules?: RecurringReminderRule[] }): void {
    if (state.version !== 1) throw new Error(`Versão de estado de lembretes desconhecida: ${state.version}.`);
    for (const r of state.records) records.set(r.id, r.intentKey ? r : { ...r, intentKey: defaultIntentKey({ date: r.occurrenceDate, startMin: minutesOf(r.eventStartIso), title: r.title }) });
    for (const rule of state.rules ?? []) rules.set(rule.id, rule);
  }

  return {
    exportState,
    importState,
    syncEvents,
    cancelEvent,
    tick,
    acknowledge,
    followUp,
    addRecurringRule,
    syncRecurring,
    get: (id: string) => records.get(id),
    list: (filter?: { eventId?: string; states?: ReminderState[] }) =>
      Array.from(records.values())
        .filter((r) => (!filter?.eventId || r.eventId === filter.eventId) && (!filter?.states || filter.states.includes(r.state)))
        .sort((a, b) => a.triggerAtIso.localeCompare(b.triggerAtIso) || a.id.localeCompare(b.id)),
    capabilities: (): ChannelCapability[] => channelCapabilities(deps.channels),
  };
}

export type ReminderEngine = ReturnType<typeof createReminderEngine>;
