/**
 * MEDUSA — Finance Domain — Use Case: propor pagamento/transferência (seção 6, CENÁRIO 3)
 *
 * financial action → EXECUTE_PAYMENT → Guardian → L3 → ApprovalRequest → NO execution
 *
 * Este use case NUNCA executa um pagamento de verdade — não existe
 * integração bancária real nesta rodada (seção 41). Ele só prova que o
 * contrato existe e que o Guardian trava a execução em L3 sempre.
 */

import { createAction, dispatch } from '../../../foundation/actionBus';
import type { GuardianEvaluation } from '../../../foundation/types/guardian';
import { FINANCE_ACTION_TYPES } from '../actions/types';
import type { ExecutePaymentPayload } from '../actions/types';
import { validateAmount, validateCurrency } from '../validators';

export function proposePayment(payload: ExecutePaymentPayload): GuardianEvaluation {
  validateAmount(payload.amount, 'payload.amount');
  validateCurrency(payload.currency);

  const action = createAction({
    domain: 'finance',
    type: FINANCE_ACTION_TYPES.EXECUTE_PAYMENT,
    intent: `Realizar pagamento de ${payload.amount.toFixed(2)} ${payload.currency} — ${payload.description}`,
    payload,
    riskLevel: 'alto',
    reversible: false,
  });

  // Sempre dispatch — o chamador NUNCA deveria tentar "pular" o Guardian achando
  // que já sabe que vai dar L3. É o Guardian que decide isso, sempre.
  return dispatch(action);
}

export function proposeTransfer(payload: ExecutePaymentPayload): GuardianEvaluation {
  const action = createAction({
    domain: 'finance',
    type: FINANCE_ACTION_TYPES.TRANSFER_FUNDS,
    intent: `Transferir ${payload.amount.toFixed(2)} ${payload.currency} — ${payload.description}`,
    payload,
    riskLevel: 'alto',
    reversible: false,
  });

  return dispatch(action);
}
