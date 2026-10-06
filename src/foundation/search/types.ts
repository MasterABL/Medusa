/**
 * MEDUSA FOUNDATION — Contrato da busca global
 *
 * Um índice só para e-mail, thread, tarefa, projeto, evento, prazo e documento — não um
 * sistema de busca por domínio. Cada domínio sabe virar `SearchDocument` (só o texto que
 * pode aparecer num resultado: título + prévia curta, nunca corpo de e-mail); quem indexa
 * implementa `SearchIndex`. Hoje existe a implementação em memória; um índice de backend
 * implementa o mesmo contrato.
 */

import type { EntityKind } from '../relations/graph';
import type { LifeDomain } from '../types/lifeDomain';

export type SearchableKind = Extract<EntityKind, 'email' | 'email_thread' | 'task' | 'project' | 'event' | 'deadline' | 'document'>;

export interface SearchDocument {
  ref: { kind: SearchableKind; id: string };
  title: string;
  /** Prévia curta (≤ 160 caracteres). */
  preview?: string;
  domain?: LifeDomain;
  /** ISO — data relevante (recebido, prazo, início). */
  at?: string;
  keywords?: string[];
}

export interface SearchHit {
  doc: SearchDocument;
  score: number;
  matched: string[];
}

export interface SearchIndex {
  upsert(docs: SearchDocument[]): void;
  remove(ref: SearchDocument['ref']): void;
  search(query: string, opts?: { kinds?: SearchableKind[]; limit?: number }): SearchHit[];
}

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const tokens = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 2);

export function createInMemorySearchIndex(): SearchIndex {
  const docs = new Map<string, SearchDocument>();
  const key = (r: SearchDocument['ref']) => `${r.kind}:${r.id}`;
  return {
    upsert: (list) => list.forEach((d) => docs.set(key(d.ref), { ...d, preview: d.preview?.slice(0, 160) })),
    remove: (r) => void docs.delete(key(r)),
    search(query, opts = {}) {
      const q = tokens(query);
      if (q.length === 0) return [];
      const hits: SearchHit[] = [];
      for (const d of Array.from(docs.values())) {
        if (opts.kinds && !opts.kinds.includes(d.ref.kind)) continue;
        const title = tokens(d.title);
        const rest = tokens(`${d.preview ?? ''} ${(d.keywords ?? []).join(' ')}`);
        const matched = q.filter((t) => title.some((x) => x.startsWith(t)) || rest.some((x) => x.startsWith(t)));
        if (matched.length !== q.length) continue; // todos os termos precisam aparecer
        const score = q.reduce((s, t) => s + (title.some((x) => x.startsWith(t)) ? 2 : 1), 0);
        hits.push({ doc: d, score, matched });
      }
      return hits.sort((a, b) => b.score - a.score || (b.doc.at ?? '').localeCompare(a.doc.at ?? '')).slice(0, opts.limit ?? 20);
    },
  };
}
