const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'http://localhost:3000';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const evidenceDir = path.join(__dirname, '..', 'public', 'evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-device-scale-factor=1'],
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);

  // 1. DESKTOP 100% ZOOM (1440x900)
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  console.log('[QA] Navigating to', URL);
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await wait(1500);

  // Wait for sidebar navigation to be mounted
  console.log('[QA] Waiting for sidebar navigation...');
  await page.waitForSelector('nav[aria-label="Rotas Operacionais"]', { timeout: 30000 });
  await wait(500);

  // Navigate to Educação
  console.log('[QA] Clicking Educação...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('nav[aria-label="Rotas Operacionais"] button')).find(
      (b) => b.getAttribute('title') === 'Educação' || (b.textContent && b.textContent.includes('Educação'))
    );
    if (btn) {
      btn.click();
    }
  });

  await page.waitForSelector('#education-experience-root', { timeout: 30000 });
  await wait(1000);
  await page.screenshot({ path: path.join(evidenceDir, 'postfix_01_dashboard.png') });
  console.log('[QA] Saved postfix_01_dashboard.png');

  // Test File Upload Multi-Stage Pipeline in Context Panel
  console.log('[QA] Testing File Upload Multi-Stage Pipeline...');
  await page.evaluate(() => {
    // Dispatch a dummy file to the dropzone
    const input = document.getElementById('faculdade-material-file-input');
    if (input) {
      const file = new File(['Dummy PDF Content for Hooke Law'], 'resumo_aula_hooke.pdf', { type: 'application/pdf' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await wait(300); // During validating
  await page.screenshot({ path: path.join(evidenceDir, 'postfix_08_upload_pipeline_validating.png') });
  await wait(600); // During processing
  await page.screenshot({ path: path.join(evidenceDir, 'postfix_08_upload_pipeline_processing.png') });
  await wait(600); // Ready
  await page.screenshot({ path: path.join(evidenceDir, 'postfix_08_upload_pipeline_ready.png') });
  console.log('[QA] Upload pipeline states captured');

  // Start Study Session
  console.log('[QA] Starting Study Session...');
  await page.waitForSelector('#btn-start-study-session', { timeout: 10000 });
  await page.click('#btn-start-study-session');

  // Wait for loading transition into study mode
  console.log('[QA] Waiting for study mode container...');
  await page.waitForSelector('#study-mode-container', { timeout: 20000 });
  await wait(1200);

  // Measure geometry helper
  const measureDOM = async (label) => {
    return await page.evaluate((l) => {
      const getBox = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          selector: sel,
          x: Math.round(r.x),
          y: Math.round(r.y),
          width: Math.round(r.width),
          height: Math.round(r.height),
          padding: `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`,
          margin: `${style.marginTop} ${style.marginRight} ${style.marginBottom} ${style.marginLeft}`,
          maxWidth: style.maxWidth,
          display: style.display,
        };
      };

      return {
        mode: l,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        contentLayout: getBox('#content-layout'),
        educationRoot: getBox('#education-experience-root'),
        studyContainer: getBox('#study-mode-container'),
        lessonStage: getBox('#lesson-stage'),
        switcher: getBox('#lesson-composition-switcher'),
        writtenContent: getBox('#lesson-written-content'),
        hookeSim: getBox('#hooke-law-simulation'),
      };
    }, label);
  };

  // 1. Measure Mode Aula + Resumo
  const geoAulaResumo = await measureDOM('aula_resumo');
  console.log('[QA] Geometry Aula+Resumo:', JSON.stringify(geoAulaResumo, null, 2));
  await page.screenshot({ path: path.join(evidenceDir, 'postfix_03_mode_aula_resumo_1440.png') });

  // 2. Switch to Só Aula
  console.log('[QA] Switching to Só Aula...');
  await page.waitForSelector('#btn-lesson-mode-aula', { timeout: 10000 });
  await page.click('#btn-lesson-mode-aula');
  await wait(800);
  const geoAulaSo = await measureDOM('so_aula');
  console.log('[QA] Geometry Só Aula:', JSON.stringify(geoAulaSo, null, 2));
  await page.screenshot({ path: path.join(evidenceDir, 'postfix_02_mode_aula_so_1440.png') });

  // 3. Switch to Resumo (Interactive Digital Lesson)
  console.log('[QA] Switching to Modo Resumo (Interactive Digital Lesson)...');
  await page.waitForSelector('#btn-lesson-mode-resumo', { timeout: 10000 });
  await page.click('#btn-lesson-mode-resumo');
  await wait(1000);
  const geoResumo = await measureDOM('resumo');
  console.log('[QA] Geometry Resumo:', JSON.stringify(geoResumo, null, 2));
  await page.screenshot({ path: path.join(evidenceDir, 'postfix_04_mode_resumo_simulation_1440.png') });

  // 4. Test Interactive Hooke's Law Simulation
  console.log('[QA] Interacting with Hooke Law Simulation...');
  await page.waitForSelector('#slider-hooke-displacement', { timeout: 10000 });
  await page.evaluate(() => {
    const slider = document.getElementById('slider-hooke-displacement');
    if (slider) {
      slider.value = '4.5';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await wait(500);
  await page.screenshot({ path: path.join(evidenceDir, 'postfix_05_hooke_interaction_elongated.png') });
  console.log('[QA] Saved hooke elongated screenshot');

  // Click continuous oscillation mode
  await page.waitForSelector('#btn-toggle-hooke-oscillation', { timeout: 5000 });
  await page.click('#btn-toggle-hooke-oscillation');
  await wait(700);
  await page.screenshot({ path: path.join(evidenceDir, 'postfix_05_hooke_oscillating.png') });

  // Answer Checkpoint Option B (Correct)
  await page.waitForSelector('#btn-checkpoint-opt-b', { timeout: 5000 });
  await page.click('#btn-checkpoint-opt-b');
  await wait(500);
  await page.screenshot({ path: path.join(evidenceDir, 'postfix_05_hooke_checkpoint_answered.png') });
  console.log('[QA] Hooke checkpoint answered');

  // 5. Test Exercises Interactive Feedback (Error Shake & Spring Success)
  console.log('[QA] Advancing from StudyMode to Exercises...');
  await page.waitForSelector('#btn-complete-lesson-trigger', { timeout: 10000 });
  await page.click('#btn-complete-lesson-trigger');
  await page.waitForSelector('#option-a', { timeout: 10000 });
  await wait(600);

  // Click Option B (wrong answer) and submit
  console.log('[QA] Selecting wrong option in exercises...');
  await page.click('#option-b');
  await wait(200);
  await page.click('#btn-submit-answer');
  await wait(400);
  await page.screenshot({ path: path.join(evidenceDir, 'postfix_06_exercise_error_shake.png') });
  console.log('[QA] Captured exercise error state with shake & retry button');

  // Click Retry button
  console.log('[QA] Clicking retry button...');
  await page.waitForSelector('#btn-retry-question', { timeout: 5000 });
  await page.click('#btn-retry-question');
  await wait(400);

  // Click Option A (correct answer) and submit
  console.log('[QA] Selecting correct option in exercises...');
  await page.click('#option-a');
  await wait(200);
  await page.click('#btn-submit-answer');
  await wait(500);
  await page.screenshot({ path: path.join(evidenceDir, 'postfix_07_exercise_correct_spring.png') });
  console.log('[QA] Captured exercise correct state with spring success');

  // 6. TABLET VIEWPORT (820x1180)
  console.log('[QA] Testing Tablet Viewport (820x1180)...');
  await page.setViewport({ width: 820, height: 1180, deviceScaleFactor: 1 });
  await wait(600);
  await page.screenshot({ path: path.join(evidenceDir, 'postfix_09_tablet_820.png') });

  // 7. MOBILE VIEWPORT (390x844)
  console.log('[QA] Testing Mobile Viewport (390x844)...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await wait(600);
  const mobileOverflow = await page.evaluate(() => {
    return {
      bodyScrollWidth: document.body.scrollWidth,
      windowWidth: window.innerWidth,
      hasHorizontalOverflow: document.body.scrollWidth > window.innerWidth,
    };
  });
  console.log('[QA] Mobile Overflow Check:', mobileOverflow);
  await page.screenshot({ path: path.join(evidenceDir, 'postfix_10_mobile_390.png') });

  // Write measurements JSON
  const measurements = {
    geoAulaSo,
    geoAulaResumo,
    geoResumo,
    mobileOverflow,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(evidenceDir, 'measurements.json'), JSON.stringify(measurements, null, 2));
  console.log('[QA] Wrote measurements.json');

  await browser.close();
  console.log('[QA] All QA tests and evidence collection completed successfully!');
}

run().catch((err) => {
  console.error('[QA] Fatal error:', err);
  process.exit(1);
});
