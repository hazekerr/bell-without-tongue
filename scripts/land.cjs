/* Горизонтальные скриншоты ключевых экранов. Нужен dev-сервер на :5173. */
const { chromium } = require('playwright');
const OUT = process.env.OUT || '/tmp/claude-0/shots';
const W = Number(process.env.W || 844), H = Number(process.env.H || 390);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://127.0.0.1:5173/?debug', { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/L01-title.png` });
  await p.evaluate(() => {
    const w = window.__bwt; const c = w.G.chron;
    c.prologueDone = true; c.tolls = 3; c.pages.push('p_awake', 'p_ilse', 'p_scar'); c.names.push('Мёрк', 'Ильзе', 'Тин');
    c.bodies = [{ circle: 1, floor: 2, cause: 'silt_hound', role: 'gravedigger', epitaph: 'Безымянный № 1314. Загрызен тинным псом. Копал неглубоко.', at: 1 }];
    w.showHub();
  });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/L02-hub.png` });
  await p.evaluate(() => window.__bwt.openRolePick());
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/L03-role.png` });
  await p.evaluate(() => { document.querySelector('.sheet')?.remove(); const w = window.__bwt; w.G.run = w.startRun(w.G.chron, 'gravedigger', 'land1'); w.showMap(); });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/L04-map.png` });
  await p.$eval('.node.avail', (e) => e.click());
  await p.waitForTimeout(2300);
  await p.screenshot({ path: `${OUT}/L05-combat.png` });
  await p.evaluate(() => { const c = document.querySelectorAll('.hand .cw')[2]; const r = c.getBoundingClientRect(); const o = { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + 30, pointerId: 3 }; c.dispatchEvent(new PointerEvent('pointerdown', o)); c.dispatchEvent(new PointerEvent('pointerup', o)); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/L06-combat-sel.png` });
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
