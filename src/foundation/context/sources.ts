/**
 * MEDUSA FOUNDATION — Fontes do Context Aggregator
 *
 * Adaptadores finos: cada um lê o domínio dono do dado (sem copiar) e traduz
 * para a contribuição do Hoje. Fontes de Finanças/Corpo/Espiritual/Educação
 * ainda não conectadas entram com `unavailableSource`, nunca como vazio.
 */

import type { ContextContribution, ContextSource, RhythmItem, TodayItem, AttentionItem } from './aggregator';
import type { AgendaSource } from '../../domains/agenda/repository/source';
import { dayInputFrom } from '../../domains/agenda/selectors';
import { buildDay } from '../../domains/agenda/services/timeline';
import { computeFreeSlots } from '../../domains/agenda/services/freeTime';
import { buildEventContexts, startIso } from './eventContext';
import type { EventContext, EventLinks } from './eventContext';
import type { ImportanceOverrides, ImportanceRule } from './importance';
import type { TaskRepository } from '../../domains/tasks/repository/types';
import type { ProjectRepository } from '../../domains/projects/repository/types';
import { assessDeadline, projectProgress } from '../../domains/projects/services/progress';
import type { ReminderEngine } from '../reminders/engine';
import { buildUniversalActionCenter } from '../actions/universal';
import type { FreeWindow, RecommendationInput } from '../recommendations/engine';
import { recommend } from '../recommendations/engine';
import { rankCandidates } from '../priority/engine';
import type { PriorityCandidate } from '../priority/engine';
import { fromProjectTasks, fromTask } from '../priority/candidates';
import type { LifeDomain } from '../types/lifeDomain';
import * as DS from '../dataState';

const toLife = (d: string): LifeDomain => (['work', 'education', 'body', 'finance', 'spiritual', 'personal', 'guardian', 'external'].includes(d) ? (d as LifeDomain) : 'personal');
const RHYTHM_KIND: Partial<Record<EventContext['category'], RhythmItem['kind']>> = { workout: 'treino', study: 'estudo', practice: 'pratica' };

export interface AgendaContextOptions {
  links?: Record<string, EventLinks>;
  rules?: readonly ImportanceRule[];
  overrides?: ImportanceOverrides;
}

export function eventContextsFor(agenda: AgendaSource, date: string, opts: AgendaContextOptions = {}): EventContext[] {
  const input = dayInputFrom(agenda, date);
  return buildEventContexts({ date, items: input.items, routine: input.routine, travel: input.travel, buffers: input.buffers, links: opts.links, rules: opts.rules, overrides: opts.overrides });
}

/** Janelas livres reais do resto do dia (Agenda), para recomendação/planner. */
export function freeWindowsFor(agenda: AgendaSource, date: string, now: string): FreeWindow[] {
  const day = buildDay(dayInputFrom(agenda, date));
  const nowMin = now.slice(0, 10) === date ? Number(now.slice(11, 13)) * 60 + Number(now.slice(14, 16)) : 0;
  return computeFreeSlots(day.entries, { minMinutes: 10 })
    .filter((s) => s.endMin > nowMin)
    .map((s) => {
      const start = Math.max(s.startMin, nowMin);
      return { startIso: startIso({ date, startMin: start }), endIso: startIso({ date, startMin: s.endMin }), minutes: s.endMin - start };
    });
}

