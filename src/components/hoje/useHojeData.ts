'use client';

/**
 * Hoje ← Personal OS. Traduz o runtime (Agenda real, tarefas, projetos,
 * Guardian, lembretes, recomendação) para as formas que a tela do Anti já usa.
 *
 * Procedência explícita: REAL (Agenda com itens hoje), EMPTY (nada hoje — e a tela
 * DIZ isso), FIXTURE (só com ?demo=1, sempre marcado), PARTIAL (há dados reais,
 * mas alguma fonte não está conectada).
 */

import { useCallback, useMemo } from 'react';
import { useAgenda } from '@/context/AgendaContext';
import { usePersonalOS } from '@/context/PersonalOSContext';
import { formatDateISO } from '@/components/agenda/agendaFixtures';
import { expandRecurringItems } from '@/components/agenda/agendaHelpers';
import { withoutAgendaExamples } from '@/lib/agendaExamples';
import { hojeFixtureItems } from '@/fixtures/hojeFixtures';
import type { AgendaItem } from '@/types/agenda';
import type { HojeCategoria, HojeItem } from '@/lib/hojeFoundation';
import { formatMinutes } from '@/lib/hojeFoundation';
import type { DataProvenance } from '@/lib/dataMode';
import { INITIAL_HOJE_HISTORY, INITIAL_HOJE_NOTICES, INITIAL_HOJE_TASKS } from './hojeTasksFixtures';
import type { HojeGuardianNotice, HojeHistoryEntry, HojeTask } from './hojeTasksFixtures';
import type { Recommendation } from '@/foundation/recommendations/engine';
import type { AttentionItem } from '@/foundation/context/aggregator';

const DOMAIN_TO_CAT: Record<string, HojeCategoria> = { education: 'estudo', work: 'trabalho', body: 'saude' };

export function mapAgendaToHojeItem(it: AgendaItem): HojeItem {
  let startMinutes = 8 * 60;
  if (it.startTime) {
    const [h, m] = it.startTime.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) startMinutes = h * 60 + m;
  }
  let durationMinutes = it.durationMinutes || 0;
  if (!durationMinutes && it.startTime && it.endTime) {
    const [eh, em] = it.endTime.split(':').map(Number);
    durationMinutes = Math.max(5, eh * 60 + em - startMinutes);
  }
  return { id: it.id, title: it.title, category: DOMAIN_TO_CAT[it.domain] ?? 'pessoal', startMinutes, durationMinutes: durationMinutes || 60 };
}

const DOMAIN_LABEL: Record<string, { label: string; icon: string; hoje: HojeGuardianNotice['domain'] }> = {
  finance: { label: 'Finanças', icon: 'credit_card', hoje: 'finance' },
  agenda: { label: 'Agenda', icon: 'schedule', hoje: 'agenda' },
  email: { label: 'E-mail', icon: 'mail', hoje: 'agenda' },
  education: { label: 'Educação', icon: 'school', hoje: 'education' },
  body: { label: 'Corpo', icon: 'fitness_center', hoje: 'body' },
  spiritual: { label: 'Espiritual', icon: 'self_improvement', hoje: 'spiritual' },
};

function dueLabelOf(dueAt: string | undefined, nowIso: string): string {
  if (!dueAt) return 'Sem prazo';
  const today = nowIso.slice(0, 10);
  const date = dueAt.slice(0, 10);
  const time = dueAt.length > 10 ? dueAt.slice(11, 16) : undefined;
  if (date === today) return time ? `Hoje até ${time}` : 'Hoje';
  if (date < today) return `Venceu em ${date.slice(8, 10)}/${date.slice(5, 7)}`;
  return `Até ${date.slice(8, 10)}/${date.slice(5, 7)}${time ? ` ${time}` : ''}`;
}

const ATTENTION_TEXT: Partial<Record<AttentionItem['reason'], (a: AttentionItem) => string>> = {
  prazo_proximo: (a) => `Prazo "${a.detail.prazo ?? ''}" em ${a.detail.horasRestantes ?? '?'} h · viabilidade: ${a.detail.viabilidade ?? '—'}`,
  prazo_inviavel: (a) => `Prazo ${a.detail.situacao === 'vencido' ? 'vencido' : 'inviável com o tempo livre real'} · faltam ${a.detail.restanteMin ?? '?'} min de trabalho`,
  marco_atrasado: (a) => `Marco atrasado · ${a.detail.restanteMin ?? '?'} min restantes`,
  conflito: (a) => `Conflita com outro compromisso (${a.detail.conflitaCom ?? ''})`,
  lembrete_sem_reconhecimento: () => 'Lembrete entregue e ainda não reconhecido',
  canal_bloqueado: (a) => `Canal de aviso indisponível: ${a.detail.motivo ?? a.title}`,
  email_requer_acao: () => 'E-mail pede uma ação sua',
  email_prazo: () => 'Prazo detectado em e-mail',
  email_risco: () => 'E-mail com risco identificado',
};

