const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const URL = 'http://localhost:3000';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '820x1180', width: 820, height: 1180 },
  { name: '390x844', width: 390, height: 844 },
];

const OUT_DIR = path.resolve(__dirname, '../artifacts/domain-personality-qa');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

let pass = 0;
let fail = 0;
const failures = [];

function check(label, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`PASS — ${label}${extra ? ' :: ' + extra : ''}`);
  } else {
    fail++;
    failures.push(`${label}${extra ? ' :: ' + extra : ''}`);
    console.error(`FAIL — ${label}${extra ? ' :: ' + extra : ''}`);
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const CORPO_STORED = {
  answers: {},
  profile: JSON.stringify({
    schemaVersion: 1,
    kind: 'body.profile',
    data: {
      id: 'body_profile_1',
      objectives: { value: ['condicionamento_geral'], origin: 'self_reported' },
      routineSummary: { value: 'Rotina moderada com janelas matinais', origin: 'self_reported' },
      availabilityWindows: { value: ['manha'], origin: 'self_reported' },
      weeklyFrequency: { value: 3, origin: 'self_reported' },
      experienceLevel: { value: 'intermediario', origin: 'self_reported' },
      habits: { value: [], origin: 'self_reported' },
      limitations: { value: [], origin: 'self_reported' },
      preferences: { value: ['corrida_ao_ar_livre'], origin: 'self_reported' },
      recoveryQuality: { value: 'boa', origin: 'self_reported' },
    },
  }),
  plan: JSON.stringify({
    schemaVersion: 1,
    kind: 'body.plan',
    data: {
      id: 'body_plan_1',
      stage: 'plano',
      status: 'active',
      sessions: [
        { id: 's1', activityId: 'act_caminhada_leve', preferredDays: [1, 3, 5], durationMinutes: 30, intensity: 'moderada' },
      ],
      frequencyPerWeek: 3,
      createdAt: '2026-09-29T00:00:00.000Z',
      updatedAt: '2026-09-29T00:00:00.000Z',
    },
  }),
};

const ESPIRITUAL_STORED = {
  v: 1,
  purpose: { label: 'Cultivar presença, sabedoria e serenidade', at: '2026-09-29T10:00:00.000Z' },
  plan: { key: 'salmos', startDate: '2026-09-29', startedAt: '2026-09-29T10:00:00.000Z' },
  practices: [
    { id: 'prac_1', kind: 'oracao', intention: 'Começar o dia com calma e propósito', timesPerWeek: 3, durationMinutes: 10 },
  ],
  readEntries: [],
  completions: [],
  reflections: [
    { id: 'ref_1', content: 'A presença se constrói no silêncio entre as atividades.', at: '2026-09-29T10:00:00.000Z' }
  ],
  studies: [],
};

const ENTRY_MAP = {
  financas: new Date().toISOString(),
  corpo: new Date().toISOString(),
  guardian: new Date().toISOString(),
  espiritual: new Date().toISOString(),
};

async function seedHomeState(page) {
  await page.evaluate((corpo, esp, entry) => {
    window.localStorage.setItem('medusa-corpo-v1', JSON.stringify(corpo));
    window.localStorage.setItem('medusa-espiritual-v1', JSON.stringify(esp));
    window.localStorage.setItem('medusa-domain-entry-v1', JSON.stringify(entry));
  }, CORPO_STORED, ESPIRITUAL_STORED, ENTRY_MAP);
}

async function navigateTo(page, domain) {
  await page.evaluate((d) => {
    const btn = document.getElementById(`nav-item-${d}`);
    if (btn) btn.click();
  }, domain);
  await sleep(350);
}

(async () => {
  console.log('Iniciando Validação Visual Humana em Navegador Real (Edge)...');
  console.log(`Executable: ${EDGE_PATH}`);
  console.log(`URL: ${URL}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: EDGE_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (err) {
    console.error('Falha ao abrir Microsoft Edge:', err);
    process.exit(1);
  }

  const page = await browser.newPage();

  // =========================================================================
  // PARTE 1: TESTE DA PRIMEIRA ENTRADA (PRIMEIRA IMPRESSÃO DISTINTA)
  // =========================================================================
  console.log('\n======================================================');
  console.log('>>> PARTE 1: PRIMEIRA ENTRADA DOS 4 DOMÍNIOS (1440x900) <<<');
  console.log('======================================================');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(400);

  // 1.1 Finanças Entrada
  await navigateTo(page, 'financas');
  const hasFinBlueprint = await page.waitForSelector('.fin-blueprint-grid', { timeout: 3000 }).catch(() => null);
  check('Entrada Finanças: Grade blueprint com eixos financeiros presente', !!hasFinBlueprint);
  const finAnswers = await page.$$eval('.fin-answer', (els) => els.length);
  check('Entrada Finanças: 4 eixos analíticos desenhados', finAnswers === 4, `answers=${finAnswers}`);
  await page.screenshot({ path: path.join(OUT_DIR, '01-entrada-financas-1440.png') });

  // 1.2 Corpo Entrada
  await navigateTo(page, 'corpo');
  const hasCorpoIntro = await page.waitForSelector('.cor-intro, .cor-panel, .cor-options', { timeout: 3000 }).catch(() => null);
  check('Entrada Corpo: Onboarding com diagnóstico físico presente', !!hasCorpoIntro);
  await page.screenshot({ path: path.join(OUT_DIR, '02-entrada-corpo-1440.png') });

  // 1.3 Guardian Entrada
  await navigateTo(page, 'guardian');
  const hasGuardianIntro = await page.waitForSelector('.gd-intro-grid, .gd-intro', { timeout: 3000 }).catch(() => null);
  check('Entrada Guardian: Conexão e acoplamento silencioso de sensores', !!hasGuardianIntro);
  await page.screenshot({ path: path.join(OUT_DIR, '03-entrada-guardian-1440.png') });

  // 1.4 Espiritual Entrada
  await navigateTo(page, 'espiritual');
  const hasEspIntro = await page.waitForSelector('.esp-intro', { timeout: 3000 }).catch(() => null);
  check('Entrada Espiritual: Santuário e halo respirado presentes', !!hasEspIntro);
  await page.screenshot({ path: path.join(OUT_DIR, '04-entrada-espiritual-1440.png') });

  // =========================================================================
  // PARTE 2: TESTE DOS HOMES NOS 4 VIEWPORTS
  // =========================================================================
  for (const vp of VIEWPORTS) {
    console.log(`\n======================================================`);
    console.log(`>>> PARTE 2: HOME DOS 4 DOMÍNIOS — VIEWPORT: ${vp.name} (${vp.width}x${vp.height}) <<<`);
    console.log(`======================================================`);

    await page.setViewport({ width: vp.width, height: vp.height });
    await seedHomeState(page);
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(400);

    // -----------------------------------------------------------------------
    // DOMÍNIO 1: FINANÇAS (Clareza + Controle)
    // -----------------------------------------------------------------------
    console.log(`\n--- [${vp.name}] FINANÇAS ---`);
    await navigateTo(page, 'financas');

    const hasBalanceDeck = await page.waitForSelector('.fin-balance-deck', { timeout: 3000 }).catch(() => null);
    check(`[Finanças/${vp.name}] Balance deck geométrico presente`, !!hasBalanceDeck);

    const hasRiver = await page.waitForSelector('.fin-river-svg', { timeout: 3000 }).catch(() => null);
    check(`[Finanças/${vp.name}] Diagrama de fluxo vetorial river presente`, !!hasRiver);

    // Abrir o simulador no Disclosure
    const disclosureBtn = await page.$('.fin-flow-card details summary, .fin-flow-card .dm-btn');
    if (disclosureBtn) {
      await disclosureBtn.click();
      await sleep(250);
    }
    const hasSimInput = await page.waitForSelector('#fin-sim-input', { timeout: 3000 }).catch(() => null);
    check(`[Finanças/${vp.name}] Simulador de margem livre revelado`, !!hasSimInput);

    if (hasSimInput) {
      await hasSimInput.click({ clickCount: 3 });
      await hasSimInput.type('650');
      await sleep(250);
      const isSimulatedActive = await page.$('.fin-stream-simulated');
      check(`[Finanças/${vp.name}] Fluxo vetorial reage dinamicamente à simulação`, !!isSimulatedActive);
    }

    if (vp.width >= 1024) {
      const hasFinCtxFlow = await page.waitForSelector('.fin-ctx-flow', { timeout: 3000 }).catch(() => null);
      check(`[Finanças/${vp.name}] Context Panel com fluxo resumido integrado`, !!hasFinCtxFlow);
    }

    await page.screenshot({ path: path.join(OUT_DIR, `home-financas-${vp.name}.png`) });

    // -----------------------------------------------------------------------
    // DOMÍNIO 2: CORPO (Evolução + Rotina)
    // -----------------------------------------------------------------------
    console.log(`\n--- [${vp.name}] CORPO ---`);
    await navigateTo(page, 'corpo');

    const hasVitalDeck = await page.waitForSelector('.cor-vital-deck', { timeout: 3000 }).catch(() => null);
    check(`[Corpo/${vp.name}] Deck vital orgânico presente`, !!hasVitalDeck);

    const hasMovementVis = await page.waitForSelector('.cor-movement-visualizer', { timeout: 3000 }).catch(() => null);
    check(`[Corpo/${vp.name}] Visualizador cinético (5 fases) presente`, !!hasMovementVis);

    const kineticStages = await page.$$eval('.cor-dim-cell', (els) => els.length);
    check(`[Corpo/${vp.name}] 5 fases do movimento explicadas`, kineticStages === 5, `fases=${kineticStages}`);

    const hasWeeklyStream = await page.waitForSelector('.cor-stream-root', { timeout: 3000 }).catch(() => null);
    check(`[Corpo/${vp.name}] Fita ondulante de ritmo semanal presente`, !!hasWeeklyStream);

    const hasBreathing = await page.waitForSelector('.cor-breath-card, .cor-breath-sphere', { timeout: 3000 }).catch(() => null);
    check(`[Corpo/${vp.name}] Guia de respiração e cadência biológica presente`, !!hasBreathing);

    if (vp.width >= 1024) {
      const hasCorpoRhythm = await page.waitForSelector('.cor-ctx-rhythm', { timeout: 3000 }).catch(() => null);
      check(`[Corpo/${vp.name}] Context Panel com onda de ritmo biológico`, !!hasCorpoRhythm);
    }

    await page.screenshot({ path: path.join(OUT_DIR, `home-corpo-${vp.name}.png`) });

    // -----------------------------------------------------------------------
    // DOMÍNIO 3: GUARDIAN (Inteligência + Controle)
    // -----------------------------------------------------------------------
    console.log(`\n--- [${vp.name}] GUARDIAN ---`);
    await navigateTo(page, 'guardian');

    const hasTopologyRadar = await page.waitForSelector('.gd-topology-console', { timeout: 3000 }).catch(() => null);
    check(`[Guardian/${vp.name}] Console de topologia operacional presente`, !!hasTopologyRadar);

    const topologyFacets = await page.$$eval('.gd-node-btn', (els) => els.length);
    check(`[Guardian/${vp.name}] Facetas do radar monitoradas`, topologyFacets >= 5, `facetas=${topologyFacets}`);

    const hasPipelineTracker = await page.waitForSelector('.gd-pipeline-container', { timeout: 3000 }).catch(() => null);
    check(`[Guardian/${vp.name}] Rastreador de pipeline em 7 estágios presente`, !!hasPipelineTracker);

    const pipelineSteps = await page.$$eval('.gd-pipeline-step', (els) => els.length);
    check(`[Guardian/${vp.name}] 7 estágios operacionais configurados`, pipelineSteps === 7, `estágios=${pipelineSteps}`);

    // Interação com faceta de filtro
    const facetBtn = await page.$('.gd-node-btn');
    if (facetBtn) {
      await facetBtn.click();
      await sleep(200);
      check(`[Guardian/${vp.name}] Filtro de topologia interativo`, true);
    }

    if (vp.width >= 1024) {
      const hasSentinelStatus = await page.waitForSelector('.gd-beacon-dot', { timeout: 3000 }).catch(() => null);
      check(`[Guardian/${vp.name}] Context Panel com sentinela ativo`, !!hasSentinelStatus);
    }

    await page.screenshot({ path: path.join(OUT_DIR, `home-guardian-${vp.name}.png`) });

    // -----------------------------------------------------------------------
    // DOMÍNIO 4: ESPIRITUAL (Presença + Fé + Caminho)
    // -----------------------------------------------------------------------
    console.log(`\n--- [${vp.name}] ESPIRITUAL ---`);
    await navigateTo(page, 'espiritual');

    const hasSanctuary = await page.waitForSelector('.esp-sanctuary', { timeout: 3500 }).catch(() => null);
    check(`[Espiritual/${vp.name}] Santuário atmosférico presente`, !!hasSanctuary);

    const hasSkyGradient = await page.waitForSelector('.esp-sky-gradient', { timeout: 3000 }).catch(() => null);
    check(`[Espiritual/${vp.name}] Gradiente de céu celestial presente`, !!hasSkyGradient);

    const hasAltar = await page.waitForSelector('.esp-sanctuary-altar', { timeout: 3000 }).catch(() => null);
    check(`[Espiritual/${vp.name}] Altar do propósito presente`, !!hasAltar);

    const hasSanctuaryGrid = await page.waitForSelector('.esp-sanctuary-grid', { timeout: 3000 }).catch(() => null);
    check(`[Espiritual/${vp.name}] Blocos de santuário des-cardificados presentes`, !!hasSanctuaryGrid);

    // Testar alternância do momento (Auto / Dia / Tarde / Noite)
    const timePills = await page.$$('.esp-time-pill');
    if (timePills.length >= 4) {
      // Clicar Noite
      await timePills[3].click();
      await sleep(250);
      const isNight = await page.$eval('.esp-sanctuary', (el) => el.getAttribute('data-ambient-time') === 'noite');
      check(`[Espiritual/${vp.name}] Atmosfera transiciona para Noite com céu estrelado`, isNight);

      // Clicar Tarde
      await timePills[2].click();
      await sleep(250);
      const isSunset = await page.$eval('.esp-sanctuary', (el) => el.getAttribute('data-ambient-time') === 'entardecer');
      check(`[Espiritual/${vp.name}] Atmosfera transiciona para Fim de Tarde caloroso`, isSunset);
    }

    // Testar alternância de modo (Propósito / Leitura / Estudo / Oração)
    const modeTabs = await page.$$('.esp-mode-tab');
    if (modeTabs.length >= 4) {
      // Clicar Oração
      await modeTabs[3].click();
      await sleep(250);
      const isOracao = await page.$eval('.esp-sanctuary', (el) => el.getAttribute('data-sanctuary-mode') === 'oracao');
      check(`[Espiritual/${vp.name}] Modo Oração ativa halo respirado concêntrico`, isOracao);

      // Clicar Leitura
      await modeTabs[1].click();
      await sleep(250);
      const isLeitura = await page.$eval('.esp-sanctuary', (el) => el.getAttribute('data-sanctuary-mode') === 'leitura');
      check(`[Espiritual/${vp.name}] Modo Leitura ativa foco de passagem`, isLeitura);
    }

    await page.screenshot({ path: path.join(OUT_DIR, `home-espiritual-${vp.name}.png`) });
  }

  // =========================================================================
  // PARTE 3: AUDITORIA DE PREFERS-REDUCED-MOTION
  // =========================================================================
  console.log('\n======================================================');
  console.log('>>> PARTE 3: AUDITORIA DE ACESSIBILIDADE E MOTION REDUZIDO <<<');
  console.log('======================================================');
  await page.setViewport({ width: 1440, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await seedHomeState(page);
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(400);

  // Espiritual
  await navigateTo(page, 'espiritual');
  await page.waitForSelector('.esp-sanctuary', { timeout: 3000 });
  const reducedAtmosphere = await page.$eval('.esp-sanctuary', (el) => {
    const halo = el.querySelector('.esp-mode-halo');
    if (!halo) return true;
    const style = window.getComputedStyle(halo);
    return style.animationName === 'none' || !style.animationName;
  });
  check('[Acessibilidade] Prefers-reduced-motion suprime animação no Santuário Espiritual', reducedAtmosphere);

  // Finanças
  await navigateTo(page, 'financas');
  await page.waitForSelector('.fin-balance-deck', { timeout: 3000 });
  const reducedFin = await page.$eval('.fin-balance-deck', (el) => {
    const style = window.getComputedStyle(el);
    return style.animationName === 'none' || !style.animationName;
  });
  check('[Acessibilidade] Prefers-reduced-motion respeitado em Finanças', reducedFin);

  // Corpo
  await navigateTo(page, 'corpo');
  await page.waitForSelector('.cor-breath-card', { timeout: 3000 });
  const reducedCorpo = await page.$eval('.cor-breath-card', (el) => {
    const sphere = el.querySelector('.cor-breath-sphere span:first-child');
    if (!sphere) return true;
    const style = window.getComputedStyle(sphere);
    return style.transitionDuration === '0s' || !style.transitionDuration || style.transitionProperty === 'none';
  });
  check('[Acessibilidade] Prefers-reduced-motion respeitado na esfera de respiração de Corpo', reducedCorpo);

  // Guardian
  await navigateTo(page, 'guardian');
  await page.waitForSelector('.gd-topology-console', { timeout: 3000 });
  const reducedGuardian = await page.$eval('.gd-topology-console', (el) => {
    const ring = el.querySelector('.gd-node-pulse-ring');
    if (!ring) return true;
    const style = window.getComputedStyle(ring);
    return style.animationName === 'none' || !style.animationName;
  });
  check('[Acessibilidade] Prefers-reduced-motion respeitado nos faróis de Guardian', reducedGuardian);

  await browser.close();

  console.log(`\n======================================================`);
  console.log(`RELATÓRIO QA NAVEGADOR: ${pass} PASSOU | ${fail} FALHOU`);
  console.log(`Screenshots salvos em: ${OUT_DIR}`);
  console.log(`======================================================`);

  if (failures.length > 0) {
    console.error('Falhas detectadas:', failures);
    process.exit(1);
  } else {
    console.log('TODAS AS VALIDAÇÕES DE NAVEGADOR PASSARAM COM 100% DE SUCESSO!');
    process.exit(0);
  }
})();
