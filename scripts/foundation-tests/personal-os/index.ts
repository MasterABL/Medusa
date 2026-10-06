/**
 * Orquestrador dos testes do Personal OS Core. Uso: npm run test:personal-os
 */
import { run as tasksProjects } from './tasks-projects';
import { run as contextPriority } from './context-priority';
import { run as remindersV2 } from './reminders-v2';
import { run as actions } from './actions';
import { run as plannerRecs } from './planner-recs';
import { run as todayIntegration } from './today-integration';
import { run as academic } from './academic';
import { run as persistence } from './persistence';

type Result = { total: number; fails: number };
const suites: Array<[string, () => Result | Promise<Result>]> = [
  ['tasks-projects', tasksProjects],
  ['context-priority', contextPriority],
  ['reminders-v2', remindersV2],
  ['actions', actions],
  ['planner-recs', plannerRecs],
  ['today-integration', todayIntegration],
  ['academic', academic],
  ['persistence', persistence],
];

(async () => {
  let total = 0;
  let fails = 0;
  const summary: string[] = [];
  for (const [name, suite] of suites) {
    const r = await suite();
    total += r.total;
    fails += r.fails;
    summary.push(`${name.padEnd(18)} ${r.total - r.fails}/${r.total}`);
  }
  console.log('\n=== PERSONAL OS — RESUMO POR SUÍTE ===');
  for (const line of summary) console.log(line);
  console.log(`\n${total - fails}/${total} checagens OK`);
  console.log(fails === 0 ? 'RESULTADO: PASS' : `RESULTADO: FAIL (${fails} falha(s))`);
  process.exit(fails > 0 ? 1 : 0);
})();
