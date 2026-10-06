/**
 * Orquestrador dos testes do domínio Gmail/Agenda. Uso: npm run test:email
 */
import { run as understanding } from './understanding';
import { run as candidates } from './candidates';
import { run as guardianProviders } from './guardian-providers';
import { run as e2e } from './e2e';
import { run as inboxFollowup } from './inbox-followup';

type Result = { total: number; fails: number };
const suites: Array<[string, () => Result | Promise<Result>]> = [
  ['understanding', understanding],
  ['candidates', candidates],
  ['guardian-providers', guardianProviders],
  ['e2e', e2e],
  ['inbox-followup', inboxFollowup],
];

(async () => {
  let total = 0;
  let fails = 0;
  const summary: string[] = [];
  for (const [name, suite] of suites) {
    const r = await suite();
    total += r.total;
    fails += r.fails;
    summary.push(`${name.padEnd(20)} ${r.total - r.fails}/${r.total}`);
  }
  console.log('\n=== GMAIL / AGENDA — RESUMO POR SUÍTE ===');
  for (const line of summary) console.log(line);
  console.log(`\n${total - fails}/${total} checagens OK`);
  console.log(fails === 0 ? 'RESULTADO: PASS' : `RESULTADO: FAIL (${fails} falha(s))`);
  process.exit(fails > 0 ? 1 : 0);
})();
