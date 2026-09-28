/**
 * MEDUSA — Guardian — Remediadores embutidos
 *
 * Operam sobre INTERFACES de armazenamento (RecordStore/TextStore), não sobre um
 * banco concreto: a lógica de correção é real e testada; ligá-la a dados de
 * produção é um adapter futuro.
 */

import type { RemediationHandler } from './registry';

export interface RecordStore {
  list(collection: string): Array<{ id: string } & Record<string, unknown>>;
  /** Remoção SUAVE: o registro vai para uma lixeira recuperável (reversibilidade). */
  remove(collection: string, ids: string[]): void;
}

export function createDuplicateRemovalHandler(store: RecordStore): RemediationHandler {
  const input = (f: { remediationInput?: Record<string, unknown> }) => f.remediationInput as { collection: string; keep: string; remove: string[] };
  return {
    actionKey: 'REMOVE_DUPLICATE_RECORDS',
    describe: (f) => `Remover ${input(f).remove.length} duplicata(s) exata(s) de "${input(f).collection}", mantendo ${input(f).keep}.`,
    expectation: (f) => `${input(f).remove.join(', ')} ausentes de "${input(f).collection}" e ${input(f).keep} preservado`,
    execute({ finding }) {
      const { collection, keep, remove } = input(finding);
      if (!store.list(collection).some((r) => r.id === keep)) {
        throw new Error(`Registro mantido "${keep}" não existe mais — abortado para não perder dados.`);
      }
      store.remove(collection, remove);
    },
    verify({ finding }) {
      const { collection, keep, remove } = input(finding);
      const ids = new Set(store.list(collection).map((r) => r.id));
      const leftover = remove.filter((id) => ids.has(id));
      const keepOk = ids.has(keep);
      return { matches: leftover.length === 0 && keepOk, observed: `presentes: ${leftover.length ? leftover.join(',') : 'nenhuma duplicata'}; mantido ${keepOk ? 'preservado' : 'AUSENTE'}` };
    },
  };
}

export interface TextStore {
  read(location: string): string | undefined;
  write(location: string, text: string): void;
}

export function createSecretRedactionHandler(store: TextStore, patterns: Array<{ name: string; re: RegExp }>): RemediationHandler {
  const input = (f: { remediationInput?: Record<string, unknown> }) => f.remediationInput as { location: string; pattern: string };
  const patternFor = (name: string) => patterns.find((p) => p.name === name);
  return {
    actionKey: 'REDACT_EXPOSED_SECRET',
    describe: (f) => `Mascarar segredo (${input(f).pattern}) em ${input(f).location}. Não rotaciona a credencial: ela continua comprometida.`,
    expectation: (f) => `nenhuma ocorrência de "${input(f).pattern}" em ${input(f).location}`,
    execute({ finding }) {
      const { location, pattern } = input(finding);
      const text = store.read(location);
      const p = patternFor(pattern);
      if (text === undefined || !p) throw new Error(`Não foi possível ler ${location} ou padrão ${pattern} desconhecido.`);
      store.write(location, text.replace(new RegExp(p.re.source, p.re.flags), '[REDACTED]'));
    },
    verify({ finding }) {
      const { location, pattern } = input(finding);
      const text = store.read(location) ?? '';
      const p = patternFor(pattern);
      const still = p ? new RegExp(p.re.source, p.re.flags).test(text) : true;
      return { matches: !still, observed: still ? `padrão ${pattern} ainda presente` : `padrão ${pattern} ausente` };
    },
  };
}
