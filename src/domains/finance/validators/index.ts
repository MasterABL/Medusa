/**
 * MEDUSA — Finance Domain — Validators (seção 35)
 *
 * Erros interpretáveis, nunca estruturas inválidas aceitas em silêncio.
 */

import type { Budget, FinancialAccount, Transaction } from '../model/types';

export class FinanceValidationError extends Error {}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/;

export function validateAmount(amount: number, field = 'amount'): void {
  if (!Number.isFinite(amount)) {
    throw new FinanceValidationError(`${field} precisa ser um número finito, recebeu: ${amount}`);
  }
  if (amount < 0) {
    throw new FinanceValidationError(`${field} não pode ser negativo (o sinal vem do tipo, não do valor): ${amount}`);
  }
}

export function validateCurrency(currency: string): void {
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new FinanceValidationError(`currency precisa ser um código ISO 4217 de 3 letras maiúsculas, recebeu: "${currency}"`);
  }
}

export function validateDate(value: string, field = 'date'): void {
  if (!ISO_DATE_RE.test(value)) {
    throw new FinanceValidationError(`${field} precisa ser uma data ISO 8601 válida, recebeu: "${value}"`);
  }
}

export function validateTransaction(transaction: Transaction): void {
  validateAmount(transaction.amount, 'transaction.amount');
  validateCurrency(transaction.currency);
  validateDate(transaction.occurredAt, 'transaction.occurredAt');
  if (transaction.postedAt) validateDate(transaction.postedAt, 'transaction.postedAt');
  if (!transaction.accountId) {
    throw new FinanceValidationError('transaction.accountId é obrigatório.');
  }
  if (!transaction.description.trim()) {
    throw new FinanceValidationError('transaction.description não pode ser vazia.');
  }
}

export function validateAccount(account: FinancialAccount): void {
  validateAmount(account.currentBalance, 'account.currentBalance');
  validateCurrency(account.currency);
  if (!account.name.trim()) {
    throw new FinanceValidationError('account.name não pode ser vazio.');
  }
}

export function validateBudget(budget: Budget): void {
  validateAmount(budget.limitAmount, 'budget.limitAmount');
  if (budget.limitAmount === 0) {
    throw new FinanceValidationError('budget.limitAmount precisa ser maior que zero.');
  }
  if (!budget.categoryId) {
    throw new FinanceValidationError('budget.categoryId é obrigatório.');
  }
}

export function validateProjectionPeriod(periodLabel: string): void {
  if (!/^\d{4}-\d{2}$/.test(periodLabel)) {
    throw new FinanceValidationError(`periodLabel precisa ser "YYYY-MM", recebeu: "${periodLabel}"`);
  }
}
