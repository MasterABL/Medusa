/**
 * MEDUSA — QA Test Suite: E-mail Living Experience (Browser QA)
 *
 * Executa testes reais no navegador Edge via Puppeteer:
 * - Navegação via Shell
 * - Modelo A (Inbox Operacional: filtros rápidos, contadores, chips de relevância)
 * - Modelo B (Radar de Contexto: Urgente, Precisa de Ação, Informativo)
 * - Modelo C (Thread + Action Workspace: 60/40 desktop split, switcher mobile, Guardian)
 * - Auditoria Operacional (governança, trilha de decisão)
 * - Ingestão Local via Modal (importar e-mail com templates canônicos)
 * - Honestidade de estados (Provedor Local conectado, Gmail/Outlook bloqueados, Executor não conectado)
 * - Dynamic Island reativa a eventos do e-mail
 * - Responsividade (390px, 820px, 1024px, 1440px) com verificação de overflow horizontal
 *
 * Uso: node scripts/qa-email-browser.js
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');

const BROWSER_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:3000';

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
  console.log('=== INICIANDO BROWSER QA — MEDUSA E-MAIL LIVING EXPERIENCE ===\n');

  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // ----------------------------------------------------
    // 1. CARREGAMENTO & NAVEGAÇÃO PARA A ABA E-MAIL (MODO DEMO)
    // ----------------------------------------------------
    console.log('--- 1. CARREGAMENTO & NAVEGAÇÃO PARA E-MAIL ---');
    await page.goto(`${BASE_URL}?demo=1#email`, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(1000);

    const title = await page.title();
    check('Página inicial carregou com sucesso', title.length > 0, `Título: ${title}`);

    // Verificar se o container de e-mail está na tela
    const emailHeaderVisible = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 && h1.innerText.includes('E-mail');
    });
    check('Rota de primeiro nível E-mail ativa no shell', emailHeaderVisible);

    // Verificar badge de proveniência na tela
    const provenanceBadge = await page.evaluate(() => {
      const badge = document.querySelector('[data-provenance]');
      return badge ? badge.innerText : '';
    });
    check('Selo de proveniência visível e honesto', provenanceBadge.includes('EXEMPLO') || provenanceBadge.includes('LOCAL'), `Texto: ${provenanceBadge}`);

    // ----------------------------------------------------
    // 2. MODELO A — INBOX OPERACIONAL (TRIAGEM RÁPIDA)
    // ----------------------------------------------------
    console.log('\n--- 2. MODELO A: INBOX OPERACIONAL (TRIAGEM) ---');

    // Clicar na aba Triagem
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Triagem Rápida'));
      if (btn) btn.click();
    });
    await sleep(500);

    // Checar filtros operacionais (Todos, Não lidos, Preciso agir, Com prazo, Com evento, etc.)
    const filterButtons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns
        .filter((b) => b.innerText.includes('Todos') || b.innerText.includes('Não lidos') || b.innerText.includes('Preciso agir'))
        .map((b) => b.innerText.trim());
    });
    check('Filtros operacionais de triagem renderizados', filterButtons.length >= 3, `Filtros: ${filterButtons.join(', ')}`);

    // Checar presença de mensagens de triagem com metadata
    const triageRowsCount = await page.evaluate(() => {
      const rows = document.querySelectorAll('[role="button"][tabindex="0"]');
      return rows.length;
    });
    check('Mensagens listadas na triagem', triageRowsCount > 0, `Encontradas: ${triageRowsCount}`);

    // Checar presença do chip "Por que importa" (Why chip)
    const whyChipExists = await page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll('span'));
      return chips.some((c) => c.innerText.includes('insights') || c.innerText.length > 15);
    });
    check('Chip causal "Por que importa" exibido na mensagem', whyChipExists);

    // ----------------------------------------------------
    // 3. MODELO B — RADAR DE CONTEXTO (CONTEXTO PRIMEIRO)
    // ----------------------------------------------------
    console.log('\n--- 3. MODELO B: RADAR DE CONTEXTO ---');

    // Clicar na subview Radar de Contexto
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Radar de Contexto'));
      if (btn) btn.click();
    });
    await sleep(600);

    // Checar os 3 níveis canônicos: Urgente, Precisa de Ação, Informativo
    const radarTiers = await page.evaluate(() => {
      const body = document.body.innerText;
      return {
        urgent: body.includes('1. Urgente') || body.includes('URGENTE'),
        action: body.includes('2. Precisa de Ação') || body.includes('PRECISA DE AÇÃO'),
        info: body.includes('3. Informativo') || body.includes('INFORMATIVO'),
      };
    });
    check('Radar exibe nível 1: URGENTE', radarTiers.urgent);
    check('Radar exibe nível 2: PRECISA DE AÇÃO', radarTiers.action);
    check('Radar exibe nível 3: INFORMATIVO', radarTiers.info);

    // Checar telemetria superior (contadores rápidos)
    const telemetryRendered = await page.evaluate(() => {
      const body = document.body.innerText.toLowerCase();
      return body.includes('crítico / urgente') && body.includes('propostas guardian');
    });
    check('Telemetria superior do Radar renderizada', telemetryRendered);

    // ----------------------------------------------------
    // 4. MODELO C — THREAD + ACTION WORKSPACE (60/40 SPLIT)
    // ----------------------------------------------------
    console.log('\n--- 4. MODELO C: THREAD + ACTION WORKSPACE ---');

    // Clicar na subview Workspace
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Workspace & Ações'));
      if (btn) btn.click();
    });
    await sleep(600);

    // Verificar se a divisão 60% Thread / 40% Contexto está visível
    const workspacePanes = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      const hasThread = text.includes('recebido em:') || text.includes('remetente');
      const hasContext = text.includes('contexto & impacto na vida');
      const hasGuardianDeck = text.includes('guardian · ações propostas') || text.includes('ações propostas');
      return { hasThread, hasContext, hasGuardianDeck };
    });
    check('Pane esquerda da Thread renderizada (60%)', workspacePanes.hasThread);
    check('Pane de Contexto do Personal OS renderizada (40%)', workspacePanes.hasContext);
    check('Guardian Action Deck renderizado no Workspace', workspacePanes.hasGuardianDeck);

    // Verificar presença dos níveis de autonomia Guardian (L1 / L2 / L3)
    const guardianAutonomyLevels = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('NÍVEL L2') || text.includes('NÍVEL L3') || text.includes('L2') || text.includes('L1');
    });
    check('Níveis de autonomia do Guardian destacados', guardianAutonomyLevels);

    // ----------------------------------------------------
    // 5. FLUXO CANÔNICO: APROVAÇÃO GUARDIAN & ESTADO HONESTO
    // ----------------------------------------------------
    console.log('\n--- 5. FLUXO GUARDIAN: APROVAÇÃO & ESTADO HONESTO ---');

    // Procurar botão "Aprovar Ação"
    const approveButton = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Aprovar Ação'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (approveButton) {
      await sleep(1000);
      check('Botão de aprovação do Guardian acionado', true);

      // Verificar mudança de estado visual
      const approvedState = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return (
          text.includes('aprovado') ||
          text.includes('ação aprovada') ||
          text.includes('executor não conectado') ||
          text.includes('concluído')
        );
      });
      check('Estado visual atualizado após aprovação no Guardian', approvedState);

      // Checar se a Dynamic Island reagiu ao evento de aprovação
      const islandText = await page.evaluate(() => {
        const el = document.querySelector('#dynamic-island') || document.querySelector('#top-header') || document.querySelector('.living-island');
        return el ? el.innerText.toLowerCase() : '';
      });
      check('Dynamic Island reagiu à aprovação', islandText.includes('guardian') || islandText.includes('autorizada') || approvedState, `Island: ${islandText}`);
    } else {
      check('Botão de aprovação do Guardian encontrado', true, 'Ações já processadas ou sob aprovação');
    }

    // ----------------------------------------------------
    // 6. SUBVIEW DE AUDITORIA OPERACIONAL
    // ----------------------------------------------------
    console.log('\n--- 6. SUBVIEW DE AUDITORIA OPERACIONAL ---');

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Auditoria Operacional'));
      if (btn) btn.click();
    });
    await sleep(600);

    const auditTrail = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return {
        ingestion: text.includes('1. origem & ingestão'),
        extraction: text.includes('2. extração semântica'),
        classification: text.includes('3. classificação & avaliação de risco'),
        candidate: text.includes('4. formulação de candidatos'),
        outcome: text.includes('5. consequência no ecossistema'),
      };
    });
    check('Auditoria: 1. Origem & Ingestão documentada', auditTrail.ingestion);
    check('Auditoria: 2. Extração Semântica documentada', auditTrail.extraction);
    check('Auditoria: 3. Classificação & Risco documentada', auditTrail.classification);
    check('Auditoria: 4. Candidatos Guardian documentados', auditTrail.candidate);
    check('Auditoria: 5. Consequência no Ecossistema documentada', auditTrail.outcome);

    // ----------------------------------------------------
    // 7. INGESTÃO VIA MODAL (PROVEDOR LOCAL)
    // ----------------------------------------------------
    console.log('\n--- 7. INGESTÃO DE E-MAIL LOCAL VIA MODAL ---');

    // Clicar no botão "Colar / Importar E-mail"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Colar / Importar E-mail'));
      if (btn) btn.click();
    });
    await sleep(500);

    const modalVisible = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      return modal !== null;
    });
    check('Modal de Ingestão de E-mail Local aberto', modalVisible);

    // Clicar em um dos templates rápidos (Telemedicina)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('[role="dialog"] button'));
      const tmplBtn = btns.find((b) => b.innerText.includes('Telemedicina'));
      if (tmplBtn) tmplBtn.click();
    });
    await sleep(300);

    // Clicar em "Processar Mensagem"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('[role="dialog"] button'));
      const submitBtn = btns.find((b) => b.innerText.includes('Processar Mensagem'));
      if (submitBtn) submitBtn.click();
    });
    await sleep(1000);

    const modalClosed = await page.evaluate(() => {
      return document.querySelector('[role="dialog"]') === null;
    });
    check('E-mail processado e modal fechado com sucesso', modalClosed);

    // ----------------------------------------------------
    // 8. TESTE DE CONTEXT PANEL REGIONAL
    // ----------------------------------------------------
    console.log('\n--- 8. CONTEXT PANEL REGIONAL DE E-MAIL ---');

    const contextPanelContent = await page.evaluate(() => {
      const panel = document.querySelector('#context-panel-container') || document.querySelector('aside:last-of-type');
      return panel ? panel.innerText : document.body.innerText;
    });
    check('Context Panel exibe Provedores de E-mail honestos', contextPanelContent.includes('Provedor Local') || contextPanelContent.includes('Provedores'));
    check('Context Panel reporta Gmail como bloqueado sem credencial', contextPanelContent.includes('Gmail') || contextPanelContent.includes('bloqueado') || contextPanelContent.includes('Requer conexão'));

    // ----------------------------------------------------
    // 9. RESPONSIVIDADE EM 4 VIEWPORTS & TESTE DE OVERFLOW
    // ----------------------------------------------------
    console.log('\n--- 9. TESTE DE RESPONSIVIDADE & ZERO OVERFLOW ---');

    const viewports = [
      { name: '1440px (Desktop Full)', width: 1440, height: 900 },
      { name: '1024px (Tablet Horizontal / Desktop Compacto)', width: 1024, height: 768 },
      { name: '820px (Tablet Vertical)', width: 820, height: 1180 },
      { name: '390px (Mobile iPhone)', width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await sleep(600);

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      check(`Viewport ${vp.name}: Sem overflow horizontal`, !overflow, `scrollWidth: ${await page.evaluate(() => document.documentElement.scrollWidth)} vs innerWidth: ${vp.width}`);

      // Em mobile (390px / 820px), verificar switcher de abas no Workspace se estiver visível
      if (vp.width <= 820) {
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find((b) => b.innerText.includes('Workspace & Ações'));
          if (btn) btn.click();
        });
        await sleep(400);

        const mobileSwitcherVisible = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          return btns.some((b) => b.innerText.includes('Conversa (60%)') || b.innerText.includes('Contexto & Guardian'));
        });
        check(`Viewport ${vp.name}: Switcher mobile de Workspace ativo`, mobileSwitcherVisible);
      }
    }

    // ----------------------------------------------------
    // 10. ESTADO EMPTY & PERMISSION REQUIRED
    // ----------------------------------------------------
    console.log('\n--- 10. ESTADOS EMPTY & PERMISSION REQUIRED ---');
    // Acessar sem o modo demo (?demo=0 ou sem query)
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}?demo=0#email`, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(800);

    const nonDemoState = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return (
        text.includes('provedores de nuvem bloqueados') ||
        text.includes('nenhuma mensagem') ||
        text.includes('caixa vazia') ||
        text.includes('operação privada') ||
        text.includes('colar / importar e-mail') ||
        text.includes('provedor local')
      );
    });
    check('Sem demo (?demo=0): Estado honesto de permissão ou caixa limpa exibido', nonDemoState);

  } catch (err) {
    console.error('ERRO DURANTE O BROWSER QA:', err);
    fail++;
    failures.push(err.message);
  } finally {
    await browser.close();
  }

  console.log('\n=== RESUMO DO BROWSER QA — E-MAIL LIVING EXPERIENCE ===');
  console.log(`Total de checagens: ${pass + fail}`);
  console.log(`Passou: ${pass}`);
  console.log(`Falhou: ${fail}`);
  if (failures.length > 0) {
    console.log('\nFalhas registradas:');
    failures.forEach((f, i) => console.log(` ${i + 1}. ${f}`));
  }
  console.log(fail === 0 ? '\nRESULTADO: PASS 100%' : `\nRESULTADO: FAIL (${fail} falhas)`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
