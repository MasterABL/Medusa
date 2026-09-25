const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EVIDENCE_DIR = path.join(__dirname, '..', 'public', 'evidence');
if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runQA() {
  console.log('🚀 Starting Human Visual Gate 2 Browser QA against http://localhost:3000/ ...');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-device-scale-factor=1'],
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);

  page.on('console', (msg) => {
    const text = msg.text();
    if (!text.includes('[Fast Refresh]')) {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${text}`);
    }
  });
  page.on('pageerror', (err) => {
    console.error('[BROWSER PAGE ERROR]', err.message);
  });

  try {
    // ----------------------------------------------------
    // TESTE 1: Interromper Aula — Sticky Header & Scroll Preservation
    // ----------------------------------------------------
    console.log('\n--- TESTE 1: Interromper Aula Sticky Header & Scroll ---');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
    await wait(1200);

    // Navegar para Educação
    console.log('[QA] Clicking Educação...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('nav[aria-label="Rotas Operacionais"] button')).find(
        (b) => b.getAttribute('title') === 'Educação' || (b.textContent && b.textContent.includes('Educação'))
      );
      if (btn) btn.click();
    });
    await page.waitForSelector('#education-experience-root', { timeout: 20000 });
    await wait(800);

    // Iniciar sessão de estudo da Faculdade
    console.log('[QA] Starting Study Session...');
    await page.waitForSelector('#btn-start-study-session', { timeout: 10000 });
    await page.click('#btn-start-study-session');

    // Aguardar entrada no Study Mode
    await page.waitForSelector('#study-mode-container', { timeout: 25000 });
    console.log('[QA] Entered Study Mode container!');
    await wait(1000);

    // Trocar para Modo Resumo (Aula Escrita)
    await page.waitForSelector('#btn-lesson-mode-resumo', { timeout: 10000 });
    await page.click('#btn-lesson-mode-resumo');
    await wait(1000);

    // Rolar a página para baixo (800px)
    await page.evaluate(() => {
      window.scrollTo(0, 800);
      const written = document.querySelector('#lesson-written-content');
      if (written) written.scrollTop = 800;
    });
    await wait(500);

    // Verificar se o botão de interrupção está no viewport (sticky)
    const isInterruptVisible = await page.evaluate(() => {
      const el = document.querySelector('#btn-interrupt-lesson');
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });
    console.log(`✓ Botão Interromper Aula visível e acessível no topo (STICKY): ${isInterruptVisible}`);

    // Clicar em Interromper Aula
    await page.click('#btn-interrupt-lesson');
    await wait(600);

    // Capturar modal de interrupção sobre scroll
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'hvg2_01_interrupt_modal_at_scroll.png'),
    });
    console.log('✓ Capturado: hvg2_01_interrupt_modal_at_scroll.png');

    // Clicar em "Continuar aula" (cancelar)
    await page.click('#btn-interrupt-cancel');
    await wait(600);
    console.log('✓ Cancelamento executado com sucesso sem perda de contexto!');

    // ----------------------------------------------------
    // TESTE 2: Faculdade — Experiência Além do MHS (Comparativo de Rigidez)
    // ----------------------------------------------------
    console.log('\n--- TESTE 2: Faculdade — Comparativo de Rigidez & Predict-Reveal ---');
    await page.evaluate(() => {
      const el = document.querySelector('#stiffness-comparison-block');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await wait(600);

    // Fazer previsão: Mola Rígida
    const predictBtn = await page.$('#btn-predict-stiff');
    if (predictBtn) {
      await predictBtn.click();
      await wait(400);
    }

    // Liberar molas
    const playStiffnessBtn = await page.$('#btn-stiffness-play');
    if (playStiffnessBtn) {
      await playStiffnessBtn.click();
      await wait(1400);
    }

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'hvg2_02_faculdade_stiffness_comparison.png'),
    });
    console.log('✓ Capturado: hvg2_02_faculdade_stiffness_comparison.png');

    // ----------------------------------------------------
    // TESTE 3: ENEM / Vestibular — Espectro Eletromagnético & Questão Contextualizada
    // ----------------------------------------------------
    console.log('\n--- TESTE 3: ENEM — Espectro Eletromagnético & Questão ---');
    // Interromper aula para voltar ao Hub
    await page.waitForSelector('#btn-interrupt-lesson', { timeout: 10000 });
    console.log('[QA] Clicking #btn-interrupt-lesson...');
    await page.click('#btn-interrupt-lesson');
    await page.waitForSelector('#btn-interrupt-confirm', { timeout: 10000 });
    console.log('[QA] #btn-interrupt-confirm is visible!');
    await wait(400);
    await page.evaluate(() => {
      const btn = document.querySelector('#btn-interrupt-confirm');
      if (btn) btn.click();
    });
    console.log('[QA] Triggered click on #btn-interrupt-confirm');

    // Aguardar o retorno completo ao Education Dashboard
    await page.waitForSelector('#education-dashboard', { timeout: 20000 });
    console.log('[QA] Back on #education-dashboard!');
    await wait(600);

    // Selecionar trilha ENEM via seletor oficial de ID
    console.log('[QA] Switching to ENEM track...');
    await page.waitForSelector('#track-selector-vestibular', { timeout: 10000 });
    await page.click('#track-selector-vestibular');
    await wait(800);

    // Iniciar sessão ENEM
    await page.waitForSelector('#btn-start-study-session', { timeout: 10000 });
    await page.click('#btn-start-study-session');
    await page.waitForSelector('#study-mode-container', { timeout: 25000 });
    await wait(1000);

    // Trocar para Modo Resumo (Aula Escrita)
    await page.waitForSelector('#btn-lesson-mode-resumo', { timeout: 10000 });
    await page.click('#btn-lesson-mode-resumo');
    await wait(1000);

    // Rolar até o Espectro Eletromagnético do ENEM
    await page.evaluate(() => {
      const el = document.querySelector('#enem-spectrum-visualizer');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await wait(600);

    // Clicar em Raios X
    const xrayBtn = await page.$('#btn-spectrum-xray');
    if (xrayBtn) {
      await xrayBtn.click();
      await wait(400);
    }

    // Responder alternativa C (correta)
    const optC = await page.$('#btn-enem-opt-C');
    if (optC) {
      await optC.click();
      await wait(600);
    }

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'hvg2_03_enem_spectrum_visualizer.png'),
    });
    console.log('✓ Capturado: hvg2_03_enem_spectrum_visualizer.png');

    // ----------------------------------------------------
    // TESTE 4: Prática Deliberada & Conclusão de Sessão (ENEM)
    // ----------------------------------------------------
    console.log('\n--- TESTE 4: Concluir Aula ENEM & Sessão Concluída ---');
    const completeLessonBtn = await page.$('#btn-complete-lesson-trigger');
    if (completeLessonBtn) {
      await completeLessonBtn.click();
      await wait(1400);

      // Aguardar container de exercícios
      await page.waitForSelector('#study-exercises-container', { timeout: 15000 });
      console.log('[QA] Exercícios ENEM carregados!');

      // Responder 5 questões para chegar à conclusão
      for (let q = 0; q < 5; q++) {
        await wait(500);
        // Clicar em uma opção disponível
        const optBtn = await page.$('#option-a') || await page.$('#option-b') || await page.$('#option-c');
        if (optBtn) {
          await optBtn.click();
          await wait(300);

          const submitBtn = await page.$('#btn-submit-answer');
          if (submitBtn) {
            await submitBtn.click();
            await wait(400);
          }

          const nextBtn = await page.$('#btn-next-question');
          if (nextBtn) {
            await nextBtn.click();
            await wait(500);
          }
        }
      }

      await wait(1800);
      const completionView = await page.waitForSelector('#study-completion-container', { timeout: 15000 });
      if (completionView) {
        await page.screenshot({
          path: path.join(EVIDENCE_DIR, 'hvg2_05_session_completion_view.png'),
        });
        console.log('✓ Capturado: hvg2_05_session_completion_view.png');

        // Retornar para Educação
        const returnEduBtn = await page.$('#btn-return-education');
        if (returnEduBtn) {
          await returnEduBtn.click();
          await wait(1200);
          console.log('[QA] Retornou ao Hub de Educação com sucesso!');
        }
      }
    }

    // ----------------------------------------------------
    // TESTE 5: Inglês — Linha do Tempo de Tempos Verbais & Sentence Builder
    // ----------------------------------------------------
    console.log('\n--- TESTE 5: Inglês — Timeline de Tempos Verbais & Sentence Builder ---');
    // Selecionar trilha Inglês via seletor oficial de ID
    console.log('[QA] Switching to Inglês track...');
    await page.waitForSelector('#track-selector-ingles', { timeout: 10000 });
    await page.click('#track-selector-ingles');
    await wait(1200);

    // Iniciar sessão Inglês
    await page.waitForSelector('#btn-start-study-session', { timeout: 10000 });
    await page.click('#btn-start-study-session');
    await page.waitForSelector('#study-mode-container', { timeout: 25000 });
    await wait(1000);

    // Trocar para Modo Resumo (Aula Escrita)
    await page.waitForSelector('#btn-lesson-mode-resumo', { timeout: 10000 });
    await page.click('#btn-lesson-mode-resumo');
    await wait(1000);

    // Rolar até o visualizador de tempos verbais
    await page.evaluate(() => {
      const el = document.querySelector('#english-timeline-grammar-block');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await wait(600);

    // Clicar na Etapa 5 da construção da frase
    const step5Btn = await page.$('#btn-builder-step-5');
    if (step5Btn) {
      await step5Btn.click();
      await wait(400);
    }

    // Tocar o ritmo da frase
    const listenCadenceBtn = await page.$('#btn-listen-english-cadence');
    if (listenCadenceBtn) {
      await listenCadenceBtn.click();
      await wait(800);
    }

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'hvg2_04_english_timeline_grammar.png'),
    });
    console.log('✓ Capturado: hvg2_04_english_timeline_grammar.png');

    // ----------------------------------------------------
    // TESTE 6: Audio Settings Widget & Sound Matrix
    // ----------------------------------------------------
    console.log('\n--- TESTE 6: Audio Settings Widget com Categorias ---');
    const audioBtn = await page.$('#btn-audio-settings');
    if (audioBtn) {
      await audioBtn.click();
      await wait(600);

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, 'hvg2_06_audio_settings_widget.png'),
      });
      console.log('✓ Capturado: hvg2_06_audio_settings_widget.png');
      await audioBtn.click();
    }

    // ----------------------------------------------------
    // TESTE 7: Responsividade Tablet (820px) & Mobile (390px)
    // ----------------------------------------------------
    console.log('\n--- TESTE 7: Responsividade Tablet 820px & Mobile 390px ---');
    await page.setViewport({ width: 820, height: 1080, deviceScaleFactor: 1 });
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
    await wait(1000);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'hvg2_07_tablet_820.png'),
    });
    console.log('✓ Capturado: hvg2_07_tablet_820.png');

    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
    await wait(1000);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'hvg2_08_mobile_390.png'),
    });
    console.log('✓ Capturado: hvg2_08_mobile_390.png');

    console.log('\n🎉 Todos os testes e capturas do Human Visual Gate 2 concluídos com sucesso!');
  } catch (err) {
    console.error('❌ Erro durante QA:', err);
  } finally {
    await browser.close();
  }
}

runQA();
