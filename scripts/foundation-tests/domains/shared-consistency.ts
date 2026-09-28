/**
 * MEDUSA — Consistência entre Finanças, Corpo, Espiritual e Guardian (missão §26)
 *
 * Varredura ESTÁTICA do código + checagens de comportamento. Não duplica a
 * infraestrutura: verifica que todos usam a MESMA (Action Bus → Guardian,
 * repositório abstrato isolado, serialização versionada, ponte de insights).
 */

import * as fs from 'fs';
import * as path from 'path';
import { resetAll, makeChecker } from './_helpers';
import { getTodayContextSnapshot } from '../../../src/foundation/hojeContext';
import * as ProactiveMessaging from '../../../src/foundation/messaging/proactiveMessage';
import { publishInsightsToContext } from '../../../src/domains/shared/insightBridge';
import { generateBodyInsights } from '../../../src/domains/body/services/insightsEngine';
import { computeRoutineLoad } from '../../../src/domains/body/services/routineLoadHeuristic';
import { generateFinanceInsights } from '../../../src/domains/finance/services/insightsEngine';
import { createInMemoryFinanceRepository } from '../../../src/domains/finance/repository/inMemory';
import { createInMemoryBodyRepository } from '../../../src/domains/body/repository/inMemory';
import { createInMemorySpiritualRepository } from '../../../src/domains/spiritual/repository/inMemory';
import { createInMemoryGuardianRepository, GuardianDomainApi, runGuardianCycle, defineSource, securityAuditor, createRemediationRegistry } from '../../../src/domains/guardian';
import * as FinanceSer from '../../../src/domains/finance/serialization';
import * as BodySer from '../../../src/domains/body/serialization';
import * as SpiritualSer from '../../../src/domains/spiritual/serialization';
import * as GuardianSer from '../../../src/domains/guardian/serialization';

const ROOT = path.resolve(__dirname, '../../../src/domains');
const DOMAINS = ['finance', 'body', 'spiritual', 'guardian'];

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith('.ts') ? [path.join(dir, e.name)] : []));
}

