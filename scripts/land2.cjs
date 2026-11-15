/* Остальные горизонтальные экраны: событие, лавка, свеча, тело, награда, смерть, библиотека. */
const { chromium } = require('playwright');
const OUT = process.env.OUT || '/tmp/claude-0/shots';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://127.0.0.1:5173/?debug', { waitUntil: 'networkidle' });
  const setup = (type) => p.evaluate((t) => {
    const w = window.__bwt; const c = w.G.chron;
    c.prologueDone = true; c.pages.push('p_awake', 'p_ilse', 'p_scar'); c.names.push('Мёрк', 'Ильзе', 'Тин');
    c.bodies = [{ circle: 1, floor: 2, cause: 'silt_hound', role: 'gravedigger', epitaph: 'Безымянный № 1314. Загрызен тинным псом. Копал неглубоко.', at: 1 }];
    w.G.run = w.startRun(c, 'gravedigger', 'f-' + t); w.G.run.gold = 220; w.G.run.hp = 51;
    for (const n of w.G.run.map.filter((x) => x.floor === 0)) n.type = t;
    w.showMap();
  }, type);
  for (const t of ['event', 'shop', 'rest', 'body']) { await setup(t); await p.waitForTimeout(400); await p.$eval('.node.avail', (e) => e.click()); await p.waitForTimeout(1200); await p.screenshot({ path: `${OUT}/L1${t}.png` }); }
  await setup('fight');
  await p.evaluate(() => { const r = window.__bwt.G.run; r.hp = 3; });
  await p.$eval('.node.avail', (e) => e.click()); await p.waitForTimeout(1800);
  for (let i = 0; i < 6 && !(await p.$('.screen.vision, .screen:not(:has(.hand))')); i++) { await p.$eval('.end-turn', (e) => e.click()).catch(() => {}); await p.waitForTimeout(3200); }
  await p.waitForTimeout(1500); await p.screenshot({ path: `${OUT}/L2death.png` });
  await p.$eval('.screen', (e) => e.click()); await p.waitForTimeout(6500);
  await p.screenshot({ path: `${OUT}/L2vision.png` });
  await p.$eval('.screen', (e) => e.click()); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/L2reading.png` });
  await p.evaluate(() => { const w = window.__bwt; w.showHub(); w.openLibrary(); }); await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/L3library.png` });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
