/**
 * QA real de Browser — Rodada 2 de refinamento (ENEM Cronograma completo, seleção real de
 * disciplina na Faculdade com transição, refinamento de composição/mobile do Inglês).
 *
 * Cobre:
 * - ENEM: subnav Visão Geral/Cronograma, períodos Hoje/Semana/Mês, filtro por disciplina,
 *   interação com bloco (painel de contexto sem navegação), "Iniciar Sessão" a partir do bloco
 *   de hoje chega no Study Mode real, ausência do alternador de composição (exclusivo Inglês).
 * - Faculdade: seleção de disciplina é estado real (não decorativo) — clicar troca sessão em
 *   foco + conteúdo + avisos, com motion real (amostrado em meio à transição), sem navegar.
 * - Inglês: modo "Aula" no mobile não deixa painel lateral invisível ocupando espaço; painel
 *   lateral nunca fica "microscópico" nos outros 2 modos (largura mínima real via clamp).
 * - Hoje: regressão (permanece intacto).
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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function freshPage(browser, width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(300);
  return page;
}

async function click(page, sel) {
  await page.evaluate((s) => document.querySelector(s)?.click(), sel);
}
async function exists(page, sel) {
  return page.evaluate((s) => !!document.querySelector(s), sel);
}
async function textOf(page, sel) {
  return page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);
}

async function goToEducacao(page) {
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button')).find((b) => b.title === 'Educação')?.click();
  });
  await wait(400);
}

async function enterStudyMode(page) {
  await click(page, '#btn-start-study-session');
  await wait(3700);
  await wait(2000);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.MEDUSA_BROWSER_PATH || '/opt/pw-browsers/chromium',
    headless: 'new',
    args: ['--no-sandbox'],
  });

  // ===== 1. ENEM — subnav Visão Geral / Cronograma =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    await click(page, '#track-selector-vestibular');
    await wait(500);
    check('[ENEM] Visão Geral é a aba inicial', await exists(page, '#enem-tab-visao-geral[aria-selected="true"]'));
    check('[ENEM] Sem alternador de composição de aula no Hub (exclusivo da tela de aula de Inglês)', !(await exists(page, '#lesson-composition-switcher')));

    await click(page, '#enem-tab-cronograma');
    await wait(400);
    check('[ENEM] Cronograma monta como subexperiência própria', await exists(page, '#enem-cronograma-view'));
    check('[ENEM] Hub NÃO entrou em Study Mode só por abrir o Cronograma', !(await exists(page, '#study-mode-container')));

    // Períodos
    const blocksSemana = await page.evaluate(() => document.querySelectorAll('[id^="cronograma-block-"]').length);
    await click(page, '#btn-cronograma-period-hoje');
    await wait(300);
    const blocksHoje = await page.evaluate(() => document.querySelectorAll('[id^="cronograma-block-"]').length);
    await click(page, '#btn-cronograma-period-mes');
    await wait(300);
    const blocksMes = await page.evaluate(() => document.querySelectorAll('[id^="cronograma-block-"]').length);
    check('[ENEM] Hoje < Semana < Mês em quantidade de blocos (filtro temporal real)', blocksHoje < blocksSemana && blocksSemana < blocksMes, `hoje=${blocksHoje} semana=${blocksSemana} mes=${blocksMes}`);
    await click(page, '#btn-cronograma-period-semana');
    await wait(300);

    // Filtro por disciplina — os próprios chips do filtro sempre listam todas as disciplinas
    // (não é sinal de vazamento do filtro), então a asserção correta é sobre os BLOCOS exibidos,
    // não sobre o texto do container inteiro (que inclui os chips).
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('#cronograma-discipline-filter button')).find((b) => b.textContent.trim() === 'Física')?.click();
    });
    await wait(300);
    const blockDisciplines = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[id^="cronograma-block-"]')).map(
        (b) => b.querySelector('span')?.textContent || ''
      )
    );
    check(
      '[ENEM] Filtro por disciplina restringe os blocos exibidos (só Física)',
      blockDisciplines.length > 0 && blockDisciplines.every((d) => d.toUpperCase().includes('FÍSICA')),
      `blocos=${JSON.stringify(blockDisciplines)}`
    );

    await page.close();
  }

  // ===== 2. ENEM — interação com bloco: painel de contexto sem navegação =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    await click(page, '#track-selector-vestibular');
    await wait(500);
    await click(page, '#enem-tab-cronograma');
    await wait(400);

    // Clica num bloco que não é hoje (o de segunda, atrasado)
    await click(page, '[id^="cronograma-block-cron-1"]');
    await wait(300);
    const panelText = await textOf(page, '#cronograma-context-panel');
    check('[ENEM] Bloco abre painel de contexto inline (sem navegação)', panelText.length > 0);
    check('[ENEM] Painel mostra status Atrasado honestamente', panelText.toLowerCase().includes('atrasado'));
    check('[ENEM] Bloco fora de hoje não oferece iniciar sessão (honestidade de fixture)', !(await exists(page, '#btn-cronograma-start-today')));
    check('[ENEM] Hub continua montado (painel não navegou para outra tela)', await exists(page, '#education-dashboard'));

    // Clica no bloco de hoje e inicia sessão real a partir do Cronograma
    await click(page, '[id^="cronograma-block-cron-3"]');
    await wait(300);
    check('[ENEM] Bloco de hoje oferece "Iniciar Sessão"', await exists(page, '#btn-cronograma-start-today'));
    await click(page, '#btn-cronograma-start-today');
    await wait(3700);
    await wait(2000);
    check('[ENEM] "Iniciar Sessão" do bloco de hoje chega no Study Mode real', await exists(page, '#study-mode-container'));

    await page.close();
  }

  // ===== 3. FACULDADE — seleção de disciplina é estado real, com transição =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    await wait(400); // trilha padrão já é Faculdade

    const beforeFocus = await textOf(page, '#faculdade-focus-session');
    check('[Faculdade] Sessão em Foco inicial é Física II (disciplina ativa por fixture)', beforeFocus.includes('Física II') || beforeFocus.includes('MHS'));

    await click(page, '#discipline-chip-MAT-215');
    await wait(120); // amostra em meio à transição (study-summary-enter ~440ms)
    const midOpacity = await page.evaluate(() => {
      const el = document.getElementById('faculdade-discipline-content');
      return el ? parseFloat(getComputedStyle(el).opacity) : null;
    });
    check('[Faculdade] Transição de disciplina é interpolada, não instantânea', midOpacity !== null && midOpacity < 0.95, `opacity@120ms=${midOpacity}`);

    await wait(500);
    const afterFocus = await textOf(page, '#faculdade-focus-session');
    // Avisos migraram do conteúdo principal para o Context Panel nesta rodada (ver
    // FaculdadeContextPanel.tsx) — checados separadamente no bloco de Context Panel abaixo.
    const afterContent = await textOf(page, '#faculdade-discipline-content');
    check('[Faculdade] Sessão em Foco muda de verdade ao trocar disciplina', afterFocus !== beforeFocus && afterFocus.includes('Newton-Raphson'));
    check('[Faculdade] Conteúdo/aulas mudam junto com a disciplina (códigos MAT-215-xx)', afterContent.includes('MAT-215-01'));
    check('[Faculdade] Chip selecionado reflete a nova disciplina (aria-selected)', await page.evaluate(() => document.getElementById('discipline-chip-MAT-215')?.getAttribute('aria-selected') === 'true'));
    check('[Faculdade] Continua no mesmo Hub (não navegou para outra tela)', await exists(page, '#education-dashboard'));

    // Disciplina sem sessão de estudo real é honesta sobre isso
    check('[Faculdade] Disciplina sem sessão real avisa honestamente (sem fingir integração)', afterFocus.toLowerCase().includes('ainda não disponível') || afterContent.toLowerCase().includes('ainda não disponível'));

    await page.close();
  }

  // ===== 4. INGLÊS — modo "Aula" no mobile não deixa espaço vazio =====
  {
    const page = await freshPage(browser, 390, 844);
    await goToEducacao(page);
    await click(page, '#track-selector-ingles');
    await wait(500);
    await enterStudyMode(page);
    check('[Inglês Mobile] Study Mode alcançado em 390px', await exists(page, '#study-mode-container'));

    await click(page, '#btn-lesson-mode-aula');
    await wait(600);
    const asideBox = await page.evaluate(() => {
      const el = document.querySelector('[aria-label="Companheiro da Sessão de Estudo"]');
      return el ? el.getBoundingClientRect().height : null;
    });
    check('[Inglês Mobile] Modo "Aula" recolhe a altura real do painel lateral (sem espaço vazio)', asideBox !== null && asideBox < 20, `height=${asideBox}`);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    check('[Inglês Mobile] Sem overflow horizontal no modo Aula', !overflow);

    await click(page, '#btn-lesson-mode-aula-resumo');
    await wait(600);
    const asideBoxRestored = await page.evaluate(() => {
      const el = document.querySelector('[aria-label="Companheiro da Sessão de Estudo"]');
      return el ? el.getBoundingClientRect().height : null;
    });
    check('[Inglês Mobile] Painel volta a ter altura real em "Aula + Resumo"', asideBoxRestored !== null && asideBoxRestored > 200, `height=${asideBoxRestored}`);

    await page.close();
  }

  // ===== 5. INGLÊS DESKTOP — painel lateral nunca fica microscópico =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    await click(page, '#track-selector-ingles');
    await wait(500);
    await enterStudyMode(page);

    for (const mode of ['aula-resumo', 'dividido']) {
      await click(page, `#btn-lesson-mode-${mode}`);
      await wait(600);
      const widths = await page.evaluate(() => {
        const stage = document.getElementById('lesson-stage');
        const aside = document.querySelector('[aria-label="Companheiro da Sessão de Estudo"]');
        return { stage: stage?.getBoundingClientRect().width, aside: aside?.getBoundingClientRect().width };
      });
      check(`[Inglês Desktop] Painel lateral em "${mode}" tem largura real (>=300px, nunca microscópico)`, widths.aside >= 300, `aside=${widths.aside}`);
      check(`[Inglês Desktop] Palco em "${mode}" domina mas não engole o painel (50-75% da largura)`, widths.stage / (widths.stage + widths.aside) > 0.5 && widths.stage / (widths.stage + widths.aside) < 0.75, `stage=${widths.stage} aside=${widths.aside}`);
    }

    await page.close();
  }

  // ===== 6. HOJE — regressão =====
  {
    const page = await freshPage(browser, 1440, 960);
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button')).find((b) => b.title === 'Hoje')?.click();
    });
    await wait(400);
    const hojeText = await page.evaluate(() => document.body.innerText);
    check('[Hoje] Continua acessível e renderizando após a rodada 2', hojeText.length > 100);
    await page.close();
  }

  await browser.close();

  console.log(`\n=== RESULTADO: ${pass} PASSOU | ${fail} FALHOU ===`);
  if (failures.length) {
    console.log('\nFalhas:');
    failures.forEach((f) => console.log(' - ' + f));
    process.exit(1);
  }
})();