export function agendaContextSource(agenda: AgendaSource, date: string, opts: AgendaContextOptions = {}): ContextSource {
  return {
    id: 'agenda',
    read(now) {
      const input = dayInputFrom(agenda, date);
      const day = buildDay(input);
      const ctxs = eventContextsFor(agenda, date, opts);
      const nowMs = Date.parse(now);
      if (ctxs.length === 0 && day.entries.length === 0) return DS.empty('Nada na Agenda hoje.');

      const items: TodayItem[] = ctxs.map((c) => ({
        id: `event:${c.eventId}`,
        title: c.title,
        kind: 'event',
        domain: toLife(c.domain),
        tier: c.tier,
        startIso: startIso(c),
        endIso: startIso({ date: c.date, startMin: c.endMin }),
        refs: { eventId: c.eventId, projectId: c.relatedProjectId, taskId: c.relatedTaskId },
        source: 'agenda',
      }));
      // rotina (ex.: trabalho fixo) também é "agora"
      const routine: TodayItem[] = day.entries
        .filter((e) => e.kind === 'rotina')
        .map((e) => ({ id: e.id, title: e.title, kind: 'routine', domain: toLife(e.domain ?? 'personal'), tier: 'high', startIso: startIso({ date, startMin: e.startMin }), endIso: startIso({ date, startMin: e.endMin }), source: 'agenda' }));
      const all = [...items, ...routine];
      const contribution: ContextContribution = {
        now: all.filter((i) => Date.parse(i.startIso!) <= nowMs && Date.parse(i.endIso!) > nowMs),
        next: all.filter((i) => Date.parse(i.startIso!) > nowMs),
        rhythm: ctxs
          .filter((c) => RHYTHM_KIND[c.category])
          .map((c) => ({ id: `rhythm:${c.eventId}`, title: c.title, kind: RHYTHM_KIND[c.category]!, domain: toLife(c.domain), startIso: startIso(c), source: 'agenda' })),
        attention: ctxs
          .filter((c) => c.conflictsWith.length > 0 && (c.tier === 'critical' || c.tier === 'high') && Date.parse(startIso({ date: c.date, startMin: c.endMin })) > nowMs)
          .map((c): AttentionItem => ({ id: `conflict:${c.eventId}`, reason: 'conflito', severity: c.tier === 'critical' ? 'alta' : 'media', title: c.title, detail: { conflitaCom: c.conflictsWith.join(', '), cede: c.yieldsInConflict }, dueIso: startIso(c), refs: { eventId: c.eventId }, source: 'agenda' })),
      };
      return day.issues.length > 0 ? DS.partial(contribution, day.issues, 'fonte_incompleta', agenda.origin, now) : DS.ready(contribution, agenda.origin, now);
    },
  };
}

/** Prazos e marcos que pedem atenção. `availableMinutes(projectId)` vem do planner/tempo livre real. */
export function projectsContextSource(projects: ProjectRepository, tasks: TaskRepository, availableMinutes?: (projectId: string, deadlineIso: string) => number | undefined, horizonHours = 72): ContextSource {
  return {
    id: 'projects',
    read(now) {
      const active = projects.list({ status: ['active', 'planning'] });
      if (active.length === 0) return DS.empty('Nenhum projeto ativo.');
      const all = tasks.list();
      const attention: AttentionItem[] = [];
      for (const p of active) {
        const prog = projectProgress(p, all, now);
        const next = prog.nextDeadline;
        const avail = next && availableMinutes ? availableMinutes(p.id, next.dueAt) : undefined;
        const a = assessDeadline(p, all, now, avail);
        if (a.feasibility === 'vencido') attention.push({ id: `deadline:${p.id}`, reason: 'prazo_inviavel', severity: 'alta', title: p.title, detail: { situacao: 'vencido', restanteMin: a.remainingMinutes }, dueIso: a.deadline?.dueAt, refs: { projectId: p.id }, source: 'projects' });
        else if (a.deadline && a.hoursUntilDeadline !== undefined && a.hoursUntilDeadline <= horizonHours && prog.remainingMinutes + prog.tasksWithoutEstimate > 0) {
          const severe = a.feasibility === 'inviavel' || a.feasibility === 'apertado' || a.hoursUntilDeadline <= 36;
          attention.push({
            id: `deadline:${p.id}`,
            reason: a.feasibility === 'inviavel' ? 'prazo_inviavel' : 'prazo_proximo',
            severity: severe ? 'alta' : 'media',
            title: p.title,
            detail: { prazo: a.deadline.label, horasRestantes: a.hoursUntilDeadline, restanteMin: a.remainingMinutes, viabilidade: a.feasibility, disponivelMin: a.availableMinutes },
            dueIso: a.deadline.dueAt,
            refs: { projectId: p.id },
            source: 'projects',
          });
        }
        for (const m of prog.milestones.filter((x) => x.state === 'atrasado')) {
          attention.push({ id: `milestone:${p.id}:${m.milestoneId}`, reason: 'marco_atrasado', severity: 'media', title: `${p.title} — ${p.milestones.find((x) => x.id === m.milestoneId)?.title ?? m.milestoneId}`, detail: { restanteMin: m.remainingMinutes }, refs: { projectId: p.id }, source: 'projects' });
        }
      }
      return DS.ready({ attention }, projects.origin, now);
    },
  };
}

