/**
 * MEDUSA — E-mail — Pontes com o Personal OS (nada paralelo)
 *
 *   e-mail → CanonicalEvent → Reminder Engine (mesmo motor, mesmo dedup)
 *   e-mail → PriorityCandidate → rankCandidates → recommend (mesmo Priority/Recommendation)
 *   e-mail → ContextSource 'email' → aggregateToday (Atenção · Próximo)
 *
 * Lembrete de compromisso vindo de e-mail sai mesmo antes de o usuário aceitar o evento
 * na Agenda (CREATE_REMINDER é L1 informativo): uma consulta confirmada por e-mail não
 * pode ficar sem aviso porque ninguém clicou em "adicionar". Só com confiança ≥ 0,7 e
 * importância crítica/alta. Se o compromisso já está na Agenda, o candidato vem
 * `linked_existing` e não gera lembrete — a Agenda já avisa.
 */

import type { CanonicalEvent } from '../../../foundation/events/canonical';
import type { PriorityCandidate } from '../../../foundation/priority/engine';
import type { ContextContribution, ContextSource, AttentionItem, TodayItem } from '../../../foundation/context/aggregator';
import type { ProviderState } from '../../../foundation/providers/state';
import { providerStateToDataState } from '../../../foundation/providers/state';
import * as DS from '../../../foundation/dataState';
import type { CalendarEventCandidate, DeadlineCandidate, EmailAnalysis, EmailCandidate, ReminderIntentCandidate, TaskCandidate } from '../model/types';
import { derivedEventId, eventFromCandidate } from './actions';

const MIN = 60_000;
const ms = (iso: string) => Date.parse(iso.length === 10 ? `${iso}T00:00:00` : iso);
const byId = (a: EmailAnalysis, id: string) => a.candidates.find((c) => c.id === id);

export interface ReminderBridgeOptions {
  minConfidence?: number;
  deadlineReminderTime?: string;
}

/** Eventos canônicos que o Reminder Engine deve acompanhar por causa de e-mails. */
export function reminderEventsFromEmail(analyses: EmailAnalysis[], now: string, opts: ReminderBridgeOptions = {}): CanonicalEvent[] {
  const min = opts.minConfidence ?? 0.7;
  const out: CanonicalEvent[] = [];
  for (const a of analyses) {
    for (const r of a.candidates.filter((c): c is ReminderIntentCandidate => c.kind === 'reminder')) {
      const target = byId(a, r.targetCandidateId);
      if (!target || target.status !== 'proposed' || r.confidence < min) continue;
      if (target.kind === 'calendar_event' && !target.allDay) {
        out.push({ ...eventFromCandidate(target, now, 'tentative'), reminderPolicy: { offsetsMinutes: r.offsetsMinutes } });
      } else if (target.kind === 'deadline') {
        const at = target.dueAt.length === 10 ? `${target.dueAt}T${opts.deadlineReminderTime ?? '09:00'}:00` : target.dueAt;
        out.push({
          id: `email-deadline:${a.messageId}`,
          source: { kind: 'gmail', externalId: a.messageId, label: 'prazo de e-mail', observedAt: now },
          title: `Prazo: ${target.title}`,
          start: at,
          importance: target.tier,
          category: 'task',
          rigidity: 'rigid',
          domain: target.domain,
          status: 'tentative',
          reminderPolicy: { offsetsMinutes: r.offsetsMinutes },
          dedupKey: `email-deadline:${a.messageId}`,
        });
      }
    }
  }
  return out;
}

