/**
 * MEDUSA FOUNDATION — Persistência: PersistenceAdapter e Repository
 *
 * Três peças, do mais genérico ao mais concreto:
 *
 *   StorageAdapter          chave/valor bruto (memory | localStorage | Supabase futuro)
 *   PersistenceAdapter<T>   um estado inteiro, versionado, lido como DataState<T>
 *   bind*Persistence        liga um repositório/motor em memória ao PersistenceAdapter
 *
 * Os repositórios de domínio (Tasks, Projects) e o Reminder Engine continuam síncronos e
 * em memória — é o que a UI e os testes consomem. A persistência fica numa camada à parte:
 * `hydrate()` carrega uma vez, `flush()` grava quando o dono decidir. Nada aqui grava
 * sozinho em segundo plano, e nada finge ter gravado: falha volta como `{ ok: false }`.
 */

import type { DataOrigin, DataState } from '../types/dataState';
import { empty, failed, ready } from '../dataState';
import type { StorageAdapter } from './storage';

interface Envelope<T> {
  version: number;
  savedAt: string;
  data: T;
}

export type SaveResult = { ok: true } | { ok: false; error: string };

export interface PersistenceAdapter<T> {
  readonly key: string;
  readonly version: number;
  readonly storage: StorageAdapter;
  load(): Promise<DataState<T>>;
  save(state: T, at: string): Promise<SaveResult>;
  clear(): Promise<void>;
}

export interface SnapshotOptions<T> {
  storage: StorageAdapter;
  key: string;
  version: number;
  /** Converte um snapshot de versão anterior. Sem migração, versão diferente é erro (nunca chute). */
  migrate?: (data: unknown, fromVersion: number) => T;
  /** Rejeita um snapshot corrompido em vez de devolvê-lo como se fosse válido. */
  validate?: (data: unknown) => data is T;
  /** Origem declarada do dado restaurado (o backend não muda a procedência). */
  origin?: DataOrigin;
}

export function createSnapshotPersistence<T>(opts: SnapshotOptions<T>): PersistenceAdapter<T> {
  const origin = opts.origin ?? 'manual';
  return {
    key: opts.key,
    version: opts.version,
    storage: opts.storage,
    async load() {
      const av = opts.storage.availability();
      if (av.status === 'unavailable') return failed<T>(av.reason, false);
      let raw: string | null;
      try {
        raw = await opts.storage.get(opts.key);
      } catch (e) {
        return failed<T>((e as Error).message, true);
      }
      if (raw === null) return empty<T>(`nada salvo em "${opts.key}" ainda`);
      let env: Envelope<unknown>;
      try {
        env = JSON.parse(raw);
      } catch {
        return failed<T>(`snapshot "${opts.key}" corrompido (JSON inválido)`, false);
      }
      let data: unknown = env.data;
      if (env.version !== opts.version) {
        if (!opts.migrate) return failed<T>(`snapshot "${opts.key}" na versão ${env.version}, esperado ${opts.version} e sem migração`, false);
        data = opts.migrate(env.data, env.version);
      }
      if (opts.validate && !opts.validate(data)) return failed<T>(`snapshot "${opts.key}" não passou na validação`, false);
      return ready(data as T, origin, env.savedAt);
    },
    async save(state, at) {
      try {
        const env: Envelope<T> = { version: opts.version, savedAt: at, data: state };
        await opts.storage.set(opts.key, JSON.stringify(env));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },
    clear: () => opts.storage.remove(opts.key),
  };
}

/** Contrato mínimo de coleção: o que TaskRepository e ProjectRepository já oferecem. */
export interface Repository<T extends { id: string }> {
  readonly origin: DataOrigin;
  get(id: string): T | undefined;
  list(): T[];
  save(entity: T): void;
  remove?(id: string): void;
}

export function createInMemoryRepository<T extends { id: string }>(origin: DataOrigin = 'manual', seed: T[] = []): Repository<T> & { remove(id: string): void } {
  const map = new Map(seed.map((x) => [x.id, x]));
  return {
    origin,
    get: (id) => map.get(id),
    list: () => Array.from(map.values()),
    save: (x) => void map.set(x.id, x),
    remove: (id) => void map.delete(id),
  };
}

export interface BoundPersistence<T> {
  /** Carrega o snapshot e repõe no dono. `ready`/`empty` = ok; `error` = o dono segue em memória. */
  hydrate(): Promise<DataState<T>>;
  flush(at: string): Promise<SaveResult>;
}

/** Liga qualquer repositório (Tasks, Projects, ...) a um PersistenceAdapter da lista inteira. */
export function bindRepositoryPersistence<T extends { id: string }>(
  repo: Pick<Repository<T>, 'list' | 'save'>,
  persistence: PersistenceAdapter<T[]>
): BoundPersistence<T[]> {
  return {
    async hydrate() {
      const state = await persistence.load();
      if (state.status === 'ready') for (const x of state.data) repo.save(x);
      return state;
    },
    flush: (at) => persistence.save(repo.list(), at),
  };
}

/** Qualquer motor com export/import de estado (ex.: Reminder Engine). */
export interface ExportableState<S> {
  exportState(): S;
  importState(state: S): void;
}

export function bindStatePersistence<S>(owner: ExportableState<S>, persistence: PersistenceAdapter<S>): BoundPersistence<S> {
  return {
    async hydrate() {
      const state = await persistence.load();
      if (state.status === 'ready') owner.importState(state.data);
      return state;
    },
    flush: (at) => persistence.save(owner.exportState(), at),
  };
}

/**
 * Log só de acréscimo (eventos de contexto, trilha de auditoria). Guarda até `max`
 * entradas — histórico infinito no navegador vira problema de cota e de privacidade.
 */
export interface AppendLog<E> {
  append(entry: E, at: string): Promise<SaveResult>;
  list(): Promise<DataState<E[]>>;
}

export function createAppendLog<E>(persistence: PersistenceAdapter<E[]>, max = 500): AppendLog<E> {
  return {
    async append(entry, at) {
      const current = await persistence.load();
      if (current.status === 'error') return { ok: false, error: current.message };
      const list = current.status === 'ready' ? current.data : [];
      return persistence.save([...list, entry].slice(-max), at);
    },
    list: () => persistence.load(),
  };
}
