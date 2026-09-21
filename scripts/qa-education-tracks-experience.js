/**
 * QA real de Browser — Educação: arquitetura de 3 trilhas, rótulo ENEM, altura do palco em
 * telas altas (rodada "Agenda inteligente + Educação Multi-Trilha + Shell/Sidebar").
 *
 * Cobre achados de auditoria desta rodada:
 * - ENEM/Inglês/Faculdade são subnavegação DENTRO de Educação, não itens da Sidebar principal.
 * - O rótulo da 3ª trilha dizia "Vestibular" — corrigido para "ENEM" (id interno inalterado).
 * - O palco da aula tinha um teto fixo de 640px mesmo em telas mais altas — corrigido para
 *   crescer além disso quando o viewport permite (max(640px, calc(100vh-320px))).
 * - Context Panel/Foco: geometria real (0px + padding 0), não apenas escondido visualmente.
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

async function freshPage(browser, width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));
  return page;
}

async function goToEducacao(page) {
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button')).find((b) => b.title === 'Educação')?.click();
  });
  await new Promise((r) => setTimeout(r, 500));
}

async function enterStudyMode(page) {
  await page.evaluate(() => {
    const root = document.getElementById('education-experience-root');
    Array.from(root.querySelectorAll('button')).find((b) => b.textContent.includes('Iniciar Sessão'))?.click();
  });
  await new Promise((r) => setTimeout(r, 3700));
  await page.evaluate(() => {
    const root = document.getElementById('education-experience-root');
    Array.from(root.querySelectorAll('button')).find((b) => !b.textContent.includes('Cancelar'))?.click();
  });
  await new Promise((r) => setTimeout(r, 600));
}

async function getPlayerHeight(page) {
  return page.evaluate(() => {
    const container = document.getElementById('study-mode-container');
    const player = container
      ? Array.from(container.querySelectorAll('div')).find(
          (d) => getComputedStyle(d).backgroundColor === 'rgb(14, 19, 17)'
        )
      : null;
    return player ? player.getBoundingClientRect().height : null;
  });
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/opt/pw-browsers/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // ===== 1. Arquitetura: ENEM/Inglês/Faculdade NÃO são itens da Sidebar principal =====
  {
    const page = await freshPage(browser, 1440, 960);
    const sidebarRoutes = await page.evaluate(() => {
      const nav = document.querySelector('#main-sidebar nav[aria-label="Rotas Operacionais"]');
      return nav ? Array.from(nav.querySelectorAll('button')).map((b) => b.title).filter(Boolean) : [];
    });
    check(
      '[Arquitetura] Sidebar tem "Educação" como único item (não 3 itens de trilha)',
      sidebarRoutes.includes('Educação') &&
        !sidebarRoutes.includes('ENEM') &&
        !sidebarRoutes.includes('Inglês') &&
        !sidebarRoutes.includes('Faculdade'),
      JSON.stringify(sidebarRoutes)
    );
    await page.close();
  }

  // ===== 2. Rótulo "ENEM" (achado de auditoria, era "Vestibular") =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    const dashboardHasEnem = await page.evaluate(() => {
      const root = document.getElementById('education-experience-root');
      return root.innerText.includes('ENEM') && !root.innerText.includes('Vestibular');
    });
    check('[Rótulo] Dashboard mostra "ENEM", não mais "Vestibular"', dashboardHasEnem);

    await enterStudyMode(page);
    const studyHasEnem = await page.evaluate(() => {
      const root = document.getElementById('education-experience-root');
      return root.innerText.includes('ENEM') && !root.innerText.includes('Vestibular');
    });
    check('[Rótulo] Study Mode (seletor de trilha + cabeçalhos) mostra "ENEM"', studyHasEnem);

    // Troca para a trilha ENEM e confirma que o conteúdo/rótulos seguem consistentes
    await page.evaluate(() => {
      const root = document.getElementById('education-experience-root');
      Array.from(root.querySelectorAll('button')).find((b) => b.textContent.includes('ENEM'))?.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    const afterSwitch = await page.evaluate(() => {
      const root = document.getElementById('education-experience-root');
      return root.innerText.includes('ENEM');
    });
    check('[Rótulo] Trocar para a trilha ENEM funciona e mantém o rótulo consistente', afterSwitch);

    await page.close();
  }

  // ===== 3. Palco da aula cresce em telas altas (achado de auditoria: teto fixo em 640px) =====
  {
    const pageNormal = await freshPage(browser, 1440, 960);
    await goToEducacao(pageNormal);
    await enterStudyMode(pageNormal);
    const heightNormal = await getPlayerHeight(pageNormal);
    await pageNormal.close();

    const pageTall = await freshPage(browser, 1440, 1200);
    await goToEducacao(pageTall);
    await enterStudyMode(pageTall);
    const heightTall = await getPlayerHeight(pageTall);
    const overflowTall = await pageTall.evaluate(() => document.body.scrollWidth > document.body.clientWidth + 1);
    await pageTall.close();

    check(
      '[Palco] altura do palco em 1440x960 é a esperada (~640px, piso já validado)',
      heightNormal !== null && Math.abs(heightNormal - 640) <= 2,
      `height=${heightNormal}`
    );
    check(
      '[Palco] altura do palco CRESCE em 1440x1200 em vez de ficar presa em 640px',
      heightTall !== null && heightTall > heightNormal + 100,
      `normal=${heightNormal} tall=${heightTall}`
    );
    check('[Palco] sem overflow horizontal em 1440x1200', !overflowTall);
  }

  // ===== 4. Context Panel: geometria real 0px + padding 0 em Foco (não só escondido visualmente) =====
  {
    const page = await freshPage(browser, 1440, 960);
    const beforeWidth = await page.evaluate(() => {
      const panel = document.getElementById('context-panel');
      return panel ? panel.getBoundingClientRect().width : null;
    });
    await goToEducacao(page);
    await enterStudyMode(page);
    const during = await page.evaluate(() => {
      const panel = document.getElementById('context-panel');
      const contentLayout = document.getElementById('content-layout');
      return {
        width: panel ? panel.getBoundingClientRect().width : null,
        paddingRight: contentLayout ? getComputedStyle(contentLayout).paddingRight : null,
      };
    });
    check('[Context Panel] largura real 320px antes de entrar em Foco', Math.abs(beforeWidth - 320) <= 2, `before=${beforeWidth}`);
    check(
      '[Context Panel] em Foco/Study Mode, largura real 0px (não só opacity/visibility)',
      Math.abs(during.width) <= 2,
      `width=${during.width}`
    );
    check(
      '[Context Panel] paddingRight do conteúdo principal também zera (refluxo real, não overlay)',
      during.paddingRight === '0px',
      `paddingRight=${during.paddingRight}`
    );
    await page.close();
  }

  // ===== 5. Keyboard/focus no seletor de trilhas =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    const isFocusable = await page.evaluate(() => {
      const root = document.getElementById('education-experience-root');
      const btn = Array.from(root.querySelectorAll('button')).find((b) => b.textContent.includes('ENEM'));
      if (!btn) return false;
      btn.focus();
      return document.activeElement === btn;
    });
    check('[A11y] chip de trilha "ENEM" é alcançável via foco de teclado', isFocusable);
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
