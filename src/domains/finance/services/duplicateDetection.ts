/**
 * MEDUSA — Finance — Detecção de duplicidade (só SUGERE; nunca apaga)
 *
 * Caso real do MINHA-VIDA: um lançamento manual + o mesmo fato vindo do Open
 * Finance. Regras (conservadoras — falso positivo aqui faz o usuário perder
 * uma despesa de verdade, então na dúvida NÃO agrupa):
 *   alta  : mesmo externalId (mesmo fato reenviado) OU mesma conta, mesmo valor,
 *           mesmo tipo, mesmo dia e descrição normalizada igual.
 *   media : mesma conta, valor e tipo, até 2 dias de diferença, FONTES diferentes
 *           e descrições que se contêm ou compartilham palavra relevante.
 * Nunca é duplicata: parcelas diferentes da mesma compra, nem lançamentos
 * vinculados a ocorrências diferentes de um mesmo compromisso, nem cancelados.
 */

import type { Transaction } from '../model/types';
import type { DuplicateGroup } from '../model/statements';

const DAY = 86_400_000;

export function normalizeDescription(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\d{1,2}\s*\/\s*\d{1,2}\s*$/, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(text: string): string[] {
  return normalizeDescription(text).split(' ').filter((w) => w.length >= 4);
}

function dayDiff(a: Transaction, b: Transaction): number {
  return Math.abs(Math.round((Date.parse(`${a.occurredAt.slice(0, 10)}T00:00:00Z`) - Date.parse(`${b.occurredAt.slice(0, 10)}T00:00:00Z`)) / DAY));
}

function sameInstallment(a: Transaction, b: Transaction): boolean {
  if (!a.installment && !b.installment) return true;
  if (!a.installment || !b.installment) return false;
  return a.installment.current === b.installment.current && a.installment.total === b.installment.total;
}

function relation(a: Transaction, b: Transaction): DuplicateGroup['confidence'] | undefined {
  if (a.status === 'cancelled' || b.status === 'cancelled') return undefined;
  if (a.externalId && a.externalId === b.externalId && a.source === b.source) return 'alta';
  if (a.accountId !== b.accountId || a.type !== b.type || a.amount !== b.amount) return undefined;
  if (!sameInstallment(a, b)) return undefined;
  if (a.recurringCommitmentId && b.recurringCommitmentId && a.recurringCommitmentId === b.recurringCommitmentId && dayDiff(a, b) > 2) return undefined;

  const diff = dayDiff(a, b);
  const na = normalizeDescription(a.description);
  const nb = normalizeDescription(b.description);
  if (diff === 0 && na === nb && na.length > 0) return 'alta';

  if (diff <= 2 && a.source !== b.source) {
    const contains = na.length > 0 && nb.length > 0 && (na.includes(nb) || nb.includes(na));
    const shared = tokens(a.description).some((w) => tokens(b.description).includes(w));
    if (contains || shared) return 'media';
  }
  return undefined;
}

export function findDuplicateGroups(transactions: Transaction[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const used = new Set<string>();
  for (let i = 0; i < transactions.length; i += 1) {
    if (used.has(transactions[i].id)) continue;
    const members = [transactions[i]];
    let confidence: DuplicateGroup['confidence'] = 'media';
    for (let j = i + 1; j < transactions.length; j += 1) {
      if (used.has(transactions[j].id)) continue;
      const rel = relation(transactions[i], transactions[j]);
      if (rel) {
        members.push(transactions[j]);
        if (rel === 'alta') confidence = 'alta';
      }
    }
    if (members.length > 1) {
      members.forEach((m) => used.add(m.id));
      groups.push({
        transactionIds: members.map((m) => m.id),
        confidence,
        reason:
          confidence === 'alta'
            ? 'Mesmo valor, conta e dia com a mesma descrição (ou mesmo identificador da fonte).'
            : 'Mesmo valor e conta em dias próximos, vindos de fontes diferentes, com descrição parecida.',
      });
    }
  }
  return groups;
}
