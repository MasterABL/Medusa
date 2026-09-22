'use client';

import React from 'react';
import { TRACK_DEFINITIONS } from './educationFixtures';
import { ContextPanelSection } from '@/components/shell/ContextPanelSection';
import { useShell } from '@/context/ShellContext';

/**
 * Painel contextual do Inglês — dashboard compacto do curso (progresso, módulo atual, quantas
 * aulas já foram feitas, próxima revisão). Não duplica o acordeão de módulos do Hub; complementa
 * com o que cabe numa extensão lateral. Sem Flashcards aqui também — a mesma regra da home vale
 * para o painel.
 */
export function EnglishContextPanel() {
  const trackDef = TRACK_DEFINITIONS.ingles;
  const { isVoiceActive } = useShell();

  const modulesWithLessons = trackDef.modules.filter((m) => m.lessons && m.lessons.length > 0);
  const allLessons = modulesWithLessons.flatMap((m) => m.lessons ?? []);
  const completedLessons = allLessons.filter((l) => l.status === 'completed').length;
  const totalLessons = allLessons.length;
  const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const currentModule = trackDef.modules.find((m) => m.status === 'in_progress');
  const resumeLesson = currentModule?.lessons?.find((l) => l.status === 'current');
  const historyCount = trackDef.completedLessonsHistory?.length ?? 0;

  return (
    <div id="context-panel-track-ingles" className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px] text-medusa-primary">translate</span>
        <span className="text-[11px] font-semibold text-text-primary">Curso de Inglês</span>
      </div>

      {isVoiceActive && (
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 border border-[#71DBD2]/30 rounded-full px-2.5 py-1 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary living-pulse" />
          Treino por voz em andamento
        </div>
      )}

      <ContextPanelSection label="Progresso Geral">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-text-primary tabular-nums">{percent}%</span>
          <span className="text-[11px] text-text-secondary">{completedLessons}/{totalLessons} aulas</span>
        </div>
        <div className="w-full bg-surface-subtle h-1 rounded-full overflow-hidden">
          <div className="bg-medusa-primary h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
      </ContextPanelSection>

      {currentModule && (
        <ContextPanelSection label="Módulo Atual">
          <h4 className="text-[13px] font-semibold text-text-primary leading-snug">{currentModule.title}</h4>
          {resumeLesson && (
            <p className="text-[12px] text-text-secondary">Retomar: {resumeLesson.title}</p>
          )}
        </ContextPanelSection>
      )}

      <ContextPanelSection label="Minhas Aulas" rightSlot={<span className="text-[10px] font-mono text-text-muted tabular-nums">{historyCount}</span>}>
        <p className="text-[12px] text-text-secondary">
          {historyCount > 0
            ? `${historyCount} concluída${historyCount !== 1 ? 's' : ''}, prontas para revisão.`
            : 'Nenhuma aula concluída ainda.'}
        </p>
      </ContextPanelSection>

      <ContextPanelSection label="Próxima Revisão" noBorder>
        <p className="text-[13px] font-semibold text-text-primary">{trackDef.nextReviewSuggestion}</p>
      </ContextPanelSection>
    </div>
  );
}
