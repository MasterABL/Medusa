/**
 * MEDUSA FOUNDATION — Persistência: StorageAdapter
 *
 * Um contrato chave/valor assíncrono que qualquer backend implementa:
 *
 *   in-memory  → createMemoryStorageAdapter()      (hoje, testes e fallback)
 *   localStorage → createLocalStorageAdapter()     (navegador; pode estar indisponível)
 *   Supabase   → BLOQUEADO: o Medusa ainda não tem backend nem credenciais.
 *                createUnavailableStorageAdapter('supabase', motivo) deixa isso explícito
 *                em vez de fingir que gravou.
 *
 * Assíncrono de propósito: localStorage é síncrono, mas um backend de rede não é — o
 * contrato já nasce no formato que o backend futuro precisa, para ninguém reescrever
 * quem consome quando ele chegar.
 */

export type PersistenceBackend = 'memory' | 'local_storage' | 'supabase';

export type StorageAvailability =
  | { status: 'available'; backend: PersistenceBackend }
  | { status: 'unavailable'; backend: PersistenceBackend; reason: string };

export interface StorageAdapter {
  readonly backend: PersistenceBackend;
  availability(): StorageAvailability;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
}

export class StorageUnavailableError extends Error {
  constructor(readonly backend: PersistenceBackend, readonly reason: string) {
    super(`Armazenamento ${backend} indisponível: ${reason}`);
    this.name = 'StorageUnavailableError';
  }
}

export function createMemoryStorageAdapter(seed: Record<string, string> = {}): StorageAdapter {
  const map = new Map(Object.entries(seed));
  return {
    backend: 'memory',
    availability: () => ({ status: 'available', backend: 'memory' }),
    get: async (k) => map.get(k) ?? null,
    set: async (k, v) => void map.set(k, v),
    remove: async (k) => void map.delete(k),
    keys: async (prefix = '') => Array.from(map.keys()).filter((k) => k.startsWith(prefix)).sort(),
  };
}

/** Só o que o adapter usa do `Storage` do navegador — injetável em teste. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key'> & { readonly length: number };

function browserLocalStorage(): KeyValueStore | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = '__medusa_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    // modo privado, cota esgotada ou bloqueado pelo navegador
    return null;
  }
}

/**
 * `store` ausente → tenta o localStorage do navegador. Se não houver (SSR, modo privado,
 * bloqueado), o adapter existe mas responde `unavailable` e falha alto ao gravar —
 * nunca "grava" em lugar nenhum fingindo sucesso.
 */
export function createLocalStorageAdapter(opts: { store?: KeyValueStore | null; namespace?: string } = {}): StorageAdapter {
  const store = opts.store === undefined ? browserLocalStorage() : opts.store;
  const ns = `${opts.namespace ?? 'medusa'}:`;
  const reason = 'localStorage indisponível neste ambiente (servidor, modo privado ou bloqueado)';
  const need = (): KeyValueStore => {
    if (!store) throw new StorageUnavailableError('local_storage', reason);
    return store;
  };
  return {
    backend: 'local_storage',
    availability: () => (store ? { status: 'available', backend: 'local_storage' } : { status: 'unavailable', backend: 'local_storage', reason }),
    get: async (k) => need().getItem(ns + k),
    set: async (k, v) => {
      try {
        need().setItem(ns + k, v);
      } catch (e) {
        if (e instanceof StorageUnavailableError) throw e;
        throw new StorageUnavailableError('local_storage', `falha ao gravar (${(e as Error).message})`);
      }
    },
    remove: async (k) => need().removeItem(ns + k),
    keys: async (prefix = '') => {
      const s = need();
      const out: string[] = [];
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k && k.startsWith(ns + prefix)) out.push(k.slice(ns.length));
      }
      return out.sort();
    },
  };
}

/** Backend declarado mas não conectado (ex.: Supabase sem projeto/credenciais no Medusa). */
export function createUnavailableStorageAdapter(backend: PersistenceBackend, reason: string): StorageAdapter {
  const fail = async (): Promise<never> => {
    throw new StorageUnavailableError(backend, reason);
  };
  return { backend, availability: () => ({ status: 'unavailable', backend, reason }), get: fail, set: fail, remove: fail, keys: fail };
}
