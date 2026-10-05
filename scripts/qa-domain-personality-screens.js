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
  throw new Error('Navegador Edge/Chrome não encontrado');
}

const OUT_DIR = path.resolve(__dirname, '../qa-recordings/domain-personality');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runDomainQAAudit() {
  console.log('=== INICIANDO QA VISUAL E FUNCIONAL: 4 TELAS MESTRES DO STITCH ===');
  const executablePath = resolveBrowserPath();
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const BASE_URL = 'http://localhost:3000';

  const viewports = [
    { name: '1440-desktop', width: 1440, height: 900 },
    { name: '1024-laptop', width: 1024, height: 768 },
    { name: '820-tablet', width: 820, height: 900 },
    { name: '390-mobile', width: 390, height: 844 }
  ];

  // ================= 1. FINANÇAS =================
  console.log('\n--- 1. AUDITANDO DOMÍNIO FINANÇAS ---');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#financas`, { waitUntil: 'networkidle0' });
  await wait(1000);

  // Validação Dynamic Island & Context Panel
  const financasIsland = await page.$eval('#island-title-group', (el) => el.innerText).catch(() => 'N/A');
  const financasBadge = await page.$eval('#island-timer-badge', (el) => el.innerText).catch(() => 'N/A');
  console.log(`  [Island Finanças]: ${financasIsland} | Badge: ${financasBadge}`);

  // Screenshot Desktop 1440
  await page.screenshot({ path: path.join(OUT_DIR, '01-financas-desktop-1440.png') });
  console.log('  [FOTO] 01-financas-desktop-1440.png salva');

  // Interação no Simulador de Margem Livre (Slider)
  await page.evaluate(() => {
    const slider = document.getElementById('fin-rev-slider');
    if (slider) {
      slider.value = '2500';
      slider.dispatchEvent(new Event('change', { bubbles: true }));
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await wait(600);
  await page.screenshot({ path: path.join(OUT_DIR, '01b-financas-simulator-adjusted.png') });
  console.log('  [FOTO] 01b-financas-simulator-adjusted.png salva');

  // ================= 2. CORPO =================
  console.log('\n--- 2. AUDITANDO DOMÍNIO CORPO ---');
  await page.goto(`${BASE_URL}/#corpo`, { waitUntil: 'networkidle0' });
  await wait(1000);

  const corpoIsland = await page.$eval('#island-title-group', (el) => el.innerText).catch(() => 'N/A');
  const corpoBadge = await page.$eval('#island-timer-badge', (el) => el.innerText).catch(() => 'N/A');
  console.log(`  [Island Corpo]: ${corpoIsland} | Badge: ${corpoBadge}`);

  await page.screenshot({ path: path.join(OUT_DIR, '02-corpo-desktop-1440.png') });
  console.log('  [FOTO] 02-corpo-desktop-1440.png salva');

  // Interação no Metrônomo (Preset 120 BPM)
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn120 = buttons.find((b) => b.textContent.trim() === '120');
    if (btn120) btn120.click();
  });
  await wait(800);
  await page.screenshot({ path: path.join(OUT_DIR, '02b-corpo-metronome-120bpm.png') });
  console.log('  [FOTO] 02b-corpo-metronome-120bpm.png salva');

  // ================= 3. GUARDIAN =================
  console.log('\n--- 3. AUDITANDO DOMÍNIO GUARDIAN ---');
  await page.goto(`${BASE_URL}/#guardian`, { waitUntil: 'networkidle0' });
  await wait(1000);

  const guardianIsland = await page.$eval('#island-title-group', (el) => el.innerText).catch(() => 'N/A');
  const guardianBadge = await page.$eval('#island-timer-badge', (el) => el.innerText).catch(() => 'N/A');
  console.log(`  [Island Guardian]: ${guardianIsland} | Badge: ${guardianBadge}`);

  await page.screenshot({ path: path.join(OUT_DIR, '03-guardian-desktop-1440.png') });
  console.log('  [FOTO] 03-guardian-desktop-1440.png salva');

  // ================= 4. ESPIRITUAL =================
  console.log('\n--- 4. AUDITANDO DOMÍNIO ESPIRITUAL ---');
  await page.goto(`${BASE_URL}/#espiritual`, { waitUntil: 'networkidle0' });
  await wait(1000);

  const espiritualIsland = await page.$eval('#island-title-group', (el) => el.innerText).catch(() => 'N/A');
  const espiritualBadge = await page.$eval('#island-timer-badge', (el) => el.innerText).catch(() => 'N/A');
  console.log(`  [Island Espiritual]: ${espiritualIsland} | Badge: ${espiritualBadge}`);

  await page.screenshot({ path: path.join(OUT_DIR, '04-espiritual-desktop-1440.png') });
  console.log('  [FOTO] 04-espiritual-desktop-1440.png salva');

  // Interação no Modo Silêncio e Apertura 'Oração & Hesicasmo'
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btnOracao = buttons.find((b) => b.textContent.includes('Oração & Hesicasmo'));
    if (btnOracao) btnOracao.click();
    const btnSilencio = buttons.find((b) => b.textContent.includes('Entrar em Silêncio'));
    if (btnSilencio) btnSilencio.click();
  });
  await wait(800);
  await page.screenshot({ path: path.join(OUT_DIR, '04b-espiritual-silence-mode.png') });
  console.log('  [FOTO] 04b-espiritual-silence-mode.png salva');

  // ================= 5. RESPONSIVIDADE (1024, 820, 390) =================
  console.log('\n--- 5. AUDITANDO RESPONSIVIDADE E ADAPTAÇÃO GEOMÉTRICA ---');
  for (const vp of viewports.slice(1)) {
    console.log(`  Testando Viewport ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });
    
    // Finanças
    await page.goto(`${BASE_URL}/#financas`, { waitUntil: 'networkidle0' });
    await wait(600);
    await page.screenshot({ path: path.join(OUT_DIR, `05-financas-${vp.name}.png`) });

    // Corpo
    await page.goto(`${BASE_URL}/#corpo`, { waitUntil: 'networkidle0' });
    await wait(600);
    await page.screenshot({ path: path.join(OUT_DIR, `06-corpo-${vp.name}.png`) });

    // Guardian
    await page.goto(`${BASE_URL}/#guardian`, { waitUntil: 'networkidle0' });
    await wait(600);
    await page.screenshot({ path: path.join(OUT_DIR, `07-guardian-${vp.name}.png`) });

    // Espiritual
    await page.goto(`${BASE_URL}/#espiritual`, { waitUntil: 'networkidle0' });
    await wait(600);
    await page.screenshot({ path: path.join(OUT_DIR, `08-espiritual-${vp.name}.png`) });
  }

  // ================= 6. PREFERS-REDUCED-MOTION =================
  console.log('\n--- 6. AUDITANDO PREFERS-REDUCED-MOTION ---');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#corpo`, { waitUntil: 'networkidle0' });
  await wait(800);
  await page.screenshot({ path: path.join(OUT_DIR, '09-corpo-reduced-motion.png') });
  console.log('  [FOTO] 09-corpo-reduced-motion.png salva (estabilidade sem oscilação contínua)');

  await browser.close();
  console.log('\n=== AUDITORIA VISUAL E FUNCIONAL CONCLUÍDA COM SUCESSO! ===');
}

runDomainQAAudit().catch((err) => {
  console.error('Erro na auditoria:', err);
  process.exit(1);
});