/** Candidatos ainda não aceitos → Priority Engine (aceitos já estão em Tasks/Agenda). */
export function emailPriorityCandidates(analyses: EmailAnalysis[]): PriorityCandidate[] {
  const out: PriorityCandidate[] = [];
  for (const a of analyses) {
    for (const c of a.candidates) {
      if (c.status !== 'proposed') continue;
      if (c.kind === 'task') {
        const t = c as TaskCandidate;
        out.push({ id: `email:${t.id}`, kind: 'task', title: t.title, domain: t.domain, tier: t.priority, rigid: !!t.dueAt && a.classification.importance !== 'low', dueAt: t.dueAt, estimatedMinutes: t.estimatedMinutes, actionable: true, costOfDelay: t.priority === 'critical' || t.priority === 'high' ? 'alto' : 'medio', refs: { projectId: t.projectId, emailCandidateId: t.id } });
      } else if (c.kind === 'calendar_event' && !c.allDay) {
        const e = c as CalendarEventCandidate;
        out.push({ id: `email:${e.id}`, kind: 'event', title: e.title, domain: e.domain, tier: e.tier, rigid: e.rigid, startsAt: e.start, endsAt: e.end, actionable: true, refs: { eventId: derivedEventId(e.sourceEmailId), emailCandidateId: e.id } });
      } else if (c.kind === 'deadline' && !a.candidates.some((x) => x.kind === 'task' && x.status === 'proposed')) {
        const d = c as DeadlineCandidate;
        out.push({ id: `email:${d.id}`, kind: 'deadline', title: d.title, domain: d.domain, tier: d.tier, rigid: true, dueAt: d.dueAt, actionable: true, costOfDelay: 'alto', refs: { projectId: d.projectId, emailCandidateId: d.id } });
      }
    }
  }
  return out;
}

const SEVERITY = (a: EmailAnalysis): AttentionItem['severity'] => (a.classification.importance === 'critical' || a.risks.some((r) => r.severity === 'critical') ? 'alta' : 'media');

/**
 * Fonte 'email' do Hoje. O estado do provedor manda: sem Gmail conectado, a fonte aparece
 * como "precisa de permissão", nunca como "nenhum e-mail".
 */
export function emailContextSource(input: { provider: ProviderState; analyses: EmailAnalysis[]; subjects?: Record<string, string>; attentionHorizonDays?: number }): ContextSource {
  return {
    id: 'email',
    read(now) {
      const nowMs = Date.parse(now);
      const horizon = (input.attentionHorizonDays ?? 3) * 24 * 60 * MIN;
      const attention: AttentionItem[] = [];
      const next: TodayItem[] = [];
      for (const a of input.analyses) {
        const subject = input.subjects?.[a.messageId] ?? a.messageId;
        const proposed = a.candidates.filter((c) => c.status === 'proposed');
        const crit = a.risks.find((r) => (r.type === 'financial' || r.type === 'security') && (r.severity === 'critical' || r.severity === 'high'));
        const dl = proposed.find((c): c is DeadlineCandidate => c.kind === 'deadline');
        const actionable = proposed.filter((c) => ['task', 'calendar_event', 'deadline', 'finance', 'reply'].includes(c.kind));
        if (crit) {
          attention.push({ id: `email:risk:${a.messageId}`, reason: 'email_risco', severity: crit.severity === 'critical' ? 'alta' : 'media', title: crit.reason, detail: { messageId: a.messageId, subject, riskType: crit.type }, dueIso: crit.deadline, source: 'email' });
        } else if (dl && ms(dl.dueAt) - nowMs <= horizon) {
          attention.push({ id: `email:deadline:${a.messageId}`, reason: 'email_prazo', severity: dl.alreadyPast || ms(dl.dueAt) - nowMs <= 24 * 60 * MIN ? 'alta' : 'media', title: dl.title, detail: { messageId: a.messageId, subject, alreadyPast: dl.alreadyPast }, dueIso: dl.dueAt, source: 'email' });
        } else if (actionable.length > 0 && a.classification.importance !== 'low') {
          attention.push({ id: `email:action:${a.messageId}`, reason: 'email_requer_acao', severity: SEVERITY(a), title: subject, detail: { messageId: a.messageId, subject, candidates: actionable.map((c) => c.kind).join(',') }, source: 'email' });
        }
        for (const e of proposed.filter((c): c is CalendarEventCandidate => c.kind === 'calendar_event' && !c.allDay)) {
          next.push({ id: `email:event:${a.messageId}`, title: e.title, kind: 'event', domain: e.domain, tier: e.tier, startIso: e.start, endIso: e.end, refs: { eventId: derivedEventId(e.sourceEmailId), emailId: a.messageId, candidateId: e.id }, provisional: { reason: 'detectado em e-mail; ainda não está na Agenda' }, source: 'email' });
        }
      }
      const contribution: ContextContribution = { attention, next };
      const empty = attention.length === 0 && next.length === 0;
      if (input.provider.status === 'connected' && empty) return DS.empty('Nenhum e-mail pedindo atenção.');
      return providerStateToDataState(input.provider, contribution, now);
    },
  };
}

export type { EmailCandidate };
