/* Остальные экраны: событие, лавка, свеча, тело, смерть и возвращение. */
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
  const setup = (type, extra = '') => p.evaluate(([t, ex]) => {
    const w = window.__bwt;
    w.G.chron.prologueDone = true;
    w.G.chron.pages.push('p_awake', 'p_ilse', 'p_scar'); w.G.chron.names.push('Мёрк', 'Ильзе', 'Тин');
    w.G.chron.bodies = [{ circle: 1, floor: 2, cause: 'silt_hound', role: 'gravedigger', epitaph: 'Безымянный № 1314. Загрызен тинным псом. Копал неглубоко.', at: 1 }];
    w.G.run = w.startRun(w.G.chron, 'gravedigger', 'flow-' + t);
    w.G.run.gold = 220; w.G.run.hp = 51;
    for (const n of w.G.run.map.filter((x) => x.floor === 0)) n.type = t;
    w.showMap();
    void ex;
  }, [type, extra]);
  for (const t of ['event', 'shop', 'rest', 'body']) {
    await setup(t);
    await p.waitForTimeout(500);
    await p.$eval('.node.avail', (e) => e.click());
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/10-${t}.png` });
  }
  // смерть
  await setup('fight');
  await p.evaluate(() => { window.__bwt.G.run.hp = 3; });
  await p.$eval('.node.avail', (e) => e.click());
  await p.waitForTimeout(1800);
  for (let i = 0; i < 6 && !(await p.$('.screen:not(.combat)')); i++) {
    await p.$eval('.end-turn', (e) => e.click()).catch(() => {});
    await p.waitForTimeout(3200);
  }
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/11-death.png` });
  await p.$eval('.screen', (e) => e.click()); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/12-vision.png` }); await p.waitForTimeout(5800);
  await p.screenshot({ path: `${OUT}/12b-vision.png` });
  await p.$eval('.screen', (e) => e.click()); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/13-reading.png` });
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
