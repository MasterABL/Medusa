/**
 * MEDUSA — Finance Domain — Use Case: criar lembrete financeiro (seção 6/29)
 *
 * Fluxo do CENÁRIO 1 da missão:
 *   payment due → Finance Event → Insight → Action CREATE_FINANCIAL_REMINDER
 *   → Guardian → L1 → Agenda scheduling request → ProactiveMessage (Hoje)
 */

import { createAction, dispatch } from '../../../foundation/actionBus';
import { publish as publishEvent } from '../../../foundation/eventBus';
import { publish as publishMessage } from '../../../foundation/messaging/proactiveMessage';
import type { GuardianEvaluation } from '../../../foundation/types/guardian';
import { FINANCE_ACTION_TYPES } from '../actions/types';
import type { CreateFinancialReminderPayload } from '../actions/types';
import { FINANCE_EVENT_TYPES } from '../events/types';
import { buildCommitmentDueRequest } from '../adapters/agendaAdapter';
import type { AgendaSchedulingRequest } from '../adapters/agendaAdapter';
import type { RecurringCommitment } from '../model/types';

export interface CreateReminderResult {
  evaluation: GuardianEvaluation;
  schedulingRequest?: AgendaSchedulingRequest;
}

export function createFinancialReminder(
  commitment: RecurringCommitment,
  dueDate: string,
  daysUntilDue: number
): CreateReminderResult {
  publishEvent({
    domain: 'finance',
    type: FINANCE_EVENT_TYPES.PAYMENT_DUE_SOON,
    payload: { commitmentId: commitment.id, dueDate, daysUntilDue },
    dedupeKey: `payment-due-${commitment.id}-${dueDate}`,
  });

  const payload: CreateFinancialReminderPayload = {
    commitmentId: commitment.id,
    message: `"${commitment.label}" vence em ${dueDate}.`,
    dueDate,
  };

  const action = createAction({
    domain: 'finance',
    type: FINANCE_ACTION_TYPES.CREATE_FINANCIAL_REMINDER,
    intent: `Criar lembrete para "${commitment.label}" (vence ${dueDate})`,
    payload,
    riskLevel: 'baixo',
    reversible: true,
    undoDescription: 'Remover o lembrete.',
  });

  const evaluation = dispatch(action);

  if (evaluation.decision.requiresApproval) {
    return { evaluation };
  }

  const schedulingRequest = buildCommitmentDueRequest(commitment, dueDate);

  publishMessage({
    domain: 'finance',
    message: payload.message,
    evidence: {
      reason: `Compromisso recorrente "${commitment.label}" com vencimento em ${daysUntilDue} dia(s).`,
      evidence: [`valor esperado: ${commitment.expectedAmount.toFixed(2)}`],
      impact: 'Compromisso financeiro com vencimento próximo.',
    },
    surfaceTargets: ['hoje', 'notification'],
    cooldownKey: `payment-due-${commitment.id}`,
    cooldownMs: 24 * 60 * 60 * 1000, // não repete o mesmo aviso no mesmo dia
  });

  return { evaluation, schedulingRequest };
}
