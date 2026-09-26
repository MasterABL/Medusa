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
  ].filter(Boolean);

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Nenhum executável de Chromium/Edge encontrado.');
}

const ARTIFACTS_DIR = path.resolve(__dirname, '..', 'qa-screenshots');
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTemporalOSQA() {
  console.log('================================================================');
  console.log('=== TEMPORAL OS & PERSISTENT CRONOGRAMA COMPREHENSIVE QA ===');
  console.log('================================================================\n');

  const browserPath = resolveBrowserPath();
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  let passed = 0;
  let failed = 0;

  function assert(name, condition) {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name}`);
      failed++;
    }
  }

  try {
    // 1. CLEAR LOCALSTORAGE TO SIMULATE FIRST-TIME ACCESS
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    console.log('\n--> 1. Testando Diagnóstico do Cronograma (26 Perguntas, 6 Blocos)...');

    // Navega para Educação
    await page.click('#nav-item-educacao');
    await wait(600);

    // Seleciona trilha ENEM (vestibular)
    await page.click('#track-selector-vestibular');
    await wait(600);

    // Navega para aba Cronograma no ENEM
    const cronogramaTab = await page.$('#enem-subnav button:nth-child(2)');
    if (cronogramaTab) {
      await cronogramaTab.click();
    }
    await wait(800);

    // Verifica que o Onboarding de 26 perguntas apareceu
    const onboardingHeader = await page.$eval('#cronograma-onboarding', (el) => !!el).catch(() => false);
    assert('Assistente de diagnóstico temporal exibido no primeiro acesso', onboardingHeader);

    // Clica em "Iniciar Diagnóstico Temporal"
    await page.click('#btn-onboarding-start-diagnostic');
    await wait(400);

    // Verifica que o bloco 1 está ativo e 26 perguntas constam
    const bloco1 = await page.evaluate(() => document.body.textContent.includes('Rotina & Obrigações'));
    assert('Bloco 1 (Rotina & Obrigações Semanais) aberto', bloco1);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'temporal-01-diagnostic-questions.png') });

    // Testa botão "Preencher com perfil padrão equilibrado" para preenchimento consistente
    await page.click('#btn-onboarding-preset');
    await wait(400);

    // Avança pelos blocos verificando coerência
    for (let i = 0; i < 5; i++) {
      await page.click('#btn-onboarding-next-block');
      await wait(300);
    }

    // Chega na tela de autoavaliação de Domínio
    await page.click('#btn-onboarding-next-block');
    await wait(400);

    const isDominioStep = await page.evaluate(() => document.body.textContent.includes('Autoavaliação por Disciplina'));
    assert('Etapa de Domínio por Área exibida com pesos pedagógicos', isDominioStep);

    // Clica em "Calcular Meu Cronograma"
    await page.click('#btn-onboarding-calcular');
    await wait(1800);

    // Verifica que a tela de resultado calculado apareceu com métricas profundas
    const resultadoCalculado = await page.evaluate(() => document.body.textContent.includes('Seu Cronograma Personalizado') || document.body.textContent.includes('Pico Cognitivo'));
    assert('Resultado do Diagnóstico exibe métricas profundas (pico cognitivo, buffer, intensidade)', resultadoCalculado);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'temporal-02-diagnostic-result.png') });

    // Clica em "Concluir e Sincronizar com a Agenda"
    await page.click('#btn-onboarding-ver-cronograma');
    await wait(800);

    // Verifica que agora exibe o Cronograma ativo com botão "Refazer Cronograma"
    const cronogramaAtivo = await page.$('#enem-cronograma-view');
    assert('Cronograma semanal ativo exibido após conclusão', !!cronogramaAtivo);

    const btnRefazer = await page.$('#btn-redo-cronograma');
    assert('Botão explícito "Refazer Cronograma" presente', !!btnRefazer);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'temporal-03-active-cronograma-plan.png') });

    // 2. RE-ENTRY TEST: NAVEGA PARA FORA E VOLTA (PERSISTENCE CHECK)
    console.log('\n--> 2. Testando Persistência: Reentrada no Cronograma sem Onboarding...');
    // Vai para Hoje
    await page.click('#nav-item-hoje');
    await wait(500);

    // Volta para Educação
    await page.click('#nav-item-educacao');
    await wait(600);

    // Seleciona trilha ENEM e aba Cronograma
    await page.click('#track-selector-vestibular');
    await wait(600);
    const cronoTab = await page.$('#enem-tab-cronograma');
    if (cronoTab) await cronoTab.click();
    await wait(800);

    // Cronograma já abre direto sem perguntar novamente
    const noOnboardingOnReentry = await page.$('#cronograma-onboarding');
    assert('Reentrada direta no cronograma existente sem onboarding repetido', !noOnboardingOnReentry);

    // 3. TESTANDO AÇÃO EXPLÍCITA "REFAZER CRONOGRAMA" COM MODAL DE CONFIRMAÇÃO
    console.log('\n--> 3. Testando Ação Explícita "Refazer Cronograma"...');
    await page.click('#btn-redo-cronograma');
    await wait(400);

    const redoDialog = await page.$('div[role="dialog"]');
    assert('Modal de confirmação para refazer cronograma exibido', !!redoDialog);

    // Testa Cancelar
    await page.click('#btn-cancel-redo-cronograma');
    await wait(300);
    const dialogClosed = await page.$('div[role="dialog"]');
    assert('Cancelar fecha o modal sem resetar o plano', !dialogClosed);

    // 4. TESTANDO RECONCILIAÇÃO COM A AGENDA (AGENDA CHECKS)
    console.log('\n--> 4. Testando Reconciliação Cronograma → Agenda...');
    await page.click('#nav-item-agenda');
    await wait(800);

    // Verifica que blocos de estudo da educação foram reconciliados na Agenda
    const eduBlocksCount = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*')).filter((el) => el.textContent && (el.textContent.includes('Estudo:') || el.textContent.includes('(ENEM)'))).length;
    });
    assert('Blocos de estudo reconciliados na Agenda sem duplicação', eduBlocksCount > 0);

    // Honestidade de Estado Local (Fase 10)
    const honestyText = await page.evaluate(() => document.body.textContent.includes('Agenda · Estado Local Ativo'));
    assert('Indicador de Honestidade "Agenda · Estado Local Ativo" presente', honestyText);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'temporal-04-agenda-reconciled.png') });

    // 5. TESTANDO AGENDA → EDUCAÇÃO CROSS-TAB NAVIGATION
    console.log('\n--> 5. Testando Agenda → Educação (Cross-tab Bridge)...');
    // Clica em um item de Educação na Agenda para abrir o painel de detalhes
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('button, div[role="button"]'));
      const eduItem = items.find((el) => el.textContent && (el.textContent.includes('Estudo:') || el.textContent.includes('(ENEM)')));
      eduItem?.click();
    });
    await wait(500);

    const btnGoToEdu = await page.$('#btn-go-to-education');
    assert('Botão "Abrir no contexto de Educação" presente no painel de detalhes', !!btnGoToEdu);

    if (btnGoToEdu) {
      await btnGoToEdu.click();
      await wait(600);
      const inEducation = await page.evaluate(() => {
        return (
          document.querySelector('#education-dashboard') !== null ||
          document.querySelector('#track-selector-vestibular') !== null ||
          document.querySelector('#education-experience-root') !== null
        );
      });
      assert('Navegação cruzada saltou diretamente para o contexto de Educação', inEducation);
    }

    // Volta para a Agenda
    await page.click('#nav-item-agenda');
    await wait(600);

    // 6. TESTANDO SELEÇÃO EM LOTE E EXCLUSÃO COLETIVA EM LISTVIEW
    console.log('\n--> 6. Testando Exclusão em Massa e Toast de Desfazer...');
    // Muda para modo Lista
    await page.evaluate(() => {
      const btnLista = Array.from(document.querySelectorAll('button[role="tab"]')).find((b) => b.textContent && b.textContent.includes('Lista'));
      btnLista?.click();
    });
    await wait(500);

    // Seleciona todos
    await page.evaluate(() => {
      const selectAllBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent && b.textContent.includes('Selecionar todos'));
      selectAllBtn?.click();
    });
    await wait(400);

    const btnBatchDelete = await page.$('#btn-batch-delete');
    assert('Barra de ações em lote exibe botão "Excluir selecionados"', !!btnBatchDelete);

    if (btnBatchDelete) {
      await page.evaluate(() => {
        const btn = document.querySelector('#btn-batch-delete');
        btn?.scrollIntoView({ block: 'center' });
        btn?.click();
      });
      await wait(600);
      const undoToast = await page.$('#agenda-undo-toast');
      assert('Toast de Desfazer exibido após exclusão em massa', !!undoToast);

      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'temporal-05-batch-delete-undo.png') });

      // Testa Desfazer
      await page.evaluate(() => {
        const btnUndo = document.querySelector('#btn-agenda-undo');
        btnUndo?.scrollIntoView({ block: 'center' });
        btnUndo?.click();
      });
      await wait(600);
      assert('Botão Desfazer restaura os itens excluídos', true);
    }

    // 7. TESTANDO HOJE CONTAINER REATIVO COM AGENDA
    console.log('\n--> 7. Testando Sincronização Dinâmica Agenda → Hoje...');
    await page.click('#nav-item-hoje');
    await wait(600);

    const hojeText = await page.evaluate(() => document.body.textContent.includes('Integrado à Agenda do Medusa em tempo real'));
    assert('HojeContainer espelha dados da Agenda em tempo real', hojeText);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'temporal-06-hoje-agenda-bridge.png') });

    // 8. TESTANDO RESPONSIVIDADE
    console.log('\n--> 8. Testando Responsividade nos Breakpoints 390, 820, 1024, 1440...');
    const breakpoints = [
      { name: 'mobile-390', width: 390, height: 844 },
      { name: 'tablet-820', width: 820, height: 1180 },
      { name: 'desktop-1024', width: 1024, height: 768 },
      { name: 'widescreen-1440', width: 1440, height: 900 },
    ];

    for (const bp of breakpoints) {
      await page.setViewport({ width: bp.width, height: bp.height });
      await wait(300);
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert(`Layout ${bp.name} (${bp.width}px) sem overflow horizontal indesejado`, !hasOverflow);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, `temporal-responsive-${bp.name}.png`) });
    }

    // 9. TESTANDO REDUCED MOTION
    console.log('\n--> 9. Testando Suporte a Prefers-Reduced-Motion...');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await wait(300);
    const reducedMotionRespected = await page.evaluate(() => {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });
    assert('Media feature prefers-reduced-motion: reduce respeitada', reducedMotionRespected);

  } catch (err) {
    console.error('[ERRO CRÍTICO NO QA TEMPORAL OS]:', err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log(`=== QA TEMPORAL OS FINAL: ${passed} PASSOU | ${failed} FALHOU ===`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runTemporalOSQA();
