const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:5173/?debug', { waitUntil: 'networkidle' });
  await p.evaluate(() => { const w = window.__bwt; const c = w.G.chron; c.prologueDone = true; w.G.run = w.startRun(c, 'gravedigger', 'fps'); w.showMap(); });
  await p.waitForTimeout(400);
  await p.$eval('.node.avail', (e) => e.click());
  await p.waitForTimeout(2500);
  const fps = await p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); }; requestAnimationFrame(f); }));
  await p.screenshot({ path: '/tmp/claude-0/shots/fps.png' });
  console.log('fps', fps, errs.join('\n') || 'no errors');
  await b.close();
})();