export async function run(): Promise<{ total: number; fails: number }> {
  const { check, result } = makeChecker('consistência');
  const all = DOMAINS.flatMap((d) => files(path.join(ROOT, d)).map((f) => ({ domain: d, file: f, src: fs.readFileSync(f, 'utf8') })));
  const rel = (f: string) => path.relative(ROOT, f);

  // 1. Todo uso de createAction passa por dispatch (Guardian) — nenhum atalho
  const bypass = all.filter((f) => /\bcreateAction\(/.test(f.src) && !/\bdispatch\(/.test(f.src)).map((f) => rel(f.file));
  check(`1.1: todo arquivo que cria Action também a despacha pelo Guardian (violações: ${bypass.join(', ') || 'nenhuma'})`, bypass.length === 0);

  // 2. Nenhum domínio decide autonomia/aprovação por fora do Guardian
  const forbidden = /GuardianApproval\.(approve|reject)\(|GuardianAuditLog\.record\(|GuardianTrust\.recordOutcome\(/;
  const direct = all.filter((f) => f.domain !== 'guardian' && (forbidden.test(f.src) || /GuardianPolicy\.classify\(/.test(f.src))).map((f) => rel(f.file));
  check(`2.1: Finanças/Corpo/Espiritual não decidem aprovação, confiança ou política diretamente (violações: ${direct.join(', ') || 'nenhuma'})`, direct.length === 0);

  // 3. Domínios não se importam entre si (só shared e foundation)
  const cross: string[] = [];
  for (const f of all) {
    for (const m of Array.from(f.src.matchAll(/from '([^']+)'/g))) {
      const resolved = path.resolve(path.dirname(f.file), m[1]);
      const other = DOMAINS.find((d) => d !== f.domain && resolved.startsWith(path.join(ROOT, d)));
      if (other) cross.push(`${rel(f.file)} → ${other}`);
    }
  }
  check(`3.1: nenhum domínio importa outro domínio diretamente (violações: ${cross.join('; ') || 'nenhuma'})`, cross.length === 0);

  // 4. Guardian sem estado de módulo (tudo passa pelo repositório)
  const moduleState = all
    .filter((f) => f.domain === 'guardian')
    .filter((f) => /^(let |const [A-Za-z_]+ = new (Map|Set)\(|const [A-Za-z_]+(: [^=]+)? = \[\])/m.test(f.src))
    .map((f) => rel(f.file));
  check(`4.1: o runtime do Guardian não guarda estado em variável de módulo (violações: ${moduleState.join(', ') || 'nenhuma'})`, moduleState.length === 0);
  const otherState = all.filter((f) => f.domain !== 'guardian' && /^let /m.test(f.src)).map((f) => rel(f.file));
  console.log(`INFO — [consistência] contadores de módulo (só ids de insight, sem dado de domínio) em: ${otherState.join(', ') || 'nenhum'}`);

  // 5. Repositórios: interface + in-memory isolado
  const f1 = createInMemoryFinanceRepository();
  const f2 = createInMemoryFinanceRepository();
  f1.saveCategory({ id: 'c', name: 'c', kind: 'expense', active: true });
  const b1 = createInMemoryBodyRepository();
  const b2 = createInMemoryBodyRepository();
  b1.saveDiagnosticSession({ id: 's', startedAt: '2026-01-01T00:00:00.000Z', answers: [], status: 'in_progress' });
  const s1 = createInMemorySpiritualRepository();
  const s2 = createInMemorySpiritualRepository();
  s1.savePurpose({ id: 'p', label: 'p', themes: [], status: 'active', createdAt: '2026-01-01T00:00:00.000Z' });
  const g1 = createInMemoryGuardianRepository();
  const g2 = createInMemoryGuardianRepository();
  g1.appendEvent({ id: 'e', type: 'CYCLE_STARTED', message: 'x', at: '2026-01-01T00:00:00.000Z' });
  check('5.1: os quatro repositórios em memória são isolados por instância (nenhum estado global)', f2.listCategories().length === 0 && b2.listDiagnosticSessions().length === 0 && s2.listPurposes().length === 0 && g2.listEvents().length === 0);

  // 6. Serialização versionada em todos
  const has = (mod: Record<string, unknown>, ...names: string[]) => names.every((n) => typeof mod[n] === 'function');
  check('6.1: todos os domínios têm serialize/deserialize com validação', has(FinanceSer, 'serializeTransaction', 'deserializeTransaction') && has(BodySer, 'serializePlan', 'deserializePlan') && has(SpiritualSer, 'serializeStudy', 'deserializeStudy', 'serializeReadingPlan') && has(GuardianSer, 'serializeFinding', 'deserializeFinding'));

  // 7. Ponte de insights: engines puros → contexto compartilhado do Hoje
  resetAll();
  {
    const body = generateBodyInsights({ routineLoad: computeRoutineLoad({ workMinutes: 480, studyMinutes: 180, commuteMinutes: 120, plannedActivityMinutes: 0, sleepQuality: 'ruim', energyLevel: 'baixa' }), now: '2026-03-10' });
    const fin = generateFinanceInsights({ cashflow: { income: 100, expense: 400, netFlow: -300, transactionCount: 5, periodFrom: '2026-03-01', periodTo: '2026-03-31' }, budgetConsumptions: [], upcomingCommitments: [], categorySpikes: [], goalTracks: [], now: '2026-03-10' });
    check('7.1: antes da ponte, o Hoje NÃO enxerga insights de Corpo/Finanças (lacuna real que a ponte fecha)', getTodayContextSnapshot().recentInsights.length === 0);
    publishInsightsToContext('body', body);
    publishInsightsToContext('finance', fin);
    const domains = new Set(getTodayContextSnapshot().recentInsights.map((i) => i.domain));
    check('7.2: depois da ponte, o Hoje vê insights de mais de um domínio, sem importá-los', domains.has('body') && domains.has('finance'));
    const before = getTodayContextSnapshot().recentInsights.length;
    publishInsightsToContext('body', generateBodyInsights({ now: '2026-03-10' }));
    check('7.3: "insufficient_evidence" nunca é publicado como insight', getTodayContextSnapshot().recentInsights.length === before);
  }

  // 8. Mensagens proativas do Guardian: só quando exige uma pessoa, sem evidência bruta
  resetAll();
  {
    const repo = createInMemoryGuardianRepository();
    await runGuardianCycle({
      repository: repo,
      sources: [defineSource(securityAuditor, () => ({ items: [{ location: 'k.pem', content: '-----BEGIN PRIVATE KEY-----' }] }))],
      remediations: createRemediationRegistry(),
    });
    const n1 = GuardianDomainApi.publishFindingMessages(repo);
    const n2 = GuardianDomainApi.publishFindingMessages(repo);
    const msgs = ProactiveMessaging.list({ domain: 'guardian', surface: 'guardian' });
    check('8.1: achado bloqueado vira mensagem no canal "guardian", uma vez só (cooldown)', n1 === 1 && n2 === 0 && msgs.length === 1);
    check('8.2: a mensagem usa categoria/severidade, não a evidência', msgs[0].message.includes('security') && !msgs[0].message.includes('PRIVATE KEY') && msgs[0].urgency === 'alta');
  }

  return result();
}

if (require.main === module) {
  run().then(({ total, fails }) => {
    console.log(`\n[consistência] ${total - fails}/${total} checagens OK`);
    process.exit(fails > 0 ? 1 : 0);
  });
}
