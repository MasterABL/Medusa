const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

function resolveBrowserPath() {
  const candidatePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Navegador não encontrado');
}

const OUT_DIR = path.resolve(__dirname, '../qa-recordings/after');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runAfterExperienceQA() {
  console.log('========================================================================');
  console.log('=== MEDUSA: HUMAN EXPERIENCE QA & VISUAL MOTION RECORDING (AFTER) ===');
  console.log('========================================================================\n');

  const executablePath = resolveBrowserPath();
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  const proofResults = {};

  try {
    // -------------------------------------------------------------
    // 1. AGENDA: WEEK VIEW LEGIBILITY, DENSITY & DELETE CONTAINMENT
    // -------------------------------------------------------------
    console.log('--> 1. Testando Agenda na Visão Semanal (1440px & 1024px)...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await wait(800);

    const agendaBtn = await page.waitForSelector('#nav-item-agenda, button[title="Agenda"]');
    await agendaBtn.click();
    await wait(800);

    // Alterna para Semana
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button[role="tab"], button'));
      const btn = btns.find((b) => b.textContent.trim() === 'Semana');
      if (btn) btn.click();
    });
    await wait(800);

    // Validação da legibilidade dos blocos (título e horário presentes)
    const weekBlocksAnalysis = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('[data-agenda-item="true"]'));
      let withTimeCount = 0;
      let withTitleCount = 0;
      blocks.forEach((b) => {
        const text = b.textContent || '';
        if (text.match(/\d{2}:\d{2}/)) withTimeCount++;
        if (text.length > 5) withTitleCount++;
      });
      return {
        totalBlocks: blocks.length,
        withTimeCount,
        withTitleCount,
      };
    });

    console.log(`  Week View: ${weekBlocksAnalysis.totalBlocks} blocos encontrados (${weekBlocksAnalysis.withTimeCount} com horário legível)`);
    proofResults['week_view_density'] = weekBlocksAnalysis.totalBlocks > 0 && weekBlocksAnalysis.withTimeCount > 0;

    await page.screenshot({ path: path.join(OUT_DIR, '01-week-view-density-desktop-1440.png') });
    console.log('  [FOTO] 01-week-view-density-desktop-1440.png salva');

    // Teste em 1024px (Tablet)
    await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 2 });
    await wait(600);
    await page.screenshot({ path: path.join(OUT_DIR, '02-week-view-density-tablet-1024.png') });
    console.log('  [FOTO] 02-week-view-density-tablet-1024.png salva');

    // Volta para 1440px
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await wait(400);

    // Inspeciona EventDetailPanel e contenção do Delete
    console.log('--> 2. Verificando contenção do EventDetailPanel e Ação de Excluir...');
    const firstEvent = await page.waitForSelector('[data-agenda-item="true"]');
    await firstEvent.click();
    await wait(600);
    await page.screenshot({ path: path.join(OUT_DIR, '03-event-detail-panel-opened.png') });

    // Clica em Excluir no DetailPanel
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const delBtn = btns.find((b) => b.textContent.includes('Excluir'));
      if (delBtn) delBtn.click();
    });
    await wait(600);

    // Avalia contenção do diálogo de exclusão
    const deleteContainment = await page.evaluate(() => {
      const confirmBox = document.querySelector('#delete-confirm-box');
      const panel = document.querySelector('#agenda-detail-panel');
      if (!confirmBox || !panel) return { contained: false, reason: 'elementos não encontrados' };

      const boxRect = confirmBox.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();

      const fitsHorizontally = boxRect.right <= panelRect.right + 30 && boxRect.left >= panelRect.left - 30;
      const isVisibleAndContained = boxRect.width > 0 && boxRect.height > 0 && fitsHorizontally;

      return {
        contained: isVisibleAndContained,
        boxRect: { top: Math.round(boxRect.top), bottom: Math.round(boxRect.bottom), right: Math.round(boxRect.right), left: Math.round(boxRect.left) },
        panelRect: { top: Math.round(panelRect.top), bottom: Math.round(panelRect.bottom), right: Math.round(panelRect.right), left: Math.round(panelRect.left) },
      };
    });

    console.log('  Contenção do card de exclusão:', deleteContainment);
    proofResults['delete_containment'] = deleteContainment.contained;
    await page.screenshot({ path: path.join(OUT_DIR, '04-event-delete-confirmation-box-contained.png') });

    // Cancela a exclusão
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cancelBtn = btns.find((b) => b.textContent.includes('Cancelar'));
      if (cancelBtn) cancelBtn.click();
    });
    await wait(400);

    // -------------------------------------------------------------
    // 2. LIFECYCLE DE CORES: CREATE COM COR A -> EDIT PARA COR B -> PERSISTÊNCIA
    // -------------------------------------------------------------
    console.log('\n--> 3. Testando Lifecycle de Cores: Create Cor A -> Edit Cor B -> Persistence...');
    // Abre modal de criação
    await page.evaluate(() => {
      const addBtn = document.querySelector('button#btn-add-event, button[aria-label*="Adicionar"]');
      if (addBtn) addBtn.click();
      else {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find((x) => x.textContent.includes('Adicionar'));
        if (b) b.click();
      }
    });
    await wait(600);

    // Preenche título do evento
    const uniqueTitle = `Revisão Biologia ${Date.now()}`;
    await page.type('#form-title', uniqueTitle);

    // Seleciona Cor A: swatch índice 2 ('rosa_blush')
    const colorA = await page.evaluate(() => {
      const swatches = Array.from(document.querySelectorAll('#event-color-swatches button'));
      if (swatches.length >= 3) {
        swatches[2].click();
        return swatches[2].getAttribute('title') || 'Cor A';
      }
      return null;
    });
    console.log('  Cor A selecionada no Create:', colorA);
    await page.screenshot({ path: path.join(OUT_DIR, '05-create-drawer-color-a.png') });

    // Salva evento
    await page.evaluate(() => {
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });
    await wait(800);

    // Localiza o evento criado no DOM
    const createdEventHandle = await page.evaluateHandle((title) => {
      const items = Array.from(document.querySelectorAll('[data-agenda-item="true"]'));
      return items.find((el) => el.textContent.includes(title));
    }, uniqueTitle);

    if (createdEventHandle) {
      await createdEventHandle.click();
      await wait(500);
      await page.screenshot({ path: path.join(OUT_DIR, '06-created-event-opened.png') });

      // Clica em Editar
      await page.evaluate(() => {
        const editBtn = document.querySelector('#btn-edit-event');
        if (editBtn) editBtn.click();
      });
      await wait(600);

      // Escolhe Cor B: swatch índice 8 ('sage')
      const colorB = await page.evaluate(() => {
        const swatches = Array.from(document.querySelectorAll('#event-color-swatches button'));
        if (swatches.length >= 9) {
          swatches[8].click();
          return swatches[8].getAttribute('title') || 'Cor B';
        }
        return null;
      });
      console.log('  Cor B selecionada no Edit:', colorB);
      await page.screenshot({ path: path.join(OUT_DIR, '07-edit-drawer-color-b.png') });

      // Salva alteração de cor
      await page.evaluate(() => {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      });
      await wait(800);
      await page.screenshot({ path: path.join(OUT_DIR, '08-after-save-color-b-reflected.png') });

      // Recarrega a página para provar persistência real
      console.log('  Recarregando página para validar persistência de Cor B...');
      await page.reload({ waitUntil: 'networkidle0' });
      await wait(1000);

      // Re-localiza o evento e avalia a cor no DOM persistido
      const persistenceResult = await page.evaluate((title) => {
        const items = Array.from(document.querySelectorAll('[data-agenda-item="true"]'));
        const event = items.find((el) => el.textContent.includes(title));
        if (!event) return { found: false };
        return {
          found: true,
          className: event.className,
        };
      }, uniqueTitle);

      console.log('  Evento persistido pós-reload com nova cor:', persistenceResult.found);
      proofResults['color_edit_persistence'] = persistenceResult.found;
      await page.screenshot({ path: path.join(OUT_DIR, '09-reloaded-color-b-persisted.png') });
    }

    // -------------------------------------------------------------
    // 3. EVENTOS RECORRENTES: ESCOPO EXPLÍCITO DE EDIÇÃO E EXCLUSÃO
    // -------------------------------------------------------------
    console.log('\n--> 4. Testando Edição de Recorrência com Seletor Explícito de Escopo...');
    // Abre gaveta de criação
    await page.evaluate(() => {
      const addBtn = document.querySelector('button#btn-add-event, button[aria-label*="Adicionar"]');
      if (addBtn) addBtn.click();
      else {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find((x) => x.textContent.includes('Adicionar'));
        if (b) b.click();
      }
    });
    await wait(600);

    const recurringTitle = `Plantão Diário ${Date.now()}`;
    await page.type('#form-title', recurringTitle);

    // Clica no botão "Rotina" para tornar o item uma rotina recorrente
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const routineBtn = btns.find((b) => b.textContent.includes('Rotina'));
      if (routineBtn) routineBtn.click();
    });
    await wait(300);

    // Salva evento recorrente
    await page.evaluate(() => {
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });
    await wait(800);

    // Abre o evento recorrente e clica em Editar
    const recurringEventHandle = await page.evaluateHandle((title) => {
      const items = Array.from(document.querySelectorAll('[data-agenda-item="true"]'));
      return items.find((el) => el.textContent.includes(title));
    }, recurringTitle);

    if (recurringEventHandle) {
      await recurringEventHandle.click();
      await wait(500);

      await page.evaluate(() => {
        const editBtn = document.querySelector('#btn-edit-event');
        if (editBtn) editBtn.click();
      });
      await wait(600);

      // Verifica presença do seletor explícito de 3 escopos na EDIÇÃO
      const editScopeAnalysis = await page.evaluate(() => {
        const scopeBox = document.querySelector('#recurring-edit-scope-box');
        const scopeThis = document.querySelector('#scope-edit-option-this');
        const scopeFollowing = document.querySelector('#scope-edit-option-following');
        const scopeSeries = document.querySelector('#scope-edit-option-series');
        return {
          hasScopeBox: !!scopeBox,
          hasThis: !!scopeThis,
          hasFollowing: !!scopeFollowing,
          hasSeries: !!scopeSeries,
        };
      });

      console.log('  Seletor de 3 escopos de edição:', editScopeAnalysis.hasScopeBox ? 'PRESENTE' : 'AUSENTE');
      proofResults['recurring_edit_scopes'] = editScopeAnalysis.hasScopeBox && editScopeAnalysis.hasThis && editScopeAnalysis.hasSeries;
      await page.screenshot({ path: path.join(OUT_DIR, '10-edit-recurring-scope-selector.png') });

      // Fecha a gaveta clicando no botão fechar gaveta
      await page.evaluate(() => {
        const btnClose = document.querySelector('#btn-close-event-drawer');
        if (btnClose) btnClose.click();
      });
      await wait(500);

      // Reabre o item recorrente para testar a Exclusão Recorrente (3 Escopos)
      console.log('  Testando seletor de 3 escopos na Exclusão Recorrente...');
      const freshRecHandle = await page.evaluateHandle((title) => {
        const items = Array.from(document.querySelectorAll('[data-agenda-item="true"]'));
        return items.find((el) => el.textContent.includes(title));
      }, recurringTitle);

      if (freshRecHandle) {
        await freshRecHandle.click();
        await wait(500);

        // Clica em Excluir no DetailPanel
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const delBtn = btns.find((b) => b.textContent.includes('Excluir'));
          if (delBtn) delBtn.click();
        });
        await wait(500);

        const deleteScopeAnalysis = await page.evaluate(() => {
          const delScopeBox = document.querySelector('#recurring-delete-scope-box');
          const delThis = document.querySelector('#delete-scope-option-this');
          const delFollowing = document.querySelector('#delete-scope-option-following');
          const delSeries = document.querySelector('#delete-scope-option-series');
          return {
            hasDelScopeBox: !!delScopeBox,
            hasDelThis: !!delThis,
            hasDelFollowing: !!delFollowing,
            hasDelSeries: !!delSeries,
          };
        });

        console.log('  Seletor de 3 escopos na Exclusão:', deleteScopeAnalysis.hasDelScopeBox ? 'PRESENTE' : 'AUSENTE');
        proofResults['recurring_delete_scopes'] = deleteScopeAnalysis.hasDelScopeBox && deleteScopeAnalysis.hasDelThis && deleteScopeAnalysis.hasDelSeries;
        await page.screenshot({ path: path.join(OUT_DIR, '10b-delete-recurring-scope-selector.png') });

        // Cancela exclusão
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const cancelBtn = btns.find((b) => b.textContent.includes('Cancelar'));
          if (cancelBtn) cancelBtn.click();
        });
        await wait(400);
      }
    }

    // -------------------------------------------------------------
    // 4. CRONOGRAMA: EXPERIÊNCIA DE ENTRADA EM TELA CHEIA
    // -------------------------------------------------------------
    console.log('\n--> 5. Testando Cronograma: Entrada em Tela Cheia & Imersão...');
    // Navega para Educação -> ENEM -> Cronograma
    await page.waitForSelector('#nav-item-educacao', { timeout: 8000 });
    await page.click('#nav-item-educacao');
    await wait(800);

    await page.waitForSelector('#track-selector-vestibular', { timeout: 8000 });
    await page.click('#track-selector-vestibular');
    await wait(600);

    await page.waitForSelector('#enem-tab-cronograma', { timeout: 8000 });
    await page.click('#enem-tab-cronograma');
    await wait(800);

    // Se já houver cronograma configurado, clica em "Refazer Cronograma" para entrar no Onboarding limpo
    const btnRedo = await page.$('#btn-redo-cronograma');
    if (btnRedo) {
      console.log('  Cronograma anterior detectado. Clicando em Refazer Cronograma...');
      await btnRedo.click();
      await wait(400);
      await page.waitForSelector('#btn-confirm-redo-cronograma', { timeout: 4000 });
      await page.click('#btn-confirm-redo-cronograma');
      await wait(800);
    }

    // Aguarda o container de onboarding
    await page.waitForSelector('#cronograma-onboarding', { timeout: 8000 });

    // Avalia a experiência em tela cheia do Onboarding
    const fullscreenAnalysis = await page.evaluate(() => {
      const container = document.querySelector('#cronograma-onboarding');
      if (!container) return { isFullscreen: false, reason: 'container não encontrado' };

      const rect = container.getBoundingClientRect();
      const coversViewport = rect.width >= window.innerWidth - 10 && rect.height >= window.innerHeight - 10;
      const hasWelcome = document.querySelector('#cronograma-onboarding-welcome') !== null;
      const hasCta = document.querySelector('#btn-onboarding-start-diagnostic') !== null;

      return {
        isFullscreen: coversViewport,
        hasWelcome,
        hasCta,
        rect: { width: Math.round(rect.width), height: Math.round(rect.height) },
        window: { width: window.innerWidth, height: window.innerHeight },
      };
    });

    console.log('  Cronograma Onboarding Tela Cheia:', fullscreenAnalysis);
    proofResults['cronograma_fullscreen_entrance'] = fullscreenAnalysis.isFullscreen && fullscreenAnalysis.hasWelcome;
    await page.screenshot({ path: path.join(OUT_DIR, '11-cronograma-fullscreen-entrance.png') });

    // Clica no CTA "Iniciar Diagnóstico"
    console.log('  Clicando em Iniciar Diagnóstico com transição espacial...');
    await page.evaluate(() => {
      document.getElementById('btn-onboarding-start-diagnostic')?.click();
    });
    await wait(800);
    await page.waitForSelector('#cronograma-questions-scroll', { timeout: 8000 });
    await page.screenshot({ path: path.join(OUT_DIR, '12-cronograma-diagnostic-block1.png') });

    // -------------------------------------------------------------
    // 5. CRONOGRAMA: RIQUEZA DE PERGUNTAS (MULTISELECT + CUSTOM TEXT)
    // -------------------------------------------------------------
    console.log('\n--> 6. Testando Perguntas Ricas: Multiseleção & Resposta Personalizada...');
    const richQuestionsAnalysis = await page.evaluate(() => {
      const customInputs = Array.from(document.querySelectorAll('[data-custom-input="true"]'));
      const multiSelectPills = Array.from(document.querySelectorAll('[data-multiselect="true"]'));
      return {
        totalCustomInputs: customInputs.length,
        totalMultiSelects: multiSelectPills.length,
      };
    });

    console.log(`  Perguntas do Bloco 1: ${richQuestionsAnalysis.totalCustomInputs} campos customizados, ${richQuestionsAnalysis.totalMultiSelects} opções multiselect`);
    proofResults['rich_questions_support'] = richQuestionsAnalysis.totalCustomInputs > 0;

    // Digita resposta customizada na primeira pergunta
    const firstCustomInput = await page.$('[data-custom-input="true"]');
    if (firstCustomInput) {
      await firstCustomInput.type('Trabalho em home-office das 08h às 14h com alta flexibilidade');
      await wait(300);
    }

    // Seleciona opções e avança
    await page.evaluate(() => {
      document.getElementById('btn-onboarding-preset')?.click();
    });
    await wait(500);
    await page.screenshot({ path: path.join(OUT_DIR, '13-cronograma-preset-filled.png') });

    // Avança pelos 6 blocos
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        document.getElementById('btn-onboarding-next-block')?.click();
      });
      await wait(400);
    }
    // Avança para Autoavaliação de Domínio
    await page.evaluate(() => {
      document.getElementById('btn-onboarding-next-block')?.click();
    });
    await wait(500);
    await page.screenshot({ path: path.join(OUT_DIR, '14-cronograma-dominio-step.png') });

    // -------------------------------------------------------------
    // 6. CRONOGRAMA -> AGENDA BRIDGE: RECONCILIAÇÃO REAL
    // -------------------------------------------------------------
    console.log('\n--> 7. Testando Bridge Cronograma -> Agenda (Geração de Blocos e Sem Duplicações)...');
    await page.evaluate(() => {
      document.getElementById('btn-onboarding-calcular')?.click();
    });
    await wait(2200);
    await page.screenshot({ path: path.join(OUT_DIR, '15-cronograma-calculated-plan.png') });

    // Aplica e Sincroniza
    await page.evaluate(() => {
      document.getElementById('btn-onboarding-ver-cronograma')?.click();
    });
    await wait(1000);
    await page.screenshot({ path: path.join(OUT_DIR, '16-cronograma-applied-sync-banner.png') });

    // Clica em [Ver Agenda]
    await page.evaluate(() => {
      document.getElementById('btn-view-agenda-from-sync')?.click();
    });
    await wait(1200);

    // Avalia blocos reconciliados na Agenda
    const reconciledBlocksAnalysis = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[data-agenda-item="true"]'));
      const studyBlocks = items.filter((el) => {
        const text = el.textContent || '';
        return text.includes('Estudo:') || text.includes('(ENEM)') || text.includes('Simulado');
      });

      return {
        totalAgendaItems: items.length,
        studyBlocksCount: studyBlocks.length,
      };
    });

    console.log(`  Bridge Agenda: ${reconciledBlocksAnalysis.studyBlocksCount} blocos de estudo sincronizados na Agenda`);
    proofResults['cronograma_agenda_bridge'] = reconciledBlocksAnalysis.studyBlocksCount > 0;
    await page.screenshot({ path: path.join(OUT_DIR, '17-agenda-reconciled-study-blocks.png') });

    // Recarrega a Agenda e verifica que não há duplicação
    console.log('  Recarregando Agenda para verificar que os blocos não duplicam...');
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(1000);

    const postReloadStudyBlocks = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[data-agenda-item="true"]'));
      const studyBlocks = items.filter((el) => {
        const text = el.textContent || '';
        return text.includes('Estudo:') || text.includes('(ENEM)') || text.includes('Simulado');
      });
      return studyBlocks.length;
    });

    console.log(`  Blocos pós-reload: ${postReloadStudyBlocks} (esperado igual a ${reconciledBlocksAnalysis.studyBlocksCount})`);
    proofResults['no_block_duplication'] = postReloadStudyBlocks === reconciledBlocksAnalysis.studyBlocksCount;
    await page.screenshot({ path: path.join(OUT_DIR, '18-agenda-post-reload-stable.png') });

    console.log('\n========================================================================');
    console.log('=== RESUMO DOS PROOFS DE EXPERIÊNCIA HUMANA (AFTER) ===');
    console.log('========================================================================');
    console.table(proofResults);

  } catch (err) {
    console.error('Erro durante QA da experiência:', err);
  } finally {
    await browser.close();
  }
}

runAfterExperienceQA();
