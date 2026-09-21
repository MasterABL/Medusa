const puppeteer = require('puppeteer-core');

const URL = 'http://localhost:3002';
const BREAKPOINTS = [
  { name: '390 (mobile)', width: 390, height: 844 },
  { name: '820 (tablet)', width: 820, height: 1180 },
  { name: '1024 (desktop-min)', width: 1024, height: 900 },
  { name: '1440 (desktop-wide)', width: 1440, height: 960 },
];

let pass = 0;
let fail = 0;
const failures = [];

function check(label, cond) {
  if (cond) {
    pass++;
  } else {
    fail++;
    failures.push(label);
  }
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`);
}

async function clickRoute(page, title) {
  await page.evaluate((t) => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find((b) => b.title === t || b.getAttribute('aria-label') === t);
    if (btn) btn.click();
  }, title);
  await new Promise((r) => setTimeout(r, 400));
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/opt/pw-browsers/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const bp of BREAKPOINTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: bp.width, height: bp.height });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 700)); // deixa passar do skeleton (nowMinutes mount)

    // ---- Hoje (rota default) ----
    const hojeState = await page.evaluate(() => {
      const main = document.querySelector('main');
      const html = main ? main.innerText : '';
      return {
        hasFakeStats: html.includes('14 rpm') || html.includes('0.02%') || html.includes('ALL GATES PROVED'),
        hasLocalStateLabel: html.includes('Armazenado apenas nesta sessão (Local State)'),
        hasAgora: html.toUpperCase().includes('AGORA'),
        hasProximo: html.toUpperCase().includes('PRÓXIMO'),
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
      };
    });
    check(`[${bp.name}] Hoje: sem estatísticas fabricadas`, !hojeState.hasFakeStats);
    check(`[${bp.name}] Hoje: rótulo Local State visível`, hojeState.hasLocalStateLabel);
    check(`[${bp.name}] Hoje: seção Agora presente`, hojeState.hasAgora);
    check(`[${bp.name}] Hoje: seção Próximo presente`, hojeState.hasProximo);
    check(`[${bp.name}] Hoje: sem overflow horizontal`, hojeState.bodyScrollWidth <= hojeState.bodyClientWidth + 1);

    // ---- Rotas pendentes honestas (apenas testado em desktop, sidebar visível) ----
    if (bp.width >= 1024) {
      for (const [title, label] of [['Agenda', 'Agenda'], ['Corpo', 'Corpo'], ['Finanças', 'Finanças'], ['Progresso', 'Progresso']]) {
        await clickRoute(page, title);
        const state = await page.evaluate(() => {
          const main = document.querySelector('main');
          return { html: main ? main.innerText : '' };
        });
        check(`[${bp.name}] Rota ${label}: sem estatísticas fabricadas`, !state.html.includes('14 rpm') && !state.html.includes('ALL GATES PROVED'));
        check(`[${bp.name}] Rota ${label}: mensagem honesta de pendência`, state.html.includes('ainda não foi especificada') || state.html.includes('ainda não'));
      }
      // volta pra Hoje
      await clickRoute(page, 'Hoje');
    }

    await page.close();
  }

  // ---- Reduced motion ----
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 700));
    const rm = await page.evaluate(() => {
      const main = document.querySelector('main.study-stage-enter');
      if (!main) return { found: false };
      const cs = getComputedStyle(main);
      return { found: true, animationName: cs.animationName, transform: cs.transform };
    });
    check('[reduced-motion] main.study-stage-enter encontrado', rm.found);
    check('[reduced-motion] animação desabilitada (animationName=none)', rm.animationName === 'none');
    await page.close();
  }

  // ---- Regressão: Educação continua funcionando ----
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));
    await clickRoute(page, 'Educação');
    const eduOk = await page.evaluate(() => !!document.querySelector('main'));
    check('[regressão] Educação renderiza sem quebrar', eduOk);
    await page.close();
  }

  await browser.close();

  console.log(`\n=== RESULTADO: ${pass} PASSOU | ${fail} FALHOU ===`);
  if (failures.length) {
    console.log('Falhas:', failures);
  }
  process.exit(fail > 0 ? 1 : 0);
})();
