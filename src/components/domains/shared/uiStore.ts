'use client';

import { useSyncExternalStore } from 'react';

/**
 * Store mínimo de UI (foco/seleção compartilhada entre a tela principal e o Context Panel do mesmo
 * domínio). Guarda só estado de interface — nunca dado de domínio, que continua nos repositórios.
 */
export interface UiStore<T> {
  get(): T;
  set(patch: Partial<T> | ((prev: T) => Partial<T>)): void;
  subscribe(listener: () => void): () => void;
}

export function createUiStore<T extends object>(initial: T): UiStore<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      const next = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...next };
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useUiStore<T extends object>(store: UiStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
