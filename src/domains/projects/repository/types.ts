import type { Project } from '../model/types';
import type { DataOrigin } from '../../../foundation/types/dataState';

export interface ProjectRepository {
  readonly origin: DataOrigin;
  get(id: string): Project | undefined;
  list(filter?: { status?: Project['status'][] }): Project[];
  save(project: Project): void;
}

export function createInMemoryProjectRepository(origin: DataOrigin = 'manual', seed: Project[] = []): ProjectRepository {
  const map = new Map(seed.map((p) => [p.id, p]));
  return {
    origin,
    get: (id) => map.get(id),
    list: (f) => Array.from(map.values()).filter((p) => !f?.status || f.status.includes(p.status)),
    save: (p) => void map.set(p.id, p),
  };
}
