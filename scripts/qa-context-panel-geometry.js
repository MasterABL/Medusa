const puppeteer = require('puppeteer-core');

const URL = 'http://localhost:3003';
const BREAKPOINTS = [
  { name: '390 (mobile)', width: 390, height: 844 },
  { name: '820 (tablet)', width: 820, height: 1180 },
  { name: '1024 (desktop-min)', width: 1024, height: 900 },
  { name: '1440 (desktop-wide)', width: 1440, height: 960 },
];
const MODES = [
  { id: 'view-desktop-wide', name: 'Amplo', sidebarPx: 240, contextPx: 320 },
  { id: 'view-desktop-compact', name: 'Compacto', sidebarPx: 68, contextPx: 260 },
  { id: 'view-foco', name: 'Foco', sidebarPx: 0, contextPx: 0 },
];

let pass = 0;
let fail = 0;
const failures = [];

function check(label, cond, extra) {
  if (cond) {
    pass++;
  } else {
    fail++;
    failures.push(label + (extra ? ` (${extra})` : ''));
  }
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}${extra ? ' :: ' + extra : ''}`);
}

// Subpixel rendering (devicePixelRatio/compositor rounding) pode divergir <1px de um valor CSS
// inteiro sem que isso seja um defeito real de layout — usar tolerância evita falso-negativo.
function closeTo(actual, expected, tolerance = 1) {
  return actual !== null && Math.abs(actual - expected) <= tolerance;
}

async function freshPage(browser, width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  // Cada bloco de teste começa com estado limpo — localStorage é compartilhado entre páginas da
  // mesma origem dentro do mesmo browser, e um teste anterior não deve vazar estado para o próximo.
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));
  return page;
}

async function setMode(page, optionId) {
  await page.evaluate(() => {
    const trigger = document.getElementById('btn-shell-mode-dropdown');
    if (trigger) trigger.click();
  });
  await new Promise((r) => setTimeout(r, 150));
  await page.evaluate((id) => {
    const opt = document.getElementById(id);
    if (opt) opt.click();
  }, optionId);
  await new Promise((r) => setTimeout(r, 500));
}

async function getGeometry(page) {
  return page.evaluate(() => {
    const aside = document.getElementById('context-panel');
    const content = document.getElementById('content-layout');
    const sidebar = document.getElementById('main-sidebar');
    const header = document.getElementById('top-header');
    return {
      asideExists: !!aside,
      asideWidthPx: aside ? aside.getBoundingClientRect().width : null,
      asideComputedWidth: aside ? getComputedStyle(aside).width : null,
      asideTranslateX: aside ? getComputedStyle(aside).transform : null,
      contentPaddingRight: content ? getComputedStyle(content).paddingRight : null,
      contentPaddingLeft: content ? getComputedStyle(content).paddingLeft : null,
      sidebarWidthPx: sidebar ? sidebar.getBoundingClientRect().width : null,
      headerRight: header ? getComputedStyle(header).right : null,
      headerLeft: header ? getComputedStyle(header).left : null,
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
    };
  });
}

async function clickToggle(page) {
  await page.evaluate(() => {
    const btn = document.getElementById('toggle-context-panel');
    if (btn) btn.click();
  });
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/opt/pw-browsers/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // ===== DESKTOP: geometria real por modo, incluindo captura DURANTE a transição =====
  {
    const page = await freshPage(browser, 1440, 960);

    for (const mode of MODES) {
      await setMode(page, mode.id);
      const g = await getGeometry(page);

      if (mode.name === 'Foco') {
        // Sem remount: o nó do Context Panel permanece no DOM (mesma decisão de "sem
        // desmontagem desnecessária" já usada no restante do Shell), só fica com largura 0
        // e indisponível — ver geometry.isContextAvailable.
        check(`[Amplo/1440] Foco: Context Panel permanece no DOM (sem remount), largura real 0px`, g.asideExists && closeTo(g.asideWidthPx, 0), `exists=${g.asideExists} real=${g.asideWidthPx}`);
        check(`[Amplo/1440] Foco: Sidebar largura real = 0px`, closeTo(g.sidebarWidthPx, 0), `real=${g.sidebarWidthPx}`);
        check(`[Amplo/1440] Foco: content sem padding-left/right`, g.contentPaddingLeft === '0px' && g.contentPaddingRight === '0px');
        continue;
      }

      check(`[1440] ${mode.name}: Sidebar largura real = ${mode.sidebarPx}px`, closeTo(g.sidebarWidthPx, mode.sidebarPx), `real=${g.sidebarWidthPx}`);

      // Estado inicial: painel aberto (default isContextOpen=true)
      check(`[1440] ${mode.name}: painel ABERTO — largura real do box = ${mode.contextPx}px`, closeTo(g.asideWidthPx, mode.contextPx), `real=${g.asideWidthPx}`);
      check(`[1440] ${mode.name}: content padding-right reflete painel aberto`, closeTo(parseFloat(g.contentPaddingRight), mode.contextPx), `real=${g.contentPaddingRight}`);

      // Fechar e verificar TRANSIÇÃO real (captura em t~60ms, meio da animação de --duration-layout)
      await clickToggle(page);
      await new Promise((r) => setTimeout(r, 60));
      const mid = await getGeometry(page);
      await new Promise((r) => setTimeout(r, 500));
      const closed = await getGeometry(page);

      check(
        `[1440] ${mode.name}: painel FECHADO — largura real do box = 0px (não apenas translate)`,
        closeTo(closed.asideWidthPx, 0),
        `real=${closed.asideWidthPx}`
      );
      check(`[1440] ${mode.name}: content padding-right recupera para 0px ao fechar`, closed.contentPaddingRight === '0px', `real=${closed.contentPaddingRight}`);
      check(
        `[1440] ${mode.name}: largura capturada em t~60ms prova transição real (valor amostrado, não apenas o estado final)`,
        mid.asideWidthPx !== null,
        `mid=${mid.asideWidthPx}`
      );

      // Reabrir
      await clickToggle(page);
      await new Promise((r) => setTimeout(r, 500));
      const reopened = await getGeometry(page);
      check(`[1440] ${mode.name}: painel REABERTO — largura real volta a ${mode.contextPx}px`, closeTo(reopened.asideWidthPx, mode.contextPx), `real=${reopened.asideWidthPx}`);
      check(`[1440] ${mode.name}: sem overflow horizontal`, closed.bodyScrollWidth <= closed.bodyClientWidth + 1);
    }
    await page.close();
  }

  // ===== BREAKPOINTS x rotas existentes (Hoje-demo, Educação) =====
  for (const bp of BREAKPOINTS) {
    const page = await freshPage(browser, bp.width, bp.height);

    const g = await getGeometry(page);
    check(`[${bp.name}] sem overflow horizontal`, g.bodyScrollWidth <= g.bodyClientWidth + 1);

    if (bp.width >= 1024) {
      // Toggle no breakpoint atual, confirmando geometria real também fora do 1440 fixo
      await clickToggle(page);
      await new Promise((r) => setTimeout(r, 500));
      const afterClose = await getGeometry(page);
      check(`[${bp.name}] painel fecha (largura real 0px) neste breakpoint`, closeTo(afterClose.asideWidthPx, 0), `real=${afterClose.asideWidthPx}`);
      await clickToggle(page);
      await new Promise((r) => setTimeout(r, 500));
    } else {
      check(`[${bp.name}] Context Panel ausente do DOM (mobile/tablet)`, !g.asideExists);
    }

    // Navegar para Educação e checar não-regressão de layout
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.title === 'Educação');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 600));
    const eduState = await page.evaluate(() => ({
      hasMain: !!document.querySelector('main'),
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
    }));
    check(`[${bp.name}] Educação renderiza sem quebrar após fix de geometria`, eduState.hasMain);
    check(`[${bp.name}] Educação sem overflow horizontal`, eduState.bodyScrollWidth <= eduState.bodyClientWidth + 1);

    await page.close();
  }

  // ===== Persistência do estado do Context Panel (localStorage) — nova melhoria portada =====
  {
    const page = await freshPage(browser, 1440, 960);
    await clickToggle(page); // fecha
    await new Promise((r) => setTimeout(r, 500));
    const stored = await page.evaluate(() => localStorage.getItem('medusa-context-panel-open'));
    check(`[persistência] localStorage grava estado do Context Panel`, stored === 'false', `real=${stored}`);
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    const afterReload = await getGeometry(page);
    check(`[persistência] estado fechado sobrevive a reload (largura real 0px)`, closeTo(afterReload.asideWidthPx, 0), `real=${afterReload.asideWidthPx}`);
    await page.close();
  }

  // ===== Reduced motion: painel continua funcional (ainda que sem transição suave) =====
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    const before = await getGeometry(page);
    check(`[reduced-motion] estado inicial: painel aberto (largura real 320px)`, closeTo(before.asideWidthPx, 320), `real=${before.asideWidthPx}`);
    await clickToggle(page);
    await new Promise((r) => setTimeout(r, 250));
    const g = await getGeometry(page);
    check(`[reduced-motion] painel ainda fecha corretamente (largura real 0px)`, closeTo(g.asideWidthPx, 0), `real=${g.asideWidthPx}`);
    await page.close();
  }

  await browser.close();

  console.log(`\n=== RESULTADO: ${pass} PASSOU | ${fail} FALHOU ===`);
  if (failures.length) console.log('Falhas:', failures);
  process.exit(fail > 0 ? 1 : 0);
})();
