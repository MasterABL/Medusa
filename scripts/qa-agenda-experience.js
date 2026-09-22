/**
 * QA real de Browser — Agenda Experience Refinement (D-013 / Fase A)
 *
 * Cobre os refinamentos desta rodada:
 * - Troca de modo de visualização (Dia/Semana/Mês/Lista) com transição real (não swap instantâneo)
 * - Dynamic Island reagindo a: troca de view, salvar item, excluir item (pulso processing -> idle)
 * - Confirmação de exclusão em 2 passos na Lista (achado de auditoria corrigido nesta rodada)
 * - Regressão: Context Panel geometry + confirmação de exclusão no EventDetailPanel
 * - Responsive 390/820/1024/1440
 * - Reduced motion
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

function closeTo(actual, expected, tolerance = 1) {
  return actual !== null && Math.abs(actual - expected) <= tolerance;
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

async function goToAgenda(page) {
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.title === 'Agenda');
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 500));
}

async function clickViewTab(page, label) {
  await page.evaluate((lbl) => {
    const btn = Array.from(document.querySelectorAll('[role="tab"]')).find(
      (b) => b.textContent.trim() === lbl
    );
    if (btn) btn.click();
  }, label);
}

async function getIslandState(page) {
  return page.evaluate(() => {
    const capsule = document.getElementById('island-capsule');
    const tag = document.getElementById('island-state-tag');
    return {
      classes: capsule ? capsule.className : '',
      tag: tag ? tag.textContent : null,
    };
  });
}

async function getViewRegionStyle(page) {
  return page.evaluate(() => {
    const main = document.getElementById('agenda-main');
    if (!main) return null;
    // A região de view é o div flex-1 filho direto do wrapper de layout (segundo nível)
    const region = main.querySelector('.study-stage-enter');
    if (!region) return null;
    const cs = getComputedStyle(region);
    return { opacity: parseFloat(cs.opacity), transform: cs.transform };
  });
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/opt/pw-browsers/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // ===== 1. Troca de view: transição real (amostra em plena transição) =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToAgenda(page);

    // Dispara a troca e amostra rapidamente durante a animação (480ms de duração)
    await clickViewTab(page, 'Semana');
    await new Promise((r) => setTimeout(r, 90));
    const mid = await getViewRegionStyle(page);
    await new Promise((r) => setTimeout(r, 600));
    const end = await getViewRegionStyle(page);

    check(
      '[ViewSwitch] região amostrada em plena transição (opacity entre 0 e 1)',
      mid && mid.opacity > 0 && mid.opacity < 1,
      `mid.opacity=${mid && mid.opacity}`
    );
    check(
      '[ViewSwitch] transform não identidade durante a transição (translateY em curso)',
      mid && mid.transform !== 'none' && mid.transform !== 'matrix(1, 0, 0, 1, 0, 0)',
      `mid.transform=${mid && mid.transform}`
    );
    check('[ViewSwitch] ao final, opacity chega a 1', end && closeTo(end.opacity, 1, 0.05), `end.opacity=${end && end.opacity}`);

    // Island: deve pulsar 'processing' e retornar a 'idle'
    await clickViewTab(page, 'Mês');
    await new Promise((r) => setTimeout(r, 60));
    const islandMid = await getIslandState(page);
    await new Promise((r) => setTimeout(r, 500));
    const islandEnd = await getIslandState(page);
    check(
      '[Island] pulsa island-processing-active durante a troca de view',
      islandMid.classes.includes('island-processing-active'),
      `classes=${islandMid.classes}`
    );
    check(
      '[Island] retorna ao estado idle (living-pulse) após o pulso',
      islandEnd.classes.includes('living-pulse') && !islandEnd.classes.includes('island-processing-active'),
      `classes=${islandEnd.classes}`
    );

    await page.close();
  }

  // ===== 2. Island reage ao salvar um novo item =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToAgenda(page);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Adicionar')
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 350));

    await page.type('#form-title', 'QA — Evento de Teste de Experiência');

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button[type="submit"]')).find((b) =>
        b.textContent.includes('Criar Compromisso')
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 60));
    const islandMidSave = await getIslandState(page);
    await new Promise((r) => setTimeout(r, 500));

    check(
      '[Island/Save] pulsa processing ao salvar novo item',
      islandMidSave.classes.includes('island-processing-active'),
      `classes=${islandMidSave.classes}`
    );

    const drawerClosed = await page.evaluate(() => !document.getElementById('form-title'));
    check('[Save] drawer fecha após salvar', drawerClosed);

    const itemCreated = await page.evaluate(() =>
      document.body.innerText.includes('QA — Evento de Teste de Experiência')
    );
    check('[Save] item criado aparece na visualização', itemCreated);

    await page.close();
  }

  // ===== 3. Confirmação de exclusão em 2 passos na Lista (achado de auditoria corrigido) =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToAgenda(page);
    await clickViewTab(page, 'Lista');
    await new Promise((r) => setTimeout(r, 600));

    const countRows = () =>
      page.evaluate(() => document.querySelectorAll('[role="button"][aria-selected]').length);

    const beforeCount = await countRows();
    check('[ListDelete] existe pelo menos 1 item com ação de excluir na Lista', beforeCount > 0, `count=${beforeCount}`);

    // Clique único no botão de excluir NÃO deve remover o item — deve abrir confirmação
    await page.evaluate(() => {
      const btn = document.querySelector('[aria-label^="Excluir"]');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 150));

    const hasConfirmUI = await page.evaluate(() =>
      !!Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Confirmar')
    );
    check('[ListDelete] primeiro clique abre confirmação (Cancelar/Confirmar), não exclui direto', hasConfirmUI);

    const countAfterFirstClick = await countRows();
    check(
      '[ListDelete] item NÃO foi removido só com o primeiro clique',
      countAfterFirstClick === beforeCount,
      `before=${beforeCount} after=${countAfterFirstClick}`
    );

    // Cancelar restaura o botão de excluir original
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Cancelar');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 150));
    const restoredExcluirCount = await page.evaluate(
      () => document.querySelectorAll('[aria-label^="Excluir"]').length
    );
    check(
      '[ListDelete] Cancelar restaura o botão de excluir original (sem remover nada)',
      restoredExcluirCount === beforeCount,
      `count=${restoredExcluirCount}`
    );

    // Confirmar de fato remove o item
    await page.evaluate(() => {
      const btn = document.querySelector('[aria-label^="Excluir"]');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 150));
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Confirmar');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    const countAfterConfirm = await countRows();
    check(
      '[ListDelete] Confirmar de fato remove o item',
      countAfterConfirm === beforeCount - 1,
      `before=${beforeCount} after=${countAfterConfirm}`
    );

    await page.close();
  }

  // ===== 4. Regressão: EventDetailPanel 2-step delete ainda funciona =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToAgenda(page);
    await clickViewTab(page, 'Lista');
    await new Promise((r) => setTimeout(r, 600));

    // O primeiro item da Lista pode ser uma rotina recorrente (ex.: "Trabalho"), que abre um
    // seletor de escopo de 3 opções em vez da confirmação simples de 2 passos (comportamento
    // correto e intencional desde a rodada de conflitos/recorrência — não um bug). Este teste
    // busca especificamente um evento NÃO recorrente para exercitar o caminho de confirmação
    // simples que ele existe para provar.
    let hasDetailPanel = false;
    let isNonRecurring = false;
    const itemCount = await page.evaluate(() => document.querySelectorAll('[role="button"][aria-label]').length);
    for (let i = 0; i < itemCount && !isNonRecurring; i++) {
      await page.evaluate((idx) => {
        document.querySelectorAll('[role="button"][aria-label]')[idx]?.click();
      }, i);
      await new Promise((r) => setTimeout(r, 300));
      hasDetailPanel = await page.evaluate(() => !!document.querySelector('aside[aria-label="Detalhes do compromisso"]'));
      if (!hasDetailPanel) continue;
      isNonRecurring = await page.evaluate(
        () => !document.querySelector('aside[aria-label="Detalhes do compromisso"]')?.textContent.includes('Rotina Recorrente')
      );
    }
    check('[DetailPanel] abre ao selecionar um item', hasDetailPanel);
    check('[DetailPanel] encontrou um evento não recorrente para testar', isNonRecurring);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('aside button')).find((b) =>
        b.textContent.includes('Excluir')
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 150));
    const hasConfirm = await page.evaluate(() =>
      document.body.innerText.includes('Confirmar exclusão deste compromisso?')
    );
    check('[DetailPanel] regressão — ainda pede confirmação em 2 passos', hasConfirm);

    await page.close();
  }

  // ===== 5. Responsive 390/820/1024/1440 =====
  for (const width of [390, 820, 1024, 1440]) {
    const page = await freshPage(browser, width, 900);
    await goToAgenda(page);
    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth + 1);
    check(`[Responsive ${width}px] sem overflow horizontal`, !overflow);

    // Troca de view funciona em todos os breakpoints
    await clickViewTab(page, 'Lista');
    await new Promise((r) => setTimeout(r, 400));
    // Rótulo simplificado na limpeza global de copy ("Camada Temporal Medusa · Temporal OS" era
    // nome interno de engenharia, não copy de produto) — mesmo smoke-check de "Agenda renderizou".
    const listRendered = await page.evaluate(() => document.body.innerText.includes('Agenda · Sincronizada'));
    check(`[Responsive ${width}px] Agenda renderiza corretamente`, listRendered);

    await page.close();
  }

  // ===== 6. Reduced motion =====
  {
    const page = await freshPage(browser, 1440, 960);
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await goToAgenda(page);

    await clickViewTab(page, 'Semana');
    await new Promise((r) => setTimeout(r, 60));
    const styleMidReduced = await getViewRegionStyle(page);
    check(
      '[ReducedMotion] transform desativado durante troca de view',
      styleMidReduced && (styleMidReduced.transform === 'none' || styleMidReduced.transform === 'matrix(1, 0, 0, 1, 0, 0)'),
      `transform=${styleMidReduced && styleMidReduced.transform}`
    );

    // Navegação continua 100% funcional sob reduced motion
    await clickViewTab(page, 'Mês');
    await new Promise((r) => setTimeout(r, 200));
    const monthRendered = await page.evaluate(() => !!document.querySelector('[role="tablist"]'));
    check('[ReducedMotion] navegação entre views permanece funcional', monthRendered);

    await page.close();
  }

  // ===== 7. Regressão: Context Panel geometry na rota Agenda (spot-check) =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToAgenda(page);
    const panel = await page.evaluate(() => {
      const aside = document.getElementById('context-panel');
      return aside ? aside.getBoundingClientRect().width : null;
    });
    check('[Regressão] Context Panel presente e com largura real na Agenda', closeTo(panel, 320), `width=${panel}`);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.title === 'Educação');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    const educationRendered = await page.evaluate(() => !document.getElementById('agenda-main'));
    check('[Regressão] navegação Agenda -> Educação não deixa resíduo de Agenda montado', educationRendered);

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
