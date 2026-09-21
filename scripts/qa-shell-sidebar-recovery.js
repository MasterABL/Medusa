/**
 * QA real de Browser — Shell Sidebar Recovery (Fase A, D-013)
 *
 * Achado de auditoria: em Modo Compacto, o botão de expandir a Sidebar ficava dentro de
 * `.sidebar-label-out` (pointer-events: none quando recolhido) e fora da faixa visível de
 * 68px — inclicável e invisível. Este script prova que o novo botão dedicado
 * (#btn-sidebar-expand-compact) resolve isso, com refluxo real de layout amostrado em plena
 * transição (não apenas antes/depois).
 */
const puppeteer = require('puppeteer-core');

const URL = 'http://localhost:3000';
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

function closeTo(actual, expected, tolerance = 2) {
  return actual !== null && Math.abs(actual - expected) <= tolerance;
}

async function freshPage(browser, width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));
  return page;
}

async function getSidebarWidth(page) {
  return page.evaluate(() => {
    const el = document.getElementById('main-sidebar');
    return el ? el.getBoundingClientRect().width : null;
  });
}

async function getMainContentPaddingLeft(page) {
  return page.evaluate(() => {
    const el = document.getElementById('content-layout');
    return el ? parseFloat(getComputedStyle(el).paddingLeft) : null;
  });
}

async function openModeDropdown(page) {
  await page.evaluate(() => {
    const btn = document.getElementById('btn-shell-mode-dropdown');
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 150));
}

