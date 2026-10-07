/**
 * Browser QA — Personal OS Integration + Product Truth Pass.
 *
 * Roda contra o build de produção (`npm run build && npm run start -- -p 3100`):
 *   QA_URL=http://localhost:3100 CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
 *     node scripts/qa-personal-os-integration.js
 *
 * Prova na TELA (não só em teste unitário):
 *  - Hoje sem dados inventados (estado vazio real, sem tarefas de exemplo fora do modo demo);
 *  - tarefa criada sobrevive a recarregar a página;
 *  - Finanças: Contestar → Guardian (aguardando) → Aprovar → "executor não conectado" (nunca "estorno enviado");
 *  - contador do Guardian na sidebar é calculado (sobe com a proposta, desce com a aprovação);
 *  - Espiritual: gratidão persiste; Corpo: série registrada persiste;
 *  - modo demo (?demo=1) marca tudo como "Dados de exemplo";
 *  - 390 / 820 / 1024 / 1440 sem rolagem horizontal; prefers-reduced-motion; zero erro de console.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const URL = process.env.QA_URL || 'http://localhost:3100';
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT = process.env.QA_OUT || path.join(process.cwd(), 'qa-screenshots', 'personal-os-integration');

let pass = 0;
let fail = 0;
const failures = [];
function check(label, cond, extra) {
  if (cond) pass++;
  else {
    fail++;
    failures.push(label + (extra ? ` (${extra})` : ''));
  }
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}${extra ? ' :: ' + extra : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function go(page, route, query = '') {
  await page.evaluate((r) => localStorage.setItem('medusa-active-route', r), route);
  await page.goto(`${URL}/${query}`, { waitUntil: 'networkidle0', timeout: 30000 });
  // espera a hidratação + o runtime carregar o estado salvo (o painel deixa de dizer "Carregando")
  await page
    .waitForFunction(() => !document.body.innerText.includes('Carregando dados salvos'), { timeout: 15000 })
    .catch(() => {});
  await sleep(700);
}

async function clickText(page, text, scope = 'button') {
  const ok = await page.evaluate(
    (t, sel) => {
      const els = Array.from(document.querySelectorAll(sel)).filter((e) => e.offsetParent !== null && (e.textContent || '').trim().includes(t));
      const el = els[0];
      if (!el) return false;
      el.click();
      return true;
    },
    text,
    scope
  );
  await sleep(450);
  return ok;
}

const bodyText = (page) => page.evaluate(() => document.body.innerText);
const islandText = (page) => page.evaluate(() => Array.from(document.querySelectorAll('[role="region"], [aria-live]')).map((e) => e.textContent).join(' | '));
const overflowX = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  await page.setViewport({ width: 1440, height: 900 });

  // estado zerado (primeiro uso real, sem demo)
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await go(page, 'hoje');

  console.log('\n--- 1. HOJE SEM DADOS INVENTADOS ---');
  const empty = await page.$('[data-testid="today-empty-state"]');
  check('1.1 Hoje sem compromissos mostra estado vazio de verdade', !!empty);
  let txt = await bodyText(page);
  check('1.2 nenhuma tarefa de exemplo fora do modo demo', !txt.includes('Revisar bibliografia') && !txt.includes('Telemedicina'));
  const prov = await page.$$eval('[aria-label="Central de Contexto Hoje"] header [data-provenance]', (els) => els.map((e) => e.getAttribute('data-provenance')));
  check('1.3 selo de procedência da Hoje diz "Sem dados" (não "dados de exemplo")', prov[0] === 'empty', prov.join(','));
  const agendaBadge = await page.$eval('#nav-item-agenda', (e) => e.textContent || '').catch(() => '');
  check('1.3b Agenda sem contador de compromissos inventados', !/\d/.test(agendaBadge), agendaBadge.trim());
  const sidebar = await page.$eval('#nav-item-educacao', (e) => e.textContent || '').catch(() => '');
  check('1.4 sidebar: Educação sem o "14" fixo', !/14/.test(sidebar), sidebar.trim());
  await page.screenshot({ path: path.join(OUT, '01-hoje-vazio-1440.png') });

  console.log('\n--- 2. TAREFA REAL + PERSISTÊNCIA ---');
  check('2.0 abre "Tarefas & Projetos"', await clickText(page, 'Tarefas & Projetos'));
  await page.type('input[aria-label="Título da tarefa"]', 'Ligar para a clínica');
  await clickText(page, 'Adicionar');
  txt = await bodyText(page);
  check('2.1 tarefa criada aparece na lista', txt.includes('Ligar para a clínica'));
  await go(page, 'hoje');
  await clickText(page, 'Tarefas & Projetos');
  txt = await bodyText(page);
  check('2.2 tarefa sobrevive a recarregar a página', txt.includes('Ligar para a clínica'));
  await page.screenshot({ path: path.join(OUT, '02-tarefas-1440.png') });

  console.log('\n--- 3. FINANÇAS → GUARDIAN → APROVAÇÃO HONESTA ---');
  await go(page, 'financas');
  await clickText(page, 'Anomalias');
  const contest = (await clickText(page, 'Contestar Estorno')) || (await clickText(page, 'Contestar no Guardian'));
  check('3.1 botão Contestar disponível', contest);
  await sleep(300);
  const isl = await islandText(page);
  txt = await bodyText(page);
  check('3.2 resposta honesta: proposta ao Guardian, nenhum emissor acionado', /Contesta[cç][aã]o proposta|Aguardando aprova/i.test(isl + txt), isl.slice(0, 160));
  check('3.3 nunca diz "estorno enviado"', !/estorno enviado/i.test(isl + txt));
  await page.screenshot({ path: path.join(OUT, '03-financas-contestar-1440.png') });
  const badgeBefore = await page.$eval('#nav-item-guardian', (e) => e.textContent || '').catch(() => '');
  check('3.4 sidebar Guardian conta 1 aprovação pendente (calculado)', /1/.test(badgeBefore), badgeBefore.trim());

  await go(page, 'guardian');
  await clickText(page, 'Ações');
  txt = await bodyText(page);
  check('3.5 proposta real aparece no Action Center aguardando aprovação', /Aguardando (sua )?aprova/i.test(txt) && /contest/i.test(txt), (txt.match(/.{0,60}contest.{0,60}/i) || [''])[0]);
  check('3.6 aprovar', await clickText(page, 'Aprovar'));
  await sleep(500);
  txt = (await bodyText(page)) + (await islandText(page));
  check('3.7 após aprovar: "executor não conectado" (sem fingir execução)', /executor n[aã]o conectado/i.test(txt));
  check('3.8 nunca "estorno enviado"/"executado" para a contestação', !/estorno enviado/i.test(txt));
  await page.screenshot({ path: path.join(OUT, '04-guardian-aprovado-1440.png') });
  await clickText(page, 'Auditoria');
  txt = await bodyText(page);
  check('3.9 audit log registra a decisão real', /DISPUTE_CHARGE|finance\/DISPUTE_CHARGE/.test(txt));
  const badgeAfter = await page.$eval('#nav-item-guardian', (e) => e.textContent || '').catch(() => '');
  check('3.10 contador do Guardian zera depois de aprovar', !/\d/.test(badgeAfter), badgeAfter.trim());
  await go(page, 'financas');
  await clickText(page, 'Anomalias');
  txt = await bodyText(page);
  check('3.11 Finanças mostra o estado real da contestação após recarregar', /executor n[aã]o conectado/i.test(txt));

  console.log('\n--- 4. ESPIRITUAL E CORPO PERSISTEM ---');
  await go(page, 'espiritual');
  await clickText(page, 'Gratidão');
  check('4.0 diário de gratidão começa vazio (sem exemplos)', !!(await page.$('[data-testid="gratitude-empty"]')));
  await page.type('input[placeholder="Pelo que você é grato a Deus hoje?"]', 'Pela consulta que deu certo');
  await clickText(page, 'Agradecer');
  await go(page, 'espiritual');
  await clickText(page, 'Gratidão');
  txt = await bodyText(page);
  check('4.1 gratidão salva sobrevive a recarregar', txt.includes('Pela consulta que deu certo'));

  await go(page, 'corpo');
  await clickText(page, 'Modo Treino');
  const registrou = await clickText(page, 'Registrar Série');
  const islBody = await islandText(page);
  check('4.2 registrar série → "Série salva"', registrou && /S[eé]rie salva/i.test(islBody), islBody.slice(0, 120));
  await go(page, 'corpo');
  await clickText(page, 'Modo Treino');
  txt = await bodyText(page);
  check('4.3 sessão em andamento retomada após recarregar (Série 2 do 1º exercício)', /Registrar S[eé]rie 2/.test(txt));

  console.log('\n--- 5. MODO DEMONSTRAÇÃO MARCADO ---');
  await go(page, 'hoje', '?demo=1');
  const provDemo = await page.$$eval('[data-provenance]', (els) => els.map((e) => e.getAttribute('data-provenance')));
  check('5.1 com ?demo=1, fixtures aparecem marcadas como "Dados de exemplo"', provDemo.includes('fixture'), provDemo.join(','));
  await go(page, 'hoje');

  console.log('\n--- 6. VIEWPORTS + REDUCED MOTION ---');
  for (const [w, h] of [[390, 844], [820, 1180], [1024, 768], [1440, 900]]) {
    await page.setViewport({ width: w, height: h });
    for (const r of ['hoje', 'guardian', 'financas']) {
      await go(page, r);
      const ox = await overflowX(page);
      check(`6 ${r} @${w}px sem rolagem horizontal`, ox <= 1, `overflow=${ox}`);
      if (r === 'hoje' || w === 390) await page.screenshot({ path: path.join(OUT, `05-${r}-${w}.png`) });
    }
  }
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width: 390, height: 844 });
  await go(page, 'hoje');
  check('6.r reduced motion: Hoje renderiza', !!(await page.$('[aria-label="Central de Contexto Hoje"]')));
  await page.screenshot({ path: path.join(OUT, '06-hoje-390-reduced-motion.png') });

  // ERR_CERT_AUTHORITY_INVALID = Google Fonts bloqueado pelo proxy deste ambiente (não é do app)
  const relevant = consoleErrors.filter((e) => !/favicon|Download the React DevTools|ERR_CERT_AUTHORITY_INVALID/i.test(e));
  check('7 nenhum erro de console/página', relevant.length === 0, relevant.slice(0, 3).join(' || '));

  await browser.close();
  console.log(`\n${pass}/${pass + fail} checagens OK`);
  if (fail) {
    console.log('Falhas:\n - ' + failures.join('\n - '));
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