const EMPTY_AGENDA: AgendaItem[] = [];

export function useHojeData(demo: boolean) {
  const { items: rawAgendaItems } = useAgenda();
  const { os, version, ready } = usePersonalOS();
  // Antes de carregar o estado salvo, a primeira renderização precisa ser igual ao HTML estático
  // (que não conhece o localStorage). A Agenda entra junto com o resto, quando `ready`.
  const agendaItems = ready ? rawAgendaItems : EMPTY_AGENDA;
  const nowIso = os.now();
  const todayStr = nowIso.slice(0, 10);

  // ---- itens do dia: Agenda real (recorrência expandida) ----
  const realTodayItems = useMemo(() => {
    const d = new Date(`${todayStr}T00:00:00`);
    return withoutAgendaExamples(expandRecurringItems(agendaItems, d, d), demo)
      .filter((it) => it.date === todayStr && it.status !== 'cancelled' && !it.allDay && it.startTime)
      .map(mapAgendaToHojeItem)
      .sort((a, b) => a.startMinutes - b.startMinutes);
  }, [agendaItems, todayStr, demo]);

  const fixtureMode = demo && realTodayItems.length === 0;
  const todayItems: HojeItem[] = fixtureMode ? hojeFixtureItems : realTodayItems;

  // ---- estado do dia (persistido) ----
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const todayState = useMemo(() => os.todayState(), [os, version]);
  const completedItemIds = useMemo(() => new Set(todayState.completedIds), [todayState]);

  // ---- contexto agregado (Agora/Próximo/Atenção/Recomendação) ----
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const today = useMemo(() => os.todayContext(), [os, version, agendaItems]);
  const todayData = today.status === 'ready' || today.status === 'partial' ? today.data : undefined;
  const missingSources = today.status === 'partial' ? today.missing : [];

  const provenance: DataProvenance = fixtureMode ? 'fixture' : realTodayItems.length === 0 ? 'empty' : missingSources.length > 0 ? 'partial' : 'real';

  // ---- tarefas reais ----
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const taskViews = useMemo(() => os.taskViews(), [os, version]);
  const realTasks: HojeTask[] = useMemo(
    () =>
      taskViews.map(({ task, projectTitle, overdue, actionable, blockedBy }) => ({
        id: task.id,
        title: task.title,
        project: projectTitle,
        domain: (['education', 'finance', 'body', 'spiritual', 'work'].includes(task.domain) ? task.domain : 'pessoal') as HojeTask['domain'],
        status: task.status === 'done' ? 'completed' : task.status === 'cancelled' ? 'cancelled' : task.status === 'blocked' ? 'delayed' : task.status === 'in_progress' ? 'in_progress' : 'pending',
        priority: task.priority === 'critical' || task.priority === 'high' ? 'high' : task.priority === 'low' ? 'low' : 'medium',
        estimatedMinutes: task.estimatedMinutes ?? 0,
        dueLabel: dueLabelOf(task.dueAt, nowIso),
        isOverdue: overdue,
        blockedReason: task.status === 'blocked' ? task.blockedReason : actionable ? undefined : blockedBy,
      })),
    [taskViews, nowIso]
  );
  const tasks: HojeTask[] = realTasks.length > 0 || !demo ? realTasks : INITIAL_HOJE_TASKS.map((t) => ({ ...t, isExample: true }));

  // ---- avisos do Guardian: aprovações pendentes + atenção real ----
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const actionViews = useMemo(() => os.actionViews(100), [os, version]);
  const notices: HojeGuardianNotice[] = useMemo(() => {
    const dismissed = new Set(todayState.dismissed);
    const out: HojeGuardianNotice[] = [];
    for (const a of actionViews.filter((x) => x.state === 'aguardando_aprovacao')) {
      const d = DOMAIN_LABEL[a.domain] ?? { label: a.domain, icon: 'shield', hoje: 'agenda' as const };
      out.push({
        id: `action:${a.id}`,
        type: 'pending_approval',
        title: a.intent,
        domain: d.hoje,
        domainLabel: d.label,
        domainIcon: d.icon,
        description: a.reason ?? 'Proposta aguardando sua decisão no Guardian.',
        autonomyLevel: (a.autonomy as HojeGuardianNotice['autonomyLevel']) ?? 'L2',
        actionLabel: 'Aprovar',
        actionKind: 'approve_action',
        status: 'active',
        actionId: a.id,
      });
    }
    for (const at of todayData?.atencao ?? []) {
      if (at.reason === 'aprovacao_pendente') continue; // já listado acima
      const kind: HojeGuardianNotice['actionKind'] = at.reason.startsWith('prazo') || at.reason === 'marco_atrasado' ? 'open_tasks' : 'open_agenda';
      out.push({
        id: `attention:${at.id}`,
        type: at.severity === 'alta' ? 'risk_alert' : 'recommendation',
        title: at.title,
        domain: at.source === 'projects' ? 'education' : 'agenda',
        domainLabel: at.source === 'projects' ? 'Projetos' : at.source === 'reminders' ? 'Lembretes' : at.source === 'email' ? 'E-mail' : 'Agenda',
        domainIcon: at.source === 'projects' ? 'flag' : at.source === 'reminders' ? 'notifications' : 'event',
        description: ATTENTION_TEXT[at.reason]?.(at) ?? at.reason,
        autonomyLevel: 'L1',
        actionLabel: kind === 'open_tasks' ? 'Ver tarefas' : 'Abrir Agenda',
        actionKind: kind,
        status: 'active',
      });
    }
    const live = out.filter((n) => !dismissed.has(n.id));
    if (live.length > 0 || !demo) return live;
    return INITIAL_HOJE_NOTICES.map((n) => ({ ...n, isExample: true })).filter((n) => !dismissed.has(n.id));
  }, [actionViews, todayData, todayState, demo]);

  // ---- histórico do dia (persistido) ----
  const history: HojeHistoryEntry[] = useMemo(() => {
    const real = todayState.history.map((h) => ({
      id: h.id,
      title: h.title,
      category: (h.category as HojeCategoria) ?? 'pessoal',
      timeLabel: `${h.plannedStart ?? '—'} — ${h.completedAt.slice(11, 16)}`,
      status: 'completed' as const,
      durationMinutes: h.durationMinutes,
      resultSummary: 'Concluído na tela Hoje (salvo neste navegador).',
    }));
    return real.length > 0 || !demo ? real : INITIAL_HOJE_HISTORY.map((h) => ({ ...h, isExample: true }));
  }, [todayState, demo]);

  // ---- recomendação: Recommendation Engine sobre tarefas reais + tempo livre real ----
  const dismissedRecs = new Set(todayState.dismissed);
  const recommendation: Recommendation | undefined = [todayData?.recomendacao, ...(todayData?.outrasRecomendacoes ?? [])].find((r) => r && !dismissedRecs.has(`rec:${r.id}`)) ?? undefined;

  // ---- janelas do dia: contadas da Agenda (antes: frases fixas) ----
  const windows = useMemo(() => {
    const tomorrow = formatDateISO(new Date(new Date(`${todayStr}T12:00:00`).getTime() + 86_400_000));
    const t = new Date(`${tomorrow}T00:00:00`);
    const amanha = withoutAgendaExamples(expandRecurringItems(agendaItems, t, t), demo).filter((it) => it.date === tomorrow && it.status !== 'cancelled');
    const nowMin = Number(nowIso.slice(11, 13)) * 60 + Number(nowIso.slice(14, 16));
    const tarde = realTodayItems.filter((i) => i.startMinutes >= Math.max(12 * 60, nowMin) && i.startMinutes < 18 * 60);
    const noite = realTodayItems.filter((i) => i.startMinutes >= Math.max(18 * 60, nowMin));
    const list = (xs: HojeItem[]) => xs.slice(0, 3).map((x) => `${formatMinutes(x.startMinutes)} ${x.title}`).join(' · ');
    return {
      tarde: tarde.length ? `Tarde: ${tarde.length} compromisso(s) — ${list(tarde)}.` : 'Tarde: nada agendado daqui em diante.',
      noite: noite.length ? `Noite: ${noite.length} compromisso(s) — ${list(noite)}.` : 'Noite: nada agendado.',
      amanha: amanha.length ? `Amanhã: ${amanha.length} compromisso(s) na Agenda.` : 'Amanhã: nada na Agenda ainda.',
    };
  }, [agendaItems, realTodayItems, todayStr, nowIso, demo]);

  // ---- ações ----
  const completeBlock = useCallback(
    (item: HojeItem, extended: number) => os.completeBlock({ itemId: item.id, title: item.title, category: item.category, plannedStart: formatMinutes(item.startMinutes), durationMinutes: item.durationMinutes + extended }),
    [os]
  );

  return {
    ready,
    os,
    nowIso,
    todayItems,
    realTodayItems,
    provenance,
    missingSources,
    todayData,
    todayState,
    completedItemIds,
    tasks,
    notices,
    history,
    recommendation,
    windows,
    completeBlock,
    projects: os.projectViews(),
  };
}
