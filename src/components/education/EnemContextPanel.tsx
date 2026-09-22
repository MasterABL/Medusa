'use client';

import React from 'react';
import { TRACK_DEFINITIONS } from './educationFixtures';
import { ContextPanelSection } from '@/components/shell/ContextPanelSection';
import { useEducationPanel } from '@/context/EducationPanelContext';

/**
 * Painel contextual do ENEM — resumo operacional da preparação: progresso, o bloco de hoje,
 * o próximo simulado e pendências (atrasos/revisões). O atalho "Ver Cronograma completo" muda a
 * aba do Hub principal via o mesmo estado compartilhado que o EnemHub usa — o painel não navega
 * para outra tela, só direciona a área principal.
 */
export function EnemContextPanel() {
  const trackDef = TRACK_DEFINITIONS.vestibular;
  const { setEnemView } = useEducationPanel();
  const cronograma = trackDef.cronograma ?? [];

  const completedModules = trackDef.modules.filter((m) => m.status === 'completed').length;
  const totalModules = trackDef.modules.length;
  const percent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  const todayBlock = cronograma.find((b) => b.isToday);
  const nextSimulado = cronograma.find((b) => b.activityType === 'simulado' && b.status === 'planejado');
  const lateCount = cronograma.filter((b) => b.status === 'atrasado').length;
  const revisionCount = cronograma.filter((b) => b.activityType === 'revisao' && b.status !== 'concluido').length;

  return (
    <div id="context-panel-track-vestibular" className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px] text-medusa-primary">assignment</span>
        <span className="text-[11px] font-semibold text-text-primary">Preparação ENEM</span>
      </div>

      <ContextPanelSection label="Progresso da Preparação">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-text-primary tabular-nums">{percent}%</span>
          <span className="text-[11px] text-text-secondary">{completedModules}/{totalModules} habilidades</span>
        </div>
        <div className="w-full bg-surface-subtle h-1 rounded-full overflow-hidden">
          <div className="bg-medusa-primary h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
      </ContextPanelSection>

      {todayBlock && (
        <ContextPanelSection label="Hoje">
          <h4 className="text-[13px] font-semibold text-text-primary">{todayBlock.discipline} · {todayBlock.topic}</h4>
          <p className="text-[12px] text-text-secondary">{todayBlock.nextAction}</p>
        </ContextPanelSection>
      )}

      {nextSimulado && (
        <ContextPanelSection label="Próximo Simulado">
          <h4 className="text-[13px] font-semibold text-text-primary">{nextSimulado.topic}</h4>
          <p className="text-[12px] text-text-secondary">{nextSimulado.date} · {nextSimulado.weekday}</p>
        </ContextPanelSection>
      )}

      {(lateCount > 0 || revisionCount > 0) && (
        <ContextPanelSection label="Pendências">
          <div className="flex flex-col gap-1 text-[12px]">
            {lateCount > 0 && (
              <span className="text-text-secondary">{lateCount} bloco{lateCount !== 1 ? 's' : ''} atrasado{lateCount !== 1 ? 's' : ''}</span>
            )}
            {revisionCount > 0 && (
              <span className="text-text-secondary">{revisionCount} revisão{revisionCount !== 1 ? 'ões' : ''} pendente{revisionCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        </ContextPanelSection>
      )}

      <button
        type="button"
        id="btn-panel-open-cronograma"
        onClick={() => setEnemView('cronograma')}
        className="btn-interactive flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 border border-[#71DBD2]/30 rounded-full px-3.5 py-2 hover:opacity-85 transition-opacity"
      >
        <span className="material-symbols-outlined text-[15px]">calendar_month</span>
        Ver Cronograma completo
      </button>
    </div>
  );
}
