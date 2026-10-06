'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { hojeFixtureItems } from '@/fixtures/hojeFixtures';
import { useAgenda } from '@/context/AgendaContext';
import { useShell } from '@/context/ShellContext';
import { formatDateISO } from '@/components/agenda/agendaFixtures';
import { AgendaItem } from '@/types/agenda';
import {
  groupHojeItems,
  formatMinutes,
  CATEGORY_ICON,
  CATEGORY_LABEL,
  HojeItem,
  HojeCategoria,
} from '@/lib/hojeFoundation';
import { playFeedback } from '@/lib/audioFeedback';

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

function mapAgendaToHojeItem(it: AgendaItem): HojeItem {
  let cat: HojeCategoria = 'pessoal';
  if (it.domain === 'education') cat = 'estudo';
  else if (it.domain === 'work') cat = 'trabalho';
  else if (it.domain === 'body') cat = 'saude';

  let startMinutes = 8 * 60;
  if (it.startTime) {
    const [h, m] = it.startTime.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) startMinutes = h * 60 + m;
  }
  return {
    id: it.id,
    title: it.title,
    category: cat,
    startMinutes,
    durationMinutes: it.durationMinutes || 60,
  };
}

export function HojeContainer() {
  const nowMinutes = useNowMinutes();
  const { items: agendaItems } = useAgenda();
  const { setActiveRoute, triggerIslandNotification } = useShell();

  // Estados interativos locais
  const [selectedRibbonItemId, setSelectedRibbonItemId] = useState<string | null>(null);
  const [completedItemIds, setCompletedItemIds] = useState<Set<string>>(new Set());
  const [extendedMinutes, setExtendedMinutes] = useState<number>(0);
  const [recommendationDismissed, setRecommendationDismissed] = useState<boolean>(false);
  const [telemedConfirmed, setTelemedConfirmed] = useState<boolean>(false);

  const todayStr = useMemo(() => formatDateISO(new Date()), []);

  const todayItems = useMemo(() => {
    const rawToday = agendaItems.filter((it) => it.date === todayStr);
    if (rawToday.length > 0) {
      return rawToday.map(mapAgendaToHojeItem).sort((a, b) => a.startMinutes - b.startMinutes);
    }
    return hojeFixtureItems;
  }, [agendaItems, todayStr]);

  const { agora, proximo, depois, maisTarde } = useMemo(
    () => groupHojeItems(todayItems, nowMinutes),
    [todayItems, nowMinutes]
  );

  // Bloco ativo (com extensão de tempo opcional)
  const activeItem = agora;
  const isCurrentCompleted = activeItem ? completedItemIds.has(activeItem.id) : false;

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

  // Checagem de atenção contextual (ex: telemedicina ou consulta médica hoje)
  const telemedicineEvent = useMemo(() => {
    return agendaItems.find((it) => {
      const isToday = it.date === todayStr;
      const titleLower = it.title.toLowerCase();
      return (
        isToday &&
        (titleLower.includes('telemedicina') ||
          titleLower.includes('consulta') ||
          titleLower.includes('médico') ||
          titleLower.includes('medico') ||
          titleLower.includes('exame'))
      );
    });
  }, [agendaItems, todayStr]);

  // Tempo até a telemedicina em minutos (se existir)
  const minutesUntilTelemedicine = useMemo(() => {
    if (!telemedicineEvent || !telemedicineEvent.startTime) return null;
    const [h, m] = telemedicineEvent.startTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    const eventMins = h * 60 + m;
    return eventMins - nowMinutes;
  }, [telemedicineEvent, nowMinutes]);

  // Item selecionado para inspeção no ribbon
  const inspectedItem = useMemo(() => {
    if (!selectedRibbonItemId) return null;
    return todayItems.find((it) => it.id === selectedRibbonItemId) || null;
  }, [selectedRibbonItemId, todayItems]);

  // Ações interativas
  const handleCompleteActive = useCallback(() => {
    if (!activeItem) return;
    setCompletedItemIds((prev) => {
      const next = new Set(prev);
      next.add(activeItem.id);
      return next;
    });
    playFeedback('action');
    triggerIslandNotification({
      title: 'Bloco concluído',
      tag: 'RITMO DO DIA',
      description: `${activeItem.title} foi concluído.`,
      badge: 'FEITO',
      state: 'active',
      durationMs: 3500,
    });
  }, [activeItem, triggerIslandNotification]);

  const handleExtendActive = useCallback(() => {
    setExtendedMinutes((prev) => prev + 15);
    playFeedback('press');
  }, []);

  const handleConfirmTelemed = useCallback(() => {
    setTelemedConfirmed(true);
    playFeedback('success');
    triggerIslandNotification({
      title: 'Check-in confirmado',
      tag: 'TELEMEDICINA',
      description: 'Presença confirmada. Link de atendimento ativo.',
      badge: 'PRONTO',
      state: 'active',
      durationMs: 4000,
      actionLabel: 'Abrir sala',
      onAction: () => {
        const link = telemedicineEvent?.location?.startsWith('http')
          ? telemedicineEvent.location
          : undefined;
        if (link) {
          window.open(link, '_blank');
        }
      },
    });
  }, [telemedicineEvent, triggerIslandNotification]);

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
      {/* 1. CABEÇALHO CONTEXTUAL MINIMALISTA */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#71DBD2] animate-pulse" aria-hidden="true" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-text-muted">
              Central de Contexto
            </span>
            <span className="text-text-muted/40">•</span>
            <span className="text-[11px] font-mono text-text-secondary tabular-nums">
              {formatMinutes(nowMinutes)}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary capitalize">
            {dateFormatted}
          </h1>
        </div>

        {/* Status vivo do sistema */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-surface px-3 py-1.5 rounded-full border border-border/60 shadow-subtle text-[12px] text-text-secondary">
          <span className="material-symbols-outlined text-[15px] text-[#71DBD2]">sync</span>
          <span>{todayItems.length} blocos hoje</span>
        </div>
      </header>

      {/* 2. PROTAGONISTA: AGORA */}
      <section aria-label="Compromisso Atual" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
            Agora
          </span>
          {activeItem && !isCurrentCompleted && (
            <span className="text-[11px] font-mono text-text-muted tabular-nums">
              {minutesRemaining} min restantes
            </span>
          )}
        </div>

        {activeItem ? (
          <div
            className={`p-5 sm:p-7 rounded-2xl border transition-all duration-300 ${
              isCurrentCompleted
                ? 'bg-[#FAFDF5] border-[#D0EAA3]/70 opacity-90'
                : 'bg-[#FAFDF5] border-[#71DBD2]/50 shadow-calm ring-1 ring-[#71DBD2]/20'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-subtle ${
                    isCurrentCompleted
                      ? 'bg-[#D0EAA3] text-[#1C2420]'
                      : 'bg-[#71DBD2] text-[#1C2420]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {isCurrentCompleted ? 'check' : CATEGORY_ICON[activeItem.category]}
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
                {!isCurrentCompleted ? (
                  <>
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
                      onClick={handleCompleteActive}
                      className="px-4 py-2 rounded-xl bg-[#71DBD2] hover:bg-[#71DBD2]/90 text-[#1C2420] text-[12px] font-semibold transition-transform active:scale-95 flex items-center gap-1.5 shadow-subtle"
                    >
                      <span className="material-symbols-outlined text-[16px]">done</span>
                      <span>Concluir</span>
                    </button>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D0EAA3]/40 text-[#1C2420] text-[12px] font-medium font-mono">
                    <span className="material-symbols-outlined text-[16px] text-green-700">check_circle</span>
                    Concluído
                  </span>
                )}
              </div>
            </div>

            {/* Barra viva de progresso temporal */}
            {!isCurrentCompleted && (
              <div className="mt-5 space-y-1.5">
                <div className="w-full h-2 rounded-full bg-surface-secondary/60 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#ADE4B5] to-[#71DBD2] transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                    role="progressbar"
                    aria-valuenow={progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-text-muted">
                  <span>{progressPercent}% decorrido</span>
                  <span>{minutesRemaining} min para encerramento</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-2xl border border-dashed border-border/80 bg-surface/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[22px] text-text-muted">bedtime</span>
              <div>
                <p className="text-[14px] font-medium text-text-primary">Janela de transição</p>
                <p className="text-[12px] text-text-muted">Nenhum compromisso fixo neste exato minuto.</p>
              </div>
            </div>
            {proximo && (
              <span className="text-[12px] font-mono text-text-secondary">
                Próximo às {formatMinutes(proximo.startMinutes)}
              </span>
            )}
          </div>
        )}
      </section>

      {/* 3. FLUXO CENTRAL: PRÓXIMO & ATENÇÃO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* PRÓXIMO */}
        <section aria-label="Próximo Compromisso" className="flex flex-col gap-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
            Próximo
          </span>

          {proximo ? (
            <div className="p-5 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col justify-between gap-4 h-full">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                    {CATEGORY_LABEL[proximo.category]}
                  </span>
                  <span className="text-[11px] font-mono text-[#71DBD2] font-semibold">
                    em {Math.max(0, proximo.startMinutes - nowMinutes)} min
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface-secondary/70 flex items-center justify-center flex-shrink-0 text-text-secondary">
                    <span className="material-symbols-outlined text-[18px]">
                      {CATEGORY_ICON[proximo.category]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-text-primary leading-snug">
                      {proximo.title}
                    </h3>
                    <p className="text-[11px] font-mono text-text-muted">
                      {formatMinutes(proximo.startMinutes)} • {proximo.durationMinutes} min
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-text-muted">
                <span>Transição prevista</span>
                <span className="font-mono text-text-secondary">Folga adequada</span>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl border border-dashed border-border/70 bg-surface/40 text-[13px] text-text-muted flex items-center gap-2.5 h-full">
              <span className="material-symbols-outlined text-[18px]">task_alt</span>
              <span>Nenhum outro evento pendente para hoje.</span>
            </div>
          )}
        </section>

        {/* ATENÇÃO CONTEXTUAL (Personal OS) */}
        <section aria-label="Atenção Contextual" className="flex flex-col gap-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
            Atenção
          </span>

          {telemedicineEvent ? (
            <div className="p-5 rounded-2xl bg-[#FFF18C]/20 border border-[#FFF18C]/70 shadow-calm flex flex-col justify-between gap-3 h-full">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#9E6500]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9E6500] animate-ping" />
                    Telemedicina Iminente
                  </span>
                  {minutesUntilTelemedicine !== null && (
                    <span className="text-[11px] font-mono font-bold text-[#9E6500]">
                      {minutesUntilTelemedicine > 0
                        ? `T-${minutesUntilTelemedicine} min`
                        : 'Em andamento'}
                    </span>
                  )}
                </div>

                <h3 className="text-[15px] font-bold text-text-primary leading-snug">
                  {telemedicineEvent.title}
                </h3>
                <p className="text-[12px] text-text-secondary">
                  Horário marcado: {telemedicineEvent.startTime || '17:00'}. Tenha exames e câmera preparados.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#FFF18C]/40">
                {!telemedConfirmed ? (
                  <button
                    type="button"
                    onClick={handleConfirmTelemed}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#FFF18C] hover:bg-[#FFF18C]/90 text-[#1C2420] text-[12px] font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-subtle"
                  >
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Confirmar Presença</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-mono text-green-800 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">check_circle</span>
                    Check-in confirmado
                  </span>
                )}

                {telemedicineEvent.location && telemedicineEvent.location.startsWith('http') && (
                  <a
                    href={telemedicineEvent.location}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 rounded-xl bg-surface border border-border/80 text-[12px] font-medium text-text-primary hover:border-text-primary transition-colors flex items-center gap-1 shadow-subtle"
                  >
                    <span>Entrar na Sala</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-surface border border-border/70 shadow-calm flex flex-col justify-between gap-3 h-full">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-text-muted">
                  <span className="material-symbols-outlined text-[18px] text-[#71DBD2]">shield</span>
                  <span className="text-[11px] font-mono uppercase tracking-wider">Estado do Sistema</span>
                </div>
                <h3 className="text-[14px] font-semibold text-text-primary">
                  Sem alertas críticos
                </h3>
                <p className="text-[12px] text-text-muted">
                  Agenda, finanças e ritmo corporal sem conflitos pendentes.
                </p>
              </div>
              <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-text-muted flex items-center justify-between">
                <span>Guardian Ativo</span>
                <span className="text-emerald-700">Equilíbrio D+0</span>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 4. RITMO DO DIA: RIBBON TEMPORAL INTERATIVO (07:00 → 21:00) */}
      <section aria-label="Ritmo do Dia" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
            Ritmo do Dia • Alocação Temporal
          </span>
          <span className="text-[11px] font-mono text-text-muted">
            Toque em um bloco para inspecionar
          </span>
        </div>

        {/* Fita do Ribbon */}
        <div className="p-4 rounded-2xl bg-surface border border-border/70 shadow-calm space-y-3">
          <div className="relative w-full h-11 bg-surface-secondary/40 rounded-xl overflow-hidden flex items-stretch p-1 gap-1">
            {todayItems.map((item) => {
              const isItemActive = activeItem?.id === item.id;
              const isSelected = selectedRibbonItemId === item.id;
              const isDone = completedItemIds.has(item.id);

              // Cores pastéis por categoria
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
          {inspectedItem && (
            <div className="p-4 rounded-xl bg-surface-secondary/30 border border-border/60 flex items-center justify-between gap-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0 text-text-secondary shadow-subtle">
                  <span className="material-symbols-outlined text-[17px]">
                    {CATEGORY_ICON[inspectedItem.category]}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase text-text-muted">
                      {CATEGORY_LABEL[inspectedItem.category]}
                    </span>
                    <span className="text-text-muted/40">•</span>
                    <span className="text-[11px] font-mono text-text-secondary">
                      {formatMinutes(inspectedItem.startMinutes)} ({inspectedItem.durationMinutes} min)
                    </span>
                  </div>
                  <h4 className="text-[14px] font-semibold text-text-primary truncate">
                    {inspectedItem.title}
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
          )}
        </div>
      </section>

      {/* 5. RECOMENDAÇÃO MEDUSA (Personal OS) */}
      {!recommendationDismissed && (
        <section aria-label="Recomendação Medusa" className="flex flex-col gap-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
            Recomendação Medusa
          </span>

          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#ADE4B5]/20 via-[#71DBD2]/15 to-[#FAFDF5] border border-[#71DBD2]/40 shadow-calm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#71DBD2] flex items-center justify-center flex-shrink-0 text-[#1C2420] shadow-subtle">
                <span className="material-symbols-outlined text-[19px]">psychology</span>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[14px] font-bold text-text-primary">
                  Janela de transição pós-trabalho
                </h4>
                <p className="text-[12px] text-text-secondary">
                  Reserve 15 minutos de descompressão antes de iniciar o treino ou a prática espiritual para restaurar a atenção.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setRecommendationDismissed(true)}
                className="px-3 py-1.5 rounded-xl text-[12px] font-medium text-text-muted hover:text-text-primary transition-colors"
              >
                Dispensar
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveRoute('corpo');
                  playFeedback('press');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#71DBD2] hover:bg-[#71DBD2]/90 text-[#1C2420] text-[12px] font-semibold transition-colors shadow-subtle flex items-center gap-1"
              >
                <span>Ver Treino</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
