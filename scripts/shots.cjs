/* Скриншоты ключевых экранов (Playwright). Запуск: node scripts/shots.cjs  (dev-сервер на :5173) */
const { chromium } = require('playwright');
const OUT = process.env.OUT || '/tmp/claude-0/shots';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://127.0.0.1:5173/?debug', { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/01-title.png` });
  await p.evaluate(() => {
    const w = window.__bwt;
    w.G.chron.prologueDone = true;
    w.G.chron.tolls = 3;
    w.G.chron.pages.push('p_awake', 'p_ilse', 'p_scar');
    w.G.chron.names.push('Мёрк', 'Ильзе');
    w.G.chron.bodies.push({ circle: 1, floor: 2, cause: 'silt_hound', role: 'gravedigger', epitaph: 'Безымянный № 1314. Загрызен тинным псом. Копал неглубоко.', at: 1 });
    w.showHub();
  });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/02-hub.png` });
  await p.evaluate(() => window.__bwt.openRolePick());
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/03-role.png` });
  await p.evaluate(() => {
    document.querySelector('.sheet')?.remove();
    const w = window.__bwt;
    w.G.run = w.startRun(w.G.chron, 'gravedigger', 'shot1');
    w.showMap();
  });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/04-map.png` });
  await p.$eval('.node.avail', (e) => e.click());
  await p.waitForTimeout(2200);
  await p.screenshot({ path: `${OUT}/05-combat.png` });
  const cards = await p.$$('.hand .cw');
  if (cards.length) {
    await cards[2].evaluate((e) => e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 700, pointerId: 1 })));
    await cards[2].evaluate((e) => e.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 200, clientY: 700, pointerId: 1 })));
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/06-combat-selected.png` });
  }
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
