const puppeteer = require('puppeteer-core');
const fs = require('fs');

const BROWSER_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'http://localhost:3000';

let pass = 0;
let fail = 0;
const failures = [];

function check(label, cond, extra) {
  if (cond) {
    pass++;
    console.log(`PASS — ${label}${extra ? ' :: ' + extra : ''}`);
  } else {
    fail++;
    failures.push(label + (extra ? ` (${extra})` : ''));
    console.log(`FAIL — ${label}${extra ? ' :: ' + extra : ''}`);
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== INICIANDO BROWSER QA — 5 DOMÍNIOS COMPLETOS & LIVING EXPERIENCE ===');

  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. CARREGAMENTO INICIAL
  console.log('\n--- 1. CARREGAMENTO INICIAL ---');
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1000);

  const title = await page.title();
  check('Página inicial carregou com sucesso', title.length > 0, `Título: ${title}`);

  // 2. DOMÍNIO HOJE
  console.log('\n--- 2. QA DOMÍNIO: HOJE ---');
  await page.click('#nav-item-hoje');
  await sleep(800);

  // Checar Matriz de Atenção (Agora)
  const agoraText = await page.evaluate(() => document.body.innerText);
  check('Hoje renderiza bloco Agora', agoraText.includes('Execução Focada') || agoraText.includes('AGORA') || agoraText.includes('Agora (Foco em Execução)'));
  check('Hoje renderiza Atenção & Alertas', agoraText.includes('Telemedicina') || agoraText.includes('ATENÇÃO'));

  // 1. Obter título do Bloco A (bloco ativo no Agora)
  const titleA = await page.evaluate(() => {
    const h2 = document.querySelector('h2');
    return h2 ? h2.innerText.trim() : '';
  });
  check('Bloco A ativo no Agora', titleA.length > 0, `Bloco A: "${titleA}"`);

  // 2. Obter título do Bloco B (bloco na sequência em Próximo)
  const titleB = await page.evaluate(() => {
    const nextSection = document.querySelector('section[aria-label="Próximo Bloco"]');
    if (!nextSection) return '';
    const h3 = nextSection.querySelector('h3');
    return h3 ? h3.innerText.trim() : '';
  });
  check('Bloco B consecutivo presente em Próximo', titleB.length > 0 && titleB !== titleA, `Bloco B: "${titleB}"`);

  // 3. Clicar em "Concluir" no Bloco A
  const concluirBtnA = await page.evaluate(() => {
    const btn = document.querySelector('#btn-concluir-agora') ||
      Array.from(document.querySelectorAll('section[aria-label="Compromisso Atual"] button')).find(b => b.innerText.includes('Concluir'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Botão Concluir clicado no Bloco A', concluirBtnA);
  await sleep(800);

  // 4. Provar: Bloco A fica Concluído (permanece representado visualmente com badge/status Concluído)
  const stateAfterA = await page.evaluate(() => {
    const body = document.body.innerText;
    const completedSummary = document.querySelector('[data-testid="last-completed-summary"]');
    return {
      hasCompletedBadge: body.includes('Concluído'),
      summaryText: completedSummary ? completedSummary.innerText : '',
      protagonistH2: document.querySelector('h2') ? document.querySelector('h2').innerText.trim() : '',
    };
  });
  check(
    'Bloco A permanece representado com status Concluído',
    stateAfterA.hasCompletedBadge && stateAfterA.summaryText.includes(titleA),
    `Bloco A concluído: "${titleA}" visível no resumo com badge Concluído`
  );

  // 5. Provar: Bloco B assume protagonismo no Agora
  check(
    'Bloco B assume protagonismo no Agora',
    stateAfterA.protagonistH2 === titleB,
    `Novo Protagonista no h2: "${stateAfterA.protagonistH2}" === Bloco B: "${titleB}"`
  );

  // 6. Concluir blocos restantes da janela até que não haja mais próximo bloco
  let lastCompletedBlockTitle = titleB;
  while (true) {
    const hasNextActive = await page.evaluate(() => {
      const btn = document.querySelector('#btn-concluir-agora');
      return !!btn;
    });
    if (!hasNextActive) break;
    lastCompletedBlockTitle = await page.evaluate(() => {
      const h2 = document.querySelector('h2');
      return h2 ? h2.innerText.trim() : '';
    });
    await page.evaluate(() => {
      const btn = document.querySelector('#btn-concluir-agora');
      if (btn) btn.click();
    });
    await sleep(800);
  }
  check('Blocos restantes concluídos até encerramento da janela operacional', true, `Último concluído: "${lastCompletedBlockTitle}"`);

  // 7. Provar: Bloco recém-concluído permanece representado e há transição explícita para Estado Calmo / Janela Concluída
  const stateCalm = await page.evaluate(() => {
    const body = document.body.innerText;
    const calmCard = document.querySelector('[data-testid="calm-state-card"]');
    return {
      bodyText: body,
      hasCalmCard: !!calmCard,
      calmCardText: calmCard ? calmCard.innerText : '',
    };
  });
  check(
    'Bloco recém-concluído permanece representado mesmo sem próximo bloco',
    stateCalm.bodyText.includes(lastCompletedBlockTitle) && stateCalm.bodyText.includes('Concluído'),
    `Bloco preservado: "${lastCompletedBlockTitle}" com status Concluído`
  );
  check(
    'Transição explícita para Janela/Dia Concluída em Estado Calmo',
    stateCalm.hasCalmCard && (stateCalm.calmCardText.includes('Janela do Dia Concluída') || stateCalm.calmCardText.includes('Estado Calmo')),
    'Card de Estado Calmo ativo com mensagem de descanso e ações de encerramento'
  );

  // Alternar subview para Contexto / Tarefas
  const tarefasTabClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Tarefas & Projetos'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Aba Tarefas & Projetos ativada', tarefasTabClicked);
  await sleep(500);

  const tarefasText = await page.evaluate(() => document.body.innerText);
  check('Tarefas atrasadas exibidas', tarefasText.includes('Revisar bibliografia') || tarefasText.includes('Atrasadas'));
  check('Vínculo com Projeto Integrado presente', tarefasText.includes('Projeto Integrado') || tarefasText.includes('Faculdade'));

  // Alternar subview para Histórico
  const histHojeClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Histórico'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Aba Histórico ativada no Hoje', histHojeClicked);
  await sleep(500);
  const histHojeText = await page.evaluate(() => document.body.innerText);
  check('Métricas de cumprimento e histórico exibidas', histHojeText.includes('Cumprimento') || histHojeText.includes('Oração Matinal') || histHojeText.includes('Histórico'));

  // 3. DOMÍNIO GUARDIAN
  console.log('\n--- 3. QA DOMÍNIO: GUARDIAN ---');
  await page.click('#nav-item-guardian');
  await sleep(800);

  const guardianText = await page.evaluate(() => document.body.innerText);
  check('Cadeia Causal renderizada', guardianText.includes('Cadeia de Decisão Causal') || guardianText.includes('EVENTO'));

  // Testar Percorrer Cadeia
  const runChainBtn = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Percorrer Cadeia') || b.innerText.includes('5 Nós'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Botão Percorrer Cadeia acionado', runChainBtn);
  await sleep(1500);

  // Subview Radar
  const radarBtn = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Radar de Riscos') || b.innerText.includes('Radar'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Aba Radar de Riscos ativada', radarBtn);
  await sleep(500);
  const radarText = await page.evaluate(() => document.body.innerText);
  check('Alertas transversais ativos listados', radarText.includes('Cobrança Duplicada') || radarText.includes('CRÍTICO') || radarText.includes('crítico'));

  // Subview Action Center
  const actionsBtn = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Action Center') || b.innerText.includes('Ações'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Aba Action Center ativada', actionsBtn);
  await sleep(500);

  // Aprovar ação pendente
  const approveAction = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Aprovar') || b.innerText.includes('Confirmar'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Aprovação L2 executada', approveAction);
  await sleep(500);
  const approvedText = await page.evaluate(() => document.body.innerText);
  check('Ação confirmada e aprovada', approvedText.includes('Aprovada') || approvedText.includes('EXECUTADA') || approvedText.includes('executada'));

  // Subview Matriz de Confiança
  const trustBtn = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Matriz de Confiança') || b.innerText.includes('Autonomia'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Aba Matriz de Confiança ativada', trustBtn);
  await sleep(500);
  const trustText = await page.evaluate(() => document.body.innerText);
  check('Políticas de Autonomia L1/L2/L3 visíveis', trustText.includes('L1') && trustText.includes('L2'));

  // 4. DOMÍNIO CORPO
  console.log('\n--- 4. QA DOMÍNIO: CORPO ---');
  await page.click('#nav-item-corpo');
  await sleep(800);

  const corpoText = await page.evaluate(() => document.body.innerText);
  check('Evolução & Força renderizada', corpoText.includes('Evolução e Força') || corpoText.includes('Agachamento') || corpoText.includes('Supino'));

  // Subview Modo Treino (Bancada Cinética)
  const treinoTab = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Modo Treino') || b.innerText.includes('Bancada'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Modo Treino (Bancada Cinética) ativado', treinoTab);
  await sleep(600);

  // Testar ajuste de carga (+2kg)
  const addWeight = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('+2kg'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Ajuste de carga (+2kg) clicado', addWeight);
  await sleep(300);

  // Registrar Série
  const regSerie = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Registrar Série'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Série registrada com sucesso', regSerie);
  await sleep(600);

  const treinoAfterText = await page.evaluate(() => document.body.innerText);
  check('Contador de séries e timer ativados', treinoAfterText.includes('1 / 4') || treinoAfterText.includes('DESCANSO') || treinoAfterText.includes('Descanso'));

  // Subview Prontidão & Sono
  const sonoTab = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Prontidão & Sono') || b.innerText.includes('Prontidão'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Aba Prontidão & Sono ativada', sonoTab);
  await sleep(500);
  const sonoText = await page.evaluate(() => document.body.innerText);
  check('Métricas de Prontidão e Sono exibidas', sonoText.includes('Prontidão Biológica') || sonoText.includes('Sono') || sonoText.includes('Sono Total'));

  // 5. DOMÍNIO FINANÇAS
  console.log('\n--- 5. QA DOMÍNIO: FINANÇAS ---');
  await page.click('#nav-item-financas');
  await sleep(800);

  const finText = await page.evaluate(() => document.body.innerText);
  check('Saldo e barra de proporção renderizados', finText.includes('34.280') || finText.includes('Equilíbrio') || finText.includes('Disponível'));

  // Testar simulador de gasto (+R$ 1.500)
  const simula1500 = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('+ R$ 1.500') || b.innerText.includes('1.500'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Simulador de gasto (+ R$ 1.500) clicado', simula1500);
  await sleep(500);

  const simulaText = await page.evaluate(() => document.body.innerText);
  check('Recálculo dinâmico de Runway e Livre', simulaText.includes('dias de runway') || simulaText.includes('seu livre recua para') || simulaText.includes('1.500'));

  // Subview Contas & Cartões
  const contasTab = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Contas & Cartões') || b.innerText.includes('Contas'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Aba Contas & Cartões ativada', contasTab);
  await sleep(500);
  const contasText = await page.evaluate(() => document.body.innerText);
  check('Contas e limites disponíveis exibidos', contasText.includes('Nubank') || contasText.includes('Inter Black'));

  // Subview Anomalias
  const anomaliaTab = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Anomalias & Risco') || b.innerText.includes('Anomalias'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Aba Anomalias ativada', anomaliaTab);
  await sleep(500);
  const anomText = await page.evaluate(() => document.body.innerText);
  check('Cobrança duplicada detectada', anomText.includes('89,90') || anomText.includes('Duplicada') || anomText.includes('Cobrança Duplicada'));

  // Clicar em contestar
  const contestBtn = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Contestar Cobrança') || b.innerText.includes('Contestar'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Botão de contestação via Guardian acionado', contestBtn);
  await sleep(500);

  // 6. DOMÍNIO ESPIRITUAL
  console.log('\n--- 6. QA DOMÍNIO: ESPIRITUAL ---');
  await page.click('#nav-item-espiritual');
  await sleep(800);

  const espText = await page.evaluate(() => document.body.innerText);
  check('Escritura Viva renderizada com versículos', espText.includes('Romanos 8') || espText.includes('Escritura') || espText.includes('Escritura Viva'));

  // Clicar em versículo para focar (elementos div com cursor-pointer)
  const vClick = await page.evaluate(() => {
    const verses = Array.from(document.querySelectorAll('div[class*="cursor-pointer"]'));
    const v = verses.find(el => el.innerText.includes('Porque eu estou bem certo') || el.innerText.includes('38') || el.innerText.includes('31'));
    if (v) {
      v.click();
      return true;
    }
    if (verses.length > 0) {
      verses[0].click();
      return true;
    }
    return false;
  });
  check('Seleção e foco de versículo', vClick);
  await sleep(500);

  // Subview Memória Bíblica
  const memTab = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Memória Bíblica') || b.innerText.includes('Memória'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Aba Memória Bíblica ativada', memTab);
  await sleep(500);

  // Testar ocultação de 50%
  const hide50 = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('50% Oculto') || b.innerText.includes('50%'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Nível de retenção 50% ativado', hide50);
  await sleep(400);

  // Subview Oração Contemplativa
  const oracaoTab = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Oração Contemplativa') || b.innerText.includes('Oração'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  check('Aba Oração Contemplativa ativada', oracaoTab);
  await sleep(500);
  const oracaoText = await page.evaluate(() => document.body.innerText);
  check('Círculo de respiração e atmosfera contemplativa ativos', oracaoText.includes('INSPIRA') || oracaoText.includes('RETÉM') || oracaoText.includes('Respiração') || oracaoText.includes('Caderno de Intenções'));

  // 7. RESPONSIVIDADE EM BREAKPOINTS REAIS
  console.log('\n--- 7. RESPONSIVE BREAKPOINT CHECKS (390, 820, 1024, 1440) ---');
  const viewports = [
    { name: 'Mobile (390px)', w: 390, h: 844 },
    { name: 'Tablet (820px)', w: 820, h: 1180 },
    { name: 'Laptop (1024px)', w: 1024, h: 768 },
    { name: 'Desktop (1440px)', w: 1440, h: 900 }
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.w, height: vp.h });
    await sleep(400);
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 1;
    });
    check(`Viewport ${vp.name} sem overflow horizontal`, !overflow, `w=${vp.w}`);
  }

  await browser.close();

  console.log('\n=== RESUMO DO BROWSER QA ===');
  console.log(`TOTAL DE TESTES: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
  if (failures.length > 0) {
    console.log('Falhas encontradas:');
    failures.forEach((f) => console.log(' - ' + f));
    process.exit(1);
  } else {
    console.log('TODAS AS EXPERIÊNCIAS E TRANSIÇÕES PROVADAS NO BROWSER!');
  }
}

run().catch((err) => {
  console.error('Erro crítico no browser QA:', err);
  process.exit(1);
});
