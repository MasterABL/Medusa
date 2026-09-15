const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

/**
 * Resolução dinâmica e portável do executável do navegador:
 * 1. Prioriza variável de ambiente MEDUSA_BROWSER_PATH
 * 2. Varre caminhos canônicos multiplataforma (Windows, macOS, Linux)
 * 3. Fallback para puppeteer caso instalado
 */
function resolveBrowserPath() {
  if (process.env.MEDUSA_BROWSER_PATH) {
    if (fs.existsSync(process.env.MEDUSA_BROWSER_PATH)) {
      return process.env.MEDUSA_BROWSER_PATH;
    }
    console.warn(`[WARN] MEDUSA_BROWSER_PATH definido (${process.env.MEDUSA_BROWSER_PATH}) mas arquivo não existe. Buscando alternativas...`);
  }

  const candidatePaths = [
    // Windows Edge & Chrome
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : null,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Microsoft\\Edge\\Application\\msedge.exe') : null,
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ].filter(Boolean);

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }

  try {
    const puppeteerFull = require('puppeteer');
    if (typeof puppeteerFull.executablePath === 'function') {
      const execPath = puppeteerFull.executablePath();
      if (fs.existsSync(execPath)) return execPath;
    }
  } catch {}

  throw new Error('Nenhum executável de Chromium/Chrome/Edge encontrado. Configure MEDUSA_BROWSER_PATH apontando para o binário do navegador.');
}

// Diretório de artefatos portável com fallback para ./qa-screenshots
const DEFAULT_ARTIFACTS_DIR = path.resolve(__dirname, '..', 'qa-screenshots');
const ARTIFACTS_DIR = process.env.MEDUSA_QA_ARTIFACTS_DIR ? path.resolve(process.env.MEDUSA_QA_ARTIFACTS_DIR) : DEFAULT_ARTIFACTS_DIR;

