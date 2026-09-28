/**
 * MEDUSA — Serialização (seção 34): roundtrip + rejeição de payload inválido.
 */

import { makeChecker } from './_helpers';
import { SerializationError, serialize } from '../../../src/domains/shared/serialization';
import { deserializeTransaction, serializeTransaction, deserializeBudget, serializeBudget } from '../../../src/domains/finance/serialization';
import { createFixtureTransaction } from '../../../src/domains/finance/fixtures';
import { deserializePlan, serializePlan, deserializeProfile } from '../../../src/domains/body/serialization';
import { deserializeReflection, serializeReflection } from '../../../src/domains/spiritual/serialization';
import { createFixtureReflection } from '../../../src/domains/spiritual/fixtures';
import { FinanceValidationError } from '../../../src/domains/finance/validators';
import type { BodyPlan } from '../../../src/domains/body/model/types';

function throwsWith<T extends Error>(fn: () => unknown, ctor: new (...a: never[]) => T): boolean {
  try {
    fn();
    return false;
  } catch (e) {
    return e instanceof ctor;
  }
}

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('serialização');

  const txn = createFixtureTransaction({ id: 'ser_1', amount: 42.5 });
  check('1.1: transação faz roundtrip idêntico', JSON.stringify(deserializeTransaction(serializeTransaction(txn))) === JSON.stringify(txn));

  check('1.2: JSON quebrado lança SerializationError', throwsWith(() => deserializeTransaction('{isso não é json'), SerializationError));
  check('1.3: envelope de outro tipo é recusado (não confunde transação com orçamento)', throwsWith(() => deserializeBudget(serializeTransaction(txn)), SerializationError));
  check('1.4: schemaVersion desconhecida é recusada', throwsWith(() => deserializeTransaction(JSON.stringify({ schemaVersion: 99, kind: 'finance.transaction', data: txn })), SerializationError));
  check('1.5: dado que viola o modelo é recusado pelo validador do domínio (valor negativo)', throwsWith(() => deserializeTransaction(serialize('finance.transaction', { ...txn, amount: -1 })), FinanceValidationError));
  check('1.6: envelope sem data é recusado', throwsWith(() => deserializeTransaction(JSON.stringify({ schemaVersion: 1, kind: 'finance.transaction' })), SerializationError));

  const budget = { id: 'b', categoryId: 'c', period: 'monthly' as const, periodLabel: '2026-02', limitAmount: 100, active: true };
  check('2.1: orçamento faz roundtrip', deserializeBudget(serializeBudget(budget)).limitAmount === 100);

  const plan: BodyPlan = {
    id: 'plan',
    stage: 'plano',
    status: 'draft',
    sessions: [{ id: 's', activityId: 'act_caminhada_leve', preferredDays: [1, 3], durationMinutes: 20, intensity: 'leve' }],
    frequencyPerWeek: 2,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  };
  check('3.1: plano de corpo faz roundtrip', deserializePlan(serializePlan(plan)).sessions[0].id === 's');
  check('3.2: plano com dia da semana inválido é recusado na volta', throwsWith(() => deserializePlan(serialize('body.plan', { ...plan, sessions: [{ ...plan.sessions[0], preferredDays: [9] }] })), Error));
  check('3.3: perfil sem "origin" nos campos é recusado (nunca aceita dado sem saber a origem)', throwsWith(() => deserializeProfile(serialize('body.profile', { id: 'p', objectives: { value: [] } })), Error));

  const reflection = createFixtureReflection();
  check('4.1: reflexão faz roundtrip', deserializeReflection(serializeReflection(reflection)).content === reflection.content);
  check('4.2: reflexão com visibilidade diferente de private é recusada na volta', throwsWith(() => deserializeReflection(serialize('spiritual.reflection', { ...reflection, visibility: 'public' })), Error));

  return result();
}

if (require.main === module) {
  const { total, fails } = run();
  console.log(`\n[serialização] ${total - fails}/${total} checagens OK`);
  process.exit(fails > 0 ? 1 : 0);
}
