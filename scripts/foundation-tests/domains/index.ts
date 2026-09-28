/**
 * Orquestrador dos testes de domínio: roda tudo, soma, sai com código único.
 * Uso: npm run test:domains
 */

import { run as finance } from './finance';
import { run as body } from './body';
import { run as spiritual } from './spiritual';
import { run as guardian } from './guardian';
import { run as integration } from './integration-scenarios';
import { run as serialization } from './serialization';

const suites: Array<[string, () => { total: number; fails: number }]> = [
  ['finance', finance],
  ['body', body],
  ['spiritual', spiritual],
  ['guardian', guardian],
  ['integração', integration],
  ['serialização', serialization],
];

let total = 0;
let fails = 0;
const summary: string[] = [];

for (const [name, suite] of suites) {
  const r = suite();
  total += r.total;
  fails += r.fails;
  summary.push(`${name.padEnd(11)} ${r.total - r.fails}/${r.total}`);
}

console.log('\n=== RESUMO POR SUÍTE ===');
for (const line of summary) console.log(line);
console.log(`\n${total - fails}/${total} checagens OK`);
console.log(fails === 0 ? 'RESULTADO: PASS' : `RESULTADO: FAIL (${fails} falha(s))`);
process.exit(fails > 0 ? 1 : 0);