// Assegura existência dos diretórios de saída
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}
if (ARTIFACTS_DIR !== DEFAULT_ARTIFACTS_DIR && !fs.existsSync(DEFAULT_ARTIFACTS_DIR)) {
  fs.mkdirSync(DEFAULT_ARTIFACTS_DIR, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function saveScreenshot(page, filename) {
  const primaryPath = path.join(ARTIFACTS_DIR, filename);
  await page.screenshot({ path: primaryPath });
  if (ARTIFACTS_DIR !== DEFAULT_ARTIFACTS_DIR) {
    const secondaryPath = path.join(DEFAULT_ARTIFACTS_DIR, filename);
    try {
      fs.copyFileSync(primaryPath, secondaryPath);
    } catch {}
  }
}

async function runFullQA() {
  console.log('=== INICIANDO MEDUSA SHELL V2 AUTOMATED MOTION & VISUAL QA (PORTABLE) ===');
  const browserPath = resolveBrowserPath();
  console.log(`--> Navegador detectado: ${browserPath}`);
  console.log(`--> Diretório de artefatos: ${ARTIFACTS_DIR}`);

  const browser = await puppeteer.launch({
    executablePath: browserPath,
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
    await page.evaluate(() => {
      document.getElementById('btn-theme-dropdown')?.click();
    });
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
    await wait(420); // 340ms layout transition
  };

  // =========================================================================
  // CARREGAR APLICAÇÃO PRINCIPAL (PRODUÇÃO) EM DESKTOP (1440 × 900)
  // =========================================================================
  console.log('\n--> Carregando http://localhost:3000 em Desktop 1440 × 900...');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
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
      await saveScreenshot(page, filename);
      console.log(`[${count}] ✓ Capturado: ${filename} (${t.label} × ${m.label})`);
    }
  }

  // Restaurar Claro e Amplo
  await setTheme('light');
  await setMode('amplo');

  // =========================================================================
  // CAPTURA TABLET VIEWPORT (820 × 1180)
  // =========================================================================
  console.log('\n--> Testando Tablet Viewport (820 × 1180)...');
  await page.setViewport({ width: 820, height: 1180, deviceScaleFactor: 2 });
  await wait(400);
  count++;
  await saveScreenshot(page, 'tablet_view.png');
  console.log(`[${count}] ✓ Capturado: tablet_view.png (Tablet 820 × 1180)`);

  // Retornar para Desktop 1440 × 900
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // =========================================================================
  // MATRIZ: TODOS OS 10 ESTADOS DO ISLAND NO DEV MOTION LAB
  // =========================================================================
  console.log('\n--> Navegando para http://localhost:3000/dev/motion-lab...');
  await page.goto('http://localhost:3000/dev/motion-lab', { waitUntil: 'networkidle0' });
  await wait(500);

  const islandStates = [
    { state: 'idle', file: 'island_state_idle.png' },
    { state: 'context', file: 'island_state_context.png' },
    { state: 'active', file: 'island_state_active.png' },
    { state: 'processing', file: 'island_state_processing.png' },
    { state: 'success', file: 'island_state_success.png' },
    { state: 'attention', file: 'island_state_attention.png' },
    { state: 'error', file: 'island_state_error.png' },
    { state: 'summary', file: 'island_state_summary.png' },
    { state: 'focus', file: 'island_state_focus.png' },
    { state: 'collapsed', file: 'island_state_collapsed.png' },
  ];

  for (const st of islandStates) {
    count++;
    await page.evaluate((targetState) => {
      const btn = document.querySelector(`button[data-state="${targetState}"]`);
      btn?.click();
    }, st.state);
    await wait(280);

    await saveScreenshot(page, st.file);
    console.log(`[${count}] ✓ Capturado: ${st.file} (Island State: ${st.state})`);
  }

  // =========================================================================
  // GEOMETRIC TRANSITION PROOFS (0%, ~50%, 100%)
  // =========================================================================
  console.log('\n=== CAPTURANDO EVIDÊNCIAS GEOMÉTRICAS DE TRANSIÇÃO (0%, 50%, 100%) ===');

  const getElementMetrics = async (selectors) => {
    return await page.evaluate((sels) => {
      const res = {};
      for (const s of sels) {
        const el = document.querySelector(s);
        if (el) {
          const r = el.getBoundingClientRect();
          res[s] = {
            x: Math.round(r.x),
            y: Math.round(r.y),
            width: Math.round(r.width),
            height: Math.round(r.height),
          };
        }
      }
      return res;
    }, selectors);
  };

  // 1. Transição Idle -> Active (220ms)
  console.log('\n--> Provando transição Island: idle -> active (220ms)...');
  await page.evaluate(() => {
    const btn = document.querySelector('button[data-state="idle"]');
    btn?.click();
  });
  await wait(300);

  const idleActive0 = await getElementMetrics(['#island-capsule']);
  await saveScreenshot(page, 'transition_island_idle_to_active_0pct.png');
  console.log('   [0% Idle]:', idleActive0['#island-capsule']);

  // Disparar active e capturar ~50% (105ms de 220ms)
  await page.evaluate(() => {
    const btn = document.querySelector('button[data-state="active"]');
    btn?.click();
  });
  await wait(105);
  const idleActive50 = await getElementMetrics(['#island-capsule']);
  await saveScreenshot(page, 'transition_island_idle_to_active_50pct.png');
  console.log('   [~50% Morph]:', idleActive50['#island-capsule']);

  // Capturar 100% (estabelecido em ~240ms)
  await wait(240);
  const idleActive100 = await getElementMetrics(['#island-capsule']);
  await saveScreenshot(page, 'transition_island_idle_to_active_100pct.png');
  console.log('   [100% Active]:', idleActive100['#island-capsule']);

  // 2. Transição Active -> Processing (220ms)
  console.log('\n--> Provando transição Island: active -> processing (220ms)...');
  const activeProc0 = await getElementMetrics(['#island-capsule']);
  await saveScreenshot(page, 'transition_island_active_to_proc_0pct.png');
  console.log('   [0% Active]:', activeProc0['#island-capsule']);

  await page.evaluate(() => {
    const btn = document.querySelector('button[data-state="processing"]');
    btn?.click();
  });
  await wait(105);
  const activeProc50 = await getElementMetrics(['#island-capsule']);
  await saveScreenshot(page, 'transition_island_active_to_proc_50pct.png');
  console.log('   [~50% Morph]:', activeProc50['#island-capsule']);

  await wait(240);
  const activeProc100 = await getElementMetrics(['#island-capsule']);
  await saveScreenshot(page, 'transition_island_active_to_proc_100pct.png');
  console.log('   [100% Processing]:', activeProc100['#island-capsule']);

  // 3. Transição Shell Mode: Amplo -> Foco (340ms)
  console.log('\n--> Provando transição Shell: amplo -> foco (340ms)...');
  await setMode('amplo');
  await wait(450);

  const shellSelectors = ['#main-sidebar', '#context-panel', '#content-layout', '#island-capsule', '#top-header'];
  const amploFoco0 = await getElementMetrics(shellSelectors);
  await saveScreenshot(page, 'transition_shell_amplo_to_foco_0pct.png');
  console.log('   [0% Amplo]:', {
    sidebarWidth: amploFoco0['#main-sidebar']?.width,
    contentPaddingLeft: await page.evaluate(() => getComputedStyle(document.getElementById('content-layout')).paddingLeft),
    contentPaddingRight: await page.evaluate(() => getComputedStyle(document.getElementById('content-layout')).paddingRight),
    islandCenter: amploFoco0['#island-capsule']?.x + (amploFoco0['#island-capsule']?.width || 0) / 2,
  });

  // Disparar Foco e capturar ~50% (165ms de 340ms)
  await page.evaluate(() => {
    document.getElementById('btn-lab-mode-foco')?.click();
  });
  await wait(165);
  const amploFoco50 = await getElementMetrics(shellSelectors);
  await saveScreenshot(page, 'transition_shell_amplo_to_foco_50pct.png');
  console.log('   [~50% Reorganização]:', {
    sidebarWidth: amploFoco50['#main-sidebar']?.width,
    contentPaddingLeft: await page.evaluate(() => getComputedStyle(document.getElementById('content-layout')).paddingLeft),
    islandCenter: amploFoco50['#island-capsule']?.x + (amploFoco50['#island-capsule']?.width || 0) / 2,
  });

  // Capturar 100% Foco (estabelecido em ~360ms)
  await wait(280);
  const amploFoco100 = await getElementMetrics(shellSelectors);
  await saveScreenshot(page, 'transition_shell_amplo_to_foco_100pct.png');
  console.log('   [100% Foco Estabilizado]:', {
    sidebarWidth: amploFoco100['#main-sidebar']?.width,
    contentPaddingLeft: await page.evaluate(() => getComputedStyle(document.getElementById('content-layout')).paddingLeft),
    islandCenter: amploFoco100['#island-capsule']?.x + (amploFoco100['#island-capsule']?.width || 0) / 2,
  });

  // Restaurar Amplo
  await page.evaluate(() => {
    document.getElementById('btn-lab-mode-amplo')?.click();
  });
  await wait(420);

  // =========================================================================
  // MATRIZ: MOBILE ISLAND REAL NO SHELL (390x844)
  // =========================================================================
  console.log('\n--> Testando Mobile Viewport (390x844) no Shell Real...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await wait(600);

  count++;
  await saveScreenshot(page, 'mobile_island_minimal.png');
  console.log(`[${count}] ✓ Capturado: mobile_island_minimal.png (Mobile Island Repouso no Shell)`);

  count++;
  await page.evaluate(() => {
    const mobileIsland = document.getElementById('mobile-dynamic-island');
    mobileIsland?.click();
  });
  await wait(350); // 220ms expansion transition
  await saveScreenshot(page, 'mobile_island_expanded.png');
  console.log(`[${count}] ✓ Capturado: mobile_island_expanded.png (Mobile Island Expandido)`);

  // =========================================================================
  // MATRIZ: PREFERS-REDUCED-MOTION
  // =========================================================================
  console.log('\n--> Testando Prefers-Reduced-Motion...');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto('http://localhost:3000/dev/motion-lab', { waitUntil: 'networkidle0' });
  await wait(500);

  count++;
  await saveScreenshot(page, 'reduced_motion_proof.png');
  console.log(`[${count}] ✓ Capturado: reduced_motion_proof.png (Reduced Motion Ativo)`);

  // =========================================================================
  // ASSERÇÕES PROGRAMÁTICAS
  // =========================================================================
  console.log('\n=== EXECUTANDO MOTION & TOKEN ASSERTIONS PROGRAMÁTICAS ===');

  // Asserção 1: Tokens canônicos presentes
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

  const tokensValid =
    motionTokens.durationMicro === '100ms' &&
    motionTokens.durationIsland === '220ms' &&
    motionTokens.durationLayout === '340ms' &&
    motionTokens.durationTheme === '380ms' &&
    motionTokens.durationMobile === '220ms';
  console.log('Asserção Tokens de Duração (100/220/340/380/220ms):', tokensValid ? 'PASSED ✓' : 'FAILED ✗');

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

  // Asserção 4: Dark Mode Token Check e Border-Border/70
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await wait(400);
  await setTheme('dark');
  await wait(450);

  const darkTokenCheck = await page.evaluate(() => {
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const island = document.getElementById('island-capsule');
    const islandBorder = island ? getComputedStyle(island).borderColor : '';

    // Dark border token: #243128 => rgb(36, 49, 40)
    // Com alpha 0.70 => rgba(36, 49, 40, 0.7)
    const isDarkBg = bodyBg.includes('17, 22, 20') || bodyBg.includes('#111614');
    const isDarkBorderCorrect = islandBorder.includes('36, 49, 40') || islandBorder.includes('36 49 40');
    const isBrokenFallback = islandBorder.includes('229, 231, 235') || islandBorder.includes('229,231,235');

    return {
      bodyBg,
      islandBorder,
      isDarkBg,
      isDarkBorderCorrect,
      isBrokenFallback,
    };
  });
  console.log('Asserção Dark Mode Background (#111614):', darkTokenCheck.isDarkBg ? 'PASSED ✓' : 'FAILED ✗', `(${darkTokenCheck.bodyBg})`);
  console.log('Asserção Dark Mode border-border/70 (deriva de rgb(36, 49, 40)):', darkTokenCheck.isDarkBorderCorrect && !darkTokenCheck.isBrokenFallback ? 'PASSED ✓' : 'FAILED ✗', `(${darkTokenCheck.islandBorder})`);

  // Asserção 5: Mobile Island pertencendo ao Shell e ausente da Home como showcase
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await wait(400);

  const mobileIntegrationCheck = await page.evaluate(() => {
    // 1. Mobile Island dentro de ShellLayout
    const shellWrapper = document.getElementById('mobile-island-wrapper');
    const mobileIsland = document.getElementById('mobile-dynamic-island');
    const isInsideShell = shellWrapper && shellWrapper.contains(mobileIsland);

    // 2. Não existe showcase na Home (não deve haver mais de 1 mobile island no DOM)
    const allMobileIslands = document.querySelectorAll('#mobile-dynamic-island');
    const hasOnlyOne = allMobileIslands.length === 1;

    // 3. Dynamic Island desktop oculto em mobile
    const desktopIslandContainer = document.querySelector('.justify-self-center.hidden.md\\:flex');
    const isDesktopHidden = desktopIslandContainer ? getComputedStyle(desktopIslandContainer).display === 'none' : true;

    return {
      isInsideShell,
      hasOnlyOne,
      isDesktopHidden,
    };
  });
  console.log('Asserção MobileIsland integrado ao ShellLayout:', mobileIntegrationCheck.isInsideShell ? 'PASSED ✓' : 'FAILED ✗');
  console.log('Asserção Ausência de showcase duplicado na Home:', mobileIntegrationCheck.hasOnlyOne ? 'PASSED ✓' : 'FAILED ✗');
  console.log('Asserção Desktop DynamicIsland oculto em mobile:', mobileIntegrationCheck.isDesktopHidden ? 'PASSED ✓' : 'FAILED ✗');

  // Asserção 6: Centralização Matemática do Island no Header Amplo
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await wait(400);
  await setTheme('light');
  await setMode('amplo');
  await wait(350);

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

  // Asserção 7: Estados pulsantes finitos (Attention termina após 1.2s sem loop contínuo)
  await page.goto('http://localhost:3000/dev/motion-lab', { waitUntil: 'networkidle0' });
  await wait(300);
  await page.evaluate(() => {
    document.querySelector('button[data-state="attention"]')?.click();
  });
  await wait(1400); // 1.2s animation duration
  const attentionTerminated = await page.evaluate(() => {
    const el = document.getElementById('island-capsule');
    if (!el) return false;
    const style = getComputedStyle(el);
    return style.animationIterationCount === '1' && style.animationFillMode.includes('forwards');
  });
  console.log('Asserção Attention Pulsante Finito (termina em 1.2s sem loop infinito):', attentionTerminated ? 'PASSED ✓' : 'FAILED ✗');

  await browser.close();

  console.log('\n=== RELATÓRIO DO BROWSER QA ===');
  console.log('Total Screenshots Geradas:', count);
  console.log('Total Erros de Console:', consoleErrors.length);
  console.log('Total Warnings:', consoleWarnings.length);
  console.log('Overflow horizontal inexistente:', !hasHorizontalOverflow);
  console.log('Dark Mode border-border/70 corrigido:', darkTokenCheck.isDarkBorderCorrect);
  console.log('MobileIsland integrado ao Shell:', mobileIntegrationCheck.isInsideShell && mobileIntegrationCheck.hasOnlyOne);
}

runFullQA().catch((err) => {
  console.error('Erro na execução do QA:', err);
  process.exit(1);
});
