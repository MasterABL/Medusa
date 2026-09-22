/**
 * QA real de Browser — Consolidação do Study Mode (ENEM/Inglês/Faculdade compartilham o mesmo
 * modelo físico: Hub -> Foco/Study Mode -> Conteúdo -> Prática -> Resultado) + limpeza de copy
 * dentro da árvore de Educação ("RODADA — REFINAMENTO FINAL DO STUDY MODE + UX COPY GLOBAL").
 *
 * Cobre:
 * - Hub != Study Mode: clicar na subaba NÃO inicia a aula; só "Continuar/Iniciar Sessão" entra
 *   em Foco.
 * - Layout 50/50 (conteúdo principal vs. companheiro) nas 3 trilhas.
 * - Inglês: alternador Vídeo/Aula IA/Dividido; fluxo estendido Aula -> Exercício de Voz ->
 *   Live Immersion -> Exercícios -> Flashcards -> Resultado; ciclo de voz com transcrição
 *   visível e feedback humano (sem métricas técnicas).
 * - Faculdade: Lousa (#0B1120) + fluxo direto Aula -> Exercícios (sem exceção criada para ENEM).
 * - ENEM: fluxo original preservado, sem virar exceção.
 * - Copy: nenhum termo técnico proibido nem inglês fora de conteúdo pedagógico dentro de
 *   #education-experience-root.
 * - Responsive (390/820/1024/1440) e reduced motion.
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

async function goToEducacao(page) {
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button')).find((b) => b.title === 'Educação')?.click();
  });
  await wait(400);
}

// Vai do Hub até dentro do Foco/Study Mode (Loading -> Ready -> auto-entrada)
async function enterStudyMode(page) {
  await click(page, '#btn-start-study-session');
  await wait(3700); // loading (~3.4s)
  await wait(2000); // ready state auto-avança após 1.8s
}

const FORBIDDEN_TERMS = [
  'clustering', 'pipeline', 'state machine', 'latency', 'bio-state', 'bio-estado',
  'syntactic analysis', 'processing pipeline', 'temporal graph', 'system status',
  'fixture', 'debug', 'heuristic', 'heurística', 'backend', 'architecture', 'arquitetural',
  'component', 'implementation', 'implementação', ' api ', 'wpm', 'inteligibilidade',
];

async function scanForbiddenTerms(page, rootSelector) {
  const text = await page.evaluate((sel) => (document.querySelector(sel)?.innerText || '').toLowerCase(), rootSelector);
  const found = FORBIDDEN_TERMS.filter((term) => text.includes(term));
  return found;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.MEDUSA_BROWSER_PATH || '/opt/pw-browsers/chromium',
    headless: 'new',
    args: ['--no-sandbox'],
  });

  // ===== 1. Hub != Study Mode: trocar de subaba NÃO inicia a aula =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    check('[Hub] Dashboard renderizado ao entrar em Educação', await exists(page, '#education-dashboard'));
    await click(page, '#track-selector-ingles');
    await wait(500);
    check('[Hub] Trocar de trilha permanece no Dashboard (não entra em Foco)', await exists(page, '#education-dashboard'));
    const stillDashboard = await exists(page, '#study-mode-container');
    check('[Hub] Study Mode NÃO é montado só por trocar de subaba', !stillDashboard);
    await page.close();
  }

  // ===== 2. Hub mostra Roteiro + Próxima Revisão + rótulo de sessão contextual =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    // innerText reflete transformação CSS (uppercase) de alguns rótulos — comparar em minúsculas.
    const heroText = await page.evaluate(() => document.getElementById('education-next-action-card')?.innerText || '');
    const heroTextLower = heroText.toLowerCase();
    check('[Hub] Roteiro da sessão visível (pontos-chave em chips)', heroTextLower.includes('força restauradora') || heroTextLower.includes('lei de hooke'));
    check('[Hub] Próxima Revisão visível no Hub', heroTextLower.includes('próxima revisão'));
    check('[Hub] Botão de sessão usa vocabulário "Continuar/Iniciar Sessão"', heroText.includes('Continuar Sessão') || heroText.includes('Iniciar Nova Sessão'));
    await page.close();
  }

  // ===== 3. ENEM: fluxo original preservado (sem exceção) =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    await click(page, '#track-selector-vestibular');
    await wait(500);
    await enterStudyMode(page);
    check('[ENEM] Study Mode alcançado', await exists(page, '#study-mode-container'));
    check('[ENEM] Sem alternador Vídeo/Aula IA/Dividido (exclusivo de Inglês)', !(await exists(page, '#btn-content-mode-video')));
    await click(page, '#btn-complete-lesson-trigger');
    await wait(500);
    check('[ENEM] Aula -> Exercícios direto, sem etapas extras', await exists(page, '#study-exercises-container'));
    await page.close();
  }

  // ===== 4. Faculdade: Lousa (#0B1120) + fluxo direto =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page); // trilha padrão já é Faculdade
    await enterStudyMode(page);
    const stageBg = await page.evaluate(() => {
      const stage = document.getElementById('lesson-stage');
      const canvas = stage ? stage.querySelector(':scope > div') : null;
      return canvas ? getComputedStyle(canvas).backgroundColor : null;
    });
    check('[Faculdade] Lousa usa #0B1120', stageBg === 'rgb(11, 17, 32)', `bg=${stageBg}`);
    const noticesText = await page.evaluate(() => document.getElementById('session-notices')?.innerText || '');
    check('[Faculdade] Painel companheiro mostra Avisos simples (não parede de cards)', noticesText.toLowerCase().includes('avisos') && noticesText.length < 400);
    await click(page, '#btn-complete-lesson-trigger');
    await wait(500);
    check('[Faculdade] Aula -> Exercícios direto (sem voz/imersão/flashcards)', await exists(page, '#study-exercises-container'));
    await page.close();
  }

  // ===== 5. Study Mode 50/50 nas 3 trilhas =====
  {
    for (const trackId of ['faculdade', 'ingles', 'vestibular']) {
      const page = await freshPage(browser, 1440, 960);
      await goToEducacao(page);
      if (trackId !== 'faculdade') {
        await click(page, `#track-selector-${trackId}`);
        await wait(500);
      }
      await enterStudyMode(page);
      const widths = await page.evaluate(() => {
        const stage = document.getElementById('lesson-stage');
        const aside = document.querySelector('[aria-label="Companheiro da Sessão de Estudo"]');
        return {
          stage: stage ? stage.getBoundingClientRect().width : null,
          aside: aside ? aside.getBoundingClientRect().width : null,
        };
      });
      const ratio = widths.stage && widths.aside ? widths.stage / widths.aside : null;
      check(`[Study Mode ${trackId}] colunas ~50/50 (proporção 0.85-1.15)`, ratio !== null && ratio > 0.85 && ratio < 1.15, `stage=${widths.stage} aside=${widths.aside} ratio=${ratio?.toFixed(2)}`);
      await page.close();
    }
  }

  // ===== 6. Inglês: alternador Vídeo/Aula IA/Dividido =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    await click(page, '#track-selector-ingles');
    await wait(500);
    await enterStudyMode(page);
    check('[Inglês] Alternador de modo presente', await exists(page, '#btn-content-mode-video'));
    await click(page, '#btn-content-mode-ai-lesson');
    await wait(250);
    const aiActive = await page.evaluate(() => document.getElementById('btn-content-mode-ai-lesson')?.getAttribute('aria-pressed'));
    check('[Inglês] Modo "Aula IA" fica ativo ao clicar', aiActive === 'true');
    await click(page, '#btn-content-mode-split');
    await wait(250);
    const splitLayoutPresent = await page.evaluate(() => !!document.querySelector('#lesson-stage .grid-cols-2'));
    check('[Inglês] Modo "Dividido" monta layout de 2 colunas dentro do palco', splitLayoutPresent);
    await page.close();
  }

  // ===== 7. Inglês: fluxo completo Aula -> Voz -> Live Immersion -> Exercícios -> Flashcards -> Resultado =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    await click(page, '#track-selector-ingles');
    await wait(500);
    await enterStudyMode(page);

    await click(page, '#btn-complete-lesson-trigger');
    await wait(500);
    check('[Inglês] Aula -> Exercício de Voz (não direto a Exercícios)', await exists(page, '#voice-exercise-container'));

    await click(page, '#btn-voice-exercise-speak');
    await wait(200);
    const transcriptDuringListen = await page.evaluate(() => document.getElementById('voice-exercise-transcript')?.textContent || '');
    check('[Voz] Transcrição permanece visível durante a escuta', transcriptDuringListen.length > 0);
    await wait(1700);
    await wait(1000);
    const feedbackText = await page.evaluate(() => document.getElementById('voice-exercise-feedback')?.textContent || '');
    check('[Voz] Feedback usa linguagem humana (não métrica técnica)', /pronúncia|compreendido|entonação|tentar novamente/i.test(feedbackText));
    check('[Voz] Feedback NÃO expõe métricas técnicas (%, WPM, latência)', !/\d+%|\bwpm\b|latência/i.test(feedbackText));

    // Percorre os prompts de voz restantes até Live Immersion
    let reachedImmersion = false;
    for (let i = 0; i < 4 && !reachedImmersion; i++) {
      await click(page, '#btn-voice-exercise-continue');
      await wait(400);
      if (await exists(page, '#live-immersion-container')) { reachedImmersion = true; break; }
      if (await exists(page, '#btn-voice-exercise-speak')) {
        await click(page, '#btn-voice-exercise-speak');
        await wait(1900);
        await wait(1000);
      }
    }
    check('[Inglês] Exercício de Voz -> Live Immersion', reachedImmersion);

    // Percorre os turnos de Live Immersion até Exercícios
    let reachedExercises = false;
    for (let i = 0; i < 4 && !reachedExercises; i++) {
      if (await exists(page, '#btn-immersion-speak')) {
        await click(page, '#btn-immersion-speak');
        await wait(1900);
        await wait(1000);
      }
      await click(page, '#btn-immersion-continue');
      await wait(400);
      if (await exists(page, '#study-exercises-container')) { reachedExercises = true; break; }
    }
    check('[Inglês] Live Immersion -> Exercícios (reaproveita StudyExercisesView)', reachedExercises);

    // Responde as 5 questões
    for (let i = 0; i < 5; i++) {
      await click(page, '#option-a');
      await wait(120);
      await click(page, '#btn-submit-answer');
      await wait(120);
      await click(page, '#btn-next-question');
      await wait(200);
    }
    await wait(500);
    check('[Inglês] Exercícios -> Flashcards (não direto à Conclusão)', await exists(page, '#flashcards-container'));

    await click(page, '#btn-flashcard-flip');
    await wait(150);
    const flipped = await page.evaluate(() => (document.getElementById('flashcards-container')?.innerText || '').toLowerCase().includes('tradução'));
    check('[Flashcards] Cartão vira e mostra tradução', !!flipped);

    for (let i = 0; i < 6; i++) {
      await click(page, '#btn-flashcard-known');
      await wait(150);
    }
    await wait(500);
    check('[Inglês] Flashcards -> Conclusão', await exists(page, '#study-completion-container'));

    const completionText = await page.evaluate(() => document.getElementById('study-completion-container')?.innerText || '');
    check('[Conclusão] Sem "(Fixture)"/"(Local State)" expostos ao usuário', !/\(Fixture\)|Local State\)/i.test(completionText));

    await page.close();
  }

  // ===== 8. Copy: nenhum termo técnico proibido dentro de Educação (Hub + Study Mode + Tutor) =====
  // Testado com Inglês (a trilha com mais telas/etapas novas: voz, imersão, flashcards) — as 3
  // trilhas compartilham o mesmo template de Study Mode, então o risco de jargão está no
  // template comum, não em uma trilha específica.
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    const hubTerms = await scanForbiddenTerms(page, '#education-experience-root');
    check('[Copy] Hub sem termos técnicos proibidos', hubTerms.length === 0, `achados=${hubTerms.join(',')}`);

    await click(page, '#track-selector-ingles');
    await wait(500);
    await enterStudyMode(page);
    const studyTerms = await scanForbiddenTerms(page, '#education-experience-root');
    check('[Copy] Study Mode (Inglês) sem termos técnicos proibidos', studyTerms.length === 0, `achados=${studyTerms.join(',')}`);

    await click(page, '#btn-trigger-tutor');
    await wait(300);
    const tutorTerms = await scanForbiddenTerms(page, '#tutor-drawer');
    check('[Copy] Tutor Drawer (Inglês) sem termos técnicos proibidos', tutorTerms.length === 0, `achados=${tutorTerms.join(',')}`);
    await page.close();
  }

  // ===== 9. QA/Dev panel nunca aparece sem ?qa=1 =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    check('[Copy] Painel de QA/Dev não é renderizado por padrão', !(await exists(page, '#qa-dev-controls')));
    await page.close();

    const pageQa = await browser.newPage();
    await pageQa.setViewport({ width: 1440, height: 960 });
    await pageQa.goto(URL + '/?qa=1', { waitUntil: 'networkidle0' });
    await goToEducacao(pageQa);
    await click(pageQa, '#btn-toggle-qa-panel');
    await wait(200);
    check('[Copy] Painel de QA/Dev aparece com ?qa=1 (mecanismo de teste preservado)', await exists(pageQa, '#qa-dev-controls'));
    await pageQa.close();
  }

  // ===== 10. Responsive 390/820/1024/1440 =====
  {
    for (const bp of [{ w: 390, h: 844 }, { w: 820, h: 1180 }, { w: 1024, h: 900 }, { w: 1440, h: 960 }]) {
      const page = await freshPage(browser, bp.w, bp.h);
      await goToEducacao(page);
      await click(page, '#track-selector-ingles');
      await wait(500);
      await enterStudyMode(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      check(`[${bp.w}px] sem overflow horizontal no Study Mode (Inglês)`, !overflow);
      check(`[${bp.w}px] palco presente`, await exists(page, '#lesson-stage'));
      await page.close();
    }
  }

  // ===== 11. Reduced motion: fluxo estendido de Inglês continua funcional =====
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await goToEducacao(page);
    await click(page, '#track-selector-ingles');
    await wait(500);
    await enterStudyMode(page);
    check('[Reduced Motion] Study Mode alcançado', await exists(page, '#study-mode-container'));
    await click(page, '#btn-complete-lesson-trigger');
    await wait(400);
    check('[Reduced Motion] Aula -> Exercício de Voz continua funcional', await exists(page, '#voice-exercise-container'));
    await page.close();
  }

  // ===== 12. Keyboard/focus no botão de falar do Exercício de Voz =====
  {
    const page = await freshPage(browser, 1440, 960);
    await goToEducacao(page);
    await click(page, '#track-selector-ingles');
    await wait(500);
    await enterStudyMode(page);
    await click(page, '#btn-complete-lesson-trigger');
    await wait(500);
    const isFocusable = await page.evaluate(() => {
      const btn = document.getElementById('btn-voice-exercise-speak');
      if (!btn) return false;
      btn.focus();
      return document.activeElement === btn;
    });
    check('[A11y] Botão "Falar" do Exercício de Voz é alcançável via teclado', isFocusable);
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
