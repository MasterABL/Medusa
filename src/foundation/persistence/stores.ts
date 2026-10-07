/**
 * MEDUSA FOUNDATION — Persistência por entidade do Personal OS
 *
 * Chaves, versões e validação de cada coleção, prontas para qualquer StorageAdapter.
 * O que cada uma é HOJE, sem exagero (ver PERSISTENCE_MATRIX):
 *
 *   Tasks, Projects, Reminders → adapter preparado e testado; quem liga é a camada de
 *                                app (hoje ninguém chama hydrate/flush em produção).
 *   Context events             → log de acréscimo preparado (DomainEvent[] do Event Bus).
 *   Actions                    → só exportação de leitura. Restaurar ações não é feito de
 *                                propósito: re-hidratar uma ação AUTHORIZED antiga poderia
 *                                fazê-la executar de novo. Precisa de decisão de produto.
 *   Supabase                   → BLOQUEADO: sem projeto/credenciais no Medusa.
 */

import type { Task } from '../../domains/tasks/model/types';
import type { Project } from '../../domains/projects/model/types';
import type { DomainEvent } from '../types/event';
import type { Action } from '../types/action';
import type { ReminderRecord, RecurringReminderRule } from '../reminders/engine';
import { listActions } from '../actionBus';
import { getHistory } from '../eventBus';
import type { StorageAdapter } from './storage';
import type { AppendLog, PersistenceAdapter, SaveResult } from './snapshot';
import { createAppendLog, createSnapshotPersistence } from './snapshot';

export const PERSISTENCE_KEYS = {
  tasks: 'personal-os/tasks',
  projects: 'personal-os/projects',
  reminders: 'personal-os/reminders',
  contextEvents: 'personal-os/context-events',
  actionHistory: 'personal-os/action-history',
} as const;

const isArrayOf = (pred: (x: any) => boolean) => (data: unknown): boolean => Array.isArray(data) && data.every(pred);
const hasId = (x: any) => !!x && typeof x.id === 'string';

export function createTaskPersistence(storage: StorageAdapter): PersistenceAdapter<Task[]> {
  return createSnapshotPersistence<Task[]>({
    storage,
    key: PERSISTENCE_KEYS.tasks,
    version: 1,
    validate: isArrayOf((t) => hasId(t) && typeof t.title === 'string' && typeof t.status === 'string' && Array.isArray(t.dependsOn)) as (d: unknown) => d is Task[],
  });
}

export function createProjectPersistence(storage: StorageAdapter): PersistenceAdapter<Project[]> {
  return createSnapshotPersistence<Project[]>({
    storage,
    key: PERSISTENCE_KEYS.projects,
    version: 1,
    validate: isArrayOf((p) => hasId(p) && typeof p.title === 'string' && Array.isArray(p.milestones)) as (d: unknown) => d is Project[],
  });
}

export type ReminderSnapshot = { version: number; records: ReminderRecord[]; rules?: RecurringReminderRule[] };

export function createReminderPersistence(storage: StorageAdapter): PersistenceAdapter<ReminderSnapshot> {
  return createSnapshotPersistence<ReminderSnapshot>({
    storage,
    key: PERSISTENCE_KEYS.reminders,
    version: 1,
    validate: ((d: any) => !!d && typeof d.version === 'number' && isArrayOf(hasId)(d.records)) as (d: unknown) => d is ReminderSnapshot,
  });
}

export function createContextEventLog(storage: StorageAdapter, max = 500): AppendLog<DomainEvent> {
  return createAppendLog<DomainEvent>(createSnapshotPersistence<DomainEvent[]>({ storage, key: PERSISTENCE_KEYS.contextEvents, version: 1 }), max);
}

/** Grava o histórico atual do Event Bus de uma vez (deduplicado por id). */
export async function snapshotEventHistory(storage: StorageAdapter, at: string, max = 500): Promise<SaveResult> {
  const p = createSnapshotPersistence<DomainEvent[]>({ storage, key: PERSISTENCE_KEYS.contextEvents, version: 1 });
  const prev = await p.load();
  const byId = new Map<string, DomainEvent>((prev.status === 'ready' ? prev.data : []).map((e) => [e.id, e]));
  for (const e of getHistory()) byId.set(e.id, e);
  return p.save(Array.from(byId.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-max), at);
}

/** Exportação de LEITURA do Action Bus (auditoria/backup). Não existe o caminho de volta, de propósito. */
export async function exportActionHistory(storage: StorageAdapter, at: string): Promise<SaveResult> {
  const p = createSnapshotPersistence<Action[]>({ storage, key: PERSISTENCE_KEYS.actionHistory, version: 1 });
  return p.save(listActions(), at);
}

export type PersistenceStatus = 'real' | 'in_memory' | 'adapter_preparado' | 'somente_exportacao' | 'bloqueado';

export const PERSISTENCE_MATRIX: Record<string, { status: PersistenceStatus; note: string }> = {
  'agenda.items': { status: 'real', note: 'localStorage via AgendaContext (arquivo da camada visual, não tocado aqui).' },
  tasks: { status: 'adapter_preparado', note: 'createTaskPersistence + bindRepositoryPersistence; ninguém liga em produção ainda.' },
  projects: { status: 'adapter_preparado', note: 'createProjectPersistence + bindRepositoryPersistence.' },
  reminders: { status: 'adapter_preparado', note: 'createReminderPersistence + bindStatePersistence(engine).' },
  contextEvents: { status: 'adapter_preparado', note: 'createContextEventLog / snapshotEventHistory (log limitado).' },
  actions: { status: 'somente_exportacao', note: 'Restaurar ações autorizadas poderia re-executá-las; precisa de decisão.' },
  supabase: { status: 'bloqueado', note: 'Medusa sem backend/credenciais; createUnavailableStorageAdapter("supabase", ...) declara isso.' },
};
