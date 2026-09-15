const puppeteer = require('puppeteer-core');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function check404() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.on('response', res => {
    if (res.status() === 404) {
      console.log('404 URL:', res.url());
    }
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await browser.close();
}

check404().catch(console.error);
