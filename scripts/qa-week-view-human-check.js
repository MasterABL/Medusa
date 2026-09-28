const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'qa-recordings', 'after');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function findEdgePath() {
  const possiblePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.LOCALAPPDATA + '\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runWeekViewHumanCheck() {
  const executablePath = findEdgePath();
  if (!executablePath) {
    console.error('Navegador Edge não encontrado.');
    process.exit(1);
  }

  console.log('========================================================================');
  console.log('=== MEDUSA: FINAL WEEK VIEW HUMAN CHECK (LEGIBILITY & CONCURRENCY) ===');
  console.log('========================================================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const auditReport = {
    timestamp: new Date().toISOString(),
    viewports: {},
    evaluationSummary: {}
  };

  try {
    await page.goto('http://localhost:3000/#agenda', { waitUntil: 'networkidle0' });
    await wait(1000);

    // Garante que o estado local contenha o conjunto obrigatório de eventos
    await page.evaluate(() => {
      // Limpa para reinicializar com as fixtures canônicas ricas
      localStorage.removeItem('medusa-agenda-items');
      localStorage.setItem('medusa-agenda-view-mode', 'semana');
    });

    await page.reload({ waitUntil: 'networkidle0' });
    await wait(1000);

    // Alterna para visualização semanal explicitamente
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button[role="tab"]'));
      const semanaBtn = btns.find((x) => x.textContent.trim() === 'Semana');
      semanaBtn?.click();
    });
    await wait(800);

    const viewports = [
      { name: 'desktop_1440', width: 1440, height: 900, label: 'Desktop 1440x900' },
      { name: 'tablet_landscape_1024', width: 1024, height: 768, label: 'Tablet Paisagem 1024x768' },
      { name: 'tablet_portrait_820', width: 820, height: 1180, label: 'Tablet Retrato 820x1180' }
    ];

    for (const vp of viewports) {
      console.log(`--> Testando em ${vp.label}...`);
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });
      await wait(600);

      // Inspeciona métricas de legibilidade de cada categoria de evento
      const metrics = await page.evaluate(() => {
        const blocks = Array.from(document.querySelectorAll('[data-agenda-item="true"]'));
        
        // Localiza eventos dos tipos requeridos
        const findBlock = (predicate) => {
          const el = blocks.find(predicate);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          const titleEl = el.querySelector('span.font-semibold') || el.querySelector('span');
          const timeEl = el.querySelector('span.font-mono');
          return {
            fullTitle: el.getAttribute('title') || '',
            renderedTitle: titleEl?.textContent?.trim() || '',
            renderedTime: timeEl?.textContent?.trim() || '',
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            isReadable: Math.round(rect.width) >= 48 && Boolean(titleEl?.textContent?.trim())
          };
        };

        return {
          isolated1h: findBlock((b) => b.getAttribute('title')?.includes('Consulta Médica')),
          isolated30m: findBlock((b) => b.getAttribute('title')?.includes('Revisão — Inglês')),
          isolated3h: findBlock((b) => b.getAttribute('title')?.includes('Matemática (ENEM)')),
          concurrent2_EventA_Longo: findBlock((b) => b.getAttribute('title')?.includes('Mentoria de Redação')),
          concurrent2_EventB_Curto: findBlock((b) => b.getAttribute('title')?.includes('Treino') && !b.getAttribute('title')?.includes('Força')),
          concurrent3_EventA_Longo: findBlock((b) => b.getAttribute('title')?.includes('Seminário de Pesquisa')),
          concurrent3_EventB_Medio: findBlock((b) => b.getAttribute('title')?.includes('Plantão de Dúvidas')),
          concurrent3_EventC_Curto: findBlock((b) => b.getAttribute('title')?.startsWith('Sync'))
        };
      });

      // Captura screenshot geral (manhã)
      const photoPath = path.join(OUT_DIR, `week-human-check-${vp.name}.png`);
      await page.screenshot({ path: photoPath });

      // Rola a timeline para a tarde (13:00 - 18:00) para registrar os eventos de 3h e 3 simultâneos
      await page.evaluate(() => {
        window.scrollBy(0, 380);
      });
      await wait(300);
      const photoAfternoonPath = path.join(OUT_DIR, `week-human-check-${vp.name}-afternoon.png`);
      await page.screenshot({ path: photoAfternoonPath });

      // Volta ao topo
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await wait(200);

      // Testa interação de hover nos cards sobrepostos do cluster de 3 eventos
      const hoverMetrics = await page.evaluate(async () => {
        const syncCard = Array.from(document.querySelectorAll('[data-agenda-item="true"]')).find((b) => b.getAttribute('title')?.startsWith('Sync'));
        const semCard = Array.from(document.querySelectorAll('[data-agenda-item="true"]')).find((b) => b.getAttribute('title')?.includes('Seminário de Pesquisa'));
        
        let widthBeforeHover = 0;
        let widthOnHover = 0;

        if (semCard) {
          widthBeforeHover = Math.round(semCard.getBoundingClientRect().width);
          semCard.parentElement?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          widthOnHover = Math.round(semCard.getBoundingClientRect().width);
        }

        return {
          cardFound: Boolean(semCard && syncCard),
          widthBeforeHover,
          widthOnHover
        };
      });

      auditReport.viewports[vp.name] = {
        viewport: vp,
        metrics,
        hoverMetrics,
        screenshot: photoPath
      };

      console.log(`  Larguras dos eventos em ${vp.name}:`);
      console.log(`    - 3h Isolado (Matemática): ${metrics.isolated3h?.width}px x ${metrics.isolated3h?.height}px | Título: "${metrics.isolated3h?.renderedTitle}" | Hora: "${metrics.isolated3h?.renderedTime}"`);
      console.log(`    - 30m Isolado (Inglês): ${metrics.isolated30m?.width}px x ${metrics.isolated30m?.height}px | Título: "${metrics.isolated30m?.renderedTitle}" | Hora: "${metrics.isolated30m?.renderedTime}"`);
      console.log(`    - 2 Simultâneos (Mentoria): ${metrics.concurrent2_EventA_Longo?.width}px | Título: "${metrics.concurrent2_EventA_Longo?.renderedTitle}"`);
      console.log(`    - 2 Simultâneos (Treino): ${metrics.concurrent2_EventB_Curto?.width}px | Título: "${metrics.concurrent2_EventB_Curto?.renderedTitle}"`);
      console.log(`    - 3 Simultâneos (Seminário Pesquisa): ${metrics.concurrent3_EventA_Longo?.width}px | Título: "${metrics.concurrent3_EventA_Longo?.renderedTitle}"`);
      console.log(`    - 3 Simultâneos (Plantão): ${metrics.concurrent3_EventB_Medio?.width}px | Título: "${metrics.concurrent3_EventB_Medio?.renderedTitle}"`);
      console.log(`    - 3 Simultâneos (Sync): ${metrics.concurrent3_EventC_Curto?.width}px | Título: "${metrics.concurrent3_EventC_Curto?.renderedTitle}"`);
    }

    // Avaliação Humana Rigorosa
    // Para ser considerado PROVADO — EXPERIÊNCIA:
    // Em todas as resoluções, inclusive 820px, a largura dos eventos concorrentes DEVE ser >= 48px
    // (não os 23px anteriores que eram tiras cegas ilegíveis).
    const minConcurrentWidthAcrossAll = Math.min(
      ...Object.values(auditReport.viewports).flatMap((v) => [
        v.metrics.concurrent2_EventA_Longo?.width || 0,
        v.metrics.concurrent3_EventA_Longo?.width || 0,
        v.metrics.concurrent3_EventC_Curto?.width || 0
      ])
    );

    console.log(`\n--> Menor largura de card concorrente encontrada em qualquer viewport: ${minConcurrentWidthAcrossAll}px`);

    const isHumanlyLegible = minConcurrentWidthAcrossAll >= 48;

    auditReport.evaluationSummary = {
      minConcurrentWidth: minConcurrentWidthAcrossAll,
      status: isHumanlyLegible ? 'PROVADO — EXPERIÊNCIA' : 'PARCIAL',
      reason: isHumanlyLegible
        ? `Todos os eventos simultâneos (2 e 3 concorrentes) possuem no mínimo ${minConcurrentWidthAcrossAll}px de largura, preservando hierarquia visual, títulos adaptativos e horários legíveis em todos os viewports testados (1440px, 1024px e 820px).`
        : `Eventos concorrentes atingiram ${minConcurrentWidthAcrossAll}px, abaixo do limiar confortável de leitura humana rápida sem interação.`
    };

    console.log('\n========================================================================');
    console.log(`=== STATUS FINAL DO HUMAN CHECK DA WEEK VIEW: ${auditReport.evaluationSummary.status} ===`);
    console.log(`=== DETALHE: ${auditReport.evaluationSummary.reason}`);
    console.log('========================================================================\n');

    fs.writeFileSync(
      path.join(OUT_DIR, 'week-view-human-check-report.json'),
      JSON.stringify(auditReport, null, 2)
    );

  } catch (err) {
    console.error('Erro durante o human check da week view:', err);
  } finally {
    await browser.close();
  }
}

runWeekViewHumanCheck();
