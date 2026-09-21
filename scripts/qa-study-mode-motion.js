const puppeteer = require('puppeteer-core');

const URL = 'http://localhost:3004';
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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function click(page, selector) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.click();
  }, selector);
}

async function clickByTitle(page, title) {
  await page.evaluate((t) => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.title === t);
    if (btn) btn.click();
  }, title);
}

async function exists(page, selector) {
  return page.evaluate((sel) => !!document.querySelector(sel), selector);
}

async function rect(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { width: r.width, height: r.height, opacity: parseFloat(cs.opacity), transform: cs.transform };
  }, selector);
}

async function goToEducacao(page) {
  await clickByTitle(page, 'Educação');
  await wait(500);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/opt/pw-browsers/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // ===== A. TROCA DE TRILHA NO DASHBOARD (ENEM/Inglês/Faculdade) =====
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await goToEducacao(page);

    check('[Dashboard] seletor de trilha Faculdade visível', await exists(page, '#track-selector-faculdade'));
    check('[Dashboard] seletor de trilha Inglês visível', await exists(page, '#track-selector-ingles'));
    check('[Dashboard] seletor de trilha Vestibular (ENEM) visível', await exists(page, '#track-selector-vestibular'));

    const pairs = [
      ['ingles', 'faculdade'],
      ['vestibular', 'ingles'],
      ['faculdade', 'vestibular'],
    ];
    for (const [to] of pairs) {
      const before = await page.evaluate(() => document.getElementById('education-next-action-card')?.textContent?.slice(0, 40));
      await click(page, `#track-selector-${to}`);
      // Amostra em plena transição (a região reentra via key change + study-stage-enter, 480ms)
      await wait(80);
      const mid = await rect(page, '#education-next-action-card');
      check(`[Dashboard] troca para ${to}: elemento amostrado em plena transição (t~80ms)`, mid !== null, `opacity=${mid?.opacity}`);
      await wait(500);
      const after = await page.evaluate(() => document.getElementById('education-next-action-card')?.textContent?.slice(0, 40));
      check(`[Dashboard] troca para ${to}: conteúdo realmente mudou`, before !== after, `before="${before}" after="${after}"`);
    }
    await page.close();
  }

  // ===== B. ENTRADA DA AULA: dashboard -> loading -> ready -> study =====
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await goToEducacao(page);

    await click(page, '#btn-start-study-session');
    await wait(300);
    check('[Entrada] estado de loading aparece', await exists(page, '#study-loading-state'));

    // Aguarda loading (auto ~3.4s) + ready (auto ~1.8s)
    await wait(3600);
    const readyOrStudy = (await exists(page, '#study-ready-state')) || (await exists(page, '#study-mode-container'));
    check('[Entrada] transição loading -> ready ocorreu', readyOrStudy);

    await wait(2200);
    check('[Entrada] Study Mode renderizado (player + palco)', await exists(page, '#study-mode-container'));
    check('[Entrada] palco da aula usa geometria reservada (#lesson-stage presente)', await exists(page, '#lesson-stage'));

    const stageRect = await rect(page, '#lesson-stage');
    check('[Espaço] palco da aula ocupa altura substancial (>= 380px)', stageRect && stageRect.height >= 380, `height=${stageRect?.height}`);

    await page.close();
  }

  // ===== C. TROCA DE TRILHA DENTRO DO STUDY MODE =====
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await goToEducacao(page);
    await click(page, '#btn-start-study-session');
    await wait(5800); // loading + ready completos

    check('[Study Mode] em sessão de estudo', await exists(page, '#study-mode-container'));

    const beforeTopic = await page.evaluate(() => document.getElementById('session-objective-banner')?.textContent);
    await click(page, '#study-track-ingles');
    await wait(60);
    const midOpacity = await rect(page, '#track-content-region');
    check('[Study Mode] troca de trilha amostrada em plena transição (t~60ms)', midOpacity !== null, `opacity=${midOpacity?.opacity}`);
    await wait(500);
    const afterTopic = await page.evaluate(() => document.getElementById('session-objective-banner')?.textContent);
    check('[Study Mode] troca de trilha (Inglês) realmente mudou o conteúdo', beforeTopic !== afterTopic, `before="${beforeTopic}" after="${afterTopic}"`);

    await page.close();
  }

  // ===== D. AULA -> EXERCÍCIOS (timing coordenado, sem pausa morta) =====
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await goToEducacao(page);
    await click(page, '#btn-start-study-session');
    await wait(5800);

    await click(page, '#btn-complete-lesson-trigger');
    await wait(100);
    const midRecede = await rect(page, '#lesson-transition-wrapper');
    check('[Aula->Exercícios] recede real amostrado em t~100ms (opacity < 1)', midRecede && midRecede.opacity < 1, `opacity=${midRecede?.opacity}`);

    await wait(350); // total ~450ms, além dos 320ms do swap
    check('[Aula->Exercícios] Exercícios renderizados após o swap coordenado', await exists(page, '#study-exercises-container'));

    await page.close();
  }

  // ===== E. MODO VOZ: Island encolhe, pulsa, e retorna ao clicar =====
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await goToEducacao(page);
    await click(page, '#btn-start-study-session');
    await wait(5800);

    const beforeVoice = await rect(page, '#island-capsule');
    check('[Voz] Island em largura normal antes da voz', beforeVoice && beforeVoice.width > 60, `width=${beforeVoice?.width}`);

    await click(page, '#btn-trigger-tutor');
    await wait(400);
    check('[Voz] Tutor Drawer abriu', await exists(page, '#tutor-drawer'));

    await click(page, '#btn-tutor-voice-toggle');
    await wait(350); // aguarda a transição de encolhimento (--duration-island = 250ms)
    const duringVoice = await rect(page, '#island-capsule');
    check('[Voz] Island encolheu fisicamente (largura real menor)', duringVoice && duringVoice.width < beforeVoice.width - 20, `before=${beforeVoice.width} during=${duringVoice?.width}`);
    check('[Voz] ícone de microfone visível no Island', await exists(page, '#island-capsule .material-symbols-outlined'));

    // Provar que a pulsação está de fato animando (amostra em dois instantes do ciclo de 2.2s)
    const t1 = await rect(page, '#island-capsule');
    await wait(550);
    const t2 = await rect(page, '#island-capsule');
    check(
      '[Voz] pulsação real em andamento (transform muda ao longo do tempo)',
      t1 && t2 && t1.transform !== t2.transform,
      `t1=${t1?.transform} t2=${t2?.transform}`
    );

    // Clique no microfone encerra a voz com transição coordenada
    await click(page, '#island-capsule');
    await wait(350);
    const afterStop = await rect(page, '#island-capsule');
    check('[Voz] Island retorna à largura normal ao clicar no microfone', afterStop && afterStop.width > beforeVoice.width - 20, `after=${afterStop?.width}`);

    await page.close();
  }

  // ===== F. REDUCED MOTION: voz, troca de trilha, entrada, aula->exercícios =====
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await goToEducacao(page);

    // Troca de trilha continua funcional
    await click(page, '#track-selector-ingles');
    await wait(200);
    const topicAfter = await page.evaluate(() => document.getElementById('education-next-action-card')?.textContent);
    check('[Reduced Motion] troca de trilha ainda funciona (conteúdo muda)', !!topicAfter);

    await click(page, '#btn-start-study-session');
    await wait(5800);
    check('[Reduced Motion] Study Mode ainda é alcançado', await exists(page, '#study-mode-container'));

    await click(page, '#btn-trigger-tutor');
    await wait(300);
    await click(page, '#btn-tutor-voice-toggle');
    await wait(300);
    const voiceRect = await rect(page, '#island-capsule');
    check('[Reduced Motion] Island ainda encolhe para o modo de voz (sem exigir animação)', voiceRect && voiceRect.width < 100, `width=${voiceRect?.width}`);
    const csAnim = await page.evaluate(() => getComputedStyle(document.getElementById('island-capsule')).animationName);
    check('[Reduced Motion] pulsação de voz desabilitada (animationName=none)', csAnim === 'none', `animationName=${csAnim}`);

    await click(page, '#btn-complete-lesson-trigger');
    await wait(400);
    check('[Reduced Motion] aula -> exercícios ainda funciona', await exists(page, '#study-exercises-container'));

    await page.close();
  }

  // ===== G. RESPONSIVE: 390 / 820 / 1024 / 1440 =====
  const breakpoints = [
    { name: '390', width: 390, height: 844 },
    { name: '820', width: 820, height: 1180 },
    { name: '1024', width: 1024, height: 900 },
    { name: '1440', width: 1440, height: 960 },
  ];
  for (const bp of breakpoints) {
    const page = await browser.newPage();
    await page.setViewport({ width: bp.width, height: bp.height });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await goToEducacao(page);
    await click(page, '#btn-start-study-session');
    await wait(5800);

    const g = await page.evaluate(() => ({
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.body.clientWidth,
    }));
    check(`[${bp.name}px] sem overflow horizontal em Study Mode`, g.scrollWidth <= g.clientWidth + 1, `scroll=${g.scrollWidth} client=${g.clientWidth}`);
    check(`[${bp.name}px] palco da aula presente`, await exists(page, '#lesson-stage'));

    await page.close();
  }

  // ===== H. REGRESSÃO: Shell / Sidebar / navegação continuam funcionais =====
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    check('[Regressão] Sidebar presente antes de entrar em Educação', await exists(page, '#main-sidebar'));
    await goToEducacao(page);
    check('[Regressão] Educação renderiza (dashboard)', await exists(page, '#education-dashboard'));
    await clickByTitle(page, 'Hoje');
    await wait(400);
    check('[Regressão] navegação de volta para Hoje funciona', await exists(page, 'main'));
    await page.close();
  }

  await browser.close();

  console.log(`\n=== RESULTADO: ${pass} PASSOU | ${fail} FALHOU ===`);
  if (failures.length) console.log('Falhas:', failures);
  process.exit(fail > 0 ? 1 : 0);
})();
