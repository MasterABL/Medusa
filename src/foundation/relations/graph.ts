/**
 * MEDUSA FOUNDATION — Relações entre entidades
 *
 * E-mails, tarefas, projetos, prazos, eventos e lembretes se relacionam:
 *
 *   Email → Project → Task → Deadline → Calendar Event → Reminder
 *   Email → Meeting (Calendar Event) → Reminder
 *   Email → Academic Notice → Academic Task → Deadline → Hoje
 *
 * Cada entidade continua morando no seu repositório; aqui só existem ARESTAS entre
 * referências (kind + id). Nenhum dado é copiado — evita a mesma tarefa existir em três
 * lugares com três versões. Cada aresta guarda de onde veio (proveniência) para o
 * Guardian conseguir explicar a cadeia.
 */

export type EntityKind =
  | 'email'
  | 'email_thread'
  | 'project'
  | 'milestone'
  | 'task'
  | 'deadline'
  | 'event'
  | 'reminder'
  | 'document'
  | 'academic_notice'
  | 'finance_item'
  | 'action';

export interface EntityRef {
  kind: EntityKind;
  id: string;
}

export type RelationType =
  /** `from` nasceu de `to` (tarefa derivada do e-mail). */
  | 'derived_from'
  /** `from` faz parte de `to` (tarefa do projeto, e-mail da thread). */
  | 'belongs_to'
  /** `from` tem o prazo/compromisso `to`. */
  | 'scheduled_as'
  /** `from` (lembrete) avisa sobre `to`. */
  | 'reminds_about'
  /** `from` só pode começar depois de `to`. */
  | 'depends_on'
  /** `from` cita `to` sem relação forte (e-mail que menciona um projeto). */
  | 'mentions'
  /** `from` e `to` são o MESMO objeto vindo de fontes diferentes. */
  | 'same_as';

export interface Relation {
  id: string;
  from: EntityRef;
  type: RelationType;
  to: EntityRef;
  /** Quem afirmou a relação (regra, usuário, provedor) e com que confiança. */
  provenance: { by: 'rule' | 'user' | 'provider' | 'guardian'; reason: string; confidence?: number };
  createdAt: string;
}

export const refKey = (r: EntityRef) => `${r.kind}:${r.id}`;
const relKey = (from: EntityRef, type: RelationType, to: EntityRef) => `${refKey(from)}|${type}|${refKey(to)}`;

export function createRelationStore(seed: Relation[] = []) {
  const byKey = new Map<string, Relation>(seed.map((r) => [relKey(r.from, r.type, r.to), r]));

  /** Idempotente: a mesma aresta afirmada duas vezes continua sendo uma. */
  function link(from: EntityRef, type: RelationType, to: EntityRef, provenance: Relation['provenance'], at: string): Relation {
    if (refKey(from) === refKey(to)) throw new Error('Uma entidade não se relaciona com ela mesma.');
    const key = relKey(from, type, to);
    const existing = byKey.get(key);
    if (existing) return existing;
    const rel: Relation = { id: key, from, type, to, provenance, createdAt: at };
    byKey.set(key, rel);
    return rel;
  }

  function unlink(from: EntityRef, type: RelationType, to: EntityRef): boolean {
    return byKey.delete(relKey(from, type, to));
  }

  function outgoing(ref: EntityRef, type?: RelationType): Relation[] {
    return Array.from(byKey.values()).filter((r) => refKey(r.from) === refKey(ref) && (!type || r.type === type));
  }

  function incoming(ref: EntityRef, type?: RelationType): Relation[] {
    return Array.from(byKey.values()).filter((r) => refKey(r.to) === refKey(ref) && (!type || r.type === type));
  }

  /** Tudo que se liga a `ref` em qualquer direção, até `depth` saltos (sem repetir nó). */
  function neighborhood(ref: EntityRef, depth = 4): EntityRef[] {
    const seen = new Set([refKey(ref)]);
    const out: EntityRef[] = [];
    let frontier = [ref];
    for (let d = 0; d < depth && frontier.length; d++) {
      const next: EntityRef[] = [];
      for (const n of frontier) {
        for (const r of [...outgoing(n), ...incoming(n)]) {
          const other = refKey(r.from) === refKey(n) ? r.to : r.from;
          if (seen.has(refKey(other))) continue;
          seen.add(refKey(other));
          out.push(other);
          next.push(other);
        }
      }
      frontier = next;
    }
    return out;
  }

  /** Primeira entidade de `kind` já ligada a `ref` — usado para não criar uma segunda tarefa/evento do mesmo e-mail. */
  function findLinked(ref: EntityRef, kind: EntityKind, types?: RelationType[]): EntityRef | undefined {
    for (const r of [...outgoing(ref), ...incoming(ref)]) {
      if (types && !types.includes(r.type)) continue;
      const other = refKey(r.from) === refKey(ref) ? r.to : r.from;
      if (other.kind === kind) return other;
    }
    return undefined;
  }

  return {
    link,
    unlink,
    outgoing,
    incoming,
    neighborhood,
    findLinked,
    all: () => Array.from(byKey.values()),
    exportState: () => ({ version: 1 as const, relations: Array.from(byKey.values()) }),
    importState: (s: { version: number; relations: Relation[] }) => {
      if (s.version !== 1) throw new Error(`Versão de relações desconhecida: ${s.version}.`);
      for (const r of s.relations) byKey.set(relKey(r.from, r.type, r.to), r);
    },
  };
}

export type RelationStore = ReturnType<typeof createRelationStore>;
