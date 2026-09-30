/**
 * MEDUSA FOUNDATION — Feedback sobre ações (explícito e implícito)
 *
 * Regra de ouro (coerente com trust.ts/policy.ts): feedback NUNCA aumenta
 * autonomia sozinho. Aqui só se decide se ele vira EVIDÊNCIA de confiança:
 *
 *  - explícito (o usuário disse)             → conta, com UMA exceção:
 *      positivo em ação que já passou por aprovação humana NÃO conta de novo
 *      (a aprovação já virou evidência em guardianLifecycle.resolveApproval);
 *  - implícito NEGATIVO (desfez, ignorou)     → conta (evidência contra sempre entra);
 *  - implícito POSITIVO (nada reclamou)       → NÃO conta: ausência de queixa não é
 *      aceitação, e deixar sucesso automático alimentar confiança seria a IA
 *      aumentando a própria autoridade em silêncio.
 *
 * Idempotente: o mesmo (ação, tipo, sinal) é registrado uma vez só.
 */

import type { ActionFeedback, FeedbackKind, FeedbackSignal } from '../types/guardianTrace';
import type { TrustOutcome } from '../types/trust';
import { getAction } from '../actionBus';
import { recordOutcome as recordTrustOutcome } from '../guardian/trust';

let feedbacks: ActionFeedback[] = [];
let counter = 0;

export class FeedbackError extends Error {}

export interface RecordFeedbackInput {
  actionId: string;
  kind: FeedbackKind;
  signal: FeedbackSignal;
  note?: string;
  at?: string;
}

const TRUST_OUTCOME: Record<FeedbackSignal, TrustOutcome> = { positive: 'accepted', negative: 'rejected', corrected: 'corrected' };

export function decideTrustCounting(input: { kind: FeedbackKind; signal: FeedbackSignal; wentThroughApproval: boolean }): { counts: boolean; rationale: string } {
  if (input.kind === 'implicit' && input.signal === 'positive') {
    return { counts: false, rationale: 'Feedback implícito positivo não vira confiança: ausência de queixa não é aceitação.' };
  }
  if (input.kind === 'explicit' && input.signal === 'positive' && input.wentThroughApproval) {
    return { counts: false, rationale: 'A aprovação humana desta ação já foi contada como evidência; contar de novo inflaria a confiança.' };
  }
  if (input.kind === 'implicit') return { counts: true, rationale: 'Evidência contra entra sempre: pode reduzir autonomia, nunca aumentar.' };
  return { counts: true, rationale: 'Feedback explícito do usuário é evidência direta.' };
}

export function recordFeedback(input: RecordFeedbackInput): ActionFeedback {
  const action = getAction(input.actionId);
  if (!action) throw new FeedbackError(`Action "${input.actionId}" não encontrada.`);
  if (action.status === 'PROPOSED' || action.status === 'ANALYZING') {
    throw new FeedbackError(`Feedback só existe para ação já avaliada pelo Guardian (status: "${action.status}").`);
  }

  const existing = feedbacks.find((f) => f.actionId === input.actionId && f.kind === input.kind && f.signal === input.signal);
  if (existing) return existing;

  const decision = decideTrustCounting({ kind: input.kind, signal: input.signal, wentThroughApproval: action.requiresApproval });
  counter += 1;
  const at = input.at ?? new Date().toISOString();
  const feedback: ActionFeedback = {
    id: `feedback_${Date.now()}_${counter}`,
    actionId: input.actionId,
    kind: input.kind,
    signal: input.signal,
    at,
    note: input.note,
    countsTowardTrust: decision.counts,
    trustRationale: decision.rationale,
  };
  feedbacks.push(feedback);

  if (decision.counts) {
    recordTrustOutcome({ domain: action.domain, actionType: action.type, outcome: TRUST_OUTCOME[input.signal], actionId: action.id, note: input.note, occurredAt: at });
  }
  return feedback;
}

export function listFeedback(actionId?: string): ActionFeedback[] {
  return feedbacks.filter((f) => !actionId || f.actionId === actionId);
}

export function __resetFeedbackForTests(): void {
  feedbacks = [];
  counter = 0;
}
