/**
 * MEDUSA — Finance — serialização (seção 34)
 */

import { deserialize, serialize } from '../shared/serialization';
import { validateAccount, validateBudget, validateTransaction } from './validators';
import type { Budget, FinancialAccount, Transaction } from './model/types';

export const serializeTransaction = (t: Transaction): string => serialize('finance.transaction', t);
export const deserializeTransaction = (payload: string): Transaction => deserialize<Transaction>('finance.transaction', payload, validateTransaction);

export const serializeAccount = (a: FinancialAccount): string => serialize('finance.account', a);
export const deserializeAccount = (payload: string): FinancialAccount => deserialize<FinancialAccount>('finance.account', payload, validateAccount);

export const serializeBudget = (b: Budget): string => serialize('finance.budget', b);
export const deserializeBudget = (payload: string): Budget => deserialize<Budget>('finance.budget', payload, validateBudget);
