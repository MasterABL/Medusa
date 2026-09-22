'use client';

import React, { useState } from 'react';
import { TrackDefinition, TrackModuleItem } from './types';

interface EnglishHubProps {
  trackDef: TrackDefinition;
  trackItems: TrackModuleItem[];
}

const LESSON_STATUS_STYLE: Record<string, string> = {
  completed: 'bg-medusa-support/20 text-[#1B502C] dark:text-medusa-support border-medusa-support/40',
  current: 'bg-medusa-primary/20 text-[#18534B] dark:text-[#71DBD2] border-medusa-primary/40',
  locked: 'bg-surface-secondary text-text-muted border-border/60',
};

const LESSON_STATUS_ICON: Record<string, string> = {
  completed: 'check',
  current: 'play_arrow',
  locked: 'lock',
};

/**
 * Hub de Inglês — a unidade principal do curso é o MÓDULO, não a "sessão do dia".
 * Cada módulo expõe suas aulas (Aula 01, 02...) com status próprio. O módulo em progresso
 * abre expandido por padrão; os demais ficam recolhidos, mas continuam navegáveis via <details>.
 * Flashcards deliberadamente NÃO aparecem aqui — são uma capacidade à parte, acessada dentro do
 * fluxo da aula, para não competir visualmente com a hierarquia de módulos.
 */
export function EnglishHub({ trackDef, trackItems }: EnglishHubProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const modulesWithLessons = trackItems.filter((m) => m.lessons && m.lessons.length > 0);

  const allLessons = modulesWithLessons.flatMap((m) => m.lessons ?? []);
  const completedLessons = allLessons.filter((l) => l.status === 'completed').length;
  const totalLessons = allLessons.length;
  const overallPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const history = trackDef.completedLessonsHistory ?? [];

  return (
    <div className="flex flex-col gap-8">
      {/* ================= MÓDULOS & AULAS — HIERARQUIA DO CURSO ================= */}
      <section aria-label="Módulos & Aulas do Curso" className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-text-muted">
              Módulos &amp; Aulas · {trackDef.name}
            </span>
            <div className="h-px bg-border/60 w-16" />
          </div>
          <span className="text-[11px] font-mono text-text-muted">
            {completedLessons}/{totalLessons} aulas · {overallPercent}% do curso
          </span>
        </div>

        {/* Barra de progresso geral do curso (não por sessão isolada) */}
        <div className="h-1.5 rounded-full bg-surface-secondary/80 border border-border/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-medusa-primary transition-all duration-700 ease-out"
            style={{ width: `${overallPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-1 gap-3">
          {modulesWithLessons.map((mod) => {
            const lessons = mod.lessons ?? [];
            const modCompleted = lessons.filter((l) => l.status === 'completed').length;
            const isActiveModule = mod.status === 'in_progress';
            const isModCompleted = mod.status === 'completed';
            const resumeLesson = lessons.find((l) => l.status === 'current');

            return (
              <details
                key={mod.id}
                open={isActiveModule}
                className={`group rounded-xl border transition-all ${
                  isActiveModule
                    ? 'bg-surface border-medusa-primary/50 shadow-calm'
                    : isModCompleted
                    ? 'bg-surface/70 border-border/60'
                    : 'bg-surface-secondary/40 border-border/40 opacity-80'
                }`}
              >
                <summary className="cursor-pointer list-none p-4 sm:p-5 flex items-center justify-between gap-3 select-none">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold flex-shrink-0 border ${
                        isModCompleted
                          ? 'bg-medusa-support/20 text-[#1B502C] dark:text-medusa-support border-medusa-support/40'
                          : isActiveModule
                          ? 'bg-medusa-primary/20 text-[#18534B] dark:text-[#71DBD2] border-medusa-primary/40'
                          : 'bg-surface-secondary text-text-muted border-border/60'
                      }`}
                    >
                      {isModCompleted ? (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">
                          {isActiveModule ? 'auto_stories' : 'lock'}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-text-muted">{mod.code}</span>
                        <span className="text-text-muted/40">•</span>
                        <span className="text-[11px] font-mono text-text-secondary">
                          {modCompleted}/{lessons.length} aulas
                        </span>
                      </div>
                      <h4 className="text-[14px] font-semibold text-text-primary tracking-tight truncate">
                        {mod.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {isActiveModule && resumeLesson && (
                      <span className="hidden sm:inline text-[11px] font-semibold text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 px-2.5 py-0.5 rounded-full border border-[#71DBD2]/30">
                        Retomar: {resumeLesson.title}
                      </span>
                    )}
                    <span className="material-symbols-outlined text-[18px] text-text-muted transition-transform group-open:rotate-180">
                      expand_more
                    </span>
                  </div>
                </summary>

                <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 flex flex-col gap-1.5 border-t border-border/50">
                  {lessons.map((lesson, li) => (
                    <div
                      key={lesson.id}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border text-[13px] ${
                        lesson.status === 'current'
                          ? 'border-medusa-primary/40 bg-medusa-primary/5'
                          : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center border flex-shrink-0 ${LESSON_STATUS_STYLE[lesson.status]}`}
                        >
                          <span className="material-symbols-outlined text-[12px]">
                            {LESSON_STATUS_ICON[lesson.status]}
                          </span>
                        </span>
                        <span
                          className={`truncate ${
                            lesson.status === 'locked' ? 'text-text-muted' : 'text-text-primary'
                          }`}
                        >
                          Aula {String(li + 1).padStart(2, '0')} · {lesson.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted flex-shrink-0">
                        {lesson.durationMinutes} min
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* ================= MINHAS AULAS — HISTÓRICO PARA REVISÃO ================= */}
      {history.length > 0 && (
        <section id="my-lessons-history" aria-label="Minhas Aulas" className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="flex items-center justify-between gap-3 w-full text-left focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-text-muted">
                Minhas Aulas · Concluídas
              </span>
              <div className="h-px bg-border/60 w-16" />
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted">
              {history.length} registradas
              <span
                className={`material-symbols-outlined text-[16px] transition-transform ${historyOpen ? 'rotate-180' : ''}`}
              >
                expand_more
              </span>
            </span>
          </button>

          {historyOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {history.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-xl border border-border/60 bg-surface/70 hover:bg-surface transition-all flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-text-muted truncate">{rec.moduleTitle}</span>
                      <span className="text-text-muted/40">•</span>
                      <span className="text-[11px] font-mono text-text-secondary flex-shrink-0">{rec.completedAt}</span>
                    </div>
                    <h4 className="text-[13px] font-semibold text-text-primary tracking-tight truncate">
                      {rec.title}
                    </h4>
                  </div>
                  <button
                    type="button"
                    className="flex-shrink-0 flex items-center gap-1 text-[11px] font-mono text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 px-2.5 py-1 rounded-full border border-[#71DBD2]/30 hover:opacity-80 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[13px]">replay</span>
                    Rever
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
