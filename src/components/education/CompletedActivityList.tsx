'use client';

import React, { useState } from 'react';
import { useEducationPanel } from '@/context/EducationPanelContext';

export interface CompletedActivityItem {
  id: string;
  title: string;
  /** Contexto curto (módulo/disciplina/área) exibido antes da data. */
  subtitle: string;
  completedAt: string;
  durationMinutes?: number;
}

interface CompletedActivityListProps {
  /** Ex.: "Minhas Aulas · Concluídas", "Aulas Concluídas · ENEM". */
  title: string;
  items: CompletedActivityItem[];
  /** Id estável para seletor de QA (varia por trilha: my-lessons-history, enem-..., faculdade-...). */
  sectionId?: string;
  defaultOpen?: boolean;
}

/**
 * "O que eu já fiz" — componente compartilhado pelas 3 trilhas (Inglês/ENEM/Faculdade) para o
 * histórico de atividades concluídas. Cada trilha decide o QUE entra na lista (aulas, conteúdos,
 * simulados); este componente só cuida de como isso é apresentado e revisitado. Puramente
 * fixture — nenhuma persistência real por trás do botão "Rever".
 */
export function CompletedActivityList({ title, items, sectionId, defaultOpen = false }: CompletedActivityListProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { openReviewModal } = useEducationPanel();

  if (items.length === 0) return null;

  return (
    <section id={sectionId} aria-label={title} className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-3 w-full text-left focus:outline-none"
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-text-muted">
            {title}
          </span>
          <div className="h-px bg-border/60 w-16" />
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted">
          {items.length} registradas
          <span
            className={`material-symbols-outlined text-[16px] transition-transform ${open ? 'rotate-180' : ''}`}
          >
            expand_more
          </span>
        </span>
      </button>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-border/60 bg-surface/70 hover:bg-surface transition-all flex items-center justify-between gap-3"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-text-muted truncate">{item.subtitle}</span>
                  <span className="text-text-muted/40">•</span>
                  <span className="text-[11px] font-mono text-text-secondary flex-shrink-0">{item.completedAt}</span>
                </div>
                <h4 className="text-[13px] font-semibold text-text-primary tracking-tight truncate">
                  {item.title}
                </h4>
              </div>
              <button
                type="button"
                id={`btn-review-${item.id}`}
                onClick={() => openReviewModal(item)}
                className="flex-shrink-0 flex items-center gap-1 text-[11px] font-mono text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 px-2.5 py-1 rounded-full border border-[#71DBD2]/30 hover:opacity-80 transition-opacity focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
              >
                <span className="material-symbols-outlined text-[13px]">replay</span>
                Rever
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
