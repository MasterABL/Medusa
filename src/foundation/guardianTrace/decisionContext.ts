/**
 * MEDUSA FOUNDATION — Contexto da decisão (o que o Guardian sabia ao decidir)
 *
 * Sem isto a auditoria responde "o que foi decidido" mas não "com base em
 * quê". Guarda REFERÊNCIAS e resumos curtos — nunca conteúdo privado
 * (reflexão, oração, corpo de e-mail): quem registra é responsável por
 * resumir sem vazar, e o limite de tamanho força isso.
 */

import type { ContextSignalRef, DecisionContextRecord } from '../types/guardianTrace';

let records: DecisionContextRecord[] = [];
let counter = 0;

export const MAX_SIGNAL_SUMMARY = 240;

export class DecisionContextError extends Error {}

export interface RecordDecisionContextInput {
  correlationId: string;
  actionId?: string;
  eventIds?: string[];
  signals: ContextSignalRef[];
  recordedAt?: string;
}

export function recordDecisionContext(input: RecordDecisionContextInput): DecisionContextRecord {
  if (!input.correlationId.trim()) throw new DecisionContextError('Contexto exige correlationId.');
  if (input.signals.length === 0 && (input.eventIds?.length ?? 0) === 0) throw new DecisionContextError('Contexto vazio: informe ao menos um sinal ou evento.');
  for (const s of input.signals) {
    if (!s.ref.trim()) throw new DecisionContextError(`Sinal "${s.kind}" sem origem (ref): não é evidência.`);
    if (s.summary.length > MAX_SIGNAL_SUMMARY) throw new DecisionContextError(`Resumo do sinal "${s.kind}" passa de ${MAX_SIGNAL_SUMMARY} caracteres — resuma, não copie conteúdo.`);
  }
  counter += 1;
  const record: DecisionContextRecord = {
    id: `ctx_${Date.now()}_${counter}`,
    correlationId: input.correlationId,
    actionId: input.actionId,
    eventIds: input.eventIds ?? [],
    signals: input.signals,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
  };
  records.push(record);
  return record;
}

export function listDecisionContext(filter?: { correlationId?: string; actionId?: string }): DecisionContextRecord[] {
  return records.filter((r) => (!filter?.correlationId || r.correlationId === filter.correlationId) && (!filter?.actionId || r.actionId === filter.actionId));
}

export function __resetDecisionContextForTests(): void {
  records = [];
  counter = 0;
}
