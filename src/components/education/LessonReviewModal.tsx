'use client';

import React from 'react';
import { useEducationPanel } from '@/context/EducationPanelContext';
import { useEscapeKey } from '@/lib/useEscapeKey';

/**
 * Destino real do botão "Rever"/"Revisão" (Minhas Aulas + "Próximas Revisões" dos 3 Context
 * Panels — ver DESIGN.md/Rodada 4 §13). Mostra o registro salvo (título, contexto, quando foi
 * concluída, duração). NÃO relança o Study Mode interativo com o vídeo/exercícios originais —
 * essa integração por-aula não existe nesta fase (as fixtures não guardam conteúdo replayable
 * por lição individual, só metadados do registro concluído). Isso é um destino genuíno (não uma
 * rota vazia nem um placeholder), só que seu alcance é "ver o que foi revisado", não "refazer a
 * aula do zero" — status PARCIAL documentado no Evidence Report da Rodada 4.
 */
export function LessonReviewModal() {
  const { reviewModalItem, closeReviewModal } = useEducationPanel();
  useEscapeKey(Boolean(reviewModalItem), closeReviewModal);

  if (!reviewModalItem) return null;

  return (
    <div
      id="lesson-review-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Revisão da aula"
      className="modal-backdrop-enter fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={closeReviewModal}
    >
      <div
        id="lesson-review-modal"
        onClick={(e) => e.stopPropagation()}
        className="modal-pop-enter w-full max-w-md bg-surface rounded-2xl border border-border/70 shadow-island p-6 flex flex-col gap-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-medusa-primary/20 border border-medusa-primary/40 flex items-center justify-center text-[#18534B] dark:text-[#71DBD2] flex-shrink-0">
              <span className="material-symbols-outlined text-[18px]">replay</span>
            </span>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                Revisão · Aula Concluída
              </span>
              <h3 className="text-[15px] font-semibold text-text-primary tracking-tight leading-snug">
                {reviewModalItem.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-review-modal"
            onClick={closeReviewModal}
            aria-label="Fechar"
            className="btn-interactive p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <div className="p-3 rounded-xl bg-surface-secondary/60 border border-border/50 space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-text-muted">Contexto</span>
            <p className="text-text-primary font-medium">{reviewModalItem.subtitle}</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-secondary/60 border border-border/50 space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-text-muted">Concluída em</span>
            <p className="text-text-primary font-medium">{reviewModalItem.completedAt}</p>
          </div>
          {reviewModalItem.durationMinutes !== undefined && (
            <div className="p-3 rounded-xl bg-surface-secondary/60 border border-border/50 space-y-0.5 col-span-2">
              <span className="text-[10px] font-mono uppercase text-text-muted">Duração</span>
              <p className="text-text-primary font-medium">{reviewModalItem.durationMinutes} min</p>
            </div>
          )}
        </div>

        <p className="text-[11px] text-text-muted leading-relaxed border-t border-border/60 pt-3">
          Registro salvo desta aula. A revisão interativa completa (retomar vídeo/exercícios
          originais) ainda não está disponível para lições individuais — este é o conteúdo real
          guardado sobre ela.
        </p>

        <button
          type="button"
          id="btn-review-modal-close-action"
          onClick={closeReviewModal}
          className="btn-interactive w-full text-center bg-medusa-primary hover:opacity-95 text-[#1C2420] px-4 py-2.5 rounded-full text-[13px] font-semibold transition-all"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
