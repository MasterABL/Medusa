const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\Abimael Balbino\\.gemini\\antigravity-ide\\brain\\e171ab28-d418-4139-8d4b-db830725aac3';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runQA() {
  console.log('--- STARTING MEDUSA SHELL V2 AUTOMATED BROWSER QA ---');
  
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
  });

  const page = await browser.newPage();
  
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText);
  });

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('favicon.ico')) return;
    if (msg.type() === 'error') {
      console.error('[BROWSER ERROR]:', text);
    }
  });

  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await wait(500);

  // Check what happens when clicking theme dropdown
  console.log('Clicking #btn-theme-dropdown...');
  await page.evaluate(() => {
    const btn = document.getElementById('btn-theme-dropdown');
    console.log('Found btn:', !!btn);
    btn?.click();
  });
  await wait(300);

  const sepiaBtn = await page.$('button[data-theme="sepia"]');
  console.log('Sepia button exists after click?', !!sepiaBtn);

  await browser.close();
}

runQA().catch(console.error);