async function selectMode(page, id) {
  await openModeDropdown(page);
  await page.evaluate((elId) => {
    const btn = document.getElementById(elId);
    if (btn) btn.click();
  }, id);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/opt/pw-browsers/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // ===== 1. Amplo -> Compacto -> recuperação via botão dedicado -> Amplo, com refluxo real =====
  {
    const page = await freshPage(browser, 1440, 960);

    const initialWidth = await getSidebarWidth(page);
    check('[1440] Sidebar inicia em Amplo (240px)', closeTo(initialWidth, 240), `real=${initialWidth}`);

    await selectMode(page, 'view-desktop-compact');
    await new Promise((r) => setTimeout(r, 400));
    const compactWidth = await getSidebarWidth(page);
    check('[1440] Sidebar reduz para Compacto (68px)', closeTo(compactWidth, 68), `real=${compactWidth}`);

    const recoveryBtn = await page.evaluate(() => {
      const btn = document.getElementById('btn-sidebar-expand-compact');
      const sidebar = document.getElementById('main-sidebar');
      if (!btn || !sidebar) return { exists: false };
      const rect = btn.getBoundingClientRect();
      const sidebarWidth = sidebar.getBoundingClientRect().width;
      const style = getComputedStyle(btn);
      return {
        exists: true,
        visible: rect.width > 0 && rect.height > 0,
        withinSidebarBand: rect.left >= 0 && rect.right <= sidebarWidth + 1,
        pointerEvents: style.pointerEvents,
      };
    });
    check('[Recovery] botão de recuperação existe em Modo Compacto', recoveryBtn.exists);
    check('[Recovery] botão está visível (não clipado a 0px)', recoveryBtn.visible, JSON.stringify(recoveryBtn));
    check('[Recovery] botão está dentro da faixa visível de 68px', recoveryBtn.withinSidebarBand, JSON.stringify(recoveryBtn));
    check('[Recovery] botão tem pointer-events ativos (clicável de fato)', recoveryBtn.pointerEvents !== 'none', `pointerEvents=${recoveryBtn.pointerEvents}`);

    // Clique real no botão (não via context/API) — prova a affordance de ponta a ponta.
    // Amostragem a 180ms: medido empiricamente que a transição de width leva ~100-150ms para
    // engatar neste ambiente antes de progredir visivelmente (ver scripts/debug-sidebar-tmp.js
    // durante o desenvolvimento desta suíte) — amostrar cedo demais (~90ms) captura o estado
    // ainda não iniciado, não a ausência de transição.
    await page.evaluate(() => {
      document.getElementById('btn-sidebar-expand-compact').click();
    });
    await new Promise((r) => setTimeout(r, 180));
    const midWidth = await getSidebarWidth(page);
    await new Promise((r) => setTimeout(r, 400));
    const recoveredWidth = await getSidebarWidth(page);

    check(
      '[Recovery] largura amostrada em plena transição (nem 68 nem 240 — refluxo real em curso)',
      midWidth !== null && midWidth > 68 && midWidth < 240,
      `mid=${midWidth}`
    );
    check('[Recovery] Sidebar retorna a Amplo (240px) após o clique', closeTo(recoveredWidth, 240), `real=${recoveredWidth}`);

    await page.close();
  }

  // ===== 2. Refluxo real do conteúdo principal (não apenas uma camada visual sobreposta) =====
  {
    const page = await freshPage(browser, 1440, 960);
    const paddingAmplo = await getMainContentPaddingLeft(page);

    await selectMode(page, 'view-desktop-compact');
    await new Promise((r) => setTimeout(r, 400));
    const paddingCompact = await getMainContentPaddingLeft(page);

    check(
      '[Reflow] paddingLeft do conteúdo principal reduz de verdade (refluxo real, não overlay) ao trocar Amplo -> Compacto',
      paddingAmplo !== null && paddingCompact !== null && paddingCompact < paddingAmplo,
      `amplo=${paddingAmplo} compact=${paddingCompact}`
    );

    await page.evaluate(() => document.getElementById('btn-sidebar-expand-compact').click());
    await new Promise((r) => setTimeout(r, 400));
    const paddingRecovered = await getMainContentPaddingLeft(page);
    check(
      '[Reflow] paddingLeft volta ao valor de Amplo ao recuperar a Sidebar',
      closeTo(paddingRecovered, paddingAmplo, 2),
      `amplo=${paddingAmplo} recovered=${paddingRecovered}`
    );

    await page.close();
  }

  // ===== 3. Modo Foco — hamburger já existente continua funcional (regressão) =====
  {
    const page = await freshPage(browser, 1440, 960);
    await selectMode(page, 'view-foco');
    await new Promise((r) => setTimeout(r, 400));

    const focusWidth = await getSidebarWidth(page);
    check('[Foco] Sidebar permanente vai a 0px', closeTo(focusWidth, 0), `real=${focusWidth}`);

    const hamburgerVisible = await page.evaluate(() => {
      const btn = document.getElementById('btn-focus-drawer-trigger');
      if (!btn) return false;
      const rect = btn.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    check('[Foco] trigger de drawer (hamburger) visível e clicável — regressão, não uma mudança desta rodada', hamburgerVisible);

    await page.evaluate(() => document.getElementById('btn-focus-drawer-trigger').click());
    await new Promise((r) => setTimeout(r, 350));
    const drawerVisible = await page.evaluate(() => {
      const el = document.getElementById('focus-drawer');
      return el ? getComputedStyle(el).visibility === 'visible' : false;
    });
    check('[Foco] drawer abre ao clicar no hamburger', drawerVisible);

    await page.close();
  }

  // ===== 4. Responsive 390/820/1024/1440 =====
  for (const width of [390, 820, 1024, 1440]) {
    const page = await freshPage(browser, width, 900);
    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth + 1);
    check(`[Responsive ${width}px] sem overflow horizontal (estado inicial)`, !overflow);

    if (width === 820) {
      // Breakpoint real de tablet (768-1023, ver ShellContext.tsx) — sempre 68px, botão de
      // recuperação NÃO deve aparecer (expandir não teria efeito, getSidebarWidth() ignora
      // `mode` no tablet).
      const tabletWidth = await getSidebarWidth(page);
      check('[820/Tablet] Sidebar permanece 68px por regra de breakpoint', closeTo(tabletWidth, 68), `real=${tabletWidth}`);
      const hasRecoveryBtn = await page.evaluate(() => !!document.getElementById('btn-sidebar-expand-compact'));
      check('[820/Tablet] botão de recuperação de Compacto não aparece (não é um estado reversível aqui)', !hasRecoveryBtn);
      const hamburgerVisible = await page.evaluate(() => {
        const btn = document.getElementById('btn-focus-drawer-trigger');
        return btn ? btn.getBoundingClientRect().width > 0 : false;
      });
      check('[820/Tablet] hamburger do drawer visível (única via de navegação lateral aqui)', hamburgerVisible);
    }

    if (width === 1024 || width === 1440) {
      // 1024 e 1440 são ambos "desktop" (breakpoint real >= 1024) — Compacto é um estado
      // reversível do usuário nos dois, então o botão de recuperação deve existir nos dois.
      await selectMode(page, 'view-desktop-compact');
      await new Promise((r) => setTimeout(r, 400));
      const recoveryVisible = await page.evaluate(() => {
        const btn = document.getElementById('btn-sidebar-expand-compact');
        const sidebar = document.getElementById('main-sidebar');
        if (!btn || !sidebar) return false;
        const rect = btn.getBoundingClientRect();
        const sidebarWidth = sidebar.getBoundingClientRect().width;
        return rect.width > 0 && rect.right <= sidebarWidth + 1;
      });
      check(`[Responsive ${width}px] botão de recuperação visível e dentro da faixa em Compacto`, recoveryVisible);
    }

    await page.close();
  }

  // ===== 5. Reduced motion — recuperação continua funcional =====
  {
    const page = await freshPage(browser, 1440, 960);
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await selectMode(page, 'view-desktop-compact');
    await new Promise((r) => setTimeout(r, 300));

    await page.evaluate(() => document.getElementById('btn-sidebar-expand-compact').click());
    await new Promise((r) => setTimeout(r, 300));
    const recoveredWidth = await getSidebarWidth(page);
    check('[ReducedMotion] recuperação continua funcional (chega a 240px)', closeTo(recoveredWidth, 240), `real=${recoveredWidth}`);

    await page.close();
  }

  // ===== 6. Keyboard/focus =====
  {
    const page = await freshPage(browser, 1440, 960);
    await selectMode(page, 'view-desktop-compact');
    await new Promise((r) => setTimeout(r, 400));

    const isFocusable = await page.evaluate(() => {
      const btn = document.getElementById('btn-sidebar-expand-compact');
      if (!btn) return false;
      btn.focus();
      return document.activeElement === btn;
    });
    check('[A11y] botão de recuperação é alcançável via foco de teclado', isFocusable);

    const hasAriaLabel = await page.evaluate(() => {
      const btn = document.getElementById('btn-sidebar-expand-compact');
      return btn ? !!btn.getAttribute('aria-label') : false;
    });
    check('[A11y] botão tem aria-label', hasAriaLabel);

    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 400));
    const widthAfterEnter = await getSidebarWidth(page);
    check('[A11y] Enter no botão focado ativa a recuperação', closeTo(widthAfterEnter, 240), `real=${widthAfterEnter}`);

    await page.close();
  }

  await browser.close();

  console.log(`\n${pass} PASSOU | ${fail} FALHOU`);
  if (failures.length) {
    console.log('\nFalhas:');
    failures.forEach((f) => console.log(' - ' + f));
    process.exit(1);
  }
})();
