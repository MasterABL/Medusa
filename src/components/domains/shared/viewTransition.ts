'use client';

import { flushSync } from 'react-dom';

type DocWithVT = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Troca de estado com transição espacial (View Transitions API) quando o navegador suporta e a
 * pessoa não pediu movimento reduzido; senão aplica direto. `update` roda dentro de flushSync
 * para o navegador capturar o DOM novo de forma síncrona.
 */
export function runTransition(update: () => void): void {
  const doc = typeof document !== 'undefined' ? (document as DocWithVT) : undefined;
  if (!doc?.startViewTransition || prefersReducedMotion()) {
    update();
    return;
  }
  doc.startViewTransition(() => {
    flushSync(update);
  });
}
