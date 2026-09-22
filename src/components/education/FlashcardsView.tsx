'use client';

import React, { useState, useCallback } from 'react';
import { TrackDefinition } from './types';

interface FlashcardsViewProps {
  trackDef: TrackDefinition;
  onFinish: () => void;
}

/**
 * Revisão de Vocabulário — última etapa prática do fluxo de Inglês, antes do Resultado.
 * Progresso e classificação (Sei essa / Preciso revisar) ficam em Local State, sem
 * persistência entre sessões (Fase A / sem backend).
 */
export function FlashcardsView({ trackDef, onFinish }: FlashcardsViewProps) {
  const vocabulary = trackDef.vocabulary || [];
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [known, setKnown] = useState<string[]>([]);
  const [toReview, setToReview] = useState<string[]>([]);

  const card = vocabulary[index];
  const isLast = index === vocabulary.length - 1;

  const advance = useCallback(() => {
    if (isLast) {
      onFinish();
      return;
    }
    setIndex((prev) => prev + 1);
    setIsFlipped(false);
  }, [isLast, onFinish]);

  const handleKnown = useCallback(() => {
    if (card) setKnown((prev) => [...prev, card.id]);
    advance();
  }, [card, advance]);

  const handleReview = useCallback(() => {
    if (card) setToReview((prev) => [...prev, card.id]);
    advance();
  }, [card, advance]);

  if (!card) return null;

  return (
    <div
      id="flashcards-container"
      className="study-stage-enter w-full flex flex-col gap-4 max-w-2xl mx-auto pb-14"
    >
      <div className="flex flex-col gap-1 border-b border-border/70 pb-4">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#18534B] dark:text-[#71DBD2] bg-[#71DBD2]/15 px-2.5 py-0.5 rounded-full border border-[#71DBD2]/30 w-fit">
          Revisão de Vocabulário · {index + 1} de {vocabulary.length}
        </span>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
          Flashcards da Sessão
        </h1>
      </div>

      <button
        type="button"
        id="btn-flashcard-flip"
        onClick={() => setIsFlipped((prev) => !prev)}
        aria-label={isFlipped ? 'Ver termo em inglês' : 'Ver tradução'}
        className="btn-interactive w-full min-h-[220px] rounded-2xl border border-border/70 shadow-calm bg-surface hover:border-medusa-primary/40 transition-all flex flex-col items-center justify-center gap-3 p-8 text-center focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
      >
        {!isFlipped ? (
          <>
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">Termo</span>
            <span className="text-2xl font-bold text-text-primary">{card.term}</span>
            <span className="text-[12px] text-text-muted mt-2">Toque para ver a tradução</span>
          </>
        ) : (
          <>
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">Tradução</span>
            <span className="text-xl font-semibold text-text-primary">{card.translation}</span>
            <span className="text-[13px] text-text-secondary italic mt-2 max-w-md">&ldquo;{card.example}&rdquo;</span>
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          id="btn-flashcard-review"
          onClick={handleReview}
          className="btn-interactive bg-surface hover:bg-surface-secondary border border-border/70 text-text-secondary hover:text-text-primary px-4 py-2 rounded-full text-[12px] font-medium transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          <span>Preciso revisar</span>
        </button>
        <button
          type="button"
          id="btn-flashcard-known"
          onClick={handleKnown}
          className="btn-interactive bg-medusa-primary hover:opacity-95 text-[#1C2420] px-5 py-2 rounded-full text-[12px] font-semibold transition-all shadow-subtle flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus:outline-none"
        >
          <span>Sei essa</span>
          <span className="material-symbols-outlined text-[16px]">
            {isLast ? 'flag' : 'arrow_forward'}
          </span>
        </button>
      </div>

      <div className="flex items-center justify-center gap-4 text-[11px] font-mono text-text-muted pt-1">
        <span>{known.length} já sabidas</span>
        <span>•</span>
        <span>{toReview.length} para revisar</span>
      </div>
    </div>
  );
}
