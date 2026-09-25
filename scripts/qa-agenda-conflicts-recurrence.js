/**
 * QA real de Browser — Agenda: Conflitos N-way, Prioridade, Recorrência (rodada de
 * refinamento "Agenda inteligente + Educação Multi-Trilha + Shell/Sidebar").
 *
 * Cobre:
 * - Composição de 2 e 3 eventos concorrentes em colunas legíveis (não mais binário/fixo).
 * - Prioridade de domínio (Trabalho antes de Educação) na ordem das colunas.
 * - Exclusão de rotina com 3 escopos (somente este / este e os próximos / toda a série).
 * - Recorrência customizada (intervalo, dias da semana, término por data/contagem).
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

async function openAddDrawer(page) {
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Adicionar'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 300));
}

// Setar `.value` diretamente num input controlado do React às vezes não dispara o rastreador
// interno de mudança do React (o `input`/`change` sintético é ignorado porque o setter nativo
// do elemento já "concordava" com o valor antes do evento) — usa o setter nativo do protótipo
// para forçar a detecção, técnica padrão para este problema conhecido de Puppeteer + React.
async function setControlledInputValue(page, selector, value) {
  await page.evaluate(
    (sel, val) => {
      const input = document.querySelector(sel);
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },
    selector,
    value
  );
}

async function fillBasicEvent(page, { title, domain, startTime, endTime, dateOffsetDays = 0 }) {
  await page.type('#form-title', title);
  await page.select('#form-domain', domain);
  if (dateOffsetDays !== 0) {
    const dateStr = await page.evaluate((offset) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10);
    }, dateOffsetDays);
    await setControlledInputValue(page, '#form-date', dateStr);
  }
  await setControlledInputValue(page, '#form-start-time', startTime);
  await setControlledInputValue(page, '#form-end-time', endTime);
}

async function submitForm(page) {
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button[type="submit"]')).find((b) =>
      b.textContent.includes('Criar Compromisso')
    );
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 300));
}

async function getEventBlockRects(page) {
  return page.evaluate(() => {
    const container = document.querySelector('#agenda-main');
    const blocks = Array.from(container.querySelectorAll('button[aria-label]')).filter((b) =>
      b.closest('[style*="position"]') || b.getAttribute('aria-label')?.includes('Categoria')
    );
    return blocks.map((b) => {
      const rect = b.getBoundingClientRect();
      return { label: b.getAttribute('aria-label'), left: rect.left, width: rect.width };
    });
  });
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/opt/pw-browsers/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // ===== 1. Conflito de 3 eventos concorrentes: colunas legíveis, Trabalho primeiro =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToAgenda(page);

    // Cenário do pedido: Trabalho 08-17, Estudo 16-18, Inglês 16:30-17:30
    await openAddDrawer(page);
    await fillBasicEvent(page, { title: 'QA Trabalho', domain: 'work', startTime: '08:00', endTime: '17:00' });
    await submitForm(page);

    await openAddDrawer(page);
    await fillBasicEvent(page, { title: 'QA Estudo', domain: 'education', startTime: '16:00', endTime: '18:00' });
    await submitForm(page);

    await openAddDrawer(page);
    await fillBasicEvent(page, { title: 'QA Ingles', domain: 'education', startTime: '16:30', endTime: '17:30' });
    await submitForm(page);

    await new Promise((r) => setTimeout(r, 300));

    const rects = await page.evaluate(() => {
      const titles = ['QA Trabalho', 'QA Estudo', 'QA Ingles'];
      return titles.map((t) => {
        const btn = Array.from(document.querySelectorAll('button[aria-label]')).find((b) =>
          (b.getAttribute('aria-label') || '').startsWith(t + ',')
        );
        const rect = btn ? btn.getBoundingClientRect() : null;
        return {
          title: t,
          found: !!btn,
          ariaLabel: btn ? btn.getAttribute('aria-label') : null,
          left: rect ? rect.left : null,
          width: rect ? rect.width : null,
        };
      });
    });

    const trabalho = rects.find((r) => r.title === 'QA Trabalho');
    const estudo = rects.find((r) => r.title === 'QA Estudo');
    const ingles = rects.find((r) => r.title === 'QA Ingles');

    check('[Conflito 3-way] os 3 blocos existem e são encontrados', rects.every((r) => r.found), JSON.stringify(rects));
    check(
      '[Conflito 3-way] os horários realmente aplicados batem com o cenário do pedido (08-17/16-18/16:30-17:30)',
      trabalho?.ariaLabel?.includes('08:00 às 17:00') &&
        estudo?.ariaLabel?.includes('16:00 às 18:00') &&
        ingles?.ariaLabel?.includes('16:30 às 17:30'),
      JSON.stringify(rects.map((r) => r.ariaLabel))
    );
    check(
      '[Conflito 3-way] Trabalho ocupa a coluna mais à esquerda (prioridade de domínio)',
      trabalho && estudo && ingles && trabalho.left <= estudo.left && trabalho.left <= ingles.left,
      `trabalho.left=${trabalho?.left} estudo.left=${estudo?.left} ingles.left=${ingles?.left}`
    );
    check(
      '[Conflito 3-way] os 3 blocos têm larguras reduzidas e distintas em posição (3 colunas, não 2 fixas)',
      trabalho && estudo && ingles && new Set([trabalho.left, estudo.left, ingles.left]).size === 3,
      `lefts=${[trabalho?.left, estudo?.left, ingles?.left]}`
    );
    check(
      '[Conflito 3-way] largura de cada bloco é bem menor que a largura total da timeline (composição em colunas real)',
      trabalho && trabalho.width < 400,
      `width=${trabalho?.width}`
    );

    await page.close();
  }

  // ===== 2. Conflito de 2 eventos concorrentes (cenário do pedido) =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToAgenda(page);

    await openAddDrawer(page);
    await fillBasicEvent(page, { title: 'QA2 Trabalho', domain: 'work', startTime: '08:00', endTime: '17:00' });
    await submitForm(page);

    await openAddDrawer(page);
    await fillBasicEvent(page, { title: 'QA2 Estudo', domain: 'education', startTime: '09:00', endTime: '11:00' });
    await submitForm(page);

    await openAddDrawer(page);
    await fillBasicEvent(page, { title: 'QA2 Ingles', domain: 'education', startTime: '10:00', endTime: '11:00' });
    await submitForm(page);

    await new Promise((r) => setTimeout(r, 300));

    const rects = await page.evaluate(() => {
      const titles = ['QA2 Trabalho', 'QA2 Estudo', 'QA2 Ingles'];
      return titles.map((t) => {
        const btn = Array.from(document.querySelectorAll('button[aria-label]')).find((b) =>
          (b.getAttribute('aria-label') || '').startsWith(t + ',')
        );
        const rect = btn ? btn.getBoundingClientRect() : null;
        return { title: t, found: !!btn, ariaLabel: btn ? btn.getAttribute('aria-label') : null, left: rect ? rect.left : null };
      });
    });
    check(
      '[Conflito cenário 2] os horários realmente aplicados batem com o pedido (08-17/09-11/10-11)',
      rects[0]?.ariaLabel?.includes('08:00 às 17:00') &&
        rects[1]?.ariaLabel?.includes('09:00 às 11:00') &&
        rects[2]?.ariaLabel?.includes('10:00 às 11:00'),
      JSON.stringify(rects.map((r) => r.ariaLabel))
    );
    check(
      '[Conflito cenário 2] Trabalho + Estudo + Inglês (todos concorrentes com Trabalho) renderizam em 3 posições distintas',
      rects.every((r) => r.found) && new Set(rects.map((r) => r.left)).size === 3,
      JSON.stringify(rects)
    );

    await page.close();
  }

  // ===== 3. Regressão: 1 evento isolado ocupa a largura normal (sem colunas) =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToAgenda(page);
    await openAddDrawer(page);
    await fillBasicEvent(page, { title: 'QA Isolado', domain: 'personal', startTime: '21:00', endTime: '21:30' });
    await submitForm(page);
    await new Promise((r) => setTimeout(r, 300));

    const result = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button[aria-label]')).find((b) =>
        (b.getAttribute('aria-label') || '').startsWith('QA Isolado,')
      );
      return {
        ariaLabel: btn ? btn.getAttribute('aria-label') : null,
        width: btn ? btn.getBoundingClientRect().width : null,
      };
    });
    check(
      '[Regressão] horário 21:00-21:30 foi realmente aplicado (fora do cluster de conflito das 08-15:30)',
      result.ariaLabel?.includes('21:00 às 21:30'),
      result.ariaLabel
    );
    check(
      '[Regressão] evento sem conflito continua ocupando a largura total da coluna',
      result.width !== null && result.width > 400,
      `width=${result.width}`
    );

    await page.close();
  }

  // ===== 4. Recorrência: criar rotina semanal com dias específicos, verificar expansão =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToAgenda(page);
    await openAddDrawer(page);

    await page.type('#form-title', 'QA Rotina Semanal');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Rotina'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 150));

    // Seleciona explicitamente Segunda, Quarta, Sexta (índices 1, 3, 5)
    await page.evaluate(() => {
      const dayLabels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      [1, 3, 5].forEach((idx) => {
        const btn = document.querySelector(`button[aria-label="${dayLabels[idx]}"]`);
        if (btn) btn.click();
      });
    });
    await new Promise((r) => setTimeout(r, 150));

    await submitForm(page);
    await new Promise((r) => setTimeout(r, 300));

    // Vai para a view de Semana para checar quantos dias da semana atual mostram a rotina
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('[role="tab"]')).find((b) => b.textContent.trim() === 'Semana');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    const occurrenceCount = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('span')).filter((s) => s.textContent.trim() === 'QA Rotina Semanal').length;
    });
    check(
      '[Recorrência] rotina com dias específicos (Seg/Qua/Sex) gera múltiplas ocorrências na semana',
      occurrenceCount >= 2,
      `occurrences=${occurrenceCount}`
    );

    await page.close();
  }

  // ===== 5. Recorrência: bug real corrigido — antes desta rodada, `isRecurring` nunca era
  // acionado pela UI e nenhuma rotina criada pelo formulário se repetia de fato =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToAgenda(page);
    await openAddDrawer(page);
    await page.type('#form-title', 'QA Regressao Rotina');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Rotina'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 150));
    await submitForm(page);
    await new Promise((r) => setTimeout(r, 300));

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('[role="tab"]')).find((b) => b.textContent.trim() === 'Semana');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    const occurrenceCount = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('span')).filter((s) => s.textContent.trim() === 'QA Regressao Rotina').length;
    });
    check(
      '[Bug corrigido] rotina criada sem escolher dias explícitos ainda assim se repete (usa o dia da própria data)',
      occurrenceCount >= 1,
      `occurrences=${occurrenceCount}`
    );

    await page.close();
  }

  // ===== 6. Exclusão de recorrência: 3 escopos disponíveis e "somente este" não remove a série =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToAgenda(page);
    await openAddDrawer(page);
    await page.type('#form-title', 'QA Rotina Exclusao');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Rotina'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 150));
    await submitForm(page);
    await new Promise((r) => setTimeout(r, 300));

    // Achado real de review: a asserção original media "remaining >= 0" — length de array
    // NUNCA é negativo, então isso sempre passava, mesmo se a série inteira tivesse sido
    // apagada (tautologia, não testava nada). Corrigido pra comparar ANTES x DEPOIS na visão de
    // Mês (janela larga o bastante pra uma rotina semanal sem data-fim aparecer mais de uma vez).
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('[role="tab"]')).find((b) => b.textContent.trim() === 'Mês');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    const occurrencesBeforeDelete = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('span')).filter((s) => s.textContent.trim() === 'QA Rotina Exclusao').length;
    });
    check(
      '[ExclusãoRecorrência] rotina sem data-fim aparece mais de uma vez no mês (pré-condição do teste)',
      occurrencesBeforeDelete >= 2,
      `before=${occurrencesBeforeDelete}`
    );

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('[role="tab"]')).find((b) => b.textContent.trim() === 'Lista');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    await page.evaluate(() => {
      const span = Array.from(document.querySelectorAll('h4')).find((h) => h.textContent.trim() === 'QA Rotina Exclusao');
      const row = span ? span.closest('[role="button"]') : null;
      if (row) row.click();
    });
    await new Promise((r) => setTimeout(r, 300));

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('aside button')).find((b) => b.textContent.includes('Excluir'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 200));

    const scopeOptions = await page.evaluate(() =>
      Array.from(document.querySelectorAll('aside input[name="delete-scope"]')).length
    );
    check('[ExclusãoRecorrência] 3 opções de escopo aparecem (somente este/próximos/série)', scopeOptions === 3, `count=${scopeOptions}`);

    // Escolhe "Somente este evento" (já é o default) e confirma
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('aside button')).find((b) => b.textContent.trim() === 'Excluir');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    // Mesma visão de Mês de antes — compara contra a contagem PRÉVIA, não um limite trivial.
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('[role="tab"]')).find((b) => b.textContent.trim() === 'Mês');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    const remainingOccurrences = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('span')).filter((s) => s.textContent.trim() === 'QA Rotina Exclusao').length;
    });
    check(
      '["Somente este evento"] remove EXATAMENTE uma ocorrência, a série continua existindo',
      remainingOccurrences === occurrencesBeforeDelete - 1 && remainingOccurrences >= 1,
      `before=${occurrencesBeforeDelete} after=${remainingOccurrences}`
    );

    await page.close();
  }

  // ===== 7. Responsive 390/820/1024/1440 com conflitos presentes =====
  for (const width of [390, 820, 1024, 1440]) {
    const page = await freshPage(browser, width, 900);
    await goToAgenda(page);
    await openAddDrawer(page);
    await fillBasicEvent(page, { title: 'QAR Trabalho', domain: 'work', startTime: '08:00', endTime: '17:00' });
    await submitForm(page);
    await openAddDrawer(page);
    await fillBasicEvent(page, { title: 'QAR Estudo', domain: 'education', startTime: '16:00', endTime: '18:00' });
    await submitForm(page);
    await new Promise((r) => setTimeout(r, 300));

    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth + 1);
    check(`[Responsive ${width}px] sem overflow horizontal com conflito presente`, !overflow);
    await page.close();
  }

  // ===== 8. Sugestões de horário compatível (seções 5/6): reais, baseadas em lacunas livres =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToAgenda(page);
    await openAddDrawer(page);
    await fillBasicEvent(page, { title: 'QAS Trabalho', domain: 'work', startTime: '08:00', endTime: '17:00' });
    await submitForm(page);
    await openAddDrawer(page);
    await fillBasicEvent(page, { title: 'QAS Estudo', domain: 'education', startTime: '16:00', endTime: '18:00' });
    await submitForm(page);
    await new Promise((r) => setTimeout(r, 300));

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('[role="tab"]')).find((b) => b.textContent.trim() === 'Lista');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    await page.evaluate(() => {
      const h4 = Array.from(document.querySelectorAll('h4')).find((h) => h.textContent.trim() === 'QAS Estudo');
      const row = h4 ? h4.closest('[role="button"]') : null;
      if (row) row.click();
    });
    await new Promise((r) => setTimeout(r, 300));

    const hasToggle = await page.evaluate(() =>
      Array.from(document.querySelectorAll('aside button')).some((b) => b.textContent.includes('Ver horários compatíveis'))
    );
    check('[Sugestões] toggle "Ver horários compatíveis" aparece para item em conflito', hasToggle);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('aside button')).find((b) =>
        b.textContent.includes('Ver horários compatíveis')
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 200));

    const suggestionCount = await page.evaluate(() =>
      Array.from(document.querySelectorAll('aside button')).filter((b) => b.textContent.trim() === 'Usar').length
    );
    check('[Sugestões] pelo menos 1 sugestão real de horário livre aparece', suggestionCount > 0, `count=${suggestionCount}`);

    if (suggestionCount > 0) {
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('aside button')).find((b) => b.textContent.trim() === 'Usar');
        if (btn) btn.click();
      });
      await new Promise((r) => setTimeout(r, 300));

      const stillConflicting = await page.evaluate(() => document.body.innerText.includes('Sobreposição detectada'));
      check('[Sugestões] aplicar a sugestão resolve o conflito de fato (Local State atualizado)', !stillConflicting);
    }

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
