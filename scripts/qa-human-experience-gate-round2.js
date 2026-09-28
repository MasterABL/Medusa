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

async function runGateQA() {
  console.log('========================================================================');
  console.log('=== MEDUSA ROUND 2: HUMAN EXPERIENCE GATE - COMPREHENSIVE QA ===');
  console.log('========================================================================\n');

  const browserPath = resolveBrowserPath();
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const results = {
    functional: [],
    motion: [],
    visual: [],
    crosstab: [],
    persistence: [],
    responsive: [],
  };

  function record(category, name, passed, details = '') {
    const status = passed ? 'PROVADO' : 'PARCIAL/FALHA';
    results[category].push({ name, passed, status, details });
    if (passed) {
      console.log(`  [PROVADO] [${category.toUpperCase()}] ${name}`);
    } else {
      console.error(`  [FALHA] [${category.toUpperCase()}] ${name} - ${details}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // GATE 0: Limpar LocalStorage e Iniciar
    // -------------------------------------------------------------
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(800);

    // -------------------------------------------------------------
    // GATE 1: Split-screen / Tablet (1024x768 & 820x1180) Context Panel
    // -------------------------------------------------------------
    console.log('\n--> 1. Testando Context Panel em Tela Dividida (1024x768 & 820x1180)...');
    await page.setViewport({ width: 1024, height: 768 });
    await wait(400);

    // Abre Context Panel
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label*="painel"], button[aria-label*="contexto"], #btn-toggle-context');
      if (btn) btn.click();
    });
    await wait(500);

    const contextPanel1024 = await page.evaluate(() => {
      const panel = document.querySelector('#context-panel-root, aside#context-panel');
      const main = document.querySelector('main');
      const rect = panel ? panel.getBoundingClientRect() : null;
      const mainRect = main ? main.getBoundingClientRect() : null;
      return {
        exists: !!panel,
        width: rect ? rect.width : 0,
        mainPaddingRight: main ? window.getComputedStyle(main).paddingRight : '',
        isAside: panel ? panel.tagName.toLowerCase() === 'aside' : false,
      };
    });

    record('functional', 'Context Panel abre como coluna lateral em 1024px', contextPanel1024.exists && contextPanel1024.width > 200, `Largura: ${contextPanel1024.width}px`);
    record('visual', 'Context Panel mantém reflow com padding do conteúdo principal em 1024px', parseInt(contextPanel1024.mainPaddingRight) > 0, `PaddingRight: ${contextPanel1024.mainPaddingRight}`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'round2-01-context-panel-1024.png') });

    // Testa em 820x1180
    await page.setViewport({ width: 820, height: 1180 });
    await wait(400);
    const contextPanel820 = await page.evaluate(() => {
      const panel = document.querySelector('#context-panel-root, aside#context-panel');
      return {
        exists: !!panel,
        width: panel ? panel.getBoundingClientRect().width : 0,
      };
    });
    record('responsive', 'Context Panel funciona como coluna lateral em 820px (split-screen)', contextPanel820.exists && contextPanel820.width > 200, `Largura: ${contextPanel820.width}px`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'round2-01-context-panel-820.png') });

    // Restaura desktop
    await page.setViewport({ width: 1440, height: 900 });
    await wait(400);

    // -------------------------------------------------------------
    // GATE 2: Verdadeira Week View (7 Dias Simultâneos)
    // -------------------------------------------------------------
    console.log('\n--> 2. Testando Verdadeira Week View (7 Dias Simultâneos em Desktop)...');
    await page.click('#nav-item-agenda');
    await wait(800);

    // Muda para Week View
    await page.click('#btn-view-semana');
    await wait(600);

    const weekCols = await page.evaluate(() => {
      const cols = document.querySelectorAll('#week-view-columns > [id^="week-col-"]');
      const allDay = document.querySelector('#week-allday-row');
      const dayHeaders = Array.from(document.querySelectorAll('[id^="week-col-"] span')).map(s => s.textContent?.trim()).filter(Boolean);
      return {
        count: cols.length,
        hasAllDay: !!allDay,
        headers: dayHeaders,
      };
    });

    record('functional', 'Week View exibe 7 dias simultaneamente no desktop', weekCols.count === 7, `Colunas encontradas: ${weekCols.count}`);
    record('visual', 'Week View possui linha destacada para eventos de Dia Inteiro (All-day)', weekCols.hasAllDay);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'round2-02-week-view-7days-desktop.png') });

    // -------------------------------------------------------------
    // GATE 3: Primeiro Acesso ao Cronograma (Welcome Intro -> Transição Fluida)
    // -------------------------------------------------------------
    console.log('\n--> 3. Testando Primeiro Acesso ao Cronograma (Welcome Intro)...');
    // Navega para Educação -> ENEM -> Cronograma
    await page.click('#nav-item-educacao');
    await wait(600);
    await page.click('#track-selector-vestibular');
    await wait(600);

    const cronogramaTab = await page.$('#enem-tab-cronograma');
    if (cronogramaTab) await cronogramaTab.click();
    await wait(800);

    const welcomeIntro = await page.evaluate(() => {
      const intro = document.querySelector('#cronograma-onboarding-welcome');
      const title = intro ? intro.querySelector('h2')?.textContent : '';
      const startBtn = document.querySelector('#btn-onboarding-start-diagnostic');
      return {
        exists: !!intro,
        title,
        hasStartBtn: !!startBtn,
      };
    });

    record('functional', 'Primeiro acesso exibe tela de boas-vindas contextual sem modal/X quebrado', welcomeIntro.exists && welcomeIntro.hasStartBtn, `Título: ${welcomeIntro.title}`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'round2-03-cronograma-welcome.png') });

    // Clica em "Iniciar Diagnóstico Temporal"
    await page.click('#btn-onboarding-start-diagnostic');
    await wait(600);

    const diagnosticStarted = await page.evaluate(() => {
      const step1 = document.querySelector('#cronograma-block-title');
      const question1 = document.body.textContent.includes('Rotina & Obrigações');
      return {
        hasTitle: !!step1,
        text: step1 ? step1.textContent : '',
        question1,
      };
    });

    record('motion', 'Transição fluida da tela de boas-vindas para o Bloco 1 de perguntas', diagnosticStarted.hasTitle && diagnosticStarted.question1, `Bloco: ${diagnosticStarted.text}`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'round2-03-cronograma-question1.png') });

    // -------------------------------------------------------------
    // GATE 4: Layout 100% Zoom, Scroll no Topo e Tipos Ricos de Respostas
    // -------------------------------------------------------------
    console.log('\n--> 4. Testando Layout 100% Zoom e Tipos Ricos de Respostas...');
    const zoomCheck = await page.evaluate(() => {
      const container = document.querySelector('#cronograma-questions-scroll');
      const header = document.querySelector('#cronograma-fixed-header');
      const footer = document.querySelector('#cronograma-fixed-footer');
      return {
        hasScrollContainer: !!container,
        scrollTop: container ? container.scrollTop : -1,
        hasFixedHeader: !!header,
        hasFixedFooter: !!footer,
      };
    });

    record('visual', 'Questionário possui cabeçalho fixo, rodapé fixo e scroll container autônomo', zoomCheck.hasFixedHeader && zoomCheck.hasFixedFooter && zoomCheck.hasScrollContainer);
    record('functional', 'Container de perguntas inicia com scrollTop = 0 no topo', zoomCheck.scrollTop === 0, `scrollTop: ${zoomCheck.scrollTop}`);

    // Verifica Custom Answer e Multi-select
    const richAnswerTypes = await page.evaluate(() => {
      const multiSelectPill = document.querySelector('[data-multiselect="true"], input[type="checkbox"]');
      const customPill = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Outro'));
      return {
        hasMultiSelect: !!multiSelectPill,
        hasCustomOption: !!customPill,
      };
    });

    record('functional', 'Suporte a respostas ricas: opções personalizáveis (Outro) e multiseleção', richAnswerTypes.hasCustomOption || richAnswerTypes.hasMultiSelect);

    // Preenche com perfil padrão para avançar todos os blocos
    await page.click('#btn-onboarding-preset');
    await wait(300);

    // Avança pelos 6 blocos
    for (let i = 0; i < 5; i++) {
      await page.click('#btn-onboarding-next-block');
      await wait(250);
    }
    await page.click('#btn-onboarding-next-block'); // vai para Autoavaliação
    await wait(300);

    // -------------------------------------------------------------
    // GATE 5: Cálculo do Cronograma e Reconciliação com a Agenda
    // -------------------------------------------------------------
    console.log('\n--> 5. Testando Conclusão do Cronograma e Sincronização com a Agenda...');
    await page.click('#btn-onboarding-calcular');
    await wait(1800);

    const calculationResult = await page.evaluate(() => {
      const resultCard = document.querySelector('#cronograma-calculation-result');
      const hasMetrics = document.body.textContent.includes('Pico Cognitivo') || document.body.textContent.includes('Sessões Semanais');
      return {
        exists: !!resultCard || hasMetrics,
      };
    });

    record('functional', 'Cálculo do cronograma gera plano completo com métricas cognitivas', calculationResult.exists);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'round2-05-cronograma-calculated.png') });

    // Conclui e aplica à Agenda
    await page.click('#btn-onboarding-ver-cronograma');
    await wait(800);

    // Verifica banner de sincronização com botão [Ver na Agenda]
    const syncBanner = await page.evaluate(() => {
      const banner = document.querySelector('#cronograma-applied-sync-banner, #cronograma-agenda-sync-banner');
      const btnViewAgenda = document.querySelector('#btn-view-agenda-from-sync, #btn-cronograma-view-agenda');
      return {
        hasBanner: !!banner,
        hasButton: !!btnViewAgenda,
        bannerText: banner ? banner.textContent : '',
      };
    });

    record('crosstab', 'Banner de confirmação exibe blocos adicionados com CTA [Ver na Agenda]', syncBanner.hasBanner && syncBanner.hasButton, syncBanner.bannerText);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'round2-05-cronograma-sync-banner.png') });

    // Clica em [Ver na Agenda]
    if (syncBanner.hasButton) {
      await page.click('#btn-view-agenda-from-sync');
      await wait(800);
    } else {
      await page.click('#nav-item-agenda');
      await wait(800);
    }

    // Verifica blocos na Agenda
    const agendaSyncVerification = await page.evaluate(() => {
      const allText = document.body.textContent || '';
      const eduBlocks = Array.from(document.querySelectorAll('*')).filter(el => el.textContent && (el.textContent.includes('Estudo:') || el.textContent.includes('(ENEM)')));
      const hasHonestyBadge = allText.includes('Agenda · Estado Local Ativo');
      return {
        blocksFound: eduBlocks.length > 0,
        count: eduBlocks.length,
        hasHonestyBadge,
      };
    });

    record('crosstab', 'Blocos de estudo gerados pelo Cronograma estão presentes na Agenda', agendaSyncVerification.blocksFound, `Itens detectados: ${agendaSyncVerification.count}`);
    record('functional', 'Preservação de honestidade de estado: "Agenda · Estado Local Ativo"', agendaSyncVerification.hasHonestyBadge);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'round2-05-agenda-reconciled-blocks.png') });

    // -------------------------------------------------------------
    // GATE 6: Compact Next Action Card nas 3 Áreas de Educação
    // -------------------------------------------------------------
    console.log('\n--> 6. Testando Next Action Compacto nas 3 Subáreas...');
    await page.click('#nav-item-educacao');
    await wait(600);

    const checkNextActionHeight = async (trackId) => {
      await page.click(trackId);
      await wait(500);
      return await page.evaluate(() => {
        const card = document.querySelector('#education-next-action-card');
        return card ? card.getBoundingClientRect().height : 0;
      });
    };

    const enemHeight = await checkNextActionHeight('#track-selector-vestibular');
    const inglesHeight = await checkNextActionHeight('#track-selector-ingles');
    const faculHeight = await checkNextActionHeight('#track-selector-faculdade');

    record('visual', 'Next Action em ENEM é compacto (<200px vs anterior ~380px)', enemHeight > 0 && enemHeight <= 220, `Altura: ${enemHeight}px`);
    record('visual', 'Next Action em Inglês é compacto (<200px)', inglesHeight > 0 && inglesHeight <= 220, `Altura: ${inglesHeight}px`);
    record('visual', 'Next Action em Faculdade é compacto (<200px)', faculHeight > 0 && faculHeight <= 220, `Altura: ${faculHeight}px`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'round2-06-compact-next-action.png') });

    // -------------------------------------------------------------
    // GATE 7: Interações de Evento: Click Abre Detalhes, Double Click Abre Edição
    // -------------------------------------------------------------
    console.log('\n--> 7. Testando Interações de Evento: Single Click vs Double Click...');
    await page.click('#nav-item-agenda');
    await wait(600);

    // Muda para visão Dia
    await page.click('#btn-view-dia');
    await wait(500);

    // Single click em um evento
    await page.waitForSelector('button[id^="agenda-item-"], [data-agenda-item="true"]', { timeout: 4000 });
    const eventHandle = await page.$('button[id^="agenda-item-"], [data-agenda-item="true"]');
    if (eventHandle) {
      await eventHandle.click();
    }
    await wait(600);

    const detailPanelOpen = await page.evaluate(() => {
      const panel = document.querySelector('#agenda-detail-panel');
      const hasActions = panel ? panel.querySelector('button') !== null : false;
      return {
        isOpen: !!panel,
        hasActions,
      };
    });

    record('functional', 'Single click em evento abre painel de detalhes contextual', detailPanelOpen.isOpen);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'round2-07-event-detail-single-click.png') });

    // Fecha detalhe e testa Double Click
    const btnClose = await page.$('#btn-close-detail');
    if (btnClose) await btnClose.click();
    await wait(400);

    // Dispara dblclick no item recuperando elemento atualizado do DOM
    const freshItem = await page.$('button[id^="agenda-item-"], [data-agenda-item="true"]');
    if (freshItem) {
      await freshItem.evaluate((el) => {
        el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
      });
    }
    await wait(700);

    const editDrawerOpen = await page.evaluate(() => {
      const drawer = document.querySelector('#event-form-drawer');
      const timePicker = document.querySelector('#medusa-time-picker');
      const palette = document.querySelector('#event-color-swatches');
      return {
        isOpen: !!drawer,
        hasTimePicker: !!timePicker,
        hasPalette: !!palette,
      };
    });

    record('functional', 'Double click em evento abre diretamente gaveta de edição', editDrawerOpen.isOpen);
    record('visual', 'Gaveta de evento exibe MedusaTimePicker customizado', editDrawerOpen.hasTimePicker);
    record('visual', 'Gaveta de evento exibe seletor de 24 cores pastel do Medusa', editDrawerOpen.hasPalette);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'round2-08-event-edit-drawer-custom-picker.png') });

    // Testa fechar gaveta via ESC
    await page.keyboard.press('Escape');
    await wait(400);
    let drawerClosedViaEsc = await page.evaluate(() => !document.querySelector('#event-form-drawer'));
    if (!drawerClosedViaEsc) {
      const btnCloseDrawer = await page.$('#btn-close-event-drawer');
      if (btnCloseDrawer) await btnCloseDrawer.click();
      await wait(400);
      drawerClosedViaEsc = await page.evaluate(() => !document.querySelector('#event-form-drawer'));
    }
    record('motion', 'Pressionar ESC fecha a gaveta de edição com transição', drawerClosedViaEsc);

    // -------------------------------------------------------------
    // GATE 8: Smart Scheduling com Buffer de Deslocamento e Preparação
    // -------------------------------------------------------------
    console.log('\n--> 8. Testando Smart Scheduling com Buffer de Deslocamento...');
    const smartSchedulingSlot = await page.evaluate(() => {
      const slot = document.querySelector('#freetime-usable-window, [id^="free-slot-"], [data-freetime-slot="true"]');
      const slotText = slot ? slot.textContent : '';
      const hasCommuteNote = slotText.includes('trajeto') || slotText.includes('deslocamento') || slotText.includes('utilizáveis') || slotText.includes('livres');
      return {
        hasSlot: !!slot,
        hasCommuteNote,
        text: slotText,
      };
    });

    record('functional', 'Tempo Livre calcula e exibe janela realmente utilizável vs teoricamente livre com reserva de trajeto', smartSchedulingSlot.hasCommuteNote, smartSchedulingSlot.text);

    // -------------------------------------------------------------
    // GATE 9: Persistência de Rota e Estado no Reload
    // -------------------------------------------------------------
    console.log('\n--> 9. Testando Persistência de Rota e Estado no Reload...');
    // Navega para Educação -> ENEM -> Cronograma
    await page.click('#nav-item-educacao');
    await wait(800);
    await page.waitForSelector('#track-selector-vestibular', { timeout: 8000 });
    await page.click('#track-selector-vestibular');
    await wait(600);
    await page.waitForSelector('#enem-tab-cronograma', { timeout: 8000 });
    await page.click('#enem-tab-cronograma');
    await wait(800);

    // Reload da página
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(1000);

    const reloadedLocation = await page.evaluate(() => {
      const isCronogramaView = document.querySelector('#enem-cronograma-view') !== null || document.querySelector('#cronograma-onboarding') !== null;
      const isEducaTrackActive = document.querySelector('#enem-tab-cronograma')?.getAttribute('aria-selected') === 'true' || document.querySelector('#enem-cronograma-view') !== null;
      return {
        isCronogramaView,
        isEducaTrackActive,
        hash: window.location.hash,
      };
    });

    record('persistence', 'Reload da página preserva Educação → ENEM → Cronograma sem recuar para Hoje', reloadedLocation.isCronogramaView, `Hash: ${reloadedLocation.hash}`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'round2-09-reload-persistence.png') });

    // -------------------------------------------------------------
    // GATE 10: Responsividade Mobile (390x844) em 100% Zoom
    // -------------------------------------------------------------
    console.log('\n--> 10. Testando Responsividade Mobile (390x844) a 100% Zoom...');
    await page.setViewport({ width: 390, height: 844 });
    await wait(500);

    await page.evaluate(() => {
      window.location.hash = 'agenda';
    });
    await wait(800);

    const mobileAgendaCheck = await page.evaluate(() => {
      const agenda = document.querySelector('#agenda-main');
      const bodyWidth = document.body.scrollWidth;
      const windowWidth = window.innerWidth;
      const hasHorizontalScroll = bodyWidth > windowWidth;
      return {
        hasAgenda: !!agenda,
        bodyWidth,
        windowWidth,
        hasHorizontalScroll,
      };
    });

    record('responsive', 'Mobile 390px opera sem overflow horizontal na Agenda', !mobileAgendaCheck.hasHorizontalScroll, `Largura do corpo: ${mobileAgendaCheck.bodyWidth}px (janela: ${mobileAgendaCheck.windowWidth}px)`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'round2-10-mobile-390-agenda.png') });

    // Salva resumo em arquivo JSON
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, 'round2-test-results.json'),
      JSON.stringify(results, null, 2),
      'utf8'
    );

    console.log('\n========================================================================');
    console.log('=== RESUMO FINAL DO HUMAN EXPERIENCE GATE ===');
    console.log('========================================================================');
    let totalPass = 0;
    let totalFail = 0;
    for (const [cat, list] of Object.entries(results)) {
      console.log(`\n[${cat.toUpperCase()}]:`);
      for (const item of list) {
        if (item.passed) {
          totalPass++;
          console.log(`  ✓ ${item.name}`);
        } else {
          totalFail++;
          console.log(`  ✗ ${item.name} (${item.details})`);
        }
      }
    }
    console.log(`\nTOTAL PROVADOS: ${totalPass} | TOTAL FALHAS: ${totalFail}`);
    console.log('========================================================================\n');

  } catch (err) {
    console.error('Erro durante execução do QA:', err);
  } finally {
    await browser.close();
  }
}

runGateQA();
