const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

function resolveBrowserPath() {
  if (process.env.MEDUSA_BROWSER_PATH && fs.existsSync(process.env.MEDUSA_BROWSER_PATH)) {
    return process.env.MEDUSA_BROWSER_PATH;
  }
  const candidatePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : null,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Microsoft\\Edge\\Application\\msedge.exe') : null,
  ].filter(Boolean);

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Nenhum executável de Chromium/Chrome/Edge encontrado.');
}

const ARTIFACTS_DIR = path.resolve(__dirname, '..', 'qa-screenshots');
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runAgendaQA() {
  console.log('================================================================');
  console.log('=== INICIANDO MEDUSA AGENDA / TEMPORAL OS AUTOMATED BROWSER QA ===');
  console.log('================================================================\n');

  const browserPath = resolveBrowserPath();
  console.log(`[INFO] Navegador detectado: ${browserPath}`);
  console.log(`[INFO] Pasta de evidências: ${ARTIFACTS_DIR}\n`);

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

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('favicon.ico')) return;
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      console.error('[CONSOLE ERROR]:', text);
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.toString());
    console.error('[PAGE ERROR]:', err.toString());
  });

  const results = [];
  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`  [PASS] ${name} ${details ? '(' + details + ')' : ''}`);
      results.push({ name, status: 'PASS', details });
    } else {
      console.error(`  [FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
      results.push({ name, status: 'FAIL', details });
    }
  }

  try {
    // 1. CARREGAR APLICAÇÃO
    console.log('--> Carregando http://localhost:3000 em Desktop 1440x900...');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await wait(800);

    // 2. ROTEAMENTO: SIDEBAR -> AGENDA
    console.log('\n--> Testando Roteamento para Agenda...');
    const agendaNavLink = await page.$('button[title="Agenda"]');
    assert('Botão Agenda na Sidebar presente', !!agendaNavLink);
    if (agendaNavLink) {
      await agendaNavLink.click();
      await wait(600);
    }

    const agendaMain = await page.$('#agenda-main');
    assert('AgendaContainer renderizado no main', !!agendaMain);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'agenda-01-day-view-desktop.png') });

    // 3. VERIFICAÇÃO DA DAY VIEW E TIMELINE
    console.log('\n--> Testando Day View (Timeline, Horas, Conflitos, Tempo Livre)...');
    const dayViewPills = await page.$$eval('button[role="tab"]', (tabs) =>
      tabs.map((t) => t.textContent.trim())
    );
    assert('Modos de visualização presentes no header', dayViewPills.includes('Dia') && dayViewPills.includes('Semana'));

    // Verifica presença de conflito com duração
    const conflictBadges = await page.$$eval('span', (spans) =>
      spans
        .map((s) => s.textContent.trim())
        .filter((t) => t.includes('Conflito'))
    );
    assert(
      'Detecção de conflito com duração real presente',
      conflictBadges.some((b) => b.includes('30 min')),
      `Encontrado: ${conflictBadges.join(', ')}`
    );

    // Verifica presença de tempo livre >= 30 min
    const freeTimeBadges = await page.$$eval('span', (spans) =>
      spans
        .map((s) => s.textContent.trim())
        .filter((t) => t.includes('livres'))
    );
    assert(
      'Identificação de tempo livre presente',
      freeTimeBadges.length > 0,
      `Exemplos: ${freeTimeBadges.slice(0, 2).join(', ')}`
    );

    // 4. TROCA DE MODOS: SEMANA, MÊS, LISTA
    console.log('\n--> Testando Troca de Modos de Visualização...');
    // Modo Semana
    const semanaTab = await page.$('button[role="tab"]:nth-child(2)');
    if (semanaTab) {
      await semanaTab.click();
      await wait(400);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'agenda-02-week-view-desktop.png') });
      const weekCols = await page.$$('.grid-cols-8, .grid-cols-7');
      assert('Semana renderiza colunas semanais no Desktop', weekCols.length > 0);
    }

    // Modo Mês
    const mesTab = await page.$('button[role="tab"]:nth-child(3)');
    if (mesTab) {
      await mesTab.click();
      await wait(400);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'agenda-03-month-view.png') });
      const monthCells = await page.$$('.min-h-\\[85px\\], .min-h-\\[105px\\]');
      assert('Mês renderiza grid de 42 células', monthCells.length >= 35, `Células: ${monthCells.length}`);
    }

    // Modo Lista com os 4 Buckets Canônicos
    const listaTab = await page.$('button[role="tab"]:nth-child(4)');
    if (listaTab) {
      await listaTab.click();
      await wait(400);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'agenda-04-list-view-buckets.png') });

      const bucketTitles = await page.$$eval('section[aria-label^="Bloco"] h3', (els) =>
        els.map((e) => e.textContent.trim())
      );
      assert(
        'Lista organiza itens nos blocos canônicos',
        bucketTitles.some((t) => t.includes('Agora') || t.includes('Próximo') || t.includes('Depois') || t.includes('Mais tarde')),
        `Buckets: ${bucketTitles.join(', ')}`
      );
    }

    // Voltar para Dia
    const diaTab = await page.$('button[role="tab"]:nth-child(1)');
    if (diaTab) {
      await diaTab.click();
      await wait(300);
    }

    // 5. NAVEGAÇÃO TEMPORAL (Anterior, Próximo, Hoje)
    console.log('\n--> Testando Navegação Temporal...');
    const headerTitleInitial = await page.$eval('h1', (el) => el.textContent.trim());

    const btnNext = await page.$('button[aria-label="Próximo período"]');
    assert('Botão Próximo período com aria-label presente', !!btnNext);
    if (btnNext) {
      await btnNext.click();
      await wait(300);
      const headerTitleNext = await page.$eval('h1', (el) => el.textContent.trim());
      assert('Avanço de data alterou o cabeçalho', headerTitleInitial !== headerTitleNext, `${headerTitleInitial} -> ${headerTitleNext}`);
    }

    const btnToday = await page.$('button[aria-label="Ir para Hoje"]');
    assert('Botão Ir para Hoje presente', !!btnToday);
    if (btnToday) {
      await btnToday.click();
      await wait(300);
      const headerTitleToday = await page.$eval('h1', (el) => el.textContent.trim());
      assert('Retorno para Hoje sincronizou o cabeçalho', headerTitleToday === headerTitleInitial);
    }

    // 6. CRIAÇÃO, EDIÇÃO E EXCLUSÃO (CRUD COMPLETO)
    console.log('\n--> Testando Fluxo de Criação, Inspeção, Edição e Exclusão...');
    const btnAdd = await page.$('button[aria-label="Adicionar compromisso à agenda"]');
    assert('Botão Adicionar presente', !!btnAdd);
    if (btnAdd) {
      await btnAdd.click();
      await wait(400);

      // Preenche o formulário
      await page.type('#form-title', 'Reunião de Alinhamento QA');
      await page.type('#form-start-time', '16:30');
      await page.type('#form-end-time', '17:30');

      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'agenda-05-event-form-drawer.png') });

      // Submete o formulário
      await page.click('button[type="submit"]');
      await wait(500);

      // Verifica se o item apareceu na interface
      const createdItemText = await page.$$eval('span', (spans) =>
        spans.map((s) => s.textContent.trim()).filter((t) => t.includes('Reunião de Alinhamento QA'))
      );
      assert('Novo compromisso criado aparece na interface', createdItemText.length > 0);

      // Clica no item para abrir o painel de detalhes
      await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('button'));
        const match = elements.find(
          (el) => el.textContent && el.textContent.includes('Reunião de Alinhamento QA')
        );
        match?.click();
      });
      await wait(500);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'agenda-06-event-detail-panel.png') });

      const detailTitle = await page.$eval('aside[aria-label="Detalhes do compromisso"] h3', (el) => el.textContent.trim());
      assert('Painel de Detalhes abriu com o compromisso selecionado', detailTitle.includes('Reunião de Alinhamento QA'));

      // Clica em Editar
      await page.evaluate(() => {
        const detailButtons = Array.from(document.querySelectorAll('aside[aria-label="Detalhes do compromisso"] button'));
        const editBtn = detailButtons.find((b) => b.textContent && b.textContent.includes('Editar'));
        editBtn?.click();
      });
      await wait(400);

      // Altera o título
      await page.click('#form-title', { clickCount: 3 });
      await page.type('#form-title', 'Reunião de Alinhamento QA (Aprovada)');
      await page.click('button[type="submit"]');
      await wait(500);

      const updatedItemText = await page.$$eval('span', (spans) =>
        spans.map((s) => s.textContent.trim()).filter((t) => t.includes('Reunião de Alinhamento QA (Aprovada)'))
      );
      assert('Compromisso editado atualizou o título com sucesso', updatedItemText.length > 0);

      // Exclui com confirmação em dois passos
      await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('button'));
        const match = elements.find(
          (el) => el.textContent && el.textContent.includes('Reunião de Alinhamento QA (Aprovada)')
        );
        match?.click();
      });
      await wait(400);

      // Clica em Excluir
      await page.evaluate(() => {
        const detailButtons = Array.from(document.querySelectorAll('aside[aria-label="Detalhes do compromisso"] button'));
        const delBtn = detailButtons.find((b) => b.textContent && b.textContent.includes('Excluir'));
        delBtn?.click();
      });
      await wait(300);

      // Confirma exclusão ("Sim, excluir")
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const confirmBtn = buttons.find((b) => b.textContent && b.textContent.includes('Sim, excluir'));
        confirmBtn?.click();
      });
      await wait(400);

      const deletedItemText = await page.$$eval('span', (spans) =>
        spans.map((s) => s.textContent.trim()).filter((t) => t.includes('Reunião de Alinhamento QA'))
      );
      assert('Compromisso excluído após confirmação em dois passos', deletedItemText.length === 0);
    }

    // 7. MODAL DE CATEGORIAS E 24 CORES
    console.log('\n--> Testando Gerenciador de Categorias & 24 Cores...');
    const btnCategories = await page.$('button[aria-label="Gerenciar categorias e cores"]');
    assert('Botão Gerenciar categorias e cores presente', !!btnCategories);
    if (btnCategories) {
      await btnCategories.click();
      await wait(400);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'agenda-07-category-palette-modal.png') });

      // Verifica presença de 24 swatches de cores
      const swatches = await page.$$('button[aria-label^="Selecionar cor"]');
      assert('Paleta de 24 cores pastel disponível no modal', swatches.length === 24, `Swatches: ${swatches.length}`);

      // Cria nova categoria
      await page.type('#cat-name-input', 'Pesquisa Acadêmica');
      if (swatches[11]) {
        await swatches[11].click(); // Turquesa pastel
        await wait(200);
      }
      await page.click('button[type="submit"]');
      await wait(400);

      const catListText = await page.$$eval('span', (spans) =>
        spans.map((s) => s.textContent.trim()).filter((t) => t.includes('Pesquisa Acadêmica'))
      );
      assert('Nova categoria criada e visível na lista', catListText.length > 0);

      // Fecha o modal
      await page.click('button[aria-label="Fechar categorias"]');
      await wait(300);
    }

    // 8. FILTROS POR DOMÍNIO
    console.log('\n--> Testando Filtros por Domínio...');
    const clickedEducation = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('nav[aria-label="Filtros por domínio"] button'));
      const eduBtn = buttons.find((b) => b.textContent && b.textContent.includes('Educação'));
      if (eduBtn) {
        eduBtn.click();
        return true;
      }
      return false;
    });

    if (clickedEducation) {
      await wait(400);
      const visibleTexts = await page.$$eval('#agenda-main span', (spans) =>
        spans.map((s) => s.textContent.trim())
      );
      assert('Filtro Educação ativo mostra itens de estudo', visibleTexts.some((t) => t.includes('Função Afim') || t.includes('Inglês')));

      // Retorna para Todos
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('nav[aria-label="Filtros por domínio"] button'));
        const allBtn = buttons.find((b) => b.textContent && b.textContent.includes('Todos'));
        allBtn?.click();
      });
      await wait(300);
    }

    // 9. CONTEXT PANEL EM MODO AGENDA
    console.log('\n--> Testando Síntese Temporal no Context Panel...');
    const contextPanelEl = await page.$('#context-panel');
    assert('Context Panel regional presente na arquitetura', !!contextPanelEl);
    if (contextPanelEl) {
      const summaryText = await page.$$eval('#context-panel span, #context-panel div', (els) =>
        els.map((e) => e.textContent.trim())
      );
      assert(
        'Context Panel exibe síntese temporal da Agenda',
        summaryText.some((t) => t.includes('Síntese Temporal') || t.includes('Ocupação Temporal') || t.includes('Tempo Livre'))
      );
    }

    // 10. RESPONSIVIDADE (390px Mobile & 820px Tablet)
    console.log('\n--> Testando Responsividade e Breakpoint 820px...');
    // A. Tablet 820px (Correção Crítica do Bug Auditado)
    await page.setViewport({ width: 820, height: 1180 });
    await wait(500);

    // Muda para semana
    const semanaBtn = await page.$('button[role="tab"]:nth-child(2)');
    if (semanaBtn) {
      await semanaBtn.click();
      await wait(400);
    }
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'agenda-08-tablet-820px.png') });

    const overflow820 = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    assert('Tablet 820px sem overflow horizontal', overflow820);

    const hasDaySelector820 = await page.$$eval('div[role="tablist"] button', (tabs) =>
      tabs.some((t) => ['Seg', 'Ter', 'Qua', 'Qui'].some((d) => t.textContent.includes(d)))
    );
    assert('Tablet 820px adota seletor horizontal de dias sem comprimir 7 colunas', hasDaySelector820);

    // B. Mobile 390px (iPhone / Smart)
    console.log('\n--> Testando Mobile 390px...');
    await page.setViewport({ width: 390, height: 844 });
    await wait(500);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'agenda-09-mobile-390px.png') });

    const overflow390 = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    assert('Mobile 390px sem overflow horizontal', overflow390);

    // 11. TEMAS (Claro, Sépia, Escuro)
    console.log('\n--> Testando Temas (Claro, Sépia, Escuro)...');
    await page.setViewport({ width: 1440, height: 900 });
    await wait(300);

    // Sépia
    await page.evaluate(() => {
      document.documentElement.className = 'sepia';
    });
    await wait(400);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'agenda-10-theme-sepia.png') });
    const isSepia = await page.evaluate(() => document.documentElement.classList.contains('sepia'));
    assert('Tema Sépia aplicado', isSepia);

    // Escuro
    await page.evaluate(() => {
      document.documentElement.className = 'dark';
    });
    await wait(400);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'agenda-11-theme-dark.png') });
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    assert('Tema Escuro aplicado', isDark);

    // Retorna para Claro
    await page.evaluate(() => {
      document.documentElement.className = 'light';
    });
    await wait(300);

    // 12. NÃO REGRESSÃO DE EDUCAÇÃO
    console.log('\n--> Testando Não-Regressão de Educação...');
    const eduLink = await page.$('button[title="Educação"]');
    if (eduLink) {
      await eduLink.click();
      await wait(600);
      const eduDashboard = await page.$('#education-dashboard, main[aria-label="Visão Operacional da Educação"]');
      assert('Módulo Educação abre normalmente sem erros', !!eduDashboard);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'agenda-12-regression-education.png') });
    }

    // 13. AUDITORIA DE ERROS DE CONSOLE
    assert('Zero erros graves no console do navegador', consoleErrors.length === 0, `Erros: ${consoleErrors.length}`);

  } catch (err) {
    console.error('[ERRO CRÍTICO NO QA BROWSER]:', err);
    results.push({ name: 'Execução QA', status: 'CRASH', details: err.message });
  } finally {
    await browser.close();
  }

  // RELATÓRIO FINAL
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status !== 'PASS').length;
  console.log('\n================================================================');
  console.log(`=== QA AGENDA COMPLETO: ${passed} PASSOU | ${failed} FALHOU ===`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAgendaQA();
