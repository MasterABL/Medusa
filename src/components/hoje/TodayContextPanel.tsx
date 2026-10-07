'use client';

import React, { useMemo } from 'react';
import { ContextPanelSection } from '@/components/shell/ContextPanelSection';
import { TRACK_DEFINITIONS } from '@/components/education/educationFixtures';
import { useAgenda } from '@/context/AgendaContext';
import { withoutAgendaExamples } from '@/lib/agendaExamples';
import { useDemoMode } from '@/lib/dataMode';
import { usePersonalOS } from '@/context/PersonalOSContext';
import { expandRecurringItems } from '@/components/agenda/agendaHelpers';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';

/**
 * Painel contextual do Hoje — só o que é verdade:
 *  - Sistema: aprovações pendentes no Guardian, onde os dados estão salvos e quais
 *    integrações estão bloqueadas (antes: "99.8% Estável · Sync ativo há 2m", inventado);
 *  - Próxima transição e marcos: Agenda real (sem fallback fixo);
 *  - Avisos da Faculdade: conteúdo de exemplo da Educação, marcado como tal.
 */
export function TodayContextPanel() {
  const { items: agendaItems } = useAgenda();
  const { os, version, storage, saveError, ready } = usePersonalOS();
  const demo = useDemoMode();
  const nowIso = os.now();
  const todayStr = nowIso.slice(0, 10);
  const nowHHMM = nowIso.slice(11, 16);

  const todayItems = useMemo(() => {
    const d = new Date(`${todayStr}T00:00:00`);
    return withoutAgendaExamples(expandRecurringItems(ready ? agendaItems : [], d, d), demo)
      .filter((it) => it.date === todayStr && it.status !== 'cancelled')
      .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
  }, [agendaItems, todayStr, demo, ready]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pending = useMemo(() => os.actionViews(100).filter((a) => a.state === 'aguardando_aprovacao').length, [os, version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const providers = useMemo(() => os.providerStates(), [os, version]);
  const nextItem = todayItems.find((it) => (it.startTime ?? '00:00') >= nowHHMM) ?? undefined;

  const avisos = (TRACK_DEFINITIONS.faculdade.disciplines ?? []).flatMap((d) =>
    d.notices.map((notice, i) => ({ id: `${d.code}-${i}`, discipline: d.title, notice }))
  );

  return (
    <>
      {/* Seção 1: Sistema (Guardian + armazenamento + integrações) */}
      <ContextPanelSection
        label="Guardian & Sistema"
        rightSlot={
          <span className="text-[11px] font-mono text-text-secondary font-semibold tabular-nums">
            {pending > 0 ? `${pending} aguardando você` : 'Nada pendente'}
          </span>
        }
      >
        <div className="flex flex-col gap-1.5 text-[11px]">
          <span className="text-text-secondary">
            {!ready
              ? 'Carregando dados salvos…'
              : storage.status === 'available'
              ? 'Dados salvos neste navegador (localStorage).'
              : 'Armazenamento indisponível — o que você fizer não será salvo.'}
            {saveError ? ` Falha ao salvar: ${saveError}` : ''}
          </span>
          <span className="text-text-muted font-mono text-[10px]">Sem sincronização em nuvem · Supabase não conectado</span>
          <div className="flex flex-wrap gap-1 pt-0.5">
            <ProvenanceBadge kind="blocked" detail={providers.google_calendar.status === 'connected' ? 'Google Agenda' : 'Google Agenda · não conectado'} />
            <ProvenanceBadge kind="blocked" detail={providers.gmail.status === 'connected' ? 'Gmail' : 'Gmail · não conectado'} />
          </div>
        </div>
      </ContextPanelSection>

      {/* Seção 2: Próxima Transição (Agenda real) */}
      <ContextPanelSection
        label="Próxima Transição"
        rightSlot={<span className="text-[10px] font-mono text-text-muted tabular-nums">{nextItem?.startTime ?? '—'}</span>}
      >
        {nextItem ? (
          <>
            <h4 className="text-[13px] font-semibold tracking-tight text-text-primary truncate">{nextItem.title}</h4>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-secondary">{nextItem.durationMinutes ? `Bloco de ${nextItem.durationMinutes}m` : nextItem.endTime ? `Até ${nextItem.endTime}` : 'Compromisso'}</span>
              <span className="text-text-muted font-mono tabular-nums">{nextItem.startTime ? `Às ${nextItem.startTime}` : 'Hoje'}</span>
            </div>
          </>
        ) : (
          <p className="text-[12px] text-text-muted">Nada mais agendado para hoje.</p>
        )}
      </ContextPanelSection>

      {/* Seção 3: Marcos do dia (Agenda real) */}
      <ContextPanelSection label="Marcos do Dia" rightSlot={<span className="text-[10px] font-mono text-text-muted">Hoje</span>}>
        <div className="space-y-2 text-[12px]">
          {todayItems.length > 0 ? (
            todayItems.slice(0, 4).map((it) => (
              <div key={it.id} className="flex items-baseline justify-between text-text-primary">
                <span className="font-medium truncate pr-2">{it.title}</span>
                <span className="text-text-muted font-mono text-[11px] tabular-nums flex-shrink-0">{it.startTime || 'Dia todo'}</span>
              </div>
            ))
          ) : (
            <p className="text-text-muted">Nenhum compromisso na Agenda hoje.</p>
          )}
        </div>
      </ContextPanelSection>

      {/* Seção 4: Avisos — conteúdo de exemplo da Faculdade (Educação) */}
      {avisos.length > 0 && (
        <ContextPanelSection label="Avisos da Faculdade" rightSlot={<ProvenanceBadge kind="fixture" />} noBorder>
          <div id="context-panel-today-avisos" className="flex flex-col gap-2">
            {avisos.map((a) => (
              <div key={a.id} className="flex items-start gap-1.5 text-[12px]">
                <span className="material-symbols-outlined text-[14px] text-medusa-primary mt-0.5">campaign</span>
                <div>
                  <span className="text-text-secondary">{a.notice}</span>
                  <span className="block text-[10px] font-mono text-text-muted">{a.discipline}</span>
                </div>
              </div>
            ))}
          </div>
        </ContextPanelSection>
      )}
    </>
  );
}
