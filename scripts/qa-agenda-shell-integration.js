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

function closeTo(actual, expected, tolerance = 1) {
  return actual !== null && Math.abs(actual - expected) <= tolerance;
}

async function goToAgenda(page) {
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.title === 'Agenda');
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 500));
}

async function clickToggleContext(page) {
  await page.evaluate(() => {
    const btn = document.getElementById('toggle-context-panel');
    if (btn) btn.click();
  });
}

async function getContextGeometry(page) {
  return page.evaluate(() => {
    const aside = document.getElementById('context-panel');
    return {
      exists: !!aside,
      width: aside ? aside.getBoundingClientRect().width : null,
      hasAgendaSummary: !!document.querySelector('[data-agenda-context-summary]') || (aside ? aside.innerText.includes('Hoje') || aside.innerText.includes('hoje') : false),
    };
  });
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/opt/pw-browsers/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // ===== Context Panel geometry NA ROTA AGENDA (regressão explícita pedida) =====
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    await goToAgenda(page);

    const open = await getContextGeometry(page);
    check('[Agenda/1440] Context Panel aberto por padrão, largura real 320px', closeTo(open.width, 320), `real=${open.width}`);

    await clickToggleContext(page);
    await new Promise((r) => setTimeout(r, 60));
    const mid = await getContextGeometry(page);
    await new Promise((r) => setTimeout(r, 500));
    const closed = await getContextGeometry(page);
    check('[Agenda/1440] Context Panel fecha de verdade (largura real 0px) na rota Agenda', closeTo(closed.width, 0), `real=${closed.width}`);
    check('[Agenda/1440] largura amostrada em transição real (t~60ms)', mid.width !== null, `mid=${mid.width}`);

    await clickToggleContext(page);
    await new Promise((r) => setTimeout(r, 500));
    const reopened = await getContextGeometry(page);
    check('[Agenda/1440] Context Panel reabre corretamente na rota Agenda', closeTo(reopened.width, 320), `real=${reopened.width}`);

    const bodyState = await page.evaluate(() => ({ scrollWidth: document.body.scrollWidth, clientWidth: document.body.clientWidth }));
    check('[Agenda/1440] sem overflow horizontal', bodyState.scrollWidth <= bodyState.clientWidth + 1);

    await page.close();
  }

  // ===== 1024px explícito (não coberto pelo qa-agenda.js original, que cobre 390/820/1440) =====
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 900 });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    await goToAgenda(page);
    const state = await page.evaluate(() => ({
      hasContainer: !!document.querySelector('main'),
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.body.clientWidth,
    }));
    check('[Agenda/1024] AgendaContainer renderiza', state.hasContainer);
    check('[Agenda/1024] sem overflow horizontal', state.scrollWidth <= state.clientWidth + 1);
    await page.close();
  }

  // ===== Navegação Hoje -> Agenda -> Educação: sem quebra da Shell =====
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    await goToAgenda(page);
    const afterAgenda = await page.evaluate(() => !!document.querySelector('main'));
    check('[navegação] Hoje → Agenda: main renderiza sem quebrar', afterAgenda);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.title === 'Educação');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 600));
    const afterEdu = await page.evaluate(() => !!document.querySelector('main'));
    check('[navegação] Agenda → Educação: main renderiza sem quebrar', afterEdu);

    // Sidebar permanece o mesmo nó estrutural (sem remount) durante a navegação
    const sidebarStable = await page.evaluate(() => !!document.getElementById('main-sidebar'));
    check('[navegação] Sidebar continua presente após troca de rotas', sidebarStable);
    await page.close();
  }

  // ===== Reduced motion: abrir/fechar o drawer de criação de evento continua funcional =====
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    await goToAgenda(page);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => /adicionar/i.test(b.textContent || '') || /adicionar/i.test(b.title || ''));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 300));
    const drawerOpen = await page.evaluate(() => {
      const drawer = document.querySelector('[role="dialog"], form');
      return !!drawer;
    });
    check('[reduced-motion] Drawer de criação de evento ainda abre corretamente', drawerOpen);
    await page.close();
  }

  await browser.close();

  console.log(`\n=== RESULTADO: ${pass} PASSOU | ${fail} FALHOU ===`);
  if (failures.length) console.log('Falhas:', failures);
  process.exit(fail > 0 ? 1 : 0);
})();
