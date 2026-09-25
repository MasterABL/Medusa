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
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  console.log('Navigating to', URL);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await wait(1000);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await wait(800);

  // Navigate to Educação
  console.log('Clicking Educação in sidebar...');
  await page.evaluate(() => {
    const navButtons = document.querySelectorAll('nav[aria-label="Rotas Operacionais"] button');
    if (navButtons && navButtons[2]) {
      navButtons[2].click();
    }
  });
  await page.waitForSelector('#education-experience-root', { timeout: 15000 });
  await wait(800);

  // Screenshot of Educação Dashboard
  await page.screenshot({ path: path.join(evidenceDir, 'baseline_01_dashboard.png') });
  console.log('Saved baseline_01_dashboard.png');

  // Start study session
  console.log('Clicking Iniciar Sessão...');
  await page.waitForSelector('#btn-start-study-session', { timeout: 10000 });
  await page.click('#btn-start-study-session');

  // Wait for loading (~3.4s) + ready (~1.8s) -> study mode
  console.log('Waiting for study mode to enter...');
  await page.waitForSelector('#study-mode-container', { timeout: 20000 });
  await wait(1000);

  // Measure baseline geometry
  const measure = async (modeName) => {
    const data = await page.evaluate(() => {
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
        window: { width: window.innerWidth, height: window.innerHeight },
        contentLayout: getBox('#content-layout'),
        educationRoot: getBox('#education-experience-root'),
        studyContainer: getBox('#study-mode-container'),
        lessonStage: getBox('#lesson-stage'),
        switcher: getBox('#lesson-composition-switcher'),
        writtenContent: getBox('#lesson-written-content'),
      };
    });

    console.log(`\n=== GEOMETRY IN MODE: ${modeName} (1440x900) ===`);
    console.log(JSON.stringify(data, null, 2));
    await page.screenshot({ path: path.join(evidenceDir, `baseline_mode_${modeName}.png`) });
    return data;
  };

  await measure('aula_resumo');

  // Switch to Aula
  console.log('Switching to Modo Aula...');
  await page.evaluate(() => {
    document.querySelector('#btn-lesson-mode-aula')?.click();
  });
  await wait(800);
  await measure('aula_so');

  // Switch to Resumo
  console.log('Switching to Modo Resumo...');
  await page.evaluate(() => {
    document.querySelector('#btn-lesson-mode-resumo')?.click();
  });
  await wait(800);
  await measure('resumo');

  await browser.close();
  console.log('Baseline measurement complete!');
}

run().catch((err) => {
  console.error('Error running baseline measurement:', err);
  process.exit(1);
});
