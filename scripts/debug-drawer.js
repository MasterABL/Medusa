const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function debugDrawer() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  const drawerInfo = await page.evaluate(() => {
    const d = document.getElementById('focus-drawer');
    const s = document.getElementById('main-sidebar');
    return {
      drawerClass: d?.className,
      drawerTransform: d ? window.getComputedStyle(d).transform : null,
      drawerLeft: d ? d.getBoundingClientRect().left : null,
      sidebarClass: s?.className,
      sidebarWidth: s ? window.getComputedStyle(s).width : null,
    };
  });

  console.log('Initial drawer info:', drawerInfo);

  // Now switch to Compacto
  await page.evaluate(() => {
    document.getElementById('btn-shell-mode-dropdown')?.click();
  });
  await new Promise(r => setTimeout(r, 200));
  await page.evaluate(() => {
    document.getElementById('view-desktop-compact')?.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const compactInfo = await page.evaluate(() => {
    const d = document.getElementById('focus-drawer');
    const s = document.getElementById('main-sidebar');
    return {
      drawerClass: d?.className,
      drawerTransform: d ? window.getComputedStyle(d).transform : null,
      drawerLeft: d ? d.getBoundingClientRect().left : null,
      sidebarClass: s?.className,
      sidebarWidth: s ? window.getComputedStyle(s).width : null,
    };
  });

  console.log('Compact info:', compactInfo);

  await browser.close();
}

debugDrawer().catch(console.error);
