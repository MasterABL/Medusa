'use client';

import { useEffect, RefObject } from 'react';

/**
 * Fecha um painel/dropdown ao clicar fora dele — generaliza o padrão que já existia, duplicado
 * inline, em `Header.tsx` (dropdowns de modo/tema). Extraído para reuso no TutorDrawer em tela
 * cheia do painel lateral de Inglês (Round 5 §8), que precisava do mesmo comportamento e não
 * fazia sentido reimplementar o listener pela terceira vez (Round 5 §28).
 *
 * `active` evita registrar o listener quando o elemento nem está aberto — mesma razão de design
 * do `useEscapeKey`.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  onOutsideClick: () => void,
  active: boolean = true
) {
  useEffect(() => {
    if (!active) return;
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutsideClick();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [ref, onOutsideClick, active]);
}
