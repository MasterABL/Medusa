const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

function resolveBrowserPath() {
  if (process.env.MEDUSA_BROWSER_PATH && fs.existsSync(process.env.MEDUSA_BROWSER_PATH)) {
    return process.env.MEDUSA_BROWSER_PATH;
  }
  const candidatePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Nenhum navegador encontrado.');
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runHardeningValidation() {
  console.log('=== TESTE DE HARDENING: CONTEXT PANEL REFLOW, PERSISTÊNCIA & TEMA CLARO ===');
  const browser = await puppeteer.launch({
    executablePath: resolveBrowserPath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Carregar página inicial em tema claro
  console.log('\n--> 1. Carregando http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await wait(500);

  // 2. Validação do Tema Claro: degraus e ausência de #FFFFFF
  console.log('\n--> 2. Validando Escala de Elevação do Tema Claro...');
  const themeColors = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      bg: style.getPropertyValue('--color-bg').trim(),
      bgRgb: style.getPropertyValue('--color-bg-rgb').trim(),
      surface: style.getPropertyValue('--color-surface').trim(),
      surfaceRgb: style.getPropertyValue('--color-surface-rgb').trim(),
      surfaceElevated: style.getPropertyValue('--color-surface-elevated').trim(),
      surfaceElevatedRgb: style.getPropertyValue('--color-surface-elevated-rgb').trim(),
      border: style.getPropertyValue('--color-border').trim(),
      textPrimary: style.getPropertyValue('--color-text-primary').trim(),
    };
  });
  console.log('Tokens do Tema Claro:', themeColors);

  const bgNotSurface = themeColors.bg !== themeColors.surface;
  const surfaceNotElevated = themeColors.surface !== themeColors.surfaceElevated;
  const elevatedNotPureWhite = themeColors.surfaceElevated.toLowerCase() !== '#ffffff' && themeColors.surfaceElevatedRgb !== '255 255 255';
  const surfaceNotPureWhite = themeColors.surface.toLowerCase() !== '#ffffff' && themeColors.surfaceRgb !== '255 255 255';
  const textNotPureBlack = themeColors.textPrimary.toLowerCase() !== '#000000' && themeColors.textPrimary !== 'rgb(0, 0, 0)';

  console.log('Asserção bg !== surface:', bgNotSurface ? 'PASSED ✓' : 'FAILED ✗');
  console.log('Asserção surface !== surface-elevated:', surfaceNotElevated ? 'PASSED ✓' : 'FAILED ✗');
  console.log('Asserção surface-elevated !== #FFFFFF:', elevatedNotPureWhite ? 'PASSED ✓' : 'FAILED ✗');
  console.log('Asserção surface !== #FFFFFF:', surfaceNotPureWhite ? 'PASSED ✓' : 'FAILED ✗');
  console.log('Asserção text-primary !== #000000:', textNotPureBlack ? 'PASSED ✓' : 'FAILED ✗');

  // 3. Validação do Refluxo do Layout Desktop Amplo (Aberto -> Fechado -> Aberto)
  console.log('\n--> 3. Validando Refluxo do Main Layout no Desktop Amplo...');
  const stateAmploOpen = await page.evaluate(() => {
    const layout = document.getElementById('content-layout');
    const header = document.getElementById('top-header');
    const panel = document.getElementById('context-panel');
    const reopen = document.getElementById('btn-reopen-context');
    return {
      paddingRight: getComputedStyle(layout).paddingRight,
      headerRight: getComputedStyle(header).right,
      panelWidth: panel ? getComputedStyle(panel).width : null,
      panelAriaHidden: panel ? panel.getAttribute('aria-hidden') : null,
      hasReopenBtn: Boolean(reopen),
    };
  });
  console.log('Estado Aberto Amplo:', stateAmploOpen);

  // Fechar o Context Panel via botão fechar
  console.log('--> Fechando Context Panel...');
  await page.evaluate(() => {
    document.getElementById('btn-close-context')?.click();
  });
  await wait(450); // layout transition

  const stateAmploClosed = await page.evaluate(() => {
    const layout = document.getElementById('content-layout');
    const header = document.getElementById('top-header');
    const panel = document.getElementById('context-panel');
    const reopen = document.getElementById('btn-reopen-context');
    return {
      paddingRight: getComputedStyle(layout).paddingRight,
      headerRight: getComputedStyle(header).right,
      panelWidth: panel ? getComputedStyle(panel).width : null,
      panelAriaHidden: panel ? panel.getAttribute('aria-hidden') : null,
      hasReopenBtn: Boolean(reopen),
    };
  });
  console.log('Estado Fechado Amplo:', stateAmploClosed);

  const reflowClosedCorrect =
    stateAmploClosed.paddingRight === '0px' &&
    stateAmploClosed.headerRight === '0px' &&
    stateAmploClosed.panelWidth === '0px' &&
    stateAmploClosed.panelAriaHidden === 'true' &&
    stateAmploClosed.hasReopenBtn === true;

  console.log('Asserção Refluxo Fechado (Main ocupa espaço liberado, painel 0px):', reflowClosedCorrect ? 'PASSED ✓' : 'FAILED ✗');

  // 4. Teste de Persistência após Reload
  console.log('\n--> 4. Testando Persistência após Reload (deve continuar fechado)...');
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(500);

  const stateAfterReloadClosed = await page.evaluate(() => {
    const layout = document.getElementById('content-layout');
    const panel = document.getElementById('context-panel');
    const reopen = document.getElementById('btn-reopen-context');
    return {
      paddingRight: getComputedStyle(layout).paddingRight,
      panelWidth: panel ? getComputedStyle(panel).width : null,
      hasReopenBtn: Boolean(reopen),
      storageVal: localStorage.getItem('medusa-context-panel-open'),
    };
  });
  console.log('Estado pós-reload (esperado fechado):', stateAfterReloadClosed);
  const persistenceClosedCorrect =
    stateAfterReloadClosed.paddingRight === '0px' &&
    stateAfterReloadClosed.panelWidth === '0px' &&
    stateAfterReloadClosed.hasReopenBtn === true &&
    stateAfterReloadClosed.storageVal === 'false';
  console.log('Asserção Persistência Fechado após Reload:', persistenceClosedCorrect ? 'PASSED ✓' : 'FAILED ✗');

  // 5. Reabrir via botão flutuante discreto
  console.log('\n--> 5. Reabrindo Context Panel via botão discreto #btn-reopen-context...');
  await page.evaluate(() => {
    document.getElementById('btn-reopen-context')?.click();
  });
  await wait(450);

  const stateReopened = await page.evaluate(() => {
    const layout = document.getElementById('content-layout');
    const panel = document.getElementById('context-panel');
    const reopen = document.getElementById('btn-reopen-context');
    return {
      paddingRight: getComputedStyle(layout).paddingRight,
      panelWidth: panel ? getComputedStyle(panel).width : null,
      hasReopenBtn: Boolean(reopen),
      storageVal: localStorage.getItem('medusa-context-panel-open'),
    };
  });
  console.log('Estado Reaberto:', stateReopened);
  const reopenCorrect =
    stateReopened.paddingRight === '320px' &&
    stateReopened.panelWidth === '320px' &&
    stateReopened.hasReopenBtn === false &&
    stateReopened.storageVal === 'true';
  console.log('Asserção Reabertura (Main reflui para 320px, painel reabre, botão flutuante oculto):', reopenCorrect ? 'PASSED ✓' : 'FAILED ✗');

  // 6. Teste de Persistência Aberto após Reload
  console.log('\n--> 6. Testando Persistência após Reload (deve continuar aberto)...');
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(500);

  const stateAfterReloadOpen = await page.evaluate(() => {
    const layout = document.getElementById('content-layout');
    const panel = document.getElementById('context-panel');
    return {
      paddingRight: getComputedStyle(layout).paddingRight,
      panelWidth: panel ? getComputedStyle(panel).width : null,
      storageVal: localStorage.getItem('medusa-context-panel-open'),
    };
  });
  console.log('Estado pós-reload (esperado aberto):', stateAfterReloadOpen);
  const persistenceOpenCorrect =
    stateAfterReloadOpen.paddingRight === '320px' &&
    stateAfterReloadOpen.panelWidth === '320px' &&
    stateAfterReloadOpen.storageVal === 'true';
  console.log('Asserção Persistência Aberto após Reload:', persistenceOpenCorrect ? 'PASSED ✓' : 'FAILED ✗');

  // 7. Teste Modo Compacto (260px)
  console.log('\n--> 7. Testando Modo Compacto (transição para 260px)...');
  await page.evaluate(() => {
    document.getElementById('btn-shell-mode-dropdown')?.click();
  });
  await wait(200);
  await page.evaluate(() => {
    document.getElementById('view-desktop-compact')?.click();
  });
  await wait(450);

  const stateCompacto = await page.evaluate(() => {
    const layout = document.getElementById('content-layout');
    const header = document.getElementById('top-header');
    const panel = document.getElementById('context-panel');
    return {
      paddingRight: getComputedStyle(layout).paddingRight,
      headerRight: getComputedStyle(header).right,
      panelWidth: panel ? getComputedStyle(panel).width : null,
    };
  });
  console.log('Estado Compacto Aberto:', stateCompacto);
  const compactoCorrect =
    stateCompacto.paddingRight === '260px' &&
    stateCompacto.headerRight === '260px' &&
    stateCompacto.panelWidth === '260px';
  console.log('Asserção Modo Compacto (geometria 260px unificada):', compactoCorrect ? 'PASSED ✓' : 'FAILED ✗');

  // 8. Teste Modo Foco (0px, painel ausente, sem botão de reabertura)
  console.log('\n--> 8. Testando Modo Foco...');
  await page.evaluate(() => {
    document.getElementById('btn-shell-mode-dropdown')?.click();
  });
  await wait(200);
  await page.evaluate(() => {
    document.getElementById('view-foco')?.click();
  });
  await wait(450);

  const stateFoco = await page.evaluate(() => {
    const layout = document.getElementById('content-layout');
    const panel = document.getElementById('context-panel');
    const reopen = document.getElementById('btn-reopen-context');
    return {
      paddingRight: getComputedStyle(layout).paddingRight,
      paddingLeft: getComputedStyle(layout).paddingLeft,
      panelWidth: panel ? getComputedStyle(panel).width : null,
      panelAriaHidden: panel ? panel.getAttribute('aria-hidden') : null,
      hasReopenBtn: Boolean(reopen),
    };
  });
  console.log('Estado Modo Foco:', stateFoco);
  const focoCorrect =
    stateFoco.paddingRight === '0px' &&
    stateFoco.paddingLeft === '0px' &&
    stateFoco.panelWidth === '0px' &&
    stateFoco.panelAriaHidden === 'true' &&
    stateFoco.hasReopenBtn === false;
  console.log('Asserção Modo Foco (Zero painel, zero botão flutuante, Main 100% livre):', focoCorrect ? 'PASSED ✓' : 'FAILED ✗');

  // 9. Teste Tablet & Mobile
  console.log('\n--> 9. Testando Tablet (820px) e Mobile (390px)...');
  await page.setViewport({ width: 820, height: 1180 });
  await wait(300);
  const tabletCheck = await page.evaluate(() => {
    const panel = document.getElementById('context-panel');
    const reopen = document.getElementById('btn-reopen-context');
    return {
      hasPanel: Boolean(panel),
      hasReopen: Boolean(reopen),
      scrollWidth: document.body.scrollWidth,
      innerWidth: window.innerWidth,
    };
  });
  console.log('Tablet Check:', tabletCheck);
  const tabletCorrect = !tabletCheck.hasPanel && !tabletCheck.hasReopen && tabletCheck.scrollWidth <= tabletCheck.innerWidth;
  console.log('Asserção Tablet (painel e botão fora do DOM, zero overflow):', tabletCorrect ? 'PASSED ✓' : 'FAILED ✗');

  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await wait(300);
  const mobileCheck = await page.evaluate(() => {
    const panel = document.getElementById('context-panel');
    const reopen = document.getElementById('btn-reopen-context');
    return {
      hasPanel: Boolean(panel),
      hasReopen: Boolean(reopen),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  });
  console.log('Mobile Check:', mobileCheck);
  const mobileCorrect = !mobileCheck.hasPanel && !mobileCheck.hasReopen && mobileCheck.scrollWidth <= mobileCheck.innerWidth;
  console.log('Asserção Mobile (painel e botão fora do DOM, zero overflow):', mobileCorrect ? 'PASSED ✓' : 'FAILED ✗');

  await browser.close();

  const allPassed =
    bgNotSurface &&
    surfaceNotElevated &&
    elevatedNotPureWhite &&
    surfaceNotPureWhite &&
    textNotPureBlack &&
    reflowClosedCorrect &&
    persistenceClosedCorrect &&
    reopenCorrect &&
    persistenceOpenCorrect &&
    compactoCorrect &&
    focoCorrect &&
    tabletCorrect &&
    mobileCorrect;

  console.log('\n==========================================');
  console.log('RESULTADO GERAL DO HARDENING VALIDATION:', allPassed ? 'PROVADO 100% ✓' : 'FALHOU ✗');
  console.log('==========================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runHardeningValidation().catch((err) => {
  console.error('Erro na execução do teste:', err);
  process.exit(1);
});
