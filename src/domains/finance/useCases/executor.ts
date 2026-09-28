/**
 * MEDUSA — Finance Domain — Action Executor
 *
 * O passo "domain executor" do fluxo (seção 6/47):
 *   insight → proposed action → Guardian → authorization → domain executor
 *
 * Chamado em dois momentos possíveis:
 *  1. Imediatamente, quando o Guardian já autorizou (L1, `requiresApproval:false`).
 *  2. Mais tarde, quando uma ApprovalRequest pendente (L2/L3) é aprovada por
 *     um humano — quem chama isso é responsabilidade de quem integrar o
 *     Guardian a um fluxo de aprovação real (fora do escopo desta rodada).
 *
 * EXECUTE_PAYMENT/TRANSFER_FUNDS SEMPRE lançam — nenhuma integração bancária
 * real existe, então não há execução possível, aprovado ou não (seção 41).
 */

import type { Action } from '../../../foundation/types/action';
import { FINANCE_ACTION_TYPES } from '../actions/types';
import type { CategorizeTransactionPayload } from '../actions/types';
import type { Budget } from '../model/types';
import type { FinanceRepository } from '../repository/types';

export class FinanceExecutionError extends Error {}

export function executeFinanceAction(repository: FinanceRepository, action: Action): void {
  switch (action.type) {
    case FINANCE_ACTION_TYPES.CATEGORIZE_TRANSACTION: {
      const payload = action.payload as CategorizeTransactionPayload;
      const transaction = repository.getTransaction(payload.transactionId);
      if (!transaction) throw new FinanceExecutionError(`Transaction "${payload.transactionId}" não encontrada.`);
      repository.saveTransaction({ ...transaction, categoryId: payload.categoryId });
      return;
    }

    case FINANCE_ACTION_TYPES.CREATE_BUDGET: {
      repository.saveBudget(action.payload as Budget);
      return;
    }

    case FINANCE_ACTION_TYPES.ADJUST_BUDGET: {
      const payload = action.payload as { budgetId: string; newLimitAmount: number };
      const budget = repository.getBudget(payload.budgetId);
      if (!budget) throw new FinanceExecutionError(`Budget "${payload.budgetId}" não encontrado.`);
      repository.saveBudget({ ...budget, limitAmount: payload.newLimitAmount });
      return;
    }

    case FINANCE_ACTION_TYPES.EXECUTE_PAYMENT:
    case FINANCE_ACTION_TYPES.TRANSFER_FUNDS:
      throw new FinanceExecutionError(
        `"${action.type}" nunca é executado por este domínio — nenhuma integração bancária real existe nesta rodada. ` +
          'A ação existe como proposta/contrato (sempre L3, sempre aguardando aprovação), nunca como execução real.'
      );

    default:
      // CREATE_FINANCIAL_REMINDER / LINK_RECURRING_COMMITMENT / UPDATE_GOAL / CREATE_PROJECTION
      // não alteram o repositório de contas/transações diretamente — cada use case cuida do
      // próprio efeito (lembrete não persiste no FinanceRepository, meta/projeção têm seus
      // próprios use cases). Chegar aqui não é erro.
      return;
  }
}
