'use client';

import { useEffect } from 'react';

/**
 * Fecha um overlay/diálogo/drawer com a tecla Esc — padrão reutilizável (ver Round 5 §28:
 * "não duplicar lógica entre... quando puder existir uma fundação comum"). Antes desta rodada,
 * nenhum dos diálogos centrados (`LessonReviewModal`, confirmação de "Interromper aula") nem o
 * `TutorDrawer` respondiam a Esc — cada um exigia clique explícito no X ou fora do elemento.
 *
 * `active` deixa o listener condicional sem precisar de um `if` dentro do próprio efeito em cada
 * chamador — quando o diálogo está fechado, `active=false` e nada é registrado no document.
 */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onEscape();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, onEscape]);
}
