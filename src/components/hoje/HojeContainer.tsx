'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useAgenda } from '@/context/AgendaContext';
import { useShell } from '@/context/ShellContext';
import { useDemoMode } from '@/lib/dataMode';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { useHojeData } from './useHojeData';
import { EXECUTION_STATE_LABEL } from '@/foundation/actions/executors';
import {
  groupHojeItems,
  formatMinutes,
  CATEGORY_ICON,
  CATEGORY_LABEL,
  HojeItem,
  HojeCategoria,
} from '@/lib/hojeFoundation';
import { playFeedback } from '@/lib/audioFeedback';
import type { HojeGuardianNotice } from './hojeTasksFixtures';

type HojeSubView = 'agora' | 'contexto' | 'historico';
type TemporalWindow = 'agora' | 'proximo' | 'tarde' | 'noite' | 'amanha';

function useNowMinutes(): number {
  const [now, setNow] = useState<number>(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    };
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  return now;
}

export function HojeContainer() {
  const nowMinutes = useNowMinutes();
  const { items: agendaItems } = useAgenda();
  const { setActiveRoute, triggerIslandNotification } = useShell();
  const demo = useDemoMode();
  const {
    os,
    ready,
    todayItems,
    provenance,
    missingSources,
    todayState,
    completedItemIds,
    tasks,
    notices,
    history,
    recommendation,
    windows,
    completeBlock,
    projects,
  } = useHojeData(demo);

  // Subnavegação interna do domínio Hoje
  const [subView, setSubView] = useState<HojeSubView>('agora');
  const [temporalWindow, setTemporalWindow] = useState<TemporalWindow>('agora');

  // Estados de interação puramente visual (seleção) — o resto vem do Personal OS e é persistido
  const [selectedRibbonItemId, setSelectedRibbonItemId] = useState<string | null>(null);
  const [lastCompletedId, setLastCompletedId] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<'all' | 'overdue' | 'today' | 'completed'>('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskMinutes, setNewTaskMinutes] = useState('');
  const [newTaskProject, setNewTaskProject] = useState('');
  const [newTaskDependsOn, setNewTaskDependsOn] = useState('');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectObjective, setNewProjectObjective] = useState('');
  const [newProjectDue, setNewProjectDue] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fila da janela: compromissos REAIS de hoje a partir do que está acontecendo agora.
  // Sem itens hoje não há fila — e a tela diz isso (nada de bloco inventado para preencher).
  const { agora: baseAgora } = useMemo(() => groupHojeItems(todayItems, nowMinutes), [todayItems, nowMinutes]);
  const windowQueue = useMemo(() => {
    if (todayItems.length === 0) return [];
    const agoraIdx = baseAgora ? todayItems.findIndex((it) => it.id === baseAgora.id) : -1;
    if (agoraIdx >= 0) return todayItems.slice(agoraIdx);
    return todayItems.filter((it) => it.startMinutes + it.durationMinutes > nowMinutes);
  }, [todayItems, baseAgora, nowMinutes]);

  const activeItem: HojeItem | null = useMemo(() => windowQueue.filter((it) => !completedItemIds.has(it.id))[0] || null, [windowQueue, completedItemIds]);
  const nextItem: HojeItem | null = useMemo(() => windowQueue.filter((it) => !completedItemIds.has(it.id))[1] || null, [windowQueue, completedItemIds]);
  const lastCompletedItem: HojeItem | null = useMemo(() => {
    const id = lastCompletedId ?? todayState.completedIds[todayState.completedIds.length - 1];
    return todayItems.find((it) => it.id === id) ?? null;
  }, [lastCompletedId, todayState, todayItems]);
  const extendedMinutes = activeItem ? todayState.extendedMinutes[activeItem.id] ?? 0 : 0;
  const telemedConfirmed = (id?: string) => !!id && todayState.checkins.includes(id);
  const allTodayDone = todayItems.length > 0 && todayItems.every((it) => completedItemIds.has(it.id));

  // Cálculo de progresso do item atual
  const progressPercent = useMemo(() => {
    if (!activeItem) return 0;
    const elapsed = Math.max(0, nowMinutes - activeItem.startMinutes);
    const total = activeItem.durationMinutes + extendedMinutes;
    if (total <= 0) return 0;
    return Math.min(100, Math.round((elapsed / total) * 100));
  }, [activeItem, nowMinutes, extendedMinutes]);

  const minutesRemaining = useMemo(() => {
    if (!activeItem) return 0;
    const total = activeItem.durationMinutes + extendedMinutes;
    const elapsed = Math.max(0, nowMinutes - activeItem.startMinutes);
    return Math.max(0, total - elapsed);
  }, [activeItem, nowMinutes, extendedMinutes]);

  // Bloco que já passou do fim mas não foi marcado: é pendência, não "foco em execução".
  const activeEndedMinutesAgo = useMemo(() => {
    if (!activeItem) return 0;
    const end = activeItem.startMinutes + activeItem.durationMinutes + extendedMinutes;
    return nowMinutes >= end ? nowMinutes - end : 0;
  }, [activeItem, nowMinutes, extendedMinutes]);
  const activeEnded = !!activeItem && activeItem.startMinutes + activeItem.durationMinutes + extendedMinutes <= nowMinutes;

  // Consulta/telemedicina de hoje (para o check-in)
  const todayStr = os.now().slice(0, 10);
  const telemedicineEvent = useMemo(() => {
    return agendaItems.find((it) => {
      const titleLower = it.title.toLowerCase();
      return (
        it.date === todayStr &&
        (titleLower.includes('telemedicina') || titleLower.includes('consulta') || titleLower.includes('médico') || titleLower.includes('medico') || titleLower.includes('exame'))
      );
    });
  }, [agendaItems, todayStr]);

  // Concluir: persistido (recarregar não "desconclui")
  const handleCompleteActive = useCallback(() => {
    if (!activeItem) return;
    const currentCompleted = activeItem;
    completeBlock(currentCompleted, extendedMinutes);
    setLastCompletedId(currentCompleted.id);
    playFeedback('action');
    triggerIslandNotification({
      title: 'Bloco Concluído!',
      tag: 'MATRIZ DE ATENÇÃO',
      description: `${currentCompleted.title} foi concluído. ${nextItem ? `Próximo: ${nextItem.title}` : 'Sem mais blocos na janela.'}`,
      badge: 'SALVO',
      state: 'active',
      durationMs: 4000,
    });
  }, [activeItem, nextItem, extendedMinutes, completeBlock, triggerIslandNotification]);

  const handleExtendActive = useCallback(() => {
    if (!activeItem) return;
    os.extendBlock(activeItem.id, 15);
    playFeedback('press');
  }, [activeItem, os]);

  const handleConfirmTelemed = useCallback(() => {
    if (telemedicineEvent) os.confirmCheckin(telemedicineEvent.id);
    playFeedback('success');
    const link = telemedicineEvent?.location?.startsWith('http') ? telemedicineEvent.location : undefined;
    triggerIslandNotification({
      title: 'Check-in Confirmado',
      tag: 'CONSULTA',
      description: link ? 'Presença confirmada (salva neste navegador). O link da sala está no compromisso.' : 'Presença confirmada e salva. Este compromisso não tem link de sala cadastrado.',
      badge: 'CONFIRMADO',
      state: 'active',
      durationMs: 4500,
      ...(link ? { actionLabel: 'Abrir Sala', onAction: () => window.open(link, '_blank') } : {}),
    });
  }, [telemedicineEvent, os, triggerIslandNotification]);

  // Tarefas reais (Personal OS). Exemplos (modo demo) não são editáveis.
  const handleToggleTask = useCallback(
    (taskId: string) => {
      const t = tasks.find((x) => x.id === taskId);
      if (!t || t.isExample) return;
      try {
        os.setTaskStatus(taskId, t.status === 'completed' ? 'todo' : 'done');
        playFeedback(t.status === 'completed' ? 'press' : 'action');
      } catch (err) {
        playFeedback('error');
        triggerIslandNotification({ title: 'Ainda não dá para concluir', tag: 'TAREFAS', description: err instanceof Error ? err.message : String(err), state: 'attention', durationMs: 4500 });
      }
    },
    [tasks, os, triggerIslandNotification]
  );

  const handleTaskStatus = useCallback(
    (taskId: string, to: 'blocked' | 'cancelled' | 'todo') => {
      try {
        if (to === 'blocked') {
          const reason = typeof window !== 'undefined' ? window.prompt('Por que esta tarefa está bloqueada?') : null;
          if (!reason?.trim()) return;
          os.setTaskStatus(taskId, 'blocked', { reason });
        } else {
          os.setTaskStatus(taskId, to);
        }
        playFeedback('press');
      } catch (err) {
        triggerIslandNotification({ title: 'Não foi possível', tag: 'TAREFAS', description: err instanceof Error ? err.message : String(err), state: 'attention', durationMs: 4000 });
      }
    },
    [os, triggerIslandNotification]
  );

  const handleCreateTask = useCallback(() => {
    setFormError(null);
    try {
      os.createTask({
        title: newTaskTitle,
        dueAt: newTaskDue || undefined,
        estimatedMinutes: newTaskMinutes ? Number(newTaskMinutes) : undefined,
        projectId: newTaskProject || undefined,
        dependsOn: newTaskDependsOn ? [newTaskDependsOn] : [],
        domain: newTaskProject ? os.projects().find((p) => p.id === newTaskProject)?.relatedDomains[0] : undefined,
      });
      setNewTaskTitle('');
      setNewTaskDue('');
      setNewTaskMinutes('');
      setNewTaskDependsOn('');
      playFeedback('success');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
      playFeedback('error');
    }
  }, [os, newTaskTitle, newTaskDue, newTaskMinutes, newTaskProject, newTaskDependsOn]);

  const handleCreateProject = useCallback(() => {
    setFormError(null);
    try {
      os.createProject({ title: newProjectTitle, objective: newProjectObjective || newProjectTitle, deadline: newProjectDue ? { label: 'Entrega', dueAt: newProjectDue } : undefined });
      setNewProjectTitle('');
      setNewProjectObjective('');
      setNewProjectDue('');
      playFeedback('success');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
      playFeedback('error');
    }
  }, [os, newProjectTitle, newProjectObjective, newProjectDue]);

  // Avisos do Guardian: aprovar pelo Action Center real; a mensagem diz o que DE FATO aconteceu
  const handleResolveNotice = useCallback(
    (notice: HojeGuardianNotice) => {
      if (notice.isExample) {
        os.dismissNotice(notice.id);
        triggerIslandNotification({ title: 'Exemplo', tag: 'DADOS DE EXEMPLO', description: 'Aviso de demonstração — nenhuma ação real foi executada.', badge: 'EXEMPLO', state: 'active', durationMs: 3000 });
        return;
      }
      if (notice.actionKind === 'approve_action' && notice.actionId) {
        try {
          const r = os.approve(notice.actionId);
          playFeedback(r.state === 'executada' ? 'success' : 'action');
          triggerIslandNotification({
            title: EXECUTION_STATE_LABEL[r.state],
            tag: 'GUARDIAN',
            description: r.state === 'aprovada_sem_executor' ? 'Aprovação registrada na auditoria. Nada foi executado: não há executor conectado para esta ação.' : r.report?.evidence ?? r.report?.error ?? 'Decisão registrada.',
            badge: r.state === 'executada' ? 'EXECUTADO' : r.state === 'aprovada_sem_executor' ? 'SEM EXECUTOR' : 'REGISTRADO',
            state: r.state === 'falhou' ? 'error' : 'active',
            durationMs: 5000,
            actionLabel: 'Ver no Guardian',
            onAction: () => setActiveRoute('guardian'),
          });
        } catch (err) {
          triggerIslandNotification({ title: 'Não foi possível aprovar', tag: 'GUARDIAN', description: err instanceof Error ? err.message : String(err), state: 'error', durationMs: 4500 });
        }
      } else if (notice.actionKind === 'open_telemed') {
        handleConfirmTelemed();
      } else if (notice.actionKind === 'open_tasks') {
        setSubView('contexto');
      } else if (notice.actionKind === 'open_agenda') {
        setActiveRoute('agenda');
      }
    },
    [os, handleConfirmTelemed, triggerIslandNotification, setActiveRoute]
  );

  const handleAcceptRecommendation = useCallback(() => {
    if (!recommendation) return;
    try {
      const r = os.acceptRecommendation(recommendation);
      playFeedback(r.state === 'executada' ? 'success' : 'action');
      triggerIslandNotification({
        title: r.state === 'executada' ? 'Bloco reservado na Agenda' : EXECUTION_STATE_LABEL[r.state],
        tag: 'RECOMENDAÇÃO · GUARDIAN',
        description: r.state === 'executada' ? `${recommendation.durationMinutes} min para "${recommendation.title}" às ${recommendation.window.startIso.slice(11, 16)}.` : r.report?.error ?? 'Decisão registrada.',
        badge: r.state === 'executada' ? 'NA AGENDA' : 'REGISTRADO',
        state: 'active',
        durationMs: 4500,
        actionLabel: 'Ver na Agenda',
        onAction: () => setActiveRoute('agenda'),
      });
    } catch (err) {
      triggerIslandNotification({ title: 'Não foi possível reservar', tag: 'RECOMENDAÇÃO', description: err instanceof Error ? err.message : String(err), state: 'error', durationMs: 4000 });
    }
  }, [recommendation, os, triggerIslandNotification, setActiveRoute]);

  // Filtragem de tarefas
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (taskFilter === 'overdue') return t.isOverdue && t.status !== 'completed';
      if (taskFilter === 'today') return !t.isOverdue && t.status !== 'completed' && t.status !== 'cancelled';
      if (taskFilter === 'completed') return t.status === 'completed';
      return true;
    });
  }, [tasks, taskFilter]);

  // Contadores analíticos do dia
  const completedTasksCount = useMemo(() => tasks.filter((t) => t.status === 'completed').length, [tasks]);
  const overdueTasksCount = useMemo(() => tasks.filter((t) => t.isOverdue && t.status !== 'completed').length, [tasks]);
  const completedBlocksCount = useMemo(() => history.filter((h) => h.status === 'completed').length, [history]);
  const guardianNotices = notices;

  // Formatação do dia
  const dateFormatted = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, []);

  return (
    <main
      className="w-full pb-20 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col gap-8 pt-6 flex-1 study-stage-enter"
      aria-label="Central de Contexto Hoje"
    >
      {/* 1. CABEÇALHO CONTEXTUAL + NAVEGAÇÃO INTERNA DO DOMÍNIO */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#71DBD2] animate-pulse" aria-hidden="true" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-text-muted">
              Central Operacional do Dia
            </span>
            <span className="text-text-muted/40">•</span>
            <span className="text-[11px] font-mono text-text-secondary tabular-nums">
              {ready ? formatMinutes(nowMinutes) : '--:--'}
            </span>
            {ready && (
              <ProvenanceBadge
                kind={provenance}
                detail={
                  provenance === 'empty'
                    ? 'nada na Agenda hoje'
                    : provenance === 'fixture'
                    ? 'modo demonstração'
                    : provenance === 'partial'
                    ? `${missingSources.length} fonte(s) não conectada(s)`
                    : 'Agenda e tarefas reais'
                }
              />
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary capitalize">
            {dateFormatted}
          </h1>
        </div>

        {/* Subnav interna de Hoje: Agora vs Contexto vs Histórico */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface border border-border/70 shadow-subtle self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setSubView('agora');
              playFeedback('press');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 ${
              subView === 'agora'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">timer</span>
            <span>Agora</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('contexto');
              playFeedback('press');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 ${
              subView === 'contexto'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">check_box</span>
            <span>Tarefas &amp; Projetos</span>
            {overdueTasksCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#C45B5B]" title="Tarefas atrasadas" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView('historico');
              playFeedback('press');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-mono font-medium transition-all flex items-center gap-1.5 ${
              subView === 'historico'
                ? 'bg-[#FAFDF5] font-bold text-text-primary shadow-subtle border border-border/60'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            <span>Histórico</span>
            <span className="text-[10px] font-mono text-text-muted">({completedBlocksCount})</span>
          </button>
        </div>
      </header>

      {/* 2. AÇÕES DO GUARDIAN EM FOCO (INTEGRAÇÃO REAL CROSS-DOMAIN) */}
      {guardianNotices.filter((n) => n.status === 'active').length > 0 && (
        <section aria-label="Ações Pendentes do Guardian" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-[#71DBD2]">shield</span>
              <span>Ações do Guardian Requeridas</span>
            </span>
            <span className="text-[11px] font-mono text-[#71DBD2]">
              {guardianNotices.filter((n) => n.status === 'active').length} ativas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {guardianNotices
              .filter((n) => n.status === 'active')
              .map((notice) => (
                <div
                  key={notice.id}
                  className="p-4 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col justify-between gap-3 transition-all hover:border-[#71DBD2]/60"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-surface-secondary/70 flex items-center justify-center text-text-primary flex-shrink-0 shadow-subtle">
                      <span className="material-symbols-outlined text-[18px]">
                        {notice.domainIcon}
                      </span>
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-secondary text-text-secondary">
                          {notice.domainLabel}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#71DBD2]">
                          {notice.autonomyLevel}
                        </span>
                        {notice.isExample && <ProvenanceBadge kind="fixture" />}
                      </div>
                      <h4 className="text-[13px] font-bold text-text-primary truncate">
                        {notice.title}
                      </h4>
                      <p className="text-[11px] text-text-secondary leading-snug line-clamp-2">
                        {notice.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => os.dismissNotice(notice.id)}
                      className="px-2.5 py-1 text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors"
                    >
                      Dispensar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveNotice(notice)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#71DBD2] hover:bg-[#71DBD2]/90 text-[#1C2420] text-[12px] font-semibold transition-transform active:scale-95 shadow-subtle flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[15px]">check</span>
                      <span>{notice.actionLabel}</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 1: AGORA (MATRIZ DE ATENÇÃO OPERACIONAL)          */}
      {/* ========================================================= */}
      {subView === 'agora' && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-200">
          {/* A. BLOCO PROTAGONISTA: AGORA */}
          <section aria-label="Compromisso Atual" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
                {activeEnded ? 'Pendente de conclusão' : 'Agora (Foco em Execução)'}
              </span>
              {activeItem && (
                <span className="text-[11px] font-mono text-text-muted tabular-nums">
                  {activeEnded ? `Encerrou há ${activeEndedMinutesAgo} min · marque como concluído` : `${minutesRemaining} min restantes`}
                </span>
              )}
            </div>

            {/* SE HOUVER BLOCO RECÉM-CONCLUÍDO E AINDA EXISTIR BLOCO ATIVO: exibe bloco anterior como concluído */}
            {lastCompletedItem && activeItem && (
              <div
                data-testid="last-completed-summary"
                className="p-4 rounded-2xl bg-[#FAFDF5] border border-[#D0EAA3] shadow-subtle flex items-center justify-between gap-4 transition-all animate-in fade-in slide-in-from-top-1 duration-300"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#D0EAA3] text-[#1C2420] flex items-center justify-center flex-shrink-0 shadow-subtle">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono uppercase text-text-muted">
                        Bloco Anterior
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#D0EAA3]/80 text-[#1C2420] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                        <span>Concluído</span>
                      </span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-secondary text-text-secondary">
                        {CATEGORY_LABEL[lastCompletedItem.category]}
                      </span>
                    </div>
                    <h4 className="text-[13px] font-bold text-text-primary truncate">
                      {lastCompletedItem.title}
                    </h4>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[11px] font-mono text-text-muted tabular-nums">
                    {formatMinutes(lastCompletedItem.startMinutes)} — {formatMinutes(nowMinutes)}
                  </span>
                </div>
              </div>
            )}

            {activeItem ? (
              <div
                className="p-5 sm:p-7 rounded-2xl border transition-all duration-300 bg-[#FAFDF5] border-[#71DBD2]/50 shadow-calm ring-1 ring-[#71DBD2]/20"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-subtle transition-transform duration-300 bg-[#71DBD2] text-[#1C2420]"
                    >
                      <span className="material-symbols-outlined text-[24px]">
                        {CATEGORY_ICON[activeItem.category]}
                      </span>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface-secondary/70 text-text-secondary">
                          {CATEGORY_LABEL[activeItem.category]}
                        </span>
                        <span className="text-[11px] font-mono text-text-muted tabular-nums">
                          {formatMinutes(activeItem.startMinutes)} —{' '}
                          {formatMinutes(activeItem.startMinutes + activeItem.durationMinutes + extendedMinutes)}
                        </span>
                        {extendedMinutes > 0 && (
                          <span className="text-[10px] font-mono text-[#71DBD2] bg-[#71DBD2]/10 px-1.5 py-0.5 rounded">
                            +{extendedMinutes}m
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                        {activeItem.title}
                      </h2>
                    </div>
                  </div>

                  {/* Ações interativas diretas no Agora */}
                  <div className="flex items-center gap-2 pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={handleExtendActive}
                      className="px-3 py-2 rounded-xl bg-surface border border-border/70 hover:border-border text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 shadow-subtle"
                      title="Estender bloco por 15 minutos"
                    >
                      <span className="material-symbols-outlined text-[16px]">more_time</span>
                      <span>+15 min</span>
                    </button>
                    <button
                      type="button"
                      id="btn-concluir-agora"
                      data-testid="btn-concluir-agora"
                      onClick={handleCompleteActive}
                      className="px-4 py-2 rounded-xl bg-[#71DBD2] hover:bg-[#71DBD2]/90 text-[#1C2420] text-[12px] font-semibold transition-transform active:scale-95 flex items-center gap-1.5 shadow-subtle"
                    >
                      <span className="material-symbols-outlined text-[16px]">done</span>
                      <span>Concluir</span>
                    </button>
                  </div>
                </div>

                {/* Barra de progresso orgânica do Agora */}
                <div className="mt-5 space-y-1.5">
                  <div className="w-full bg-surface-secondary/70 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#71DBD2] to-[#ADE4B5] h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                    <span>Iniciado</span>
                    <span>{progressPercent}% decorrido</span>
                    <span>Encerramento previsto</span>
                  </div>
                </div>
              </div>
            ) : todayItems.length === 0 ? (
              /* ESTADO VAZIO VERDADEIRO: nada na Agenda hoje — nunca preenchido com blocos inventados */
              <div data-testid="today-empty-state" className="p-6 sm:p-8 rounded-2xl bg-surface border border-border/70 shadow-calm text-center space-y-3">
                <span className="material-symbols-outlined text-3xl text-text-muted">event_available</span>
                <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">Nenhum compromisso na sua Agenda hoje</h2>
                <p className="text-[13px] text-text-secondary max-w-md mx-auto">
                  {ready ? 'O Hoje mostra só o que existe de verdade. Adicione compromissos na Agenda ou tarefas aqui e o Medusa organiza o dia.' : 'Carregando o que está salvo neste navegador…'}
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                  <button type="button" onClick={() => setActiveRoute('agenda')} className="px-4 py-2 rounded-xl bg-[#71DBD2] hover:bg-[#71DBD2]/90 text-[#1C2420] text-[12px] font-semibold shadow-subtle">
                    Abrir Agenda
                  </button>
                  <button type="button" onClick={() => setSubView('contexto')} className="px-4 py-2 rounded-xl bg-surface border border-border/80 text-[12px] font-medium text-text-primary shadow-subtle">
                    Tarefas ({tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length})
                  </button>
                </div>
              </div>
            ) : (
              /* ESTADO CALMO: QUANDO NÃO HÁ PRÓXIMO BLOCO, O BLOCO RECÉM-CONCLUÍDO PERMANECE REPRESENTADO E HÁ TRANSIÇÃO EXPLÍCITA */
              <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                {/* 1. O BLOCO RECÉM-CONCLUÍDO PERMANECE PROMINENTEMENTE REPRESENTADO */}
                {lastCompletedItem && (
                  <div className="p-5 sm:p-6 rounded-2xl bg-[#FAFDF5] border border-[#D0EAA3] shadow-calm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#D0EAA3] text-[#1C2420] flex items-center justify-center flex-shrink-0 shadow-subtle">
                        <span className="material-symbols-outlined text-[24px]">verified</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#D0EAA3]/70 text-[#1C2420] font-bold">
                            Último Bloco Realizado
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#D0EAA3] text-[#1C2420] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">check</span>
                            <span>Concluído</span>
                          </span>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-secondary text-text-secondary">
                            {CATEGORY_LABEL[lastCompletedItem.category]}
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                          {lastCompletedItem.title}
                        </h3>
                        <p className="text-[11px] font-mono text-text-muted">
                          Concluído com sucesso às {formatMinutes(nowMinutes)} • Duração registrada no histórico
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="px-3 py-1.5 rounded-xl bg-[#D0EAA3]/50 text-[#1C2420] text-[12px] font-medium font-mono flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">task_alt</span>
                        <span>100% Cumprido</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. TRANSIÇÃO EXPLÍCITA PARA DIA/JANELA CONCLUÍDA OU ESTADO CALMO */}
                <div
                  data-testid="calm-state-card"
                  className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#FAFDF5] via-surface to-[#F0FAF7] border border-[#71DBD2]/40 shadow-calm text-center space-y-4"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#71DBD2]/30 to-[#ADE4B5]/40 text-[#1C2420] flex items-center justify-center mx-auto shadow-subtle ring-4 ring-[#71DBD2]/10">
                    <span className="material-symbols-outlined text-[28px] text-[#2D6A5D]">spa</span>
                  </div>
                  <div className="space-y-1.5 max-w-lg mx-auto">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#71DBD2] animate-pulse" />
                      <span className="text-[11px] font-mono uppercase tracking-widest text-[#2D6A5D] font-bold">
                        {allTodayDone ? 'Transição Concluída · Estado Calmo' : 'Sem mais compromissos hoje'}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                      {allTodayDone ? 'Janela do Dia Concluída' : 'Nada mais agendado para hoje'}
                    </h2>
                    <p className="text-[13px] text-text-secondary leading-relaxed">
                      {allTodayDone
                        ? 'Todos os blocos de hoje foram marcados como concluídos.'
                        : `${completedItemIds.size} de ${todayItems.length} bloco(s) marcado(s) como concluído(s). Os demais já passaram sem confirmação.`}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setSubView('historico');
                        playFeedback('press');
                      }}
                      className="px-4 py-2 rounded-xl bg-surface border border-border/80 hover:border-border text-[12px] font-medium text-text-primary transition-colors flex items-center gap-1.5 shadow-subtle"
                    >
                      <span className="material-symbols-outlined text-[16px]">history</span>
                      <span>Ver no Histórico ({completedBlocksCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubView('contexto');
                        playFeedback('press');
                      }}
                      className="px-4 py-2 rounded-xl bg-surface border border-border/80 hover:border-border text-[12px] font-medium text-text-primary transition-colors flex items-center gap-1.5 shadow-subtle"
                    >
                      <span className="material-symbols-outlined text-[16px]">checklist</span>
                      <span>Revisar Tarefas ({completedTasksCount}/{tasks.length})</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* B. PRÓXIMO BLOCO NA FILA */}
          <section aria-label="Próximo Bloco" className="flex flex-col gap-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
              Próximo (Na Sequência)
            </span>

            {nextItem ? (
              <div className="p-5 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-border">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-secondary/70 flex items-center justify-center flex-shrink-0 text-text-secondary shadow-subtle">
                    <span className="material-symbols-outlined text-[20px]">
                      {CATEGORY_ICON[nextItem.category]}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-secondary text-text-secondary">
                        {CATEGORY_LABEL[nextItem.category]}
                      </span>
                      <span className="text-[11px] font-mono text-text-muted tabular-nums">
                        {formatMinutes(nextItem.startMinutes)} —{' '}
                        {formatMinutes(nextItem.startMinutes + nextItem.durationMinutes)}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-text-primary tracking-tight">
                      {nextItem.title}
                    </h3>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-text-secondary bg-surface-secondary/40 px-3 py-1.5 rounded-xl border border-border/50 self-start sm:self-auto">
                  Em {Math.max(0, nextItem.startMinutes - nowMinutes)} min
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface border border-border/60 text-[12px] text-text-muted">
                Sem novos compromissos agendados para a sequência imediata.
              </div>
            )}
          </section>

          {/* C. RITMO DO DIA (TIMELINE RIBBON INTERATIVO) */}
          <section aria-label="Ritmo do Dia" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
                Ritmo do Dia · Linha Contínua
              </span>
              <span className="text-[11px] font-mono text-text-muted">
                Clique em um bloco para inspecionar
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-surface border border-border/70 shadow-calm space-y-4">
              <div className="flex items-stretch gap-1.5 h-10 w-full overflow-x-auto pb-1">
                {todayItems.map((item) => {
                  const isDone = completedItemIds.has(item.id);
                  const isItemActive = activeItem?.id === item.id;
                  const isSelected = selectedRibbonItemId === item.id;

                  let bgClass = 'bg-[#ADE4B5]/60 hover:bg-[#ADE4B5]';
                  if (item.category === 'trabalho') bgClass = 'bg-[#71DBD2]/60 hover:bg-[#71DBD2]';
                  else if (item.category === 'estudo') bgClass = 'bg-[#FFF18C]/70 hover:bg-[#FFF18C]';
                  else if (item.category === 'saude') bgClass = 'bg-[#D0EAA3]/70 hover:bg-[#D0EAA3]';
                  else if (item.category === 'descanso') bgClass = 'bg-surface-secondary hover:bg-surface-secondary/80';

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedRibbonItemId(selectedRibbonItemId === item.id ? null : item.id);
                        playFeedback('press');
                      }}
                      className={`relative flex-1 rounded-lg transition-all duration-200 flex items-center justify-center text-[11px] font-mono font-semibold truncate px-1 text-text-primary ${bgClass} ${
                        isSelected ? 'ring-2 ring-text-primary z-10 scale-[1.02]' : ''
                      } ${isItemActive ? 'ring-2 ring-[#71DBD2]' : ''}`}
                      title={`${item.title} (${formatMinutes(item.startMinutes)})`}
                    >
                      <span className="truncate">{formatMinutes(item.startMinutes)}</span>
                      {isDone && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-700" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Inspetor de Bloco Selecionado */}
              {selectedRibbonItemId && (
                (() => {
                  const inspected = todayItems.find((it) => it.id === selectedRibbonItemId);
                  if (!inspected) return null;
                  return (
                    <div className="p-4 rounded-xl bg-surface-secondary/40 border border-border/60 flex items-center justify-between gap-4 animate-in fade-in duration-200">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0 text-text-secondary shadow-subtle">
                          <span className="material-symbols-outlined text-[17px]">
                            {CATEGORY_ICON[inspected.category]}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase text-text-muted">
                              {CATEGORY_LABEL[inspected.category]}
                            </span>
                            <span className="text-text-muted/40">•</span>
                            <span className="text-[11px] font-mono text-text-secondary">
                              {formatMinutes(inspected.startMinutes)} ({inspected.durationMinutes} min)
                            </span>
                          </div>
                          <h4 className="text-[14px] font-semibold text-text-primary truncate">
                            {inspected.title}
                          </h4>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedRibbonItemId(null)}
                        className="text-[12px] font-mono text-text-muted hover:text-text-primary px-2 py-1"
                      >
                        Fechar
                      </button>
                    </div>
                  );
                })()
              )}
            </div>
          </section>

          {/* D. EXPLORAÇÃO TEMPORAL (SEM DUPLICAR A AGENDA) */}
          <section aria-label="Exploração Temporal do Contexto" className="flex flex-col gap-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
              Janelas do Dia · Interpretação de Contexto
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-[11px]">
              {(['agora', 'proximo', 'tarde', 'noite', 'amanha'] as TemporalWindow[]).map((win) => {
                const labels: Record<TemporalWindow, string> = {
                  agora: 'Agora',
                  proximo: 'Próximo',
                  tarde: 'Tarde',
                  noite: 'Noite',
                  amanha: 'Amanhã',
                };
                const isSelected = temporalWindow === win;
                return (
                  <button
                    key={win}
                    type="button"
                    onClick={() => {
                      setTemporalWindow(win);
                      playFeedback('press');
                    }}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-[#FAFDF5] border-[#71DBD2] text-text-primary font-bold shadow-subtle ring-1 ring-[#71DBD2]/40'
                        : 'bg-surface border-border/60 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span>{labels[win]}</span>
                  </button>
                );
              })}
            </div>

            {/* Descrição contextual da janela selecionada */}
            <div className="p-4 rounded-xl bg-surface border border-border/60 text-[12px] text-text-secondary flex items-center justify-between">
              {temporalWindow === 'agora' && (
                <span>{activeItem ? (activeEnded ? `Pendente: ${activeItem.title} encerrou há ${activeEndedMinutesAgo} min e não foi marcado como concluído.` : `Agora: ${activeItem.title} (${minutesRemaining} min restantes).`) : 'Nenhum compromisso em andamento agora.'}</span>
              )}
              {temporalWindow === 'proximo' && (
                <span>{nextItem ? `Próximo: ${nextItem.title} às ${formatMinutes(nextItem.startMinutes)}.` : 'Sem próximo compromisso hoje.'}</span>
              )}
              {temporalWindow === 'tarde' && (
                <span>{windows.tarde}</span>
              )}
              {temporalWindow === 'noite' && (
                <span>{windows.noite}</span>
              )}
              {temporalWindow === 'amanha' && (
                <span>{windows.amanha}</span>
              )}
              <button
                type="button"
                onClick={() => setActiveRoute('agenda')}
                className="text-[11px] font-mono text-[#71DBD2] hover:underline flex items-center gap-1 flex-shrink-0 ml-2"
              >
                <span>Ver na Agenda</span>
                <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </button>
            </div>
          </section>

          {/* E. RECOMENDAÇÃO MEDUSA (PERSONAL OS) — Recommendation Engine sobre tarefas reais e tempo livre real */}
          {recommendation && (
            <section aria-label="Recomendação Medusa" className="flex flex-col gap-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
                Recomendação Medusa · Personal OS
              </span>

              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#ADE4B5]/20 via-[#71DBD2]/15 to-[#FAFDF5] border border-[#71DBD2]/40 shadow-calm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#71DBD2] flex items-center justify-center flex-shrink-0 text-[#1C2420] shadow-subtle">
                    <span className="material-symbols-outlined text-[19px]">psychology</span>
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-[14px] font-bold text-text-primary">
                      {recommendation.title} · {recommendation.durationMinutes} min {recommendation.timing === 'agora' ? 'agora' : `às ${recommendation.window.startIso.slice(11, 16)}`}
                    </h4>
                    <p className="text-[12px] text-text-secondary">
                      {recommendation.reasons.map((r) => r.detail).join(' · ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => os.dismissNotice(`rec:${recommendation.id}`)}
                    className="px-3 py-1.5 rounded-xl text-[12px] font-medium text-text-muted hover:text-text-primary transition-colors"
                  >
                    Dispensar
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptRecommendation}
                    className="px-3.5 py-1.5 rounded-xl bg-[#71DBD2] hover:bg-[#71DBD2]/90 text-[#1C2420] text-[12px] font-semibold transition-colors shadow-subtle flex items-center gap-1"
                  >
                    <span>Reservar na Agenda</span>
                    <span className="material-symbols-outlined text-[14px]">event_available</span>
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 2: CONTEXTO / TAREFAS & PROJETOS DE HOJE         */}
      {/* ========================================================= */}
      {subView === 'contexto' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Barra de Filtros de Tarefas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
                Tarefas Operacionais
              </span>
              <span className="text-[11px] font-mono text-text-muted">
                ({completedTasksCount}/{tasks.length} concluídas)
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'overdue', label: `Atrasadas (${overdueTasksCount})` },
                { id: 'today', label: 'Hoje' },
                { id: 'completed', label: 'Concluídas' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setTaskFilter(f.id as any);
                    playFeedback('press');
                  }}
                  className={`px-3 py-1 rounded-xl text-[11px] font-mono transition-all border ${
                    taskFilter === f.id
                      ? 'bg-[#FAFDF5] border-[#71DBD2] text-text-primary font-bold shadow-subtle'
                      : 'bg-surface border-border/60 text-text-muted hover:text-text-primary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nova tarefa (Personal OS · Tasks) — salva neste navegador */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateTask();
            }}
            className="p-4 rounded-2xl bg-surface border border-border/70 shadow-subtle flex flex-col gap-2"
            aria-label="Nova tarefa"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Nova tarefa…"
                aria-label="Título da tarefa"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-surface-secondary/50 border border-border/60 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              />
              <button type="submit" disabled={!newTaskTitle.trim()} className="px-4 py-2 rounded-xl bg-[#71DBD2] hover:bg-[#71DBD2]/90 disabled:opacity-50 text-[#1C2420] text-[12px] font-semibold shadow-subtle">
                Adicionar
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
              <label className="flex flex-col gap-0.5 text-text-muted">
                Prazo
                <input type="datetime-local" value={newTaskDue} onChange={(e) => setNewTaskDue(e.target.value)} className="px-2 py-1.5 rounded-lg bg-surface-secondary/50 border border-border/60 text-text-primary" />
              </label>
              <label className="flex flex-col gap-0.5 text-text-muted">
                Minutos
                <input type="number" min={1} value={newTaskMinutes} onChange={(e) => setNewTaskMinutes(e.target.value)} placeholder="—" className="px-2 py-1.5 rounded-lg bg-surface-secondary/50 border border-border/60 text-text-primary" />
              </label>
              <label className="flex flex-col gap-0.5 text-text-muted">
                Projeto
                <select value={newTaskProject} onChange={(e) => setNewTaskProject(e.target.value)} className="px-2 py-1.5 rounded-lg bg-surface-secondary/50 border border-border/60 text-text-primary">
                  <option value="">Nenhum</option>
                  {projects.map((p) => (
                    <option key={p.project.id} value={p.project.id}>
                      {p.project.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-0.5 text-text-muted">
                Depende de
                <select value={newTaskDependsOn} onChange={(e) => setNewTaskDependsOn(e.target.value)} className="px-2 py-1.5 rounded-lg bg-surface-secondary/50 border border-border/60 text-text-primary">
                  <option value="">Nada</option>
                  {tasks
                    .filter((t) => !t.isExample && t.status !== 'completed' && t.status !== 'cancelled')
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            {formError && <p role="alert" className="text-[11px] text-[#C45B5B]">{formError}</p>}
          </form>

          {/* Lista de Tarefas Interativas */}
          <div className="flex flex-col gap-3">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                const isCompleted = task.status === 'completed';

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col gap-2 ${
                      isCompleted
                        ? 'bg-surface/60 border-border/50 opacity-75'
                        : task.isOverdue
                        ? 'bg-[#FAFDF5] border-[#C45B5B]/50 shadow-calm'
                        : 'bg-surface border-border/70 shadow-calm hover:border-[#71DBD2]/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Checkbox interativo */}
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task.id)}
                          className={`w-6 h-6 rounded-lg border mt-0.5 flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-[#ADE4B5] border-[#ADE4B5] text-[#1C2420]'
                              : 'bg-surface border-border/80 hover:border-[#71DBD2]'
                          }`}
                        >
                          {isCompleted && (
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          )}
                        </button>

                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {task.project && (
                              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-secondary text-text-secondary">
                                {task.project}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-mono font-semibold ${
                                task.isOverdue && !isCompleted
                                  ? 'text-[#C45B5B]'
                                  : 'text-text-muted'
                              }`}
                            >
                              {task.dueLabel}
                            </span>
                            <span className="text-[10px] font-mono text-text-muted">
                              ~{task.estimatedMinutes}m
                            </span>
                          </div>

                          <h3
                            className={`text-[14px] font-bold tracking-tight ${
                              isCompleted
                                ? 'line-through text-text-muted'
                                : 'text-text-primary'
                            }`}
                          >
                            {task.title}
                          </h3>
                          {task.blockedReason && !isCompleted && (
                            <p className="text-[11px] text-text-muted">{task.status === 'delayed' ? `Bloqueada: ${task.blockedReason}` : `Ainda não executável — ${task.blockedReason}`}</p>
                          )}
                          {task.isExample && <ProvenanceBadge kind="fixture" />}
                        </div>
                      </div>

                      {!task.isExample && (
                        <div className="flex items-center gap-1 flex-shrink-0 text-[11px] font-mono">
                          {task.status === 'delayed' || task.status === 'cancelled' ? (
                            <button type="button" onClick={() => handleTaskStatus(task.id, 'todo')} className="px-2 py-1 rounded-lg text-text-secondary hover:text-text-primary">
                              Retomar
                            </button>
                          ) : !isCompleted ? (
                            <>
                              <button type="button" onClick={() => handleTaskStatus(task.id, 'blocked')} className="px-2 py-1 rounded-lg text-text-muted hover:text-text-primary">
                                Bloquear
                              </button>
                              <button type="button" onClick={() => handleTaskStatus(task.id, 'cancelled')} className="px-2 py-1 rounded-lg text-text-muted hover:text-text-primary">
                                Cancelar
                              </button>
                            </>
                          ) : null}
                        </div>
                      )}

                      {/* Botão de detalhes / ação do Guardian */}
                      {task.guardianActionRequired && !isCompleted && (
                        <button
                          type="button"
                          onClick={() => setActiveRoute('guardian')}
                          className="px-2.5 py-1 rounded-lg bg-[#71DBD2]/20 border border-[#71DBD2]/40 text-[#1C2420] dark:text-[#71DBD2] text-[11px] font-mono font-semibold hover:bg-[#71DBD2]/30 transition-colors flex items-center gap-1 flex-shrink-0"
                        >
                          <span className="material-symbols-outlined text-[14px]">shield</span>
                          <span>{task.guardianActionLabel || 'Guardian'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 rounded-2xl bg-surface border border-border/60 text-center space-y-1 text-text-secondary">
                <span className="material-symbols-outlined text-3xl text-text-muted">task_alt</span>
                <p className="text-[13px] font-medium">{tasks.length === 0 ? 'Nenhuma tarefa ainda. Crie a primeira acima.' : 'Nenhuma tarefa correspondente ao filtro selecionado.'}</p>
              </div>
            )}
          </div>

          {/* Projetos (Personal OS · Projects): objetivo, progresso e viabilidade do prazo contra o tempo livre real */}
          <section aria-label="Projetos" className="flex flex-col gap-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">Projetos</span>
            {projects.map((p) => {
              const pct = Math.round(p.progress.completionRatio * 100);
              const viab: Record<string, string> = { folgado: 'prazo folgado', apertado: 'prazo apertado', inviavel: 'prazo inviável com o tempo livre', sem_estimativa: 'falta estimativa de esforço', sem_prazo: 'sem prazo', vencido: 'prazo vencido' };
              return (
                <div key={p.project.id} className="p-4 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-[14px] font-bold text-text-primary truncate">{p.project.title}</h4>
                      <p className="text-[11px] text-text-secondary truncate">{p.project.objective}</p>
                    </div>
                    <span className="text-[11px] font-mono text-text-muted flex-shrink-0">
                      {p.progress.doneTasks}/{p.progress.totalTasks} · {viab[p.deadline.feasibility] ?? p.deadline.feasibility}
                    </span>
                  </div>
                  <div className="w-full bg-surface-secondary/70 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#71DBD2] h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  {p.deadline.deadline && (
                    <p className="text-[11px] font-mono text-text-muted">
                      {p.deadline.deadline.label}: {p.deadline.deadline.dueAt.slice(8, 10)}/{p.deadline.deadline.dueAt.slice(5, 7)} · faltam {p.progress.remainingMinutes} min de trabalho
                      {p.deadline.availableMinutes !== undefined ? ` · ${p.deadline.availableMinutes} min livres na Agenda até lá` : ''}
                    </p>
                  )}
                </div>
              );
            })}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateProject();
              }}
              className="p-4 rounded-2xl bg-surface border border-dashed border-border/70 flex flex-col sm:flex-row gap-2"
              aria-label="Novo projeto"
            >
              <input value={newProjectTitle} onChange={(e) => setNewProjectTitle(e.target.value)} placeholder="Novo projeto…" aria-label="Título do projeto" className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-surface-secondary/50 border border-border/60 text-[13px] text-text-primary placeholder:text-text-muted" />
              <input value={newProjectObjective} onChange={(e) => setNewProjectObjective(e.target.value)} placeholder="Objetivo" aria-label="Objetivo do projeto" className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-surface-secondary/50 border border-border/60 text-[13px] text-text-primary placeholder:text-text-muted" />
              <input type="date" value={newProjectDue} onChange={(e) => setNewProjectDue(e.target.value)} aria-label="Prazo do projeto" className="px-3 py-2 rounded-xl bg-surface-secondary/50 border border-border/60 text-[12px] text-text-primary" />
              <button type="submit" disabled={!newProjectTitle.trim()} className="px-4 py-2 rounded-xl bg-surface border border-border/80 disabled:opacity-50 text-[12px] font-semibold text-text-primary shadow-subtle">
                Criar projeto
              </button>
            </form>
          </section>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBVIEW 3: HISTÓRICO REALIZADO DO DIA                     */}
      {/* ========================================================= */}
      {subView === 'historico' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block">
                Histórico Operacional de Hoje
              </span>
              <p className="text-[13px] text-text-secondary">
                Registro fiel de blocos concluídos, pausas e compromissos cumpridos.
              </p>
            </div>

            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-text-primary tabular-nums">
                {completedBlocksCount}
              </span>
              <span className="text-[10px] font-mono uppercase text-text-muted block">
                Blocos Executados
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {history.length === 0 && (
              <div className="p-6 rounded-2xl bg-surface border border-border/60 text-center text-[13px] text-text-secondary">Nenhum bloco concluído hoje ainda.</div>
            )}
            {history.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-secondary/70 flex items-center justify-center flex-shrink-0 text-text-primary shadow-subtle">
                    <span className="material-symbols-outlined text-[17px]">
                      {CATEGORY_ICON[entry.category]}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase text-text-muted">
                        {entry.timeLabel}
                      </span>
                      <span className="text-text-muted/40">•</span>
                      <span className="text-[10px] font-mono text-text-secondary">
                        {entry.durationMinutes} min
                      </span>
                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold ${
                          entry.status === 'completed'
                            ? 'bg-[#ADE4B5]/50 text-[#1C2420]'
                            : 'bg-[#FFF18C]/60 text-[#1C2420]'
                        }`}
                      >
                        {entry.status === 'completed' ? 'Concluído' : 'Adiado'}
                      </span>
                    </div>
                    <h4 className="text-[14px] font-semibold text-text-primary">
                      {entry.title}
                    </h4>
                    {entry.resultSummary && (
                      <p className="text-[11px] text-text-secondary">
                        {entry.resultSummary}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
