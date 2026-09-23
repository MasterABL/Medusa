'use client';

import React, { useState } from 'react';
import { TRACK_DEFINITIONS } from './educationFixtures';
import { ContextPanelSection } from '@/components/shell/ContextPanelSection';
import { useShell } from '@/context/ShellContext';
import { useEducationPanel } from '@/context/EducationPanelContext';
import { MasteryBars } from './MasteryBars';
import { TutorDrawer } from './TutorDrawer';
import { getTrackAccent } from './trackAccent';

const accent = getTrackAccent('ingles');

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;

/**
 * Painel contextual do Inglês — segue a composição-base dos 3 painéis (Contexto → Próxima Ação →
 * Domínio → Revisões → Cronograma, ver DESIGN.md), com o "cronograma" do Inglês expresso como a
 * linha do tempo de níveis CEFR (A1→A2→B1→B2), e um Professor IA embutido de verdade (não um
 * redirecionamento) reaproveitando o mesmo `TutorDrawer` do Modo Dividido, variant="inline".
 */
export function EnglishContextPanel() {
  const trackDef = TRACK_DEFINITIONS.ingles;
  const { isVoiceActive, setVoiceActive } = useShell();
  const { openReviewModal, isSessionCompleted, sessionResultMirror, requestStartStudy } = useEducationPanel();
  const [isTeacherOpen, setIsTeacherOpen] = useState(false);

  const modulesWithLessons = trackDef.modules.filter((m) => m.lessons && m.lessons.length > 0);
  const allLessons = modulesWithLessons.flatMap((m) => m.lessons ?? []);
  const completedLessons = allLessons.filter((l) => l.status === 'completed').length;
  const totalLessons = allLessons.length;
  const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const currentModule = trackDef.modules.find((m) => m.status === 'in_progress');
  const resumeLesson = currentModule?.lessons?.find((l) => l.status === 'current');
  const history = trackDef.completedLessonsHistory ?? [];

  // Revisão gerada pela sessão que o usuário ACABOU de concluir (ver Refinamento Visual §8:
  // Aula → Resultado → Revisão gerada → Próxima Revisão). `sessionResultMirror` é o mesmo
  // objeto real exibido em StudyCompletionView, espelhado via EducationPanelContext — não uma
  // segunda fonte de dado. "Revisar antes" nunca é bloqueado: o botão abaixo abre o modal
  // imediatamente, a data é só uma sugestão de agenda, não um portão.
  const justCompletedReview =
    isSessionCompleted && sessionResultMirror?.track === 'ingles'
      ? {
          id: 'just-completed-ingles',
          title: trackDef.lesson.topic,
          moduleTitle: trackDef.lesson.discipline,
          completedAt: 'Agora',
          durationMinutes: undefined as number | undefined,
          nextReviewDate: sessionResultMirror.nextReviewDate,
        }
      : null;
  const reviewCandidates = history.slice(0, 2);

  // Nível CEFR derivado do prefixo do título do módulo ("A1 Fundamentals...", "B1 Spoken...") —
  // dado real já existente na fixture, não uma segunda fonte de verdade sobre o nível do aluno.
  const levelOf = (title: string) => CEFR_LEVELS.find((l) => title.startsWith(l));
  const levelStatus = (level: string): 'completed' | 'current' | 'locked' => {
    const modulesInLevel = trackDef.modules.filter((m) => levelOf(m.title) === level);
    if (modulesInLevel.length === 0) return 'locked';
    if (modulesInLevel.every((m) => m.status === 'completed')) return 'completed';
    if (modulesInLevel.some((m) => m.status === 'in_progress')) return 'current';
    return 'locked';
  };
  const currentLevel = CEFR_LEVELS.find((l) => levelStatus(l) === 'current') ?? 'A1';
  const nextLevel = CEFR_LEVELS[CEFR_LEVELS.indexOf(currentLevel) + 1];
  const lessonsRemainingInLevel = trackDef.modules
    .filter((m) => levelOf(m.title) === currentLevel)
    .flatMap((m) => m.lessons ?? [])
    .filter((l) => l.status !== 'completed').length;

  return (
    <div id="context-panel-track-ingles" className="flex flex-col gap-6">
      {/* 1. CONTEXTO DA TRILHA — compacto */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-6 h-6 rounded-lg ${accent.softBg} border ${accent.softBorder} flex items-center justify-center flex-shrink-0`}>
            <span className={`material-symbols-outlined text-[14px] ${accent.text}`}>translate</span>
          </span>
          <span className="text-[11px] font-semibold text-text-primary truncate">
            INGLÊS / {currentLevel} · {currentModule?.title.replace(/^[A-Z]\d\s/, '') ?? 'Curso'}
          </span>
        </div>
        <span className="text-[10px] font-mono text-text-muted tabular-nums flex-shrink-0">
          {completedLessons}/{totalLessons} aulas
        </span>
      </div>

      {isVoiceActive && (
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 border border-[#71DBD2]/30 rounded-full px-2.5 py-1 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-medusa-primary living-pulse" />
          Treino por voz em andamento
        </div>
      )}

      {/* 2. PRÓXIMA AÇÃO — protagonista do painel */}
      {currentModule && resumeLesson && (
        <ContextPanelSection label="Próxima Ação">
          {requestStartStudy ? (
            <button
              type="button"
              id="panel-next-action-ingles"
              onClick={requestStartStudy}
              className={`w-full text-left p-3.5 rounded-xl ${accent.softBg} backdrop-blur-sm border ${accent.softBorder} flex flex-col gap-1 transition-all duration-220 hover:-translate-y-0.5 hover:shadow-glass ${accent.hoverBorder} focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none`}
            >
              <h4 className="text-[13px] font-semibold text-text-primary leading-snug">{resumeLesson.title}</h4>
              <p className="text-[11px] text-text-secondary">{resumeLesson.durationMinutes} min · {currentModule.title}</p>
              <span className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold ${accent.text}`}>
                <span className="material-symbols-outlined text-[14px]">play_circle</span>
                Continuar sessão
              </span>
            </button>
          ) : (
            <div
              id="panel-next-action-ingles"
              className={`p-3.5 rounded-xl ${accent.softBg} backdrop-blur-sm border ${accent.softBorder} flex flex-col gap-1`}
            >
              <h4 className="text-[13px] font-semibold text-text-primary leading-snug">{resumeLesson.title}</h4>
              <p className="text-[11px] text-text-secondary">{resumeLesson.durationMinutes} min · {currentModule.title}</p>
            </div>
          )}
        </ContextPanelSection>
      )}

      {/* 3. DOMÍNIO / MASTERY */}
      {trackDef.masteryDomains && (
        <ContextPanelSection label="Domínio por Habilidade">
          <MasteryBars domains={trackDef.masteryDomains} />
        </ContextPanelSection>
      )}

      {/* 4. PRÓXIMAS REVISÕES — destino real: abre o registro salvo em Minhas Aulas */}
      {(justCompletedReview || reviewCandidates.length > 0) && (
        <ContextPanelSection label="Próximas Revisões">
          <div id="panel-reviews-ingles" className="flex flex-col gap-2">
            {justCompletedReview && (
              <div
                id="panel-review-just-completed"
                className="p-3 rounded-xl bg-medusa-support/10 border border-medusa-support/40 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[#1B502C] dark:text-medusa-support">Recém-concluída</span>
                  <h5 className="text-[12px] font-semibold text-text-primary truncate">{justCompletedReview.title}</h5>
                  <p className="text-[11px] text-text-muted truncate">
                    Revisão agendada: {justCompletedReview.nextReviewDate} · pode revisar antes
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-panel-review-just-completed"
                  onClick={() =>
                    openReviewModal({
                      id: justCompletedReview.id,
                      title: justCompletedReview.title,
                      subtitle: justCompletedReview.moduleTitle,
                      completedAt: justCompletedReview.completedAt,
                      durationMinutes: justCompletedReview.durationMinutes,
                    })
                  }
                  className="flex-shrink-0 text-[11px] font-mono text-[#1B502C] dark:text-medusa-support bg-medusa-support/20 px-2.5 py-1 rounded-full border border-medusa-support/40 hover:opacity-80 transition-opacity focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                >
                  Revisar agora
                </button>
              </div>
            )}
            {reviewCandidates.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-surface/70 border border-border/50 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <h5 className="text-[12px] font-semibold text-text-primary truncate">{item.title}</h5>
                  <p className="text-[11px] text-text-muted truncate">{item.moduleTitle} · Próxima revisão: {trackDef.nextReviewSuggestion}</p>
                </div>
                <button
                  type="button"
                  id={`btn-panel-review-${item.id}`}
                  onClick={() =>
                    openReviewModal({
                      id: item.id,
                      title: item.title,
                      subtitle: item.moduleTitle,
                      completedAt: item.completedAt,
                      durationMinutes: item.durationMinutes,
                    })
                  }
                  className="flex-shrink-0 text-[11px] font-mono text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 px-2.5 py-1 rounded-full border border-[#71DBD2]/30 hover:opacity-80 transition-opacity focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
                >
                  Revisão
                </button>
              </div>
            ))}
          </div>
        </ContextPanelSection>
      )}

      {/* 5. CRONOGRAMA DO INGLÊS = linha do tempo de níveis CEFR (A1→A2→B1→B2) */}
      <ContextPanelSection label="Trajetória de Nível">
        <div id="panel-english-level-timeline" className="flex items-center gap-1">
          {CEFR_LEVELS.map((level, i) => {
            const status = levelStatus(level);
            return (
              <React.Fragment key={level}>
                {i > 0 && (
                  <div
                    className={`h-px flex-1 ${
                      CEFR_LEVELS.indexOf(currentLevel) > i - 1 ? 'bg-medusa-support' : 'bg-border/60'
                    }`}
                  />
                )}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold flex-shrink-0 border ${
                    status === 'completed'
                      ? 'bg-medusa-support/25 border-medusa-support text-[#1B502C] dark:text-medusa-support'
                      : status === 'current'
                        ? 'bg-medusa-primary border-medusa-primary text-[#1C2420]'
                        : 'bg-surface-subtle border-border/60 text-text-muted'
                  }`}
                  title={level}
                >
                  {status === 'completed' ? (
                    <span className="material-symbols-outlined text-[15px]">check</span>
                  ) : (
                    level
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <p className="text-[11px] text-text-secondary pt-1">
          Nível atual <strong className="text-text-primary">{currentLevel}</strong>
          {nextLevel && (
            <>
              {' '}· faltam <strong className="text-text-primary">{lessonsRemainingInLevel}</strong> aula
              {lessonsRemainingInLevel !== 1 ? 's' : ''} para {nextLevel}
            </>
          )}
        </p>
      </ContextPanelSection>

      {/* PROFESSOR IA — embutido de verdade no painel, não um redirecionamento */}
      <ContextPanelSection label="Professor de Inglês (IA)" noBorder>
        <button
          type="button"
          id="btn-toggle-english-teacher"
          onClick={() => setIsTeacherOpen((v) => !v)}
          className="btn-interactive w-full flex items-center justify-between gap-2 p-3 rounded-xl bg-surface-secondary/70 border border-border/60 hover:border-medusa-primary/50 transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
        >
          <span className="flex items-center gap-2 text-[12px] font-semibold text-text-primary">
            <span className="material-symbols-outlined text-[17px] text-medusa-primary">record_voice_over</span>
            Conversar com o professor
          </span>
          <span className={`material-symbols-outlined text-[16px] text-text-muted transition-transform ${isTeacherOpen ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>

        {isTeacherOpen && (
          <div
            id="english-teacher-inline-wrapper"
            className="mt-2 h-[420px] rounded-xl border border-border/60 overflow-hidden study-summary-enter"
          >
            <TutorDrawer
              isOpen={isTeacherOpen}
              onClose={() => setIsTeacherOpen(false)}
              trackDef={trackDef}
              variant="inline"
              onVoiceActiveChange={setVoiceActive}
            />
          </div>
        )}
      </ContextPanelSection>
    </div>
  );
}
