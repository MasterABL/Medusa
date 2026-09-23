/**
 * QA real de Browser — Rodada 3 (Context Panel específico por trilha/área, Aulas Concluídas em
 * Inglês/ENEM/Faculdade, Simulados do ENEM, Avisos agregados no Hoje).
 *
 * Cobre:
 * - Context Panel: cada trilha de Educação mostra um painel diferente (não o painel genérico
 *   antigo); trocar de trilha troca o painel; trocar de disciplina na Faculdade atualiza o
 *   painel da Faculdade em tempo real; o atalho do painel do ENEM abre o Cronograma no Hub.
 * - Hoje: painel do Hoje preservado (Guardian/Próxima Transição/Marcos) + nova seção de Avisos
 *   agregados da Faculdade, sem duplicar dado.
 * - Aulas Concluídas: presentes e funcionais nas 3 trilhas via o mesmo componente compartilhado.
 * - ENEM Simulados: visíveis na Visão Geral (não só escondidos dentro do Cronograma).
 * - Boilerplate: cabeçalho da Educação não usa mais o texto institucional genérico.
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

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.MEDUSA_BROWSER_PATH || '/opt/pw-browsers/chromium',
    headless: 'new',
    args: ['--no-sandbox'],
  });

  // ===== 1. Context Panel muda por trilha (não é mais o painel genérico antigo) =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    check('[Painel] Faculdade mostra o painel específico da Faculdade', await exists(page, '#context-panel-track-faculdade'));
    check('[Painel] Painel genérico antigo (Guardian) NÃO aparece em Educação', !(await textOf(page, '#context-panel')).includes('Guardian'));

    await click(page, '#track-selector-ingles');
    await wait(400);
    check('[Painel] Inglês mostra o painel específico de Inglês', await exists(page, '#context-panel-track-ingles'));
    const inglesPanelText = await textOf(page, '#context-panel-track-ingles');
    check('[Painel Inglês] Mostra progresso geral', /\d+%/.test(inglesPanelText));
    check('[Painel Inglês] Sem seção de Flashcards', !inglesPanelText.toLowerCase().includes('flashcard'));

    await click(page, '#track-selector-vestibular');
    await wait(400);
    check('[Painel] ENEM mostra o painel específico do ENEM', await exists(page, '#context-panel-track-vestibular'));

    await page.close();
  }

  // ===== 2. Painel do ENEM: atalho abre o Cronograma no Hub principal =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    await click(page, '#track-selector-vestibular');
    await wait(400);
    check('[Painel ENEM] Hub começa em Visão Geral', await exists(page, '#enem-tab-visao-geral[aria-selected="true"]'));
    await click(page, '#btn-panel-open-cronograma');
    await wait(400);
    // Comportamento atualizado no Refinamento Visual §10: o atalho do painel agora abre o
    // Cronograma como overlay em contexto (funciona também de dentro do Study Mode, onde a aba
    // do Hub não existe) — não troca mais a aba interna do Hub. A aba do Hub continua existindo
    // e funcionando (ver qa_enemhub_tab_regression.js), só não é mais o alvo deste atalho.
    check('[Painel ENEM] Hub NÃO troca de aba (o atalho agora abre um overlay, não a aba)', await exists(page, '#enem-tab-visao-geral[aria-selected="true"]'));
    check('[Painel ENEM] Overlay de Cronograma abre em contexto', await exists(page, '#cronograma-overlay-panel[aria-hidden="false"]'));
    check('[Painel ENEM] Cronograma realmente montou dentro do overlay', await exists(page, '#enem-cronograma-view'));
    await page.close();
  }

  // ===== 3. Painel da Faculdade acompanha a disciplina selecionada (com transição amostrada) =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    await wait(400);
    const beforePanel = await textOf(page, '#context-panel-track-faculdade');
    check('[Painel Faculdade] Mostra disciplina ativa inicial (Física II)', beforePanel.includes('Física II') || beforePanel.includes('FIS-204'));

    await click(page, '#discipline-chip-CMP-102');
    await wait(120); // amostra em meio à transição
    const midOpacity = await page.evaluate(() => {
      const el = document.querySelector('#context-panel-track-faculdade');
      return el ? parseFloat(getComputedStyle(el).opacity) : null;
    });
    check('[Painel Faculdade] Transição do painel é interpolada (amostrada em t=120ms)', midOpacity !== null && midOpacity < 0.95, `opacity=${midOpacity}`);

    await wait(500);
    const afterPanel = await textOf(page, '#context-panel-track-faculdade');
    check('[Painel Faculdade] Painel muda de verdade ao trocar disciplina', afterPanel !== beforePanel && afterPanel.includes('CMP-102'));
    check('[Painel Faculdade] Materiais aparecem no painel', afterPanel.toLowerCase().includes('slides') || afterPanel.toLowerCase().includes('especificação'));
    check('[Painel Faculdade] Prazos aparecem no painel', afterPanel.includes('15/Out') || afterPanel.toLowerCase().includes('projeto final'));
    await page.close();
  }

  // ===== 4. Hoje: painel preservado + Avisos agregados (mesma fonte da Faculdade) =====
  {
    const page = await freshPage(browser, 1440, 960);
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button')).find((b) => b.title === 'Hoje')?.click();
    });
    await wait(400);
    // innerText reflete a transformação CSS `uppercase` de alguns rótulos — comparar em minúsculas.
    const panelText = (await textOf(page, '#context-panel')).toLowerCase();
    check('[Hoje] Painel preservado (Guardian/Bio-Estado ainda presente)', panelText.includes('guardian') || panelText.includes('bio-estado'));
    check('[Hoje] Marcos da Sessão ainda presentes (não redesenhado)', panelText.includes('marcos da sessão'));
    check('[Hoje] Avisos aparecem no painel', await exists(page, '#context-panel-today-avisos'));
    const avisosText = await textOf(page, '#context-panel-today-avisos');
    check('[Hoje] Avisos vêm da mesma fonte da Faculdade (mesmo texto)', avisosText.includes('Professor alterou o prazo'));
    await page.close();
  }

  // ===== 5. Aulas Concluídas nas 3 trilhas (componente compartilhado) =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    await wait(400);
    // Faculdade
    check('[Faculdade] Seção de Aulas Concluídas presente', await exists(page, '#faculdade-completed-activities'));
    await click(page, '#faculdade-completed-activities button');
    await wait(200);
    check('[Faculdade] Aulas Concluídas expande e mostra itens', (await textOf(page, '#faculdade-completed-activities')).length > 20);

    // Inglês
    await click(page, '#track-selector-ingles');
    await wait(400);
    check('[Inglês] Seção Minhas Aulas presente', await exists(page, '#my-lessons-history'));

    // ENEM
    await click(page, '#track-selector-vestibular');
    await wait(400);
    check('[ENEM] Seção de Aulas Concluídas presente', await exists(page, '#enem-completed-activities'));
    check('[ENEM] Seção de Simulados visível na Visão Geral (não escondida no Cronograma)', await exists(page, '#enem-simulados'));
    const simuladosText = (await textOf(page, '#enem-simulados')).toLowerCase();
    check('[ENEM] Simulados mostram status Realizado e Programado', simuladosText.includes('realizado') && simuladosText.includes('programado'));
    await page.close();
  }

  // ===== 6. Boilerplate removido do cabeçalho da Educação =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    await wait(300);
    const headerText = await textOf(page, '#education-dashboard');
    check('[Copy] "Life OS · Learning OS Multi-Trilha" removido', !headerText.includes('Life OS'));
    check('[Copy] "Trilha de Aprendizado & Prática" removido', !headerText.includes('Trilha de Aprendizado'));
    check('[Copy] "Motor unificado de estudo" removido', !headerText.includes('Motor unificado'));
    await page.close();
  }

  // ===== 7. Regressão rápida: Hub/Study Mode ainda funcionam após as mudanças de estado =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    await click(page, '#track-selector-ingles');
    await wait(400);
    await click(page, '#btn-start-study-session');
    await wait(3700);
    await wait(2000);
    check('[Regressão] Study Mode de Inglês ainda é alcançado', await exists(page, '#study-mode-container'));
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
