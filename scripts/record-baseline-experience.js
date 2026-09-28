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

const OUT_DIR = path.resolve(__dirname, '../qa-recordings/baseline');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runBaselineExploration() {
  console.log('=== INICIANDO GRAVAÇÃO BASELINE DA EXPERIÊNCIA ATUAL ===');
  const executablePath = resolveBrowserPath();
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // 1. Carrega Agenda na Week View
  console.log('1. Carregando Agenda na Semana (Week View)...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await wait(800);

  const agendaBtn = await page.waitForSelector('button[title="Agenda"]');
  await agendaBtn.click();
  await wait(800);

  // Alterna para Semana
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button[role="tab"], button'));
    const btn = btns.find((b) => b.textContent.trim() === 'Semana');
    if (btn) btn.click();
  });
  await wait(800);

  await page.screenshot({ path: path.join(OUT_DIR, '01-week-view-density-desktop-1440.png') });
  console.log('  [FOTO] 01-week-view-density-desktop-1440.png salva');

  // Teste em 1024px para ver esmagamento e legibilidade
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 2 });
  await wait(600);
  await page.screenshot({ path: path.join(OUT_DIR, '02-week-view-density-tablet-1024.png') });
  console.log('  [FOTO] 02-week-view-density-tablet-1024.png salva');

  // Volta para 1440px
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await wait(400);

  // 2. Clica em um item para abrir o EventDetailPanel e inspecionar botão de Excluir
  console.log('2. Inspecionando EventDetailPanel e Ação de Excluir...');
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
  await wait(400);
  await page.screenshot({ path: path.join(OUT_DIR, '04-event-delete-confirmation-box.png') });

  // Cancela exclusão
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const cancelBtn = btns.find((b) => b.textContent.includes('Cancelar'));
    if (cancelBtn) cancelBtn.click();
  });
  await wait(400);

  // 3. Testa Criação de Evento com Cor Específica
  console.log('3. Testando criação com Cor A...');
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

  // Preenche formulário: título 'Treino Matutino Teste' e escolhe swatch rosa (swatch 0 ou específico)
  await page.type('#form-title', 'Treino Matutino Teste');
  const colorSwatchClicked = await page.evaluate(() => {
    const swatches = Array.from(document.querySelectorAll('#event-color-swatches button'));
    // escolhe o 3º swatch
    if (swatches.length >= 3) {
      swatches[2].click();
      return swatches[2].getAttribute('title');
    }
    return null;
  });
  console.log('  Cor escolhida na criação:', colorSwatchClicked);
  await page.screenshot({ path: path.join(OUT_DIR, '05-create-drawer-color-selected.png') });

  // Submete
  await page.evaluate(() => {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.click();
  });
  await wait(800);
  await page.screenshot({ path: path.join(OUT_DIR, '06-created-event-on-week-view.png') });

  // 4. Edita o evento recém criado para tentar mudar a Cor
  console.log('4. Editando evento para tentar mudar a cor para Cor B...');
  const createdEvent = await page.waitForSelector('[data-agenda-item="true"]');
  await createdEvent.click();
  await wait(400);
  // Clica em Editar
  await page.evaluate(() => {
    const editBtn = document.querySelector('#btn-edit-event');
    if (editBtn) editBtn.click();
  });
  await wait(600);

  // Tenta escolher outro swatch (ex: swatch 10 - roxo / verde)
  const newColorClicked = await page.evaluate(() => {
    const swatches = Array.from(document.querySelectorAll('#event-color-swatches button'));
    if (swatches.length >= 10) {
      swatches[9].click();
      return swatches[9].getAttribute('title');
    }
    return null;
  });
  console.log('  Nova cor selecionada na edição:', newColorClicked);
  await page.screenshot({ path: path.join(OUT_DIR, '07-edit-drawer-new-color-selected.png') });

  // Salva alterações
  await page.evaluate(() => {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.click();
  });
  await wait(800);
  await page.screenshot({ path: path.join(OUT_DIR, '08-after-save-color-bug-evidence.png') });

  // 5. Edição de Item Recorrente (Ausência de Escopo)
  console.log('5. Testando edição de item recorrente (verificando se pergunta escopo)...');
  // Abre o drawer para criar uma rotina recorrente primeiro
  await page.evaluate(() => {
    const addBtn = document.querySelector('button#btn-add-event, button[aria-label*="Adicionar"]');
    if (addBtn) addBtn.click();
  });
  await wait(600);

  await page.type('#form-title', 'Rotina Semanal QA');
  // Seleciona kind 'routine'
  await page.evaluate(() => {
    const select = document.querySelector('#form-kind');
    if (select) {
      select.value = 'routine';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await wait(400);

  // Salva rotina
  await page.evaluate(() => {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.click();
  });
  await wait(800);

  // Clica na rotina criada e tenta editar
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('[data-agenda-item="true"]'));
    const rotina = items.find((it) => it.textContent.includes('Rotina Semanal QA'));
    if (rotina) rotina.click();
  });
  await wait(500);

  await page.evaluate(() => {
    const editBtn = document.querySelector('#btn-edit-event');
    if (editBtn) editBtn.click();
  });
  await wait(600);
  await page.screenshot({ path: path.join(OUT_DIR, '09-edit-recurring-drawer-no-scope.png') });

  // Fecha o drawer
  await page.evaluate(() => {
    const cancelBtn = document.querySelector('#event-form-drawer button');
    if (cancelBtn) cancelBtn.click();
  });
  await wait(400);

  // 6. Teste da tela de Cronograma (Primeiro Acesso / Estrutura)
  console.log('6. Inspecionando primeiro acesso ao Cronograma...');
  // Limpa o local storage de cronograma para simular primeiro acesso
  await page.evaluate(() => {
    localStorage.removeItem('medusa_cronograma_seen');
    localStorage.removeItem('medusa_cronograma_plan');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(800);

  const eduNav = await page.waitForSelector('button[title="Educação"]');
  await eduNav.click();
  await wait(800);

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const c = btns.find((b) => b.textContent.includes('Cronograma'));
    if (c) c.click();
  });
  await wait(800);
  await page.screenshot({ path: path.join(OUT_DIR, '10-cronograma-first-access-container.png') });

  console.log('=== GRAVAÇÃO BASELINE CONCLUÍDA COM SUCESSO ===');
  await browser.close();
}

runBaselineExploration().catch((err) => {
  console.error('Falha no baseline exploration:', err);
  process.exit(1);
});
