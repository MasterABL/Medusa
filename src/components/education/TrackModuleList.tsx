'use client';

import React from 'react';
import { TrackModuleItem } from './types';

interface TrackModuleListProps {
  title: string;
  domainLabel: string;
  items: TrackModuleItem[];
}

/**
 * Lista plana de módulos curados — reaproveitada por ENEM (habilidades/conteúdos) e Faculdade
 * (aulas/conteúdos da disciplina ativa), já que para essas duas trilhas o módulo plano é a unidade
 * correta. Inglês NÃO usa este componente: sua unidade é o módulo→aulas (ver EnglishHub.tsx).
 */
export function TrackModuleList({ title, domainLabel, items }: TrackModuleListProps) {
  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-text-muted">
            {title}
          </span>
          <div className="h-px bg-border/60 w-16" />
        </div>
        <span className="text-[11px] font-mono text-text-muted">{domainLabel}</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {items.map((item, idx) => {
          const isItemCompleted = item.status === 'completed';
          const isItemActive = item.status === 'in_progress';

          return (
            <div
              key={item.id}
              className={`p-4 sm:p-5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isItemActive
                  ? 'bg-surface border-medusa-primary/50 shadow-calm'
                  : isItemCompleted
                  ? 'bg-surface/70 border-border/60 hover:bg-surface'
                  : 'bg-surface-secondary/40 border-border/40 opacity-70'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold flex-shrink-0 ${
                    isItemCompleted
                      ? 'bg-medusa-support/20 text-[#1B502C] dark:text-medusa-support border border-medusa-support/40'
                      : isItemActive
                      ? 'bg-medusa-primary/20 text-[#18534B] dark:text-[#71DBD2] border border-medusa-primary/40'
                      : 'bg-surface-secondary text-text-muted border border-border/60'
                  }`}
                >
                  {isItemCompleted ? (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  ) : (
                    `0${idx + 1}`
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-text-muted">{item.code}</span>
                    <span className="text-text-muted/40">•</span>
                    <span className="text-[11px] font-mono text-text-secondary">{item.date}</span>
                  </div>
                  <h4 className="text-[14px] font-semibold text-text-primary tracking-tight">
                    {item.title}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:justify-end text-[11px] font-mono text-text-muted">
                <span>{item.duration}</span>
                {isItemCompleted && (
                  <span className="font-semibold text-[#1B502C] dark:text-medusa-support bg-medusa-support/15 px-2.5 py-0.5 rounded-full border border-medusa-support/30">
                    Score: {item.score}
                  </span>
                )}
                {isItemActive && (
                  <span className="font-semibold text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 px-2.5 py-0.5 rounded-full border border-[#71DBD2]/30">
                    Em Foco
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
