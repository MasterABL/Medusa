/**
 * Orquestrador dos testes de domínio: roda tudo, soma, sai com código único.
 * Uso: npm run test:domains
 */

import { run as finance } from './finance';
import { run as body } from './body';
import { run as spiritual } from './spiritual';
import { run as spiritualIntelligence } from './spiritual-intelligence';
import { run as guardian } from './guardian';
import { run as guardianRuntime } from './guardian-runtime';
import { run as integration } from './integration-scenarios';
import { run as integrationRound2 } from './integration-round2';
import { run as consistency } from './shared-consistency';
import { run as serialization } from './serialization';
import { run as dataState } from './data-state';
import { run as bodyFoundation } from './body-foundation';

type Result = { total: number; fails: number };
const suites: Array<[string, () => Result | Promise<Result>]> = [
  ['finance', finance],
  ['body', body],
  ['spiritual', spiritual],
  ['espiritual-intel', spiritualIntelligence],
  ['guardian', guardian],
  ['guardian-runtime', guardianRuntime],
  ['integração', integration],
  ['integração-2', integrationRound2],
  ['consistência', consistency],
  ['serialização', serialization],
  ['data-state', dataState],
  ['body-foundation', bodyFoundation],
];

async function main(): Promise<void> {
  let total = 0;
  let fails = 0;
  const summary: string[] = [];

  for (const [name, suite] of suites) {
    const r = await suite();
    total += r.total;
    fails += r.fails;
    summary.push(`${name.padEnd(18)} ${r.total - r.fails}/${r.total}`);
  }

  console.log('\n=== RESUMO POR SUÍTE ===');
  for (const line of summary) console.log(line);
  console.log(`\n${total - fails}/${total} checagens OK`);
  console.log(fails === 0 ? 'RESULTADO: PASS' : `RESULTADO: FAIL (${fails} falha(s))`);
  process.exit(fails > 0 ? 1 : 0);
}

main();