export function remindersContextSource(engine: ReminderEngine): ContextSource {
  return {
    id: 'reminders',
    read(now) {
      const records = engine.list();
      const attention: AttentionItem[] = records
        .filter((r) => (r.state === 'delivered' || r.state === 'partially_delivered') && r.requiresAcknowledgement && r.eventEndIso > now.slice(0, 19))
        .map((r) => ({ id: `ack:${r.occurrenceKey}`, reason: 'lembrete_sem_reconhecimento' as const, severity: 'alta' as const, title: r.title, detail: { gatilho: r.offsetMinutes, canais: r.deliveries.filter((d) => d.status === 'delivered').map((d) => d.channel).join(', ') }, dueIso: r.eventStartIso, refs: { eventId: r.eventId, reminderId: r.id }, source: 'reminders' as const }));
      // canal bloqueado só importa se há lembrete crítico/alto por vir que dependia dele
      const blockedCaps = engine.capabilities().filter((c) => c.status !== 'available');
      const upcomingImportant = records.filter((r) => r.state === 'scheduled' && (r.tier === 'critical' || r.tier === 'high'));
      for (const cap of blockedCaps) {
        if (upcomingImportant.some((r) => r.channels.includes(cap.channel))) {
          attention.push({ id: `channel:${cap.channel}`, reason: 'canal_bloqueado', severity: 'media', title: cap.channel, detail: { status: cap.status, motivo: cap.reason }, source: 'reminders' });
        }
      }
      if (records.length === 0) return DS.empty('Nenhum lembrete.');
      return DS.ready({ attention }, 'derived', now);
    },
  };
}

export function guardianContextSource(): ContextSource {
  return {
    id: 'guardian',
    read(now) {
      const center = buildUniversalActionCenter();
      const attention: AttentionItem[] = center.awaitingApproval.map((a) => ({
        id: `approval:${a.id}`,
        reason: 'aprovacao_pendente',
        severity: a.risk === 'alto' ? 'alta' : 'media',
        title: a.intent,
        detail: { dominio: a.sourceDomain, risco: a.risk, autonomia: a.autonomy, prazo: a.approval?.expiresAt },
        dueIso: a.approval?.expiresAt,
        refs: { actionId: a.id },
        source: 'guardian',
      }));
      return center.recent.length === 0 ? DS.empty('Nenhuma ação proposta.') : DS.ready({ attention }, 'real', now);
    },
  };
}

/** Recomendações a partir de tarefas/projetos priorizados e do tempo livre real da Agenda. */
export function recommendationsContextSource(input: {
  agenda: AgendaSource;
  date: string;
  tasks: TaskRepository;
  projects?: ProjectRepository;
  practices?: RecommendationInput['practices'];
  energy?: RecommendationInput['energy'];
  contextTag?: RecommendationInput['contextTag'];
}): ContextSource {
  return {
    id: 'recommendations',
    read(now) {
      const all = input.tasks.list();
      const windows = freeWindowsFor(input.agenda, input.date, now);
      const freeTotal = windows.reduce((s, w) => s + w.minutes, 0);
      const projectTaskIds = new Set<string>();
      const cands: PriorityCandidate[] = [];
      for (const p of input.projects?.list({ status: ['active', 'planning'] }) ?? []) {
        for (const c of fromProjectTasks(p, all, now, freeTotal)) {
          cands.push(c);
          projectTaskIds.add(c.refs!.taskId!);
        }
      }
      for (const t of all) if (!projectTaskIds.has(t.id) && t.status !== 'done' && t.status !== 'cancelled') cands.push(fromTask(t, all));
      const recs = recommend({ now, freeWindows: windows, ranked: rankCandidates(cands, now), practices: input.practices, energy: input.energy, contextTag: input.contextTag });
      if (cands.length === 0 && !input.practices?.length) return DS.empty('Nada para recomendar.');
      return DS.ready({ recommendations: recs }, 'derived', now);
    },
  };
}
