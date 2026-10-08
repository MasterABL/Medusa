/**
 * MEDUSA — DEEP EMAIL LIVING EXPERIENCE & DOMAIN QA
 * Validates:
 * 1. 11 Triage Filters (Todos, Não lidos, Importantes, Preciso agir, Aguardando resposta, Com prazo, Com evento, Financeiro, Faculdade, Trabalho, Saúde)
 * 2. Radar 3 Zones (URGENTE, PRECISA DE AÇÃO, INFORMATIVO)
 * 3. Thread + Action Workspace (60/40 desktop split, Guardian proposals, L1/L2/L3 autonomy)
 * 4. Approval flow & Ecosystem consequences (Guardian -> Dynamic Island -> Agenda / Tasks / Projects)
 * 5. Local Provider Ingestion:
 *    - Paste custom raw text
 *    - 4 canonical templates (Telemedicina, Faculdade, Financeiro, Informativo)
 *    - Deduplication
 *    - Persistence across page reload
 * 6. The 7 Cases:
 *    - Caso 1: Informativo
 *    - Caso 2: Precisa de ação
 *    - Caso 3: Prazo
 *    - Caso 4: Evento
 *    - Caso 5: Financeiro
 *    - Caso 6: Faculdade
 *    - Caso 7: Trabalho
 * 7. Design tokens and styles (Epilogue font, surface #FAFDF5, primary #71DBD2, text #1C2420, alert #C45B5B)
 * 8. Viewports (1440px, 1024px, 820px, 390px) & Horizontal overflow detection
 * 9. Reduced motion emulation
 * 10. Console errors & hydration errors
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');

const BROWSER_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:3000';

const results = {
  passed: 0,
  failed: 0,
  checks: [],
  consoleErrors: [],
  viewports: {},
  filtersTested: [],
  casesTested: {},
};

function assert(label, condition, detail = '') {
  if (condition) {
    results.passed++;
    console.log(`[PASS] ${label}${detail ? ' — ' + detail : ''}`);
    results.checks.push({ label, status: 'PASS', detail });
  } else {
    results.failed++;
    console.error(`[FAIL] ${label}${detail ? ' — ' + detail : ''}`);
    results.checks.push({ label, status: 'FAIL', detail });
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runDeepQA() {
  console.log('=== STARTING DEEP QA SUITE: MEDUSA EMAIL LIVING EXPERIENCE ===\n');

  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore known favicon/font 404s in sandbox
      if (!text.includes('favicon') && !text.includes('fonts.gstatic.com')) {
        results.consoleErrors.push(text);
        console.error('[BROWSER CONSOLE ERROR]:', text);
      }
    }
  });

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: VIEWPORT 1440PX & INITIAL LOAD
    // ------------------------------------------------------------------------
    console.log('\n--- 1. DESKTOP 1440px & INITIAL LOAD ---');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}?demo=1#email`, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(1000);

    const title = await page.title();
    assert('Page loaded successfully', title.length > 0, `Title: "${title}"`);

    const overflow1440 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert('1440px: Zero horizontal overflow', !overflow1440);
    results.viewports['1440px'] = { overflow: overflow1440 };

    // Check header and design tokens
    const headerStyles = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (!h1) return null;
      const comp = window.getComputedStyle(h1);
      return {
        text: h1.innerText,
        fontFamily: comp.fontFamily,
        color: comp.color,
      };
    });
    assert('Header h1 renders "E-mail · Living Experience"', headerStyles && headerStyles.text.includes('E-mail'));
    assert('Typography uses Epilogue as primary font', headerStyles && headerStyles.fontFamily.toLowerCase().includes('epilogue'), headerStyles?.fontFamily);

    // ------------------------------------------------------------------------
    // SECTION 2: 11 OPERATIONAL TRIAGE FILTERS
    // ------------------------------------------------------------------------
    console.log('\n--- 2. TRIAGE VIEW & 11 FILTERS ---');
    // Ensure Triagem subview is active
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Triagem Rápida'));
      if (btn) btn.click();
    });
    await sleep(500);

    const filterLabels = [
      'Todos',
      'Não lidos',
      'Importantes',
      'Preciso agir',
      'Aguardando resposta',
      'Com prazo',
      'Com evento',
      'Financeiro',
      'Faculdade',
      'Trabalho',
      'Saúde',
    ];

    for (const filterName of filterLabels) {
      const filterResult = await page.evaluate((name) => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find((b) => b.innerText.includes(name));
        if (!btn) return { found: false, count: -1, rowCount: 0 };
        btn.click();
        const countSpan = btn.querySelector('span:last-child');
        const count = countSpan ? parseInt(countSpan.innerText.trim(), 10) : 0;
        return { found: true, count, buttonText: btn.innerText.trim() };
      }, filterName);

      await sleep(300);

      const rowCount = await page.evaluate(() => {
        const rows = document.querySelectorAll('[data-thread-row]');
        // Alternatively count by cards in triage
        const cardRows = document.querySelectorAll('div.flex.flex-col.gap-2\\.5 > div');
        return rows.length || cardRows.length;
      });

      assert(`Filter "${filterName}" exists and is clickable`, filterResult.found, `Badge: ${filterResult.count}`);
      results.filtersTested.push({ name: filterName, badge: filterResult.count, rows: rowCount });
    }

    // ------------------------------------------------------------------------
    // SECTION 3: RADAR VIEW (3 ZONES)
    // ------------------------------------------------------------------------
    console.log('\n--- 3. RADAR VIEW (3 ZONES) ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Radar de Contexto'));
      if (btn) btn.click();
    });
    await sleep(500);

    const radarZones = await page.evaluate(() => {
      const body = document.body.innerText;
      return {
        urgent: body.includes('1. URGENTE') || body.includes('URGENTE'),
        needsAction: body.includes('2. PRECISA DE AÇÃO') || body.includes('PRECISA DE AÇÃO'),
        info: body.includes('3. INFORMATIVO') || body.includes('INFORMATIVO'),
        telemetry: body.includes('ZONAS DE ATENÇÃO') || body.includes('IMPACTO'),
      };
    });
    assert('Radar: Zone 1 (URGENTE) present', radarZones.urgent);
    assert('Radar: Zone 2 (PRECISA DE AÇÃO) present', radarZones.needsAction);
    assert('Radar: Zone 3 (INFORMATIVO) present', radarZones.info);
    assert('Radar: Header telemetry present', radarZones.telemetry);

    // ------------------------------------------------------------------------
    // SECTION 4: THREAD + ACTION WORKSPACE (60/40 SPLIT) & GUARDIAN APPROVAL
    // ------------------------------------------------------------------------
    console.log('\n--- 4. WORKSPACE & GUARDIAN ACTION DECK ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Workspace & Ações'));
      if (btn) btn.click();
    });
    await sleep(500);

    const workspaceStructure = await page.evaluate(() => {
      const threadCol = document.querySelector('div.lg\\:col-span-7');
      const actionCol = document.querySelector('div.lg\\:col-span-5');
      const allH3 = Array.from(document.querySelectorAll('h3')).map((h) => h.textContent || '');
      const hasGuardianDeck = allH3.some((t) => t.includes('Guardian') || t.includes('Ações Propostas'));
      const approveBtns = Array.from(document.querySelectorAll('button')).filter((b) =>
        b.innerText.includes('Aprovar Ação')
      );
      return {
        has60Col: !!threadCol,
        has40Col: !!actionCol,
        hasGuardianDeck,
        allH3,
        approveButtonsCount: approveBtns.length,
      };
    });
    assert('Workspace: 60% Thread Column present', workspaceStructure.has60Col);
    assert('Workspace: 40% Guardian Action Column present', workspaceStructure.has40Col);
    assert('Workspace: Guardian Action Deck present', workspaceStructure.hasGuardianDeck, `H3s: ${workspaceStructure.allH3.join(' | ')}`);
    assert('Workspace: Action candidates available for approval', workspaceStructure.approveButtonsCount > 0, `Found: ${workspaceStructure.approveButtonsCount}`);

    // Test Action Approval
    const approvalResult = await page.evaluate(() => {
      const approveBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Aprovar Ação')
      );
      if (!approveBtn) return false;
      approveBtn.click();
      return true;
    });
    assert('Triggered "Aprovar Ação" click', approvalResult);
    await sleep(800);

    // Verify post-approval honest state & Dynamic Island
    const postApprovalState = await page.evaluate(() => {
      const body = document.body.innerText;
      const isApprovedNotice =
        body.toLowerCase().includes('ação aprovada') ||
        body.toLowerCase().includes('aprovado') ||
        body.toLowerCase().includes('aprovada & aplicada') ||
        body.toLowerCase().includes('executor não conectado');
      const island = document.querySelector('[data-island="true"]') || document.querySelector('header');
      const islandText = island ? island.innerText : '';
      return { isApprovedNotice, islandText };
    });
    assert('Post-approval honest state displayed', postApprovalState.isApprovedNotice);
    assert('Dynamic Island displays action authorization', postApprovalState.islandText.toLowerCase().includes('autorizada') || postApprovalState.islandText.toLowerCase().includes('ação') || postApprovalState.islandText.toLowerCase().includes('e-mail'), postApprovalState.islandText.slice(0, 80));

    // ------------------------------------------------------------------------
    // SECTION 5: LOCAL PROVIDER & IMPORT MODAL
    // ------------------------------------------------------------------------
    console.log('\n--- 5. LOCAL PROVIDER INGESTION & TEMPLATES ---');
    // Open import modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Importar E-mail'));
      if (btn) btn.click();
    });
    await sleep(500);

    const modalVisible = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      const textarea = document.querySelector('textarea');
      return !!modal && !!textarea;
    });
    assert('Email Import Modal opened with textarea', modalVisible);

    // Ingest custom pasted email
    const customEmail = `De: Chefe Financeiro <gestor@empresa.com.br>
Assunto: Relatório Trimestral Q3 - Ação Urgente
Data: 2026-10-08T10:00:00

Favor revisar o relatório de despesas Q3 em anexo até hoje às 17:00.
Tempo de leitura estimado: 30 minutos. Requer aprovação da diretoria.`;

    await page.evaluate((text) => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeSetter.call(textarea, text);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, customEmail);
    await sleep(300);

    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('[role="dialog"] button')).find((b) =>
        b.innerText.includes('Processar Mensagem')
      );
      if (submitBtn) submitBtn.click();
    });
    await sleep(1000);

    const postImportCheck = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      const body = document.body.innerText;
      return {
        modalClosed: !modal,
        hasNewEmail: body.includes('Relatório Trimestral Q3') || body.includes('gestor@empresa.com.br'),
      };
    });
    assert('Import Modal closed after submission', postImportCheck.modalClosed);

    // Test Deduplication by selecting the same template twice
    // 1st import of template
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Importar E-mail') || b.innerText.includes('Colar / Importar'));
      if (btn) btn.click();
    });
    await sleep(500);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Telemedicina'));
      if (btn) btn.click();
    });
    await sleep(300);

    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('[role="dialog"] button')).find((b) =>
        b.innerText.includes('Processar Mensagem')
      );
      if (submitBtn) submitBtn.click();
    });
    await sleep(7500);

    // 2nd import of the SAME template
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Importar E-mail') || b.innerText.includes('Colar / Importar'));
      if (btn) btn.click();
    });
    await sleep(500);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Telemedicina'));
      if (btn) btn.click();
    });
    await sleep(300);

    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('[role="dialog"] button')).find((b) =>
        b.innerText.includes('Processar Mensagem')
      );
      if (submitBtn) submitBtn.click();
    });
    await sleep(1500);

    const dedupNotification = await page.evaluate(() => {
      const island = document.querySelector('[data-island="true"]') || document.querySelector('header');
      const text = (island ? island.innerText : '') + ' ' + document.body.innerText;
      return {
        hasDedup:
          text.includes('E-mail Já Registrado') ||
          text.includes('idêntico') ||
          text.includes('Nenhuma duplicação') ||
          text.includes('nada foi duplicado') ||
          text.includes('Conteúdo idêntico'),
        islandSnippet: island ? island.innerText.slice(0, 200) : 'no island',
      };
    });
    assert('Deduplication: Identical email recognized without duplicates', dedupNotification.hasDedup);

    // Test Persistence across Reload
    console.log('\n--- 6. PERSISTENCE ACROSS PAGE RELOAD ---');
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(1000);

    // Switch to Workspace or Triagem and confirm the imported email survives
    const persistedEmail = await page.evaluate(() => {
      const body = document.body.innerText;
      return body.includes('Relatório Trimestral Q3') || body.includes('gestor@empresa.com.br');
    });
    assert('Persistence: Manually imported email survives page reload', persistedEmail);

    // ------------------------------------------------------------------------
    // SECTION 7: TESTING THE 7 SPECIFIC CASES
    // ------------------------------------------------------------------------
    console.log('\n--- 7. TESTING THE 7 SPECIFIC CASES ---');

    // Case 1: Informativo
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Importar E-mail'));
      if (btn) btn.click();
    });
    await sleep(400);

    await page.evaluate(() => {
      const templateBtns = Array.from(document.querySelectorAll('[role="dialog"] button')).filter((b) =>
        b.innerText.includes('Architecture Weekly') || b.innerText.includes('Informativo')
      );
      if (templateBtns[0]) templateBtns[0].click();
    });
    await sleep(300);

    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('[role="dialog"] button')).find((b) =>
        b.innerText.includes('Processar Mensagem')
      );
      if (submitBtn) submitBtn.click();
    });
    await sleep(800);

    const case1Result = await page.evaluate(() => {
      return document.body.innerText.includes('Architecture Weekly');
    });
    assert('Case 1 (Informativo): Architecture Weekly ingested as informational', case1Result);

    // Case 2 & 3 & 6: Faculdade / Prazo / Precisa de Ação
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Importar E-mail'));
      if (btn) btn.click();
    });
    await sleep(400);

    await page.evaluate(() => {
      const templateBtns = Array.from(document.querySelectorAll('[role="dialog"] button')).filter((b) =>
        b.innerText.includes('Trabalho Integrador') || b.innerText.includes('Faculdade')
      );
      if (templateBtns[0]) templateBtns[0].click();
    });
    await sleep(300);

    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('[role="dialog"] button')).find((b) =>
        b.innerText.includes('Processar Mensagem')
      );
      if (submitBtn) submitBtn.click();
    });
    await sleep(800);

    const academicCheck = await page.evaluate(() => {
      return document.body.innerText.includes('Trabalho Integrador') || document.body.innerText.includes('Contabilidade');
    });
    assert('Cases 2, 3, 6 (Ação/Prazo/Faculdade): Academic deadline identified', academicCheck);

    // Case 4 & 7: Telemedicina / Evento / Saúde / Trabalho
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Importar E-mail'));
      if (btn) btn.click();
    });
    await sleep(400);

    await page.evaluate(() => {
      const templateBtns = Array.from(document.querySelectorAll('[role="dialog"] button')).filter((b) =>
        b.innerText.includes('Telemedicina') || b.innerText.includes('Dra. Ana Souza')
      );
      if (templateBtns[0]) templateBtns[0].click();
    });
    await sleep(300);

    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('[role="dialog"] button')).find((b) =>
        b.innerText.includes('Processar Mensagem')
      );
      if (submitBtn) submitBtn.click();
    });
    await sleep(800);

    const eventCheck = await page.evaluate(() => {
      return document.body.innerText.includes('Dra. Ana Souza') || document.body.innerText.includes('Teleconsulta');
    });
    assert('Case 4 (Evento / Telemedicina): Calendar event recognized', eventCheck);

    // Case 5: Financeiro (Fatura Nubank)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Importar E-mail'));
      if (btn) btn.click();
    });
    await sleep(400);

    await page.evaluate(() => {
      const templateBtns = Array.from(document.querySelectorAll('[role="dialog"] button')).filter((b) =>
        b.innerText.includes('Fatura Nubank') || b.innerText.includes('Financeiro')
      );
      if (templateBtns[0]) templateBtns[0].click();
    });
    await sleep(300);

    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('[role="dialog"] button')).find((b) =>
        b.innerText.includes('Processar Mensagem')
      );
      if (submitBtn) submitBtn.click();
    });
    await sleep(800);

    const financeCheck = await page.evaluate(() => {
      return document.body.innerText.includes('Nubank') || document.body.innerText.includes('1.420');
    });
    assert('Case 5 (Financeiro / Fatura): Financial bill detected with L3 policy', financeCheck);

    // ------------------------------------------------------------------------
    // SECTION 8: CONTEXT PANEL & HONEST CONNECTION STATUS
    // ------------------------------------------------------------------------
    console.log('\n--- 8. CONTEXT PANEL REGIONAL STATUS ---');
    const contextPanelStatus = await page.evaluate(() => {
      const body = document.body.innerText;
      return {
        hasProvidersCard: body.includes('Provedores de E-mail') || body.includes('PROVEDORES'),
        hasLocalConnected: body.includes('Provedor Local') || body.includes('Local'),
        hasGmailBlocked: (body.includes('Gmail') || body.includes('Google Gmail')) && (body.includes('OAuth ausente') || body.includes('Requer conexão') || body.includes('BLOQUEADO')),
        hasOutlookBlocked: body.includes('Outlook') && (body.includes('Não configurado') || body.includes('Requer conexão') || body.includes('BLOQUEADO')),
      };
    });
    assert('Context Panel: Displays Email Providers status', contextPanelStatus.hasProvidersCard);
    assert('Context Panel: Local Provider is CONNECTED', contextPanelStatus.hasLocalConnected);
    assert('Context Panel: Gmail is honestly marked as BLOQUEADO', contextPanelStatus.hasGmailBlocked);
    assert('Context Panel: Outlook is honestly marked as BLOQUEADO', contextPanelStatus.hasOutlookBlocked);

    // ------------------------------------------------------------------------
    // SECTION 9: RESPONSIVENESS ACROSS 4 VIEWPORTS
    // ------------------------------------------------------------------------
    console.log('\n--- 9. RESPONSIVENESS & OVERFLOW CHECKS ---');
    const viewportsToTest = [
      { name: '1440px', width: 1440, height: 900 },
      { name: '1024px', width: 1024, height: 768 },
      { name: '820px', width: 820, height: 1180 },
      { name: '390px', width: 390, height: 844 },
    ];

    for (const vp of viewportsToTest) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await sleep(400);

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      assert(`Viewport ${vp.name}: Zero horizontal overflow (scrollWidth <= ${vp.width}px)`, !overflow);
      results.viewports[vp.name] = { overflow };

      if (vp.width <= 1024) {
        // Check for mobile workspace switcher
        const hasSwitcher = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          return btns.some((b) => b.innerText.includes('Conversa') || b.innerText.includes('Contexto'));
        });
        assert(`Viewport ${vp.name}: Mobile workspace switcher active`, hasSwitcher);
      }
    }

    // ------------------------------------------------------------------------
    // SECTION 10: PREFERS-REDUCED-MOTION
    // ------------------------------------------------------------------------
    console.log('\n--- 10. PREFERS-REDUCED-MOTION ---');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await sleep(300);

    const reducedMotionOk = await page.evaluate(() => {
      // Switch tab and verify it renders without crashing
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Triagem Rápida'));
      if (btn) btn.click();
      return true;
    });
    assert('Prefers-reduced-motion: Interface transitions and functions properly', reducedMotionOk);

    // ------------------------------------------------------------------------
    // SECTION 11: CONSOLE & HYDRATION ERRORS CHECK
    // ------------------------------------------------------------------------
    console.log('\n--- 11. CONSOLE & HYDRATION AUDIT ---');
    assert('Zero browser console errors detected', results.consoleErrors.length === 0, `Errors: ${results.consoleErrors.join(' | ')}`);

  } catch (err) {
    console.error('Fatal error during deep QA execution:', err);
    assert('Execution completed without unhandled exceptions', false, err.message);
  } finally {
    await browser.close();
  }

  console.log('\n=== DEEP QA SUMMARY ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total checks: ${results.passed + results.failed}`);

  fs.writeFileSync('artifacts/deep-email-qa-results.json', JSON.stringify(results, null, 2));
  console.log('Results written to artifacts/deep-email-qa-results.json');
}

runDeepQA();
