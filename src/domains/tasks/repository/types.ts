/**
 * MEDUSA — Tasks — Fronteira de dados. Hoje só existe a implementação em memória;
 * um adapter de banco implementa a mesma interface.
 */
import type { Task } from '../model/types';
import type { DataOrigin } from '../../../foundation/types/dataState';

export interface TaskRepository {
  readonly origin: DataOrigin;
  get(id: string): Task | undefined;
  list(filter?: { projectId?: string; status?: Task['status'][]; domain?: Task['domain'] }): Task[];
  save(task: Task): void;
}

export function createInMemoryTaskRepository(origin: DataOrigin = 'manual', seed: Task[] = []): TaskRepository {
  const map = new Map(seed.map((t) => [t.id, t]));
  return {
    origin,
    get: (id) => map.get(id),
    list: (f) =>
      Array.from(map.values()).filter(
        (t) => (!f?.projectId || t.projectId === f.projectId) && (!f?.status || f.status.includes(t.status)) && (!f?.domain || t.domain === f.domain)
      ),
    save: (t) => void map.set(t.id, t),
  };
}
