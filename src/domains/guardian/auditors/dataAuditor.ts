/**
 * MEDUSA — Guardian — Data Auditor
 *
 * Duplicidade, integridade (campo obrigatório) e referência órfã (schema/data
 * mismatch). Só afirma o que consegue mostrar: cada finding cita os ids.
 */

import type { FindingDraft } from '../model/types';
import type { Auditor } from './types';
import { fingerprint } from './types';

export interface DataAuditInput {
  collection: string;
  records: Array<{ id: string } & Record<string, unknown>>;
  uniqueKeys?: string[][];
  required?: string[];
  references?: Array<{ field: string; targetCollection: string }>;
  /** ids existentes por coleção — necessário para checar referências órfãs. */
  collections?: Record<string, string[]>;
}

export const DATA_AUDITOR_ID = 'data-auditor';

function withoutId(record: Record<string, unknown>): string {
  const { id: _id, ...rest } = record;
  return JSON.stringify(Object.keys(rest).sort().map((k) => [k, rest[k]]));
}

export const dataAuditor: Auditor<DataAuditInput> = {
  id: DATA_AUDITOR_ID,
  category: 'data',
  detect(input, now) {
    const observedAt = now.toISOString();
    const drafts: FindingDraft[] = [];

    for (const fields of input.uniqueKeys ?? []) {
      const groups = new Map<string, DataAuditInput['records']>();
      for (const record of input.records) {
        const key = fields.map((f) => String(record[f] ?? '')).join('|');
        if (fields.some((f) => record[f] === undefined || record[f] === null || record[f] === '')) continue;
        groups.set(key, [...(groups.get(key) ?? []), record]);
      }
      for (const [key, group] of Array.from(groups.entries())) {
        if (group.length < 2) continue;
        const ids = group.map((r) => r.id);
        const exact = group.every((r) => withoutId(r) === withoutId(group[0]));
        drafts.push({
          category: 'data',
          severity: 'moderada',
          origin: DATA_AUDITOR_ID,
          evidence: [
            {
              source: DATA_AUDITOR_ID,
              reference: `${input.collection}#${ids.join(',')}`,
              observation: `${group.length} registros compartilham ${fields.join('+')}`,
              expectation: `${fields.join('+')} único na coleção`,
              difference: `${group.length - 1} duplicata(s)${exact ? ' exata(s)' : ' com conteúdo divergente'}`,
              observedAt,
            },
          ],
          context: { collection: input.collection, fields, exact },
          impact: 'Duplicidade distorce totais e pode gerar ações repetidas sobre o mesmo item.',
          confidence: exact ? 0.95 : 0.8,
          hypothesis: exact
            ? 'O mesmo registro foi gravado mais de uma vez (reenvio ou importação repetida).'
            : 'Registros distintos disputam a mesma chave — precisa de decisão humana sobre qual vale.',
          suggestedActionKey: exact ? 'REMOVE_DUPLICATE_RECORDS' : undefined,
          remediationInput: exact ? { collection: input.collection, keep: ids[0], remove: ids.slice(1) } : undefined,
          dedupeKey: `data:${input.collection}:dup:${fields.join('+')}:${fingerprint(key)}`,
        });
      }
    }

    for (const field of input.required ?? []) {
      const missing = input.records.filter((r) => r[field] === undefined || r[field] === null || r[field] === '');
      if (missing.length === 0) continue;
      drafts.push({
        category: 'data',
        severity: missing.length / Math.max(input.records.length, 1) > 0.5 ? 'alta' : 'moderada',
        origin: DATA_AUDITOR_ID,
        evidence: [
          {
            source: DATA_AUDITOR_ID,
            reference: `${input.collection}#${missing.map((r) => r.id).join(',')}`,
            observation: `${missing.length} de ${input.records.length} registros sem "${field}"`,
            expectation: `"${field}" obrigatório`,
            difference: `${missing.length} registro(s) incompleto(s)`,
            observedAt,
          },
        ],
        context: { collection: input.collection, field },
        impact: 'Registros incompletos quebram cálculos e telas que assumem o campo presente.',
        confidence: 0.9,
        hypothesis: 'Escrita sem validação ou migração parcial de schema.',
        dedupeKey: `data:${input.collection}:missing:${field}`,
      });
    }

    for (const ref of input.references ?? []) {
      const targets = input.collections?.[ref.targetCollection];
      if (!targets) continue;
      const known = new Set(targets);
      const orphans = input.records.filter((r) => r[ref.field] !== undefined && r[ref.field] !== null && !known.has(String(r[ref.field])));
      if (orphans.length === 0) continue;
      drafts.push({
        category: 'data',
        severity: 'alta',
        origin: DATA_AUDITOR_ID,
        evidence: [
          {
            source: DATA_AUDITOR_ID,
            reference: `${input.collection}#${orphans.map((r) => r.id).join(',')}`,
            observation: `${orphans.length} registro(s) apontam para ${ref.targetCollection} inexistente via "${ref.field}"`,
            expectation: `"${ref.field}" referencia um id existente em ${ref.targetCollection}`,
            difference: `${orphans.length} referência(s) órfã(s)`,
            observedAt,
          },
        ],
        context: { collection: input.collection, field: ref.field, target: ref.targetCollection },
        impact: 'Referência órfã faz telas e cálculos falharem ou mostrarem dado ausente.',
        confidence: 0.9,
        hypothesis: 'O registro referenciado foi removido sem tratar os dependentes.',
        dedupeKey: `data:${input.collection}:orphan:${ref.field}->${ref.targetCollection}`,
      });
    }

    return drafts;
  },
};
