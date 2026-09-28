/**
 * MEDUSA — Finance ↔ Agenda adapter (seção 7)
 *
 * A Agenda não sabe calcular finanças — este adapter só traduz uma entidade
 * financeira com temporalidade numa REQUISIÇÃO de agendamento genérica,
 * reaproveitando o vocabulário que a Agenda já entende
 * (`AgendaDomain`/`AgendaSourceRef`, via src/foundation/domains/agendaBridge.ts).
 * Não cria um `AgendaItem` completo — isso é responsabilidade da própria
 * Agenda (categoria/cor/etc. são decisão dela ou do usuário).
 */

import { toAgendaDomain, toAgendaSourceRef } from '../../../foundation/domains/agendaBridge';
import type { RecurringCommitment, FinancialGoalMilestone } from '../model/types';

export interface AgendaSchedulingRequest {
  title: string;
  date: string; // YYYY-MM-DD
  agendaDomain: ReturnType<typeof toAgendaDomain>;
  source: ReturnType<typeof toAgendaSourceRef>;
  description?: string;
}

export function buildCommitmentDueRequest(commitment: RecurringCommitment, dueDate: string): AgendaSchedulingRequest {
  return {
    title: `Vencimento: ${commitment.label}`,
    date: dueDate,
    agendaDomain: toAgendaDomain('finance'),
    source: toAgendaSourceRef('finance', commitment.id, commitment.label),
    description: `Compromisso recorrente esperado: ${commitment.expectedAmount.toFixed(2)}`,
  };
}

export function buildGoalCheckpointRequest(
  goalId: string,
  goalLabel: string,
  milestone: FinancialGoalMilestone,
  checkpointDate: string
): AgendaSchedulingRequest {
  return {
    title: `Checkpoint: ${goalLabel} — ${milestone.label}`,
    date: checkpointDate,
    agendaDomain: toAgendaDomain('finance'),
    source: toAgendaSourceRef('finance', goalId, goalLabel),
    description: `Meta financeira: acompanhar progresso até ${milestone.targetAmount.toFixed(2)}`,
  };
}
