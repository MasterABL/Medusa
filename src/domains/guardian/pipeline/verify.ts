/**
 * Etapa VERIFY — estado esperado × estado observado depois da execução.
 *
 * A action terminar sem erro NÃO é verificação. Sem verificador/fonte, o
 * resultado é "unverifiable" (parcial) e o finding nunca vira "resolved".
 */

import type { VerificationResult } from '../model/types';

export interface ObservedState {
  matches: boolean;
  observed: string;
}

export async function verifyActionOutcome(input: {
  expected: string;
  method: 'handler' | 'redetection';
  observe?: () => Promise<ObservedState> | ObservedState;
  now: Date;
}): Promise<VerificationResult> {
  const checkedAt = input.now.toISOString();
  if (!input.observe) {
    return {
      status: 'unverifiable',
      method: 'none',
      expected: input.expected,
      observed: 'nenhum verificador disponível',
      checkedAt,
      notes: 'A execução terminou, mas não há como confirmar o resultado — não conta como resolvido.',
    };
  }
  try {
    const observed = await input.observe();
    return {
      status: observed.matches ? 'verified' : 'failed',
      method: input.method,
      expected: input.expected,
      observed: observed.observed,
      checkedAt,
    };
  } catch (e) {
    return {
      status: 'unverifiable',
      method: input.method,
      expected: input.expected,
      observed: 'falha ao observar o estado',
      checkedAt,
      notes: e instanceof Error ? e.message : String(e),
    };
  }
}
