/**
 * Integração do Personal OS com o produto. Uso: npm run test:integration
 */
import { run as runtimeCore } from './runtime-core';
import { run as journeys } from './journeys';
import { run as cronograma } from './cronograma';

type Result = { total: number; fails: number };
const suites: Array<[string, () => Result | Promise<Result>]> = [
  ['runtime-core', runtimeCore],
  ['jornadas', journeys],
  ['cronograma', cronograma],
];

(async () => {
  let total = 0;
  let fails = 0;
  const summary: string[] = [];
  for (const [name, suite] of suites) {
    const r = await suite();
    total += r.total;
    fails += r.fails;
    summary.push(`${name.padEnd(14)} ${r.total - r.fails}/${r.total}`);
  }
  console.log('\n=== INTEGRAÇÃO — RESUMO POR SUÍTE ===');
  for (const line of summary) console.log(line);
  console.log(`\n${total - fails}/${total} checagens OK`);
  console.log(fails === 0 ? 'RESULTADO: PASS' : `RESULTADO: FAIL (${fails} falha(s))`);
  if (fails > 0) process.exit(1);
})();
