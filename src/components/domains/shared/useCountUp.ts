'use client';

import { useEffect, useState } from 'react';
import { prefersReducedMotion } from './viewTransition';

/** Conta de 0 até `target` (easing suave). Com movimento reduzido, mostra o valor final direto. */
export function useCountUp(target: number, opts: { delayMs?: number; durationMs?: number; active?: boolean } = {}): number {
  const { delayMs = 0, durationMs = 900, active = true } = opts;
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    let raf = 0;
    let start = 0;
    const timer = window.setTimeout(() => {
      const step = (ts: number) => {
        if (!start) start = ts;
        const t = Math.min(1, (ts - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(target * eased);
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, delayMs, durationMs, active]);

  return value;
}
