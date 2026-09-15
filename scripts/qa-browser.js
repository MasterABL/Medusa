const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:\\Users\\Abimael Balbino\\.gemini\\antigravity-ide\\brain\\e171ab28-d418-4139-8d4b-db830725aac3';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runFullQA() {
  console.log('=== INICIANDO MEDUSA SHELL V2 AUTOMATED MOTION & VISUAL QA (17 MATRIZES) ===');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
  });

  const page = await browser.newPage();

  const consoleErrors = [];
  const consoleWarnings = [];

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('favicon.ico')) return;
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      console.error('[BROWSER CONSOLE ERROR]:', text);
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(text);
      console.warn('[BROWSER CONSOLE WARNING]:', text);
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.toString());
    console.error('[PAGE ERROR]:', err.toString());
  });

  // Helpers para Tema e Modo
  const setTheme = async (t) => {
    await page.evaluate((themeName) => {
      document.getElementById('btn-theme-dropdown')?.click();
    }, t);
    await wait(200);
    await page.evaluate((themeName) => {
      const btn = document.querySelector(`button[data-theme="${themeName}"]`);
      btn?.click();
    }, t);
    await wait(450); // 380ms transition
  };

  const setMode = async (m) => {
    await page.evaluate(() => {
      document.getElementById('btn-shell-mode-dropdown')?.click();
    });
    await wait(200);
    await page.evaluate((modeName) => {
      const id = modeName === 'amplo' ? 'view-desktop-wide' : modeName === 'compacto' ? 'view-desktop-compact' : 'view-foco';
      document.getElementById(id)?.click();
    }, m);
    await wait(350); // 280ms layout transition
  };

  // =========================================================================
  // CARREGAR APLICAÇÃO PRINCIPAL (PRODUÇÃO)
  // =========================================================================
  console.log('\n--> Carregando http://localhost:3000...');
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await wait(600);

  // =========================================================================
  // MATRIZ 1 a 9: THEMES (3) × MODES (3) = 9 SCREENSHOTS
  // =========================================================================
  const themes = [
    { name: 'light', label: 'Claro' },
    { name: 'sepia', label: 'Sépia' },
    { name: 'dark', label: 'Escuro' },
  ];

  const modes = [
    { name: 'amplo', label: 'Amplo' },
    { name: 'compacto', label: 'Compacto' },
    { name: 'foco', label: 'Foco' },
  ];

  let count = 0;
  for (const t of themes) {
    await setTheme(t.name);
    for (const m of modes) {
      count++;
      await setMode(m.name);
      const filename = `desktop_${t.name === 'light' ? 'claro' : t.name === 'sepia' ? 'sepia' : 'escuro'}_${m.name}.png`;
      const shotPath = path.join(ARTIFACTS_DIR, filename);
      await page.screenshot({ path: shotPath });
      console.log(`[${count}/17] ✓ Capturado: ${filename} (${t.label} × ${m.label})`);
    }
  }

  // Restaurar Claro e Amplo
  await setTheme('light');
  await setMode('amplo');

  // =========================================================================
  // NAVEGAR PARA O MOTION LAB ISOLADO (/dev/motion-lab)
  // =========================================================================
  console.log('\n--> Navegando para http://localhost:3000/dev/motion-lab...');
  await page.goto('http://localhost:3000/dev/motion-lab', { waitUntil: 'networkidle0' });
  await wait(500);

  // =========================================================================
  // MATRIZ 10 a 14: ISLAND STATES (5 SCREENSHOTS)
  // Idle, Processing, Success, Attention, Focus
  // =========================================================================
  const islandStates = [
    { state: 'idle', file: 'island_state_idle.png' },
    { state: 'processing', file: 'island_state_processing.png' },
    { state: 'success', file: 'island_state_success.png' },
    { state: 'attention', file: 'island_state_attention.png' },
    { state: 'focus', file: 'island_state_focus.png' },
  ];

  for (const st of islandStates) {
    count++;
    await page.evaluate((stateName) => {
      document.getElementById(`btn-state-${stateName}`)?.click();
    }, st.state);
    await wait(300); // 180ms transition + settle

    const shotPath = path.join(ARTIFACTS_DIR, st.file);
    await page.screenshot({ path: shotPath });
    console.log(`[${count}/17] ✓ Capturado: ${st.file} (Island State: ${st.state})`);
  }

  // Restaurar Island para Idle
  await page.evaluate(() => {
    document.getElementById('btn-state-idle')?.click();
  });
  await wait(200);

  // =========================================================================
  // MATRIZ 15 e 16: MOBILE DYNAMIC ISLAND (2 SCREENSHOTS)
  // Minimal vs Expanded
  // =========================================================================
  console.log('\n--> Testando Mobile Viewport (390x844)...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await wait(450);

  // 15. Mobile Minimal
  count++;
  await page.evaluate(() => {
    const el = document.getElementById('mobile-dynamic-island');
    el?.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await wait(300);
  const shotMobileMin = path.join(ARTIFACTS_DIR, 'mobile_island_minimal.png');
  await page.screenshot({ path: shotMobileMin });
  console.log(`[${count}/17] ✓ Capturado: mobile_island_minimal.png (Mobile Island Repouso)`);

  // 16. Mobile Expanded (Touch & Reflow Orgânico)
  count++;
  await page.evaluate(() => {
    document.getElementById('mobile-dynamic-island')?.click();
  });
  await wait(350); // 220ms transition
  const shotMobileExp = path.join(ARTIFACTS_DIR, 'mobile_island_expanded.png');
  await page.screenshot({ path: shotMobileExp });
  console.log(`[${count}/17] ✓ Capturado: mobile_island_expanded.png (Mobile Island Expandido)`);

  // =========================================================================
  // MATRIZ 17: ACCESSIBILITY & PREFERS-REDUCED-MOTION (1 SCREENSHOT)
  // =========================================================================
  console.log('\n--> Testando Prefers-Reduced-Motion...');
  count++;
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto('http://localhost:3000/dev/motion-lab', { waitUntil: 'networkidle0' });
  await wait(400);

  const shotReducedMotion = path.join(ARTIFACTS_DIR, 'reduced_motion_proof.png');
  await page.screenshot({ path: shotReducedMotion });
  console.log(`[${count}/17] ✓ Capturado: reduced_motion_proof.png (Reduced Motion Ativo)`);

  // =========================================================================
  // MOTION ASSERTIONS PROGRAMÁTICAS
  // =========================================================================
  console.log('\n=== EXECUTANDO MOTION ASSERTIONS PROGRAMÁTICAS ===');

  const motionTokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      durationMicro: style.getPropertyValue('--duration-micro').trim(),
      durationIsland: style.getPropertyValue('--duration-island').trim(),
      durationLayout: style.getPropertyValue('--duration-layout').trim(),
      durationTheme: style.getPropertyValue('--duration-theme').trim(),
      durationMobile: style.getPropertyValue('--duration-mobile').trim(),
      easeSnappy: style.getPropertyValue('--ease-snappy').trim(),
      easeSmooth: style.getPropertyValue('--ease-smooth').trim(),
    };
  });

  console.log('Tokens Computados:', motionTokens);

  // Asserção 1: Tokens canônicos presentes
  const tokensValid =
    motionTokens.durationMicro === '100ms' &&
    motionTokens.durationIsland === '180ms' &&
    motionTokens.durationLayout === '280ms' &&
    motionTokens.durationTheme === '380ms' &&
    motionTokens.durationMobile === '220ms';

  console.log('Asserção Tokens de Duração (100/180/280/380/220ms):', tokensValid ? 'PASSED ✓' : 'FAILED ✗');

  // Asserção 2: Reduced motion desativa transform e animação
  const reducedMotionActive = await page.evaluate(() => {
    const pulseEl = document.querySelector('.living-pulse');
    if (!pulseEl) return false;
    const style = getComputedStyle(pulseEl);
    return style.animationName === 'none' || style.animationDuration === '0s';
  });
  console.log('Asserção Reduced Motion (animation disabled):', reducedMotionActive ? 'PASSED ✓' : 'FAILED ✗');

  // Asserção 3: Overflow horizontal inexistente
  const hasHorizontalOverflow = await page.evaluate(() => {
    return document.body.scrollWidth > window.innerWidth;
  });
  console.log('Asserção Overflow Horizontal (deve ser false):', !hasHorizontalOverflow ? 'PASSED (zero overflow) ✓' : 'FAILED ✗');

  // Asserção 4: Dark Mode tonal check (sem white border/halo)
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await setTheme('dark');
  const darkTonalCheck = await page.evaluate(() => {
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    // Verifica se background é #111614 rgb(17, 22, 20)
    return bodyBg.includes('17, 22, 20') || bodyBg.includes('#111614');
  });
  console.log('Asserção Dark Mode Tonal Separation (#111614):', darkTonalCheck ? 'PASSED ✓' : 'FAILED ✗');

  // Asserção 5: Centralização Matemática do Island no Header Amplo
  await setTheme('light');
  await setMode('amplo');
  const islandCentering = await page.evaluate(() => {
    const header = document.getElementById('top-header');
    const island = document.getElementById('island-capsule');
    if (!header || !island) return null;
    const hRect = header.getBoundingClientRect();
    const iRect = island.getBoundingClientRect();
    const headerCenter = hRect.left + hRect.width / 2;
    const islandCenter = iRect.left + iRect.width / 2;
    return {
      diff: Math.abs(headerCenter - islandCenter),
      headerCenter,
      islandCenter,
    };
  });
  console.log('Asserção Centralização do Island (diff <= 1px):', islandCentering?.diff <= 1 ? 'PASSED ✓' : 'FAILED ✗', islandCentering);

  await browser.close();

  console.log('\n=== RELATÓRIO DO BROWSER QA ===');
  console.log('Total Screenshots Geradas:', count);
  console.log('Total Erros de Console:', consoleErrors.length);
  console.log('Total Warnings:', consoleWarnings.length);
  console.log('Overflow horizontal inexistente:', !hasHorizontalOverflow);
  console.log('Todos os critérios de Motion comprovados:', tokensValid && reducedMotionActive && !hasHorizontalOverflow);
}

runFullQA().catch((err) => {
  console.error('Erro na execução do QA:', err);
  process.exit(1);
});
